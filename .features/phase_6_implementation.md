# Milestone 6 — Performance Improvements (Implementation Plan)

> **✅ COMPLETE — merged (PR #6) and deployed to Render, verified in production
> 2026-06-18.** 6A (board tiles → WebP, ~85% smaller) and 6C (deterministic
> battle simulator + keyless calculator + opt-in LLM explanation) shipped in
> full. 6B shipped steps 1–2 (prune + compact, ~62% fewer tokens); step 3 (TOON)
> was evaluated and **rejected** — it measured ~9% *larger* than the pruned
> compact JSON on this nested board.
>
> Companion to `oracle_rex_upgrade_plan.md` → "Milestone 6 — Performance
> Improvements". Breaks that milestone into three independently shippable
> workstreams. **Planning only** — no code is written here.
>
> **Branch:** suggested `epic/m6-performance` off `main` (post-M5). The three
> workstreams below touch mostly disjoint files and can land as separate commits
> (or even separate PRs); 6C is the only one that is full-stack and large.

---

## 0. Scope & Ordering

Three workstreams, in suggested order (smallest/lowest-risk first):

| # | Workstream | Surface | Size | Needs live key? |
|---|---|---|---|---|
| **6A** | Board image lazy loading & asset optimization | Frontend only | S | No |
| **6B** | AI payload slimming: prune → compact → TOON | Backend (+ measure) | M | Eval step only |
| **6C** | Deterministic battle simulator + optional LLM explanation | Full-stack | L | Optional path only |

They are independent — none blocks another — so they can be reviewed and merged
separately. 6C is the headline change (it makes the "deterministic combat
simulation" claim in the product pitch actually true) and carries the most design
risk, so it is sequenced last.

A note that recurs below: today the battle calculator and the strategy/move
prompts are the only places that matter for M6. The board renderer is already a
cheap 37-cell React grid, so 6A is deliberately narrow.

---

## Plan 6A — Board Image Lazy Loading & Asset Optimization

### Current state

`Board.tsx` paints all 37 hexes by setting each one's CSS `background-image` to
`/static/images/systems/ST_<tile_id>.png` ([Board.tsx:79](../frontend/src/components/Board/Board.tsx#L79)).
Because they are **CSS backgrounds, not `<img>` elements**, the browser cannot
apply native `loading="lazy"`, and all 37 tile images are fetched as soon as the
board mounts. The plan's other "board rendering" bullets (memoize tiles, cache
parsed state, avoid reparsing TTS) were assessed as already handled by React /
the current architecture — **image weight is the only real lever here.**

### Goal

Cut the board's initial image payload and avoid loading tiles that aren't
on-screen yet, without changing the board's appearance.

### Approach

1. **Measure first.** Record the total bytes + request count for the systems
   image folder (`static/images/systems/ST_*.png`) and the largest individual
   files. This decides whether compression alone is enough or lazy loading is
   also worth the refactor.
2. **Compress / convert assets.** Convert the `ST_*.png` tiles to WebP (or
   optimized PNG) — typically a large size win for photographic tile art. Keep
   PNG fallbacks only if any target browser needs them (modern evergreen
   browsers all support WebP, so likely not). This is the highest
   value-to-effort item and requires **no component changes** if filenames are
   reused.
3. **Enable lazy loading (only if step 1 justifies it).** Two options:
   - **Lowest-churn:** keep CSS backgrounds, but only set `background-image` for
     hexes that are actually populated (a placed system or the Mecatol fallback).
     Empty slots already resolve to `ST_0.png`; rendering those with a CSS color
     instead of an image removes a chunk of requests on a sparse board.
   - **Native lazy loading:** swap the CSS background for an `<img loading="lazy"
     decoding="async">` inside each hex. This gets real viewport-based lazy
     loading but touches `Board.module.css` (the hex sizing currently assumes a
     background) and must preserve the `:root` hex vars + `[data-position]`
     layout ported verbatim in Phase 5. Higher churn — only do it if the board is
     ever scrolled/offscreen at mount, which on the current single-screen layout
     it mostly isn't.
4. **Optional:** add `<link rel="preload">` for the handful of always-visible
   tiles (Mecatol) if compression alone leaves a visible pop-in.

### Caveats / decisions

- **CSS background vs `<img>`** is the core trade-off. Recommendation: do the
  compression (step 2) unconditionally; do lazy loading (step 3) only if the
  measured payload is large *and* the board renders partly offscreen. Don't
  refactor the ported hex CSS for a board that already fits one screen.
- Keep the same filenames on conversion so `tileIdFor()` needs no change; if
  extensions change (`.png`→`.webp`), that string is built in one place
  ([Board.tsx:79](../frontend/src/components/Board/Board.tsx#L79)) and in the
  Fleet Manager's hex click art — grep for `ST_` before renaming.

### Testing

- Existing `Board.test.tsx` (37 hexes, tile-image painting, Mecatol fallback)
  must stay green; update the expected URL if the extension changes.
- Manual: visual diff of the board before/after on a built, demo-loaded board.

### Acceptance

- Board systems-image payload measurably smaller (record before/after bytes).
- Board renders identically; demo board + Fleet Manager hexes unchanged.
- `Board.test.tsx` green.

---

## Plan 6B — AI Request Payload Slimming (prune → compact → TOON)

### Current state

Strategy and move prompts serialize the **entire** board graph with
`json.dumps(game_json, indent=2)`:

- [strategic_plan.py:30](../core/service/ai/prompts/strategic_plan.py#L30)
- [tactical_move.py](../core/service/ai/prompts/tactical_move.py) (same pattern)

`game_json` comes from the model `to_json()` methods and includes data the LLM
likely doesn't need: `system.name` (redundant with `tile_id`), full
`adjacent_tiles` string arrays on all 37 tiles, and null/empty systems. There is
already a developer TODO acknowledging the payload should differ for the LLM:
[system.py:31](../core/models/system.py#L31) — `#todo: make a different set of
to_json methods for passing to LLM`.

These two calls use the largest token budgets (`STRATEGY_MAX_TOKENS` /
`MOVE_MAX_TOKENS` = 12000), so payload size hits cost and latency hardest here.

### Goal

Reduce the board-state prompt size **measurably**, in three stacking steps, with
a token-count + quality gate before each step ships.

### Approach — three measured steps

**Step 1 — Prune (biggest win, zero new dependency).**
Add an LLM-oriented serialization (the `to_json` variant the
[system.py:31](../core/models/system.py#L31) TODO calls for) rather than mutating
the existing `to_json()` (which the API contract / frontend depend on — do **not**
change it). Candidate fields to drop or shrink for the LLM payload:
- `system.name` (implied by `tile_id`),
- `adjacent_tiles` — either drop, or compute adjacency once at top level instead
  of repeating per tile,
- entirely empty tiles (no system) — omit or collapse,
- null `fleet` / empty `planets` — omit keys rather than emit `null`.
Keep everything strategically meaningful: tile_id, anomaly, wormhole, planet
resources/influence/trait/tech_specialty/legendary, fleets, ground forces,
players.

**Step 2 — Compact.** Drop `indent=2` (use compact separators). Free, immediate.

**Step 3 — TOON encode.** Replace `json.dumps(...)` with a TOON encoder over the
pruned structure. Confirmed feasible: maintained Python encoders exist
(`python-toon`, `toon-py`, `toon-encoder`; an official `toon-format/toon-python`
is forthcoming). **Start with `python-toon`** (bidirectional, active) and pin a
version; migrate to the official package when it ships. Verify license + recent
commit activity before pinning.

### Why only moderate (not 60%) savings here

The board is a **37-row uniform-at-the-top array** (TOON's strength → declares
`designation`/`system`/… keys once instead of 37×), but each tile is **nested**
(`system` object, variable-length `planets` sub-array, frequent nulls). So expect
roughly **20–40%** on the board payload, not the 60% headline TOON quotes for flat
tables. Pruning (step 1) both saves tokens directly **and** flattens the
structure, which makes step 3 more effective — they compound.

### Measurement & eval gate

- Add a small measurement harness (a script or test helper) that runs a couple of
  real boards through each serialization and reports the provider token count
  (use the provider tokenizer, not a char estimate). Capture before/after per
  step.
- **Quality gate before shipping step 3:** run strategy + move on 2–3 real boards
  with a live key and eyeball that output quality holds with the TOON payload.
  This is the one step that needs a live key, and it guards the only real risk
  (a given model parsing nested TOON less reliably than JSON — benchmarks say
  accuracy holds or improves, but verify on *this* data).

### Where the change lives

All board serialization is centralized in the two prompt builders, so the swap is
localized — build the LLM-payload serializer once (e.g. a
`to_llm_json()`/`to_llm_payload()` helper or a `core/service/ai/serialize.py`
module) and call it from both `build_messages` functions. The encoder choice sits
behind that one helper, so JSON↔TOON is a one-line switch (handy for the eval and
for rollback).

### Caveats / decisions

- **Do not touch the existing `to_json()` methods** — they back the stable M5 API
  contract and the frontend. Add a parallel LLM serializer.
- Keep a config/env switch to fall back to compact JSON if a provider misbehaves
  with TOON in production.
- "Cap prompt length / summarize large inputs" from the plan is **not needed** —
  board state is bounded at 37 tiles.

### Testing

- Unit test the pruning serializer (drops the right fields, keeps the meaningful
  ones, handles empty/null systems).
- Unit test that `build_messages` emits the chosen format and still includes
  faction + key board facts.
- Token-count assertion (regression guard: pruned+TOON payload is smaller than
  the old `indent=2` JSON for a sample board).
- Existing strategy/move job tests stay green (they mock the provider, so they
  only need the new payload to be well-formed).

### Acceptance

- Strategy/move board payloads measurably smaller (record token counts per step).
- Output quality verified on real boards before TOON ships (eval gate).
- Existing `to_json()` API output unchanged; backend tests green.

---

## Plan 6C — Deterministic Battle Simulator (+ optional LLM explanation)

### Current state

The battle calculator is **100% an LLM call**: `get_tac_calc_response` sends the
fleet JSON to the model and asks it to compute the win % and recommend fleet
compositions ([service.py:176](../core/service/ai/service.py#L176),
[tactical_calculator.py](../core/service/ai/prompts/tactical_calculator.py)). The
worker wraps the text as `{ "calc_results": text }`
([jobs.py:91](../core/jobs.py#L91)) and the frontend renders it as a plain-text
fallback ([JobResultView.tsx:30](../frontend/src/components/JobResultView/JobResultView.tsx#L30)).
There is **no combat simulator anywhere in the repo** — so the product pitch's
"deterministic combat simulation" (plan line 50) is currently aspirational.

LLMs are unreliable at exactly this kind of multi-step dice arithmetic, and it
costs tokens + latency for a worse, non-reproducible answer.

### Target architecture

> **Deterministic math by default; LLM only as an opt-in explanation layer.**

```
Frontend (BattleCalculator)
  ├─ [always] POST /api/tactical/simulate/  → deterministic sim (fast, sync, NO key)
  │     → { win_probability, minimum_fleet, recommended_fleet, breakdown }
  └─ [if "Get Oracle's recommendation" checked]
        → create tactical AI job, now seeded WITH the computed numbers
        → LLM explains the result in plain language (does NOT compute it)
```

This is the hybrid "deterministic simulation + LLM explanation" story the plan's
Optional Enhancements already gesture at ("Tactical Calculator Integration", plan
line ~992).

### 6C.1 — Backend: the simulator

New module, e.g. `core/service/combat/` (sibling of `core/service/ai/`):

- **Unit stats table.** Base TI4 (PoK) combat values. *Base/un-upgraded* values —
  see caveats for tech:

  | Unit | Combat (hit on ≥) | Dice | Special |
  |---|---|---|---|
  | Fighter | 9 | 1 | — |
  | Destroyer | 9 | 1 | Anti-Fighter Barrage 9 ×2 |
  | Cruiser | 7 | 1 | — |
  | Carrier | 9 | 1 | — |
  | Dreadnought | 5 | 1 | Sustain Damage; Bombardment 5 |
  | War Sun | 3 | 3 | Sustain Damage; Bombardment 3 ×3 |
  | Flagship | ⚠️ faction-specific | varies | varies — **see caveat** |
  | PDS | — | — | Space Cannon 6 (no space-combat dice) |
  | Infantry (ground) | 8 | 1 | — |
  | Mech (ground) | 6 | 1 | Sustain Damage (most factions) |
  | Space Dock | — | — | no combat power |

- **Combat sequence** (in rules order), driven by the existing `force_data`
  shape (`friendly_fleet`, `enemy_fleet`, `friendly_ground_forces`,
  `enemy_ground_forces_and_structures`):
  1. Space Cannon Offense (enemy PDS fires at attacker) — once.
  2. Anti-Fighter Barrage (destroyers) — first round only.
  3. Space combat rounds: both roll, assign hits, sustain-damage option, until
     one fleet is eliminated.
  4. Bombardment (if attacker wins space and enemy holds ground) — once.
  5. Ground combat (invasion) until one side's ground forces are gone.
  - Victory condition: clear the system; **if** the enemy has ground forces,
     also take the planet (matches the current prompt's stated rule). No friendly
     ground vs. enemy ground ⇒ 0% (can't take the planet).

- **Probability engine: Monte Carlo.** Run N trials (e.g. 10k–50k) with random
  dice; `win_probability = wins / N`. Simple, fast (well under a second in pure
  Python; can vectorize with numpy if needed), and seedable for reproducible
  tests. (An exact convolution/Markov engine is possible but more complex —
  Monte Carlo is the right first cut; the "deterministic" claim is about the
  rules being codified + reproducible, not about avoiding sampling.)

- **Fleet recommendation search.** Find the minimum fleet for ≥50% and a stronger
  fleet for ≥80% by searching compositions, using the simulator as the evaluation
  function. Start greedy/incremental (add the most resource-efficient unit, re-sim,
  stop at threshold) and **bound the search space** — this is exactly where the
  plan's "bound recommendation search / memoize repeated fleet states / cache
  common calculations" bullets become real, worthwhile optimizations (memoize
  sim results by composition key).

- **Endpoint.** New **synchronous** `POST /api/tactical/simulate/` (it's
  milliseconds — it must NOT go through the async job queue, which exists only to
  move *slow provider* calls off the request path). Returns structured JSON.

### 6C.2 — Frontend: the checkbox

- Add a checkbox **"Get Oracle's recommendation"** to `BattleCalculator.tsx`
  ([BattleCalculator.tsx](../frontend/src/features/battleCalculator/BattleCalculator.tsx)).
- **Unchecked (default):** clicking Calculate calls `/api/tactical/simulate/`
  only → instant, deterministic result, **no API key required**. This is a major
  UX win: the calculator becomes fully usable with zero setup, and demo mode for
  it becomes trivial (the math just runs).
- **Checked:** after (or alongside) the deterministic result, fire the existing
  `tactical` AI job — but seeded with the computed numbers — to get a
  natural-language explanation. Gated on credentials exactly as today
  (`getCredentials('tactical')`); if no creds, show the existing guidance instead
  of failing.
- **Result rendering.** Replace the plain-text `calc_results` fallback with a
  structured battle-result card: win % shown prominently, two recommended-fleet
  lists, optional combat breakdown, and — when the box was checked — the LLM
  explanation appended below (with the demo label when applicable). Extend
  `JobResultView` or add a dedicated `BattleResult` card.

### 6C.3 — Refining the LLM call

Once the math is deterministic, the LLM's job changes from *compute* to
*explain*. Rewrite [tactical_calculator.py](../core/service/ai/prompts/tactical_calculator.py):

- **New input:** the `force_data` **plus** the computed `win_probability`,
  `minimum_fleet`, and `recommended_fleet`.
- **New instruction:** explain *why* the odds are what they are, the key threats,
  and tactical advice (e.g. which units to commit, when to retreat) — explicitly
  **do not recompute** the probability; treat the simulator numbers as ground
  truth.
- **Consider structured output.** The current feature returns a rigid text block
  parsed by the frontend; with the numbers now coming from the simulator, the LLM
  side can become a proper structured schema (e.g. `BattleExplanation` with
  summary / key_factors / threats / advice), rendered as an AdvisorCard like the
  other features — a cleaner result than the legacy text format. This is optional
  but recommended; bump `PROMPT_VERSIONS["tac_calc"]`.
- This is the "deterministic sim + LLM narration" pairing that makes the resume
  bullet ("Optimized combat calculator workflows … probability thresholds …") true.

### 6C.4 — Demo mode simplification

The deterministic math is free and keyless, so "Load Example Battle" can compute
the result live instead of serving a cached one. The cached demo response
(`core/demo/responses/sample_battle_result.json`) is then only needed for the
**optional LLM explanation** path — simplify accordingly.

### Design decisions & caveats (resolve before building)

- **⚠️ Flagship is faction-specific.** There is no single flagship stat line —
  combat value, dice, and abilities vary per faction (and some have unique
  effects). Options: (a) require a faction/flagship selection when a flagship is
  present and look up real stats; (b) use a configurable "generic flagship"
  approximation and label it as such; (c) exclude flagship from the deterministic
  sim v1 and note it. **Recommend (b) for v1, (a) as a follow-up.** Decide
  explicitly — this is the single biggest correctness gap.
- **⚠️ Tech upgrades not modeled.** The app tracks no unit upgrades, so the sim
  uses base stats (e.g. Cruiser II's 6 / Fighter II's 8 won't be reflected). Call
  this out in the UI ("base unit stats; upgrades not modeled") or add an
  upgrade-toggle as a follow-up.
- **⚠️ Rules nuance to get right.** Codifying combat deterministically will surface
  ambiguities the LLM prompt papered over — e.g. the current prompt says
  bombardment is blocked "unless the enemy has a PDS," but in the actual rules it
  is **Planetary Shield** that blocks bombardment, not PDS. Use building the
  simulator as the moment to verify each interaction (AFB timing, PDS fires once,
  sustain-damage assignment order, bombardment vs. Planetary Shield) against the
  rules rather than inheriting the prompt's approximations.
- **Where the sim runs: backend (recommended).** Python backend keeps the logic
  testable in the existing test suite and supports the "productionized backend
  combat simulator" portfolio story. A frontend TS sim would be even faster and
  offline-capable but duplicates rules logic and moves it out of the tested
  Python core. Recommend backend.
- **Monte Carlo vs exact.** Monte Carlo first (simpler, fast enough). Note exact
  computation as a possible later precision upgrade.

### Testing (ties into M8)

- **Known-scenario tests** are the heart of this: hand-computable or
  reference battles with expected win-rate ranges (seeded RNG for determinism),
  plus edge cases (no friendly ground vs. enemy ground ⇒ 0%; space dock has no
  combat power; PDS fires once; AFB only round one).
- Unit tests for each combat phase in isolation.
- Recommendation search tests (returns a fleet that actually meets the threshold;
  terminates; respects bounds).
- Endpoint smoke test (`/api/tactical/simulate/` returns structured result fast,
  no key).
- Frontend: checkbox off → sim-only path (no job, no creds needed); checkbox on →
  sim + LLM job; result card renders win % + fleets; demo path.

### Acceptance

- Battle calculator returns deterministic, reproducible odds + fleet
  recommendations **without an API key**.
- "Get Oracle's recommendation" checkbox gates the LLM explanation; the LLM no
  longer computes odds.
- Known-scenario combat tests pass.
- Product pitch's "deterministic combat simulation" is now real.

---

## Cross-cutting acceptance (Milestone 6 done when)

- Battle calculator feels instant for normal scenarios (deterministic path).
- Board rendering payload reduced; renders identically.
- Strategy/move AI prompts no longer ship oversized board payloads (measured).
- Any remaining slow operation (the optional LLM explanation) has a clear loading
  state — already provided by `useAiJob` + `LoadingState`.
