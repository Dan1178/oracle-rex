# Oracle Rex Upgrade Plan

## Purpose

Modernize Oracle Rex from an older AI demo into a polished, reliable, portfolio-ready AI strategy assistant for Twilight Imperium.

The goal is **not** to add a large number of new features. The priority is to make the existing app reliable, maintainable, easier to demo, and technically impressive as a resume/portfolio project.

## Current Major Features

Oracle Rex currently includes:

1. **TI Rules Chatbot**
   - AI chatbot intended to answer Twilight Imperium rules questions.
   - Currently uses simple prompt instructions.

2. **Plan Suggester from TTS String**
   - User inputs a Tabletop Simulator string.
   - App displays the board.
   - User selects their faction.
   - AI suggests general playstyle, opening strategy, first few turns, and related advice.

3. **Tactical Move Suggester**
   - Similar to the plan suggester.
   - User inputs ships and structures on each tile.
   - AI suggests a move.

4. **Battle Calculator**
   - User sets counts for friendly and enemy ships/structures.
   - App returns estimated victory chance.
   - App recommends minimum fleet composition for roughly 60% victory chance.
   - App recommends stronger composition for roughly 80%+ victory chance.

## Core Upgrade Goals

The main upgrade goals are:

1. Upgrade deprecated AI model/API usage and response objects.
2. Convert frontend from plain JavaScript to React/TypeScript.
3. Make AI API calls work reliably on Render without timing out.
4. Improve UX, visual theme, and demo flow.
5. Fix mismatched map/data issues by checking against Milty Draft source data.
6. Improve performance where practical.
7. Add a public-safe demo mode that does not require API keys or user-provided TTS strings.

## Recommended Product Direction

Position Oracle Rex as:

> A productionized AI decision-support app for Twilight Imperium, combining structured game-state parsing, validated board data, deterministic combat simulation, and LLM-powered strategic recommendations.

Avoid presenting it as just a chatbot or API wrapper.

## Architectural Principles

Follow these principles during the upgrade:

- Keep existing functionality working while modernizing.
- Avoid large feature expansion until reliability and demo usability are solved.
- Prefer structured AI responses over freeform text blobs.
- Separate prompts, model calls, response schemas, and UI rendering.
- Treat long-running AI calls as asynchronous jobs or streaming responses, not normal blocking web requests.
- Make the public demo safe by default: no owner-paid API key exposed to anonymous users.
- Provide sample scenarios so non-TI interviewers can understand the app quickly.
- Add tests around parsing, data correctness, and calculator behavior.

---

# Milestone 1 — Stabilize Backend and AI Integration

## Objective

Make all existing AI-powered features work again with current model APIs and stable response handling.

## Tasks

### 1. Audit Existing AI Usage

- Locate all AI API calls.
- Identify deprecated model names.
- Identify outdated SDK usage.
- Identify outdated response parsing logic.
- Identify duplicated prompt/model logic.

Deliverable:

- A short internal note or code comment listing all AI call sites and what each one powers.

### 2. Create Centralized AI Service Layer

Create a dedicated backend AI service structure. Exact folder names can be adjusted to match the existing project.

Suggested structure:

```text
ai/
  clients/
    openai_client.py
    anthropic_client.py
  prompts/
    rules_chat.py
    strategic_plan.py
    tactical_move.py
  schemas/
    rules_answer.py
    strategic_plan.py
    tactical_move.py
  service.py
```

Requirements:

- Model/provider selection should be centralized.
- Prompt text should not be scattered through views/controllers.
- Each feature should call a service function rather than directly calling provider SDKs.
- Add one clear place for model config, token limits, and timeout settings.

### 3. Add Structured Response Schemas

Use Pydantic or equivalent validation for AI outputs.

Suggested schemas:

#### Rules Answer

```json
{
  "answer": "string",
  "assumptions": ["string"],
  "rule_basis": ["string"],
  "caveats": ["string"],
  "needs_exact_text": false
}
```

#### Strategic Plan

