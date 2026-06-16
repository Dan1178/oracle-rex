# Milestone 5 — React/TypeScript Frontend Migration (Phased Plan)

> Companion to `oracle_rex_upgrade_plan.md` → "Milestone 5 — React/TypeScript Frontend
> Migration". This document breaks that milestone into ordered, independently
> verifiable phases. **Planning only** — no code is written here.
>
> **Branch:** all of Milestone 5 lands on `epic/frontend-react-typescript-migration`.
> It is **not** merged to `main` until the full migration is verified working
> end-to-end (all phases complete, legacy retired, Render deploy confirmed).

---

## 1. Current State (what we are migrating from)

Plain-JS, Django-template frontend. Small surface area (~900 lines JS, ~900 lines
template, ~600 lines CSS), which makes a clean parallel rebuild realistic.

**Templates** (`templates/`): `base.html` (shell + tab nav + `<script app.js>`),
`index.html` (includes the 6 tab partials), and one partial per tab:
`settings.html`, `rules.html`, `strategy.html`, `move.html`, `fleet.html` +
`fleet_mgmt.html`, `tactical.html`.

**Scripts** (`static/js/`): `app.js` (383) — tab switching, board rendering
(`setBoard`), `generateGame`, `suggestStrategy`, async job polling
(`runAiJob`/`pollAiJob`), demo-mode wiring; `fleet_manager.js` (349) — hex-click
popover, fleet/ground/structure mutation, save/load/copy JSON; `rules.js` (53) —
ask + demo chips; `tactical_calculator.js` (132) — unit counters + force payload.

**Styles** (`static/css/`): `style.css` (378, incl. the hex-grid layout),
`fleet_manager.css`, `tactical_calculator.css`.

**How it's served:** `frontend_view` renders `index.html`; WhiteNoise serves
`static/` (autorefresh in `DJANGO_DEBUG=1`, hashed `staticfiles/` in prod). Single
Render free web service. No build step today.

**Key patterns to be aware of (these shape the migration):**
- **DOM-as-state.** App state lives in the DOM + a few `window.*GameData` globals
  (`strategyGameData`, `moveGameData`, `fleetGameData`). React replaces this with
  component/query state — the per-feature global board state maps to per-feature
  React state keyed by tab.
- **API keys are NOT persisted.** Despite the warning copy in `settings.html`, there
  is no `localStorage`/`sessionStorage` code — keys live only in the input DOM for
  the session. We can preserve that (in-memory) or add opt-in persistence.
- **Brittle element IDs.** Several IDs contain spaces, e.g. `id="faction-select strategy"`,
  `id="board-preview fleet"`. React component state eliminates these footguns.
- **Board is a fixed 37-hex grid.** Positions are hard-coded `data-position` strings
  ("0-0", "1-4", … plus Mecatol special case). `setBoard` sets each hex's
  background image to `/static/images/systems/ST_<tile_id>.png`.

---

## 2. Backend Contract (stable — do NOT change in M5)

Milestones 1–4 already built a clean, typed-on-the-backend API. **The React app
consumes this contract as-is; M5 changes no backend behavior.**

| Endpoint | Method | Body / Params | Returns |
|---|---|---|---|
| `/api/build-game-from-tts/` | POST | `{tts_string, game_name}` | `{game: {board, players}}` |
| `/api/jobs/{rules,strategy,move,tactical}/` | POST | inputs + creds | `202 {job_id}` |
| `/api/jobs/<uuid>/` | GET | — | job dict (below) |
| `/api/demo/catalog/` | GET | — | scenarios catalog |
| `/api/demo/status/` | GET | — | `{live_demo_enabled}` |
| `/api/demo/run/` | POST | `{scenario_key}` | `202 {job_id}` (pre-completed) |

**Job status dict:** `{id, feature_type, status, is_terminal, result, error,
model_name, prompt_version, created_at, completed_at}`.

**Result payloads** (the `result` field): `{answer | strategy | calc_results,
structured, demo?, demo_label?}`. `structured` is the pydantic `model_dump()` for
rules/strategy/move; tac_calc is **plain text only** (no structured).

**Credentials in job-create bodies:** either `{access_code}` (private live demo,
takes precedence) or `{api_key, model}` (BYOK). Resolved server-side.

**Structured schemas to mirror in TS types:**
- `RulesAnswer`: `answer`, `assumptions[]`, `rule_basis[]`, `caveats[]`, `needs_exact_text`
- `StrategicPlan`: `summary`, `faction_read`, `opening_priorities[]`, `round_one_plan`,
  `tech_path[]`, `expansion_targets[]`, `risks[]`, `mistakes_to_avoid[]`
- `TacticalMove`: `recommended_move`, `reasoning`, `expected_benefit`, `combat_risk`,
  `alternative_conservative_move`, `alternative_aggressive_move`, `assumptions[]`

---

## 3. Stack & Key Decisions

Per the upgrade plan's recommended stack, plus decisions made for this codebase.
Environment confirmed: **Node v22.14, npm 10.9.2**, no `package.json` yet, Windows.

| Concern | Decision | Rationale |
|---|---|---|
| Framework / build | **React + TypeScript (strict) + Vite** | Plan-mandated; Vite = fast dev + simple prod build. |
| Server state | **TanStack Query** | The async-job *create → poll until terminal* flow is exactly `useQuery` with `refetchInterval`; demo + catalog are plain queries. |
| Client state | **Lightweight (Zustand or Context)** for Settings (keys, per-feature model, access code) | Small; avoid Redux. Server state stays in Query. |
| Styling | **Port existing CSS as CSS Modules / scoped global first** | Minimize visual churn in M5. Heavy theme/redesign is **M6's** job, not M5. Tailwind would be more rework — defer. |
| Response validation | **Zod** schemas mirroring the pydantic structures | Runtime-validate API responses → typed results, graceful failure. |
| Django ↔ Vite integration | **Manifest-based: Vite builds into a dir WhiteNoise serves; Django template references hashed assets via manifest** (e.g. `django-vite` or a small custom tag) | Keeps the M2/M3 architecture: **one free Render web service, no CORS, no second host**. Dev uses the Vite dev server proxying `/api` → Django :8000. |
| API key persistence | **Keep in-memory (current behavior)**; optionally add opt-in `sessionStorage` | Matches today; avoids new security surface. Fix the misleading "local storage" warning copy while we're in there. |
| Structured cards | **Render `structured` as cards in M5** (types are available) | The plan calls for structured cards over text blobs; wiring it now is cheap. **Visual polish/theming stays in M6.** |
| Migration strategy | **Parallel SPA, incremental features, legacy served at `/legacy` until cutover** | App is small enough to rebuild cleanly; keeping legacy reachable means nothing breaks mid-migration. Satisfies "migrate one feature at a time" *within* the new SPA. |
| Testing | **Vitest + React Testing Library + MSW** | Component + API-client tests; MSW mocks the stable contract. |

**Open questions for the user (decide before/early in Phase 0 — recommendations in bold):**
1. Vite↔Django glue: **`django-vite` package** vs a hand-rolled manifest tag? (Recommend `django-vite` — less custom code.)
2. Styling: **CSS Modules port** vs adopt Tailwind now? (Recommend port now, Tailwind later if M6 wants it.)
3. Key persistence: in-memory only vs **opt-in sessionStorage**? (Recommend in-memory; revisit in M6 UX.)

---

## 4. Migration Phases

Each phase ends with the app **still working** (legacy stays at `/legacy` until
Phase 8). Order is dependency-driven: infra → simplest feature → board-dependent
features → most complex (fleet) → cutover.

### Phase 0 — Tooling & build integration ✅ **Complete**
**Goal:** A React/TS/Vite app that builds into Django's static pipeline and is
served on the same single Render web service, hitting one real API endpoint.

- Scaffold `frontend/` (Vite React-TS template); `package.json`, strict
  `tsconfig`, ESLint + Prettier.
- Wire Vite → Django: build manifest + asset references; WhiteNoise serves built
  output; dev server proxies `/api` → `:8000`.
- New SPA mounts at a temporary route (e.g. `/app` or `?spa`); legacy stays at `/`.
- npm scripts (`dev`, `build`, `test`, `lint`); add `npm ci && npm run build` to CI
  (`.github/workflows/django.yml`); document the dev loop (run Django + Vite).
- **Verify:** empty React page renders locally *and* from a Django prod build
  (`collectstatic`), and successfully fetches `/api/demo/catalog/`.

### Phase 1 — Typed API layer & shared infrastructure ✅ **Complete**
**Goal:** Fully typed, tested client + the async-job hook. No feature UI yet.

- `types/`: `game.ts` (board, players, system, planet, fleet, ground_forces),
  `ai.ts` (Job, JobStatus, result payloads + the 3 structured schemas), `demo.ts`.