```json
{
  "summary": "string",
  "faction_read": "string",
  "opening_priorities": ["string"],
  "round_one_plan": "string",
  "tech_path": ["string"],
  "expansion_targets": ["string"],
  "risks": ["string"],
  "mistakes_to_avoid": ["string"]
}
```

#### Tactical Move Recommendation

```json
{
  "recommended_move": "string",
  "reasoning": "string",
  "expected_benefit": "string",
  "combat_risk": "string",
  "alternative_conservative_move": "string",
  "alternative_aggressive_move": "string",
  "assumptions": ["string"]
}
```

Requirements:

- Validate AI responses before returning to the frontend.
- If validation fails, return a graceful error instead of crashing.
- Log validation failures for debugging.

### 4. Improve Error Handling

Add consistent error handling for:

- Missing API keys.
- Invalid API keys.
- Provider timeout.
- Provider rate limit.
- Malformed AI response.
- Render/backend timeout.
- User input validation failure.

User-facing errors should be clear and non-technical when possible.

Example:

```text
The AI response took too long or failed to complete. Try a smaller scenario, use demo mode, or retry with a faster model.
```

## Acceptance Criteria

- All existing AI features use the centralized AI service.
- Deprecated model/API usage is removed.
- AI responses are validated before returning to the frontend.
- Missing/invalid keys and provider failures produce usable errors.
- Existing features still work locally.

---

# Milestone 2 — Fix Render AI Timeout Problem

## Objective

Make AI requests reliable on Render by avoiding long blocking web requests.

## Recommended Approach

Implement asynchronous AI jobs with polling.

Flow:

```text
Frontend submits request
Backend creates AI job record
Worker processes job
Frontend polls job status
Frontend renders result when complete
```

## Decision (locked 2026-06-14)

**Approach: DB-backed AI job queue with Django-Q2 (ORM broker) + a dedicated Render
background worker, backed by Postgres. Frontend polls job status.**

Rationale (see options considered below): the live-AI path is low-volume (BYOK and
controlled private demo; public demo serves cached responses), so this is a
timeout problem, not a throughput problem. The fix is to stop holding the
browser→backend request open. Django-Q2's ORM broker means **no Redis** — the
shared state between web and worker is the database itself. Moving from SQLite to
Postgres is the enabling change: it removes SQLite's file-lock contention between
the two processes and matches production. User already runs Postgres at work, so
the local two-process dev loop is acceptable.

### Consequences for local development

- Run **two processes**: `python manage.py runserver` (web) and
  `python manage.py qcluster` (worker). A Procfile / `honcho` one-liner should
  launch both so the worker isn't forgotten (queued jobs hang silently otherwise).
- Local Postgres required (Docker is fine). `DATABASES` becomes env-driven
  (`DATABASE_URL` via `dj-database-url`); keep a sensible default.
- `db.sqlite3` stops being the committed source of truth — seed via migrations /
  `reset_database_api` flow.

### Options considered

- **Option A — Celery + Redis.** Standard, strongest resume keyword, but on Render
  means a Redis add-on *plus* a worker dyno (more cost/ops) and free-tier worker
  spin-down. Over-engineered for this load. Rejected.
- **Option B — RQ / Huey / Django-Q.** Sweet spot. **Django-Q2 with the ORM broker
  chosen** specifically to avoid Redis while keeping a real worker + job story.
- **Option C — Streaming responses.** Right tool for the **rules chatbot** UX, wrong
  tool for the structured strategy/move/calc features (single validated JSON object
  via `with_structured_output`). Deferred — add later for chat only, not as the
  primary timeout fix.
- **In-process threads (no separate worker).** Considered as the zero-local-change
  fallback; rejected in favor of the durable worker now that Postgres is in.

### Render-specific notes

- Raise/avoid gunicorn worker timeout: the create-job request must return
  immediately, so the long provider call never runs inside an HTTP request.
- Worker runs as a separate Render **Background Worker** service pointed at the same
  Postgres instance.

### BYOK key handling (decided 2026-06-14)

BYOK keys are routed through the async worker too (BYOK is most of the live-AI
traffic, so it must get the timeout fix). The key is **encrypted before it enters
the Django-Q task/broker** (e.g. Fernet keyed off a server secret) and decrypted in
the worker. It is **never** persisted on the `AIJob` row. This avoids plaintext user
keys sitting in the Postgres broker table.

### Build order

0. **Postgres switch** — `dj-database-url` + `psycopg`, env-driven `DATABASES`;
   provision Render Postgres. Standalone, verifiable on its own.
1. **`AIJob` model** — fields/states per spec above; register in admin.
2. **`run_ai_job(job_id)`** in `core/jobs.py` — routes by `feature_type` to
   `service.py`, stores result, maps `AIServiceError` to terminal states. Unit-test
   with mocked `get_chat` before adding the queue.
3. **Wire Django-Q2** — ORM broker, `Q_CLUSTER`, migrate; prove enqueue→complete
   from the shell with `qcluster` running.
4. **Endpoints (additive)** — per-feature POST create (returns `{job_id}`) +
   `GET /api/jobs/<id>/`. Encrypt BYOK key into the task arg. Keep old sync
   endpoints alive until frontend cutover.
5. **Frontend polling** — plain-JS handlers submit→poll→render the `structured`
   field; add per-feature loading copy.
6. **Timeout/failure + logging** — Q task timeout → `status=timeout`; log duration
   and provider errors.
7. **Render deploy + cleanup** — add Background Worker service (`manage.py
   qcluster`), Procfile/honcho for local, remove dead sync endpoints, retire legacy
   `core/service/ai_service.py`.

Opportunistic: stamp `prompt_version` on each job now (seeds the optional
prompt-versioning feature for free).

## Tasks

1. Add an AI job model/table if using database-backed status tracking.
2. Add endpoint to create AI jobs.
3. Add endpoint to check AI job status.
4. Add worker process to complete AI jobs.
5. Update frontend to show job progress/loading state.
6. Add timeout and failure state to jobs.
7. Log job duration and provider errors.

Suggested job states:

```text
queued
running
completed
failed
timeout
validation_failed
```

Suggested job fields:

```text
id
feature_type
input_payload_json
result_payload_json
status
error_message
model_provider
model_name
prompt_version
created_at
started_at
completed_at
```

## Acceptance Criteria

- AI requests no longer rely on one long blocking request from browser to backend.
- Render-hosted app can complete AI features reliably.
- Frontend shows clear loading, success, and failure states.
- Job failures are visible in logs or admin/debug output.

---

# Milestone 3 — Demo Mode and Portfolio Usability

## Objective

Make the hosted app usable by interviewers without requiring API keys or Twilight Imperium setup knowledge.

## Required Modes

Implement or clearly support three modes:

### 1. Demo Mode

- Default public experience.
- No API key required.
- Uses sample scenarios and cached/pregenerated AI responses.
- Safe for public hosting.

### 2. BYOK Mode

- User provides their own API key.
- Existing settings page can remain, but polish the UX.
- Clearly explain that keys are used for live AI requests.

### 3. Private Live Demo Mode

Optional but useful.

- Owner-controlled access for interviews.
- Could use an access code or environment flag.
- Uses backend API key with strict limits.

## Demo Scenario Requirements

Every major feature should be usable in one click.

### Rules Chatbot

Add prompt chips such as:

```text
What happens if two players have abilities that trigger at the same timing window?
Can I retreat from space combat if I have no ships left?
How does production capacity work?
Explain this rule like I’m new to TI.
```

### Strategic Plan Suggester

Add:

```text
Load Sample Milty Draft Board
```

Sample should:

- Load a valid board.
- Render correctly.
- Auto-select or suggest a faction.
- Allow user to generate or view a saved strategy response.

### Tactical Move Suggester

Add:

```text
Load Tactical Puzzle
```

Sample should:

- Include a clear board/fleet state.
- Present a meaningful strategic decision.
- Return a saved or live recommendation.

### Battle Calculator

Add:

```text
Load Example Battle
```

Sample should preload friendly/enemy fleets and immediately make the calculator understandable.

## Cached AI Responses

For demo mode, store pregenerated responses as JSON.