- Zod schemas + runtime validation of responses.
- `api/oracleRexApi.ts`: `buildGameFromTts`, `createJob(feature, body)`,
  `getJobStatus(id)`, `getDemoCatalog`, `getDemoStatus`, `runDemo(scenarioKey)`.
- TanStack Query provider; **`useAiJob` hook** = POST create → poll status with
  `refetchInterval` until `is_terminal` (port the 1.5s interval / ~5.5min cap and
  the terminal/error handling from `pollAiJob`).
- Shared components: `LoadingState`, `ErrorState`, `DemoLabel`, and the result
  renderer (`AdvisorCard` for structured, text fallback for tac_calc).
- Settings/credentials primitive: `buildLiveCredentials` equivalent (access code
  beats BYOK key).
- **Verify:** unit tests for client + `useAiJob` (MSW-mocked create→poll→complete,
  and failure/timeout paths).

### Phase 2 — App shell, tab routing & Settings ✅ **Complete**
**Goal:** SPA shell with the 6-tab layout and a working Settings tab.

- Tab nav matching current tabs (Settings, Rules Q&A, Strategy, Fleet Manager,
  Move, Tactical Calculator).
- Settings: 3 BYOK key inputs, per-feature model radio groups (mirror current model
  lists), access-code field, "three modes" blurb. Wire to the settings store +
  credential builder. Fix the misleading persistence warning.
- Bootstrap demo config (catalog + status) on mount.
- **Verify:** tab switching works; model/key selection drives credential building;
  demo catalog loads.

**Done:** `components/TabNav/` (React-driven active tab, `role="tablist"`);
`features/settings/SettingsPanel.tsx` (modes blurb, access-code + 3 BYOK key
inputs, per-feature model radio groups mirroring `templates/settings.html`,
corrected in-memory key warning); `store/models.ts` (per-feature model catalog +
`apiMakeFor`), `store/settings.tsx` + `store/settingsContext.ts` (Context store:
keys, model-per-feature, access code, `getCredentials(feature)` wiring the
Phase-1 `buildLiveCredentials`); `hooks/useDemoConfig.ts` (catalog + status
bootstrap, non-fatal on error); `App.tsx` shell with the 6 tabs (unbuilt features
show a phase placeholder) + base CSS/font port (`index.css`, `App.module.css`).
Verified: lint + `tsc -b` clean, `npm run build` succeeds, 33 tests pass
(`App.test.tsx`, `SettingsPanel.test.tsx`, `settings.test.tsx`,
`useDemoConfig.test.tsx`).

### Phase 3 — Tactical / Battle Calculator (first feature — validates the pipeline) ✅ **Complete**
**Goal:** Simplest feature fully on React; proves create→poll→render end-to-end.

- Unit-counter components (friendly/enemy fleet, ground, structures); build the
  `force_data` payload (port `getForceCounts`).
- `useAiJob('tactical')`; render plain-text `calc_results`.
- Demo: "Load Example Battle" applies `unit_counts` and runs the demo job.
- **Verify:** live (BYOK/access code) and demo both work and render.

**Done:** `features/battleCalculator/units.ts` (unit catalog + `buildForceData`
port of `getForceCounts`, incl. the legacy `mech`→`mechs` payload-key mapping and
zero-omission; flat `"<side>-<unit>"` counts keyed exactly like the demo
scenario's `unit_counts`); `components/UnitCounter/` (controlled icon + ▲/▼
steppers + count, friendly/enemy tint filters ported verbatim);
`features/battleCalculator/BattleCalculator.tsx` (friendly/enemy fleet + ground +
structure sections, `useAiJob('tactical')` submit via the settings
`getCredentials('tactical')`, plain-text `calc_results` rendered through the
shared `JobResultView` with `feature="tac_calc"`, loading/error/retry states,
"Load Example Battle" demo applying `unit_counts` + running the pre-completed
demo job through the same UI). Wired into `App.tsx` (tactical tab now live).
Verified: lint + `tsc -b` clean, `npm run build` succeeds, 42 tests pass
(`units.test.ts` force_data parity; `BattleCalculator.test.tsx` no-credentials
guard, live calculate capturing the force_data body + render, demo round-trip
with label; `App.test.tsx` tactical tab mounts the calculator). The live + demo
create→poll→render paths are covered against the contract via MSW; not yet
exercised against a real provider.

### Phase 4 — Rules Q&A
**Goal:** Rules feature on React, incl. structured card + demo chips.

- Question input → `useAiJob('rules')`; render `RulesAnswer` as a structured card
  (answer + rule basis / assumptions / caveats).