Suggested structure:

```text
demo/
  scenarios/
    sample_opening_board.json
    sample_tactical_puzzle.json
    sample_battle.json
  responses/
    sample_rules_answer.json
    sample_opening_strategy.json
    sample_tactical_recommendation.json
```

The UI may simulate a short loading state, but should clearly label the result as a demo response.

Example label:

```text
Demo response generated from a saved scenario. Use Live AI Mode to generate a fresh response.
```

## Public API Key Safety

Do not allow unlimited anonymous access to owner-paid backend AI keys.

If private live demo mode is implemented, add:

- access code or token
- request limit
- max output token cap
- logging
- cheap default model
- expiration or manual reset

## Acceptance Criteria

- An interviewer can open the app and try each major feature without an API key.
- An interviewer does not need to know what a TTS string is.
- Demo mode cannot run up owner AI costs.
- Live AI remains available through BYOK or controlled private access.

---

# Milestone 4 — Data Correctness and Validation

## Objective

Fix mismatched planet/system/tile data and make future mismatches detectable.

## Tasks

### 1. Locate Current Game Data

Identify current sources for:

- systems
- planets
- tile IDs
- anomalies
- wormholes
- legendary planets
- home systems
- hyperlanes if applicable
- graphic asset mappings

### 2. Compare Against Milty Draft Source Data

Use the Milty Draft repo data as the canonical reference where appropriate.

Tasks:

- Pull or copy relevant Milty Draft data.
- Compare current Oracle Rex tile/system/planet mappings against source data.
- Identify mismatches.
- Fix mismatched records.

### 3. Normalize Internal Data

If current data is scattered, consolidate it.

Suggested structure:

```text
data/
  source/
    milty_draft_tiles.json
  normalized/
    systems.json
    planets.json
    factions.json
  validators/
    validate_tile_planet_mapping.py
    validate_tts_string_parser.py
```

### 4. Add Validation Scripts

Add scripts/tests that catch:

- tile references nonexistent planets
- planet references nonexistent system
- tile image does not match system data
- duplicated system IDs
- invalid wormhole values
- missing planet traits/resources/influence
- invalid TTS parser outputs

## Acceptance Criteria

- Known mismatches are fixed.
- Data validation script can be run locally.
- Tests or scripts fail clearly when a mapping is invalid.
- Board rendering matches parsed game state.

---

# Milestone 5 — React/TypeScript Frontend Migration

## Objective

Replace the plain JavaScript frontend with a modern React/TypeScript frontend.

## Recommended Stack

- React
- TypeScript
- Vite
- TanStack Query or equivalent for API state
- CSS Modules, Tailwind, or another simple styling system
- Optional: Zod for frontend schema validation

## Suggested Structure

```text
frontend/
  src/
    api/
      oracleRexApi.ts
    components/
      Board/
      Chat/
      FleetCalculator/
      LoadingState/
      ErrorState/
      AdvisorCard/
    features/
      rulesChat/
      strategicPlan/
      tacticalMove/
      battleCalculator/
      demoMode/
    types/
      game.ts
      ai.ts
      demo.ts
```

## Migration Strategy

Do not rewrite every feature at once unless the existing frontend is extremely small.

Recommended order:

1. Create React shell and routing/tab layout.
2. Build shared API client.
3. Build shared loading/error/result components.
4. Migrate Battle Calculator.
5. Migrate Rules Chatbot.
6. Migrate Strategic Plan Suggester.
7. Migrate Tactical Move Suggester.
8. Remove or retire old plain JavaScript frontend.

## UI Requirements

- Every async call should have loading, success, and error states.
- AI results should render as structured cards, not raw text blobs.
- Demo mode should be obvious and easy to use.
- BYOK/live mode should be available but not required for exploration.

## Acceptance Criteria

- React frontend covers all existing major features.
- Plain JS frontend is removed or no longer primary.
- API contracts are typed in frontend code.
- App remains deployable on Render.

---

# Milestone 6 — UX and Visual Theme Polish

## Objective