- Demo prompt chips (from catalog) → `runDemo` with the chip's saved answer.
- **Verify:** live + demo + chips render with the demo label.

### Phase 5 — Board rendering + Strategy Suggester
**Goal:** The hex board component + first board-driven feature.

- **`Board` component**: 37 fixed hex positions, tile images by `tile_id` (Mecatol
  special case), faction dropdown populated from `game.players`. Port the hex-grid
  CSS layout carefully.
- TTS input → `buildGameFromTts` → render board; per-feature board state via Query
  key / component state (no more `window.*GameData`, no space-in-ID hacks).
- `useAiJob('strategy')`; render `StrategicPlan` structured card.
- Demo: "Load Sample Milty Draft Board" → build board, auto-select suggested
  faction, show saved strategy.
- **Verify:** board renders correctly vs legacy; live + demo strategy work.

### Phase 6 — Move Suggester (reuses Board)
**Goal:** Move feature, reusing the Board + faction-select from Phase 5.

- `useAiJob('move')`; render `TacticalMove` structured card.
- Demo: "Load Tactical Puzzle".
- **Verify:** live + demo work; board reuse confirmed.

### Phase 7 — Fleet Manager (most complex — reuses Board)
**Goal:** Port the interactive fleet/ground editor and game-state I/O.

- Hex-click → fleet-management popover; ship counters mutating `system.fleet`,
  ground/structure counters mutating `planet.ground_forces`, owner selects (port
  `updateShipCount`/`updateUnitCount`/`loadFleetData`/`loadPlanetData`). This is
  React state, not DOM mutation.
- Export-to-Move-Suggester; save/load/copy game JSON (download / file upload /
  clipboard).
- **Verify:** counts persist per system/planet; export + save/load/copy round-trip.

### Phase 8 — Cutover, cleanup, retire legacy
**Goal:** SPA becomes the only frontend; remove the plain-JS app.

- Point `frontend_view` (route `/`) at the SPA build; remove the temporary route.
- Delete legacy templates (`base/index/settings/rules/strategy/move/fleet/
  fleet_mgmt/tactical`) and `static/js/*.js` (keep images/shared assets); remove
  dead CSS or fold needed rules into the React styles.
- Update README / dev docs (Node + Vite dev loop, build, CI), and `render.yaml`
  build command if needed (`npm ci && npm run build` before `collectstatic`).
- Final Render deploy verification (demo + a live BYOK round-trip).
- **Verify:** all M5 acceptance criteria (below) pass; legacy gone.

---

## 5. Cross-Cutting Concerns

- **Async-job UX**: every AI call must show loading / success / error (already the
  pattern; preserve it via `useAiJob` states). Keep per-feature loading copy
  ("Analyzing board state…", "Evaluating tactical options…", etc.).
- **Demo mode parity**: demo buttons/chips must keep working through the same
  `runDemo` → poll UI, with the demo label on results.