Make Oracle Rex feel like a coherent AI strategy dashboard rather than a collection of forms.

## Suggested Theme Direction

Use a polished sci-fi strategy/command-dashboard aesthetic.

Possible direction:

> Imperial war room / galactic command dashboard.

Avoid excessive visual noise. Prioritize readability.

## UX Improvements

### Shared Advisor Response Layout

Use a consistent card layout for AI output.

Suggested sections:

```text
Recommendation Summary
Primary Objective
First Actions
Risks
Alternative Line
Assumptions
```

### Better Empty States

Each tab should explain:

- what it does
- what input is needed
- how to try it with sample data

### Better Loading States

Use feature-specific loading copy.

Examples:

```text
Analyzing board state...
Evaluating tactical options...
Calculating combat odds...
Consulting rules advisor...
```

### Better Error States

Errors should provide next steps.

Example:

```text
The AI request failed. You can retry, switch to demo mode, or provide your own API key in Live AI Mode.
```

### Portfolio-Friendly Landing Page

Add a short landing page or intro section:

```text
Oracle Rex is an AI strategy assistant for Twilight Imperium. It parses board states, renders game maps, estimates combat odds, and generates faction-specific strategy recommendations.
```

Include buttons:

```text
Try Demo Scenario
Open Rules Advisor
Open Battle Calculator
Use Live AI Mode
```

## Acceptance Criteria

- App has a coherent visual identity.
- A new visitor can understand the app within 30 seconds.
- All tabs have sample/demo entry points.
- AI responses are easy to scan.

---

# Milestone 7 — Performance Improvements

## Objective

Improve runtime performance where it materially affects UX.

## Focus Areas

### 1. Battle Calculator

Investigate current algorithm and identify bottlenecks.

Possible improvements:

- memoization for repeated fleet states
- cache common calculations
- reduce unnecessary repeated simulations
- bound fleet recommendation search space
- move expensive calculations to backend job if needed
- show progress/loading for expensive recommendations

### 2. Board Rendering

Investigate:

- repeated DOM/render work
- large image assets
- inefficient tile redraws
- unnecessary reparsing of TTS strings

Possible improvements:

- cache parsed board state
- memoize tile components in React
- optimize image loading
- lazy load non-critical assets

### 3. AI Request Payloads

Reduce unnecessary prompt size.

Tasks:

- send structured board state instead of verbose raw text where possible
- exclude irrelevant game data from prompts
- cap prompt length
- summarize large inputs before final AI call if needed

## Acceptance Criteria

- Battle calculator feels responsive for normal scenarios.
- Board rendering is smooth enough for demo use.
- AI prompts do not include unnecessary large payloads.
- Any remaining slow operations have clear loading states.

---

# Milestone 8 — Tests and Quality Gates

## Objective

Add enough testing to make the modernization credible and safer.

## Minimum Useful Tests

### Backend Tests

- TTS string parser test with sample input.
- System/planet/tile mapping validation test.
- AI schema validation test with sample response.
- API smoke tests for major endpoints.
- Battle calculator known-scenario tests.

### Frontend Tests

If practical:

- basic component tests for result cards
- API client tests/mocks
- simple smoke test that sample demo scenario renders

## Validation Commands

Add clear commands to README or project docs.

Example:

```bash
pytest
python data/validators/validate_tile_planet_mapping.py
npm test
npm run build
```

## Acceptance Criteria

- Core parser/data/calculator tests pass locally.
- Frontend production build succeeds.
- README explains how to validate the app.

---

# Milestone 9 — Portfolio Packaging

## Objective

Make the upgraded project easy to understand for recruiters/interviewers.

## Tasks

### 1. Update README

README should include:

- short project description
- screenshots
- demo mode explanation
- live AI/BYOK explanation
- architecture overview
- major features
- local setup
- deployment notes
- testing commands

### 2. Add Screenshots

Capture:

- landing/demo page
- board visualization
- strategy recommendation
- tactical move recommendation
- battle calculator result
- rules chatbot answer

### 3. Record Short Walkthrough Video

Target length: 60–90 seconds.

Show:

1. Load sample board.
2. Select faction.
3. View strategy plan.
4. Open tactical scenario.
5. Open battle calculator.
6. Mention live AI mode uses BYOK or controlled demo access.

### 4. Add Architecture Diagram

Simple diagram is enough.

Example:

```text
React Frontend
  -> Django API
    -> AI Job Queue / Worker
      -> Provider SDK
    -> Game Data Validators
    -> Combat Simulator
    -> Database
```

### 5. Prepare Resume Bullets

Potential bullets:

```text
Modernized Oracle Rex, a Twilight Imperium AI strategy assistant, by migrating the frontend from vanilla JavaScript to React/TypeScript, upgrading deprecated LLM integrations, and implementing structured AI response schemas for rules, strategy, and tactical recommendations.
```

```text
Reworked long-running AI requests for Render deployment using asynchronous job processing and status polling, reducing request timeouts and improving reliability of hosted inference workflows.
```

```text
Built validation scripts and tests to reconcile system, planet, and board-state data against canonical Milty Draft data, improving correctness of generated map displays and AI strategy context.
```

```text
Optimized combat calculator workflows with reusable simulation logic, probability thresholds, and fleet recommendation outputs for tactical decision support.
```

## Acceptance Criteria

- Portfolio page can link to app, GitHub, screenshots, and walkthrough video.
- Public demo works without API keys.
- Technical story is clear to a non-TI interviewer.

---

# Optional Enhancements

Do these only after the core modernization is complete.

## Saved Scenarios

Allow users to save/load:

- board state
- faction
- tactical scenario
- battle calculator setup
- AI result

This is the best optional feature because it improves all existing workflows and adds a full-stack CRUD element.

Suggested model:

```text
SavedScenario
  id
  name
  scenario_type
  payload_json
  notes
  created_at
  updated_at
```

## Debug/Admin Panel

Useful for development.

Show:

- latest AI jobs
- failed responses
- parsed board state JSON
- raw model response
- validation errors
- prompt version
- model used

## Prompt Versioning

Track prompt versions such as:

```text
rules_chat_v2
strategic_plan_v3
tactical_move_v1
```

Log prompt version with each AI job.

## Tactical Calculator Integration

Use battle calculator outputs inside tactical move suggestions.

Example:

```text
Recommended attack has an estimated 68% win chance based on current fleet inputs.
```

This creates a strong hybrid deterministic simulation + LLM explanation story.

---

# Explicit Non-Goals for This Upgrade

Avoid these unless specifically needed later:

- Full user account system.
- Large-scale multiplayer features.
- Full TI card/rule database unless already available and manageable.
- Unlimited public live AI access using owner-paid API keys.
- Major new AI tabs before stabilizing existing features.
- Overly complex visual redesign before reliability is fixed.

---

# Recommended Implementation Order for Claude Code

Use this order when working through the project:

1. Audit existing codebase and identify AI call sites, frontend entry points, data files, and deployment config.
2. Modernize AI service layer and response parsing.
3. Add structured schemas and graceful AI error handling.
4. Implement async AI jobs or streaming/polling to solve Render timeouts.
5. Add demo mode with sample scenarios and cached responses.
6. Fix game data mismatches using Milty Draft source data.
7. Add validation scripts/tests for data and parser correctness.
8. Create React/TypeScript frontend shell.
9. Migrate each feature into React one at a time.
10. Improve UX/theme and advisor result cards.
11. Optimize calculator/board rendering performance where needed.
12. Add screenshots, README updates, and portfolio packaging.

---

# Definition of Done

The upgrade is complete when:

- Hosted app works on Render without AI timeout failures during normal use.
- Public demo mode works without API keys.
- Every major feature has a sample scenario.
- Live AI works through BYOK or controlled private access.
- Frontend is React/TypeScript.
- AI outputs are structured and validated.
- Planet/system/tile data mismatches are fixed and covered by validation.
- Battle calculator and board rendering are responsive enough for demo use.
- README, screenshots, and portfolio story are updated.
- Project can be explained as a productionized AI decision-support app, not just a chatbot wrapper.