- **Single-host / no-CORS**: keep the build served by Django/WhiteNoise on the one
  free Render service. (CORS settings exist but we shouldn't need cross-origin.)
- **Images**: `/static/images/...` paths stay valid (served by Django) — Board and
  unit icons reference them. Confirm asset URLs resolve under the new build.
- **Accessibility/keyboard**: minor improvement opportunity, but heavy UX work is M6.

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Vite↔Django integration friction (manifest, static paths) | Phase 0 spike isolates this before any feature work; use `django-vite` to avoid custom glue. |
| Hex-grid CSS layout regressions | Port `style.css` hex layout verbatim first; visually diff Board vs legacy in Phase 5 before refactoring. |
| Fleet Manager state complexity (nested mutation, popover) | Migrate last (Phase 7), after the simpler features prove the patterns. |
| Render free-tier build time / memory for `npm run build` | Keep deps minimal; verify the build in CI and on a Render deploy early (Phase 0/8). |
| Scope creep into redesign | Hard boundary: **M5 ports behavior + adds structured cards; visual theme/redesign is M6.** |
| Half-migrated app breaks demo | Legacy stays at `/legacy` until Phase 8; each phase keeps the app working. |

---

## 7. Acceptance Criteria (from the upgrade plan, restated)

- React frontend covers all existing major features (rules, strategy, move, fleet,
  tactical) plus Settings and demo mode.
- Plain-JS frontend is removed / no longer primary.
- API contracts are typed in frontend code (and runtime-validated).
- AI results render as structured cards, not raw text blobs (where structured data
  exists).
- Demo mode is obvious and usable with no API key; BYOK / private-live still work.
- App still deploys on the single free Render web service; production build
  succeeds in CI (`npm run build`) and frontend tests pass (`npm test`).

---

## 8. Suggested Target Structure

```text
frontend/
  src/
    api/        oracleRexApi.ts        # typed client
    hooks/      useAiJob.ts            # create + poll
    components/ Board/ Chat/ FleetCalculator/ LoadingState/ ErrorState/ AdvisorCard/ DemoLabel/
    features/   rulesChat/ strategicPlan/ tacticalMove/ battleCalculator/ fleetManager/ settings/ demoMode/
    store/      settings.ts            # keys, model-per-feature, access code
    types/      game.ts ai.ts demo.ts
    schemas/    *.zod.ts               # runtime validation
    App.tsx  main.tsx
  index.html  vite.config.ts  package.json  tsconfig.json
```

---

## 9. Out of Scope for M5 (defer)

- Visual theme / "command dashboard" redesign, landing page, advisor-card polish → **M6**.
- Performance (board memoization, calculator tuning) → **M7**.
- Frontend test depth beyond smoke/component basics → **M8**.
- Any backend/API contract changes, new AI features, account system.

---

## 10. Cleanup Work (side tasks discovered during implementation)

Out-of-scope items surfaced while doing the migration. Tracked here so they
aren't lost; address opportunistically or fold into the relevant phase. None
block the migration.

- **`STATICFILES_STORAGE` is a silent no-op (Django 5.1).** `oracle-rex/settings.py`
  still sets `STATICFILES_STORAGE = 'whitenoise…CompressedManifestStaticFilesStorage'`,
  but Django 5.1 removed that setting (use the `STORAGES` dict). Result: in
  production there is no `staticfiles.json`, no WhiteNoise compression, and no
  manifest hashing. Phase 0 works regardless because Vite already content-hashes
  its bundles. Fix = migrate to `STORAGES`, re-run `collectstatic`, and confirm
  the django-vite asset URLs still resolve (ManifestStaticFilesStorage keeps the
  original unhashed copies, which WhiteNoise serves). **Testable now** (see §11);
  spawned as task `task_4b213925`.
- **`core/urls.py` is included twice.** `oracle-rex/urls.py` mounts `core.urls`
  under both `''` and `api/`, so every route also exists under `/api/…` — e.g.
  the new SPA route yields a harmless `/api/app/`, and `/api/` renders the
  frontend. Pre-existing pattern; not introduced by M5. Consider tidying the URL
  config (e.g. a dedicated frontend urlconf vs the API urlconf) during the
  Phase 8 cutover, when the frontend routes are being reworked anyway. Low value,
  low urgency.
- **`db.sqlite3` churn on every run.** The committed SQLite file is mutated by
  `reset_database()` at session startup (and by tests), so `runserver`/tests
  leave the tracked DB dirty and it must be restored by hand. A dev-process
  annoyance, not an M5 concern — revisit only if it gets in the way (e.g. stop
  committing the seeded DB, or gate the startup reset more aggressively).
- **Admin-session CSRF edge case (caveat, not a fix).** The AI POST endpoints
  rely on DRF `SessionAuthentication`, which only enforces CSRF for an
  authenticated session. The public app has no login, so the SPA's same-origin
  POSTs need no CSRF token — but if you're logged into `/admin` in the same
  browser, those POSTs will fail CSRF. This is pre-existing (the legacy JS
  behaves identically) and only affects the owner while testing. Document it;
  only add explicit CSRF handling if it becomes a real problem.

## 11. What's testable right now (before Phase 1)

The only cleanup item that is independently actionable and end-to-end verifiable
today (it doesn't depend on any later phase) is the **`STORAGES` migration**:

1. Replace `STATICFILES_STORAGE` with the `STORAGES` dict (`staticfiles` →
   `whitenoise.storage.CompressedManifestStaticFilesStorage`).
2. `python manage.py collectstatic --noinput` → confirm `staticfiles/staticfiles.json`
   now exists and content-hashed copies are produced.
3. `python manage.py test core.tests` → expect **100 passing**.
4. Serve in production mode (`DEBUG` off, `DJANGO_VITE_DEV_MODE` unset) and `curl`
   `/app/`, the referenced JS/CSS bundle, and `/api/demo/catalog/` → all `200`,
   confirming the React/Vite assets still resolve under manifest storage.

Everything else in §10 is either a caveat to document or a low-value tidy best
done during its natural phase.
