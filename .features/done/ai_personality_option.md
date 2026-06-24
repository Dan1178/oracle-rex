# Feature: AI Personality Option

## Status

Planned (sketched 2026-06-22). Not started. Post-core polish.

## Objective

Let the user pick a "personality" for Oracle Rex in Settings, so the AI's
responses take on a flavored voice (a mysterious ancient oracle, a cold hostile
war machine, etc.) while staying just as accurate and helpful. A "None / default"
option keeps the current neutral voice.

This is a tone layer only. It never changes what the AI knows, how correct it is,
or the structured shape of its output. It is a stylistic wrapper on the system
prompt.

## Why it fits

The app is already themed as "Oracle Rex," a sci-fi command console (see
`milestone_7_ux_theme.md`). A selectable AI persona is a cheap, memorable
differentiator that rides on top of the existing prompt layer with no change to
the game logic or schemas.

## Proposed personas

Display names are tentative; the third+ are optional extras.

- **None / Default**: the current neutral, professional voice. No persona applied.
- **Ancient Oracle**: cryptic, archaic, portentous; speaks as an age-old
  intelligence. Leans into the "Oracle" theme.
- **Hostile War Machine** (the "sociopathic terminator" idea): cold, clinical,
  menacing, militaristic. Treats the game as a campaign of annihilation. Still
  gives correct, genuinely useful advice; the menace is purely tonal.
- (Optional) **Snarky Strategist**: dry, sarcastic veteran commander.
- (Optional) **Overeager Cadet**: enthusiastic rookie.

Note on naming: keep shipped display names original (avoid trademarked names like
"Terminator") even if they inspire a persona.

## Hard constraints (non-negotiable)

1. **Accuracy is untouched.** A persona never refuses, never dumbs down, never
   trades correctness for flavor. Each persona preamble ends with an explicit
   guardrail: "Remain accurate and genuinely helpful. The persona affects tone
   only, never correctness or safety."
2. **Structure is untouched.** The structured features (rules, strategy, move)
   return validated Pydantic objects (`RulesAnswer`, `StrategicPlan`,
   `TacticalMove`). The persona colors the prose inside fields (answer, summary,
   reasoning) but must not change field names, JSON shape, or list structure.
   Validation in `service.py` already enforces this; a persona that breaks format
   would just trigger the existing plain-text fallback, so preambles must end by
   reaffirming "still return the required structured fields."
3. **No harmful content.** A "hostile" persona is theatrical menace only. It does
   not produce abuse, slurs, or anything genuinely harmful; it is a board-game
   villain voice.

## Where it plugs in (grounded in the current code)

- Prompts live in `core/service/ai/prompts/*` and each `build_messages(...)`
  returns a list of LangChain messages starting with a `SystemMessage`.
- `core/service/ai/service.py` is the single chokepoint: every feature function
  builds its messages there, then invokes. This is the clean injection point.

### Backend

1. New `core/service/ai/personas.py`: a registry mapping `persona_id` to a short
   system-prompt preamble string (plus the shared guardrail suffix). `"default"`
   maps to no preamble.
2. A helper `apply_persona(messages, persona_id)` that prepends a persona
   `SystemMessage` (or merges it into the leading system message) when the persona
   is not default. Apply it once in `service.py` after each `build_messages(...)`
   call, so all four features get it without touching the prompt modules.
3. Thread `persona` through the service functions (`get_rules_response`, etc.) and
   the job runner (`core/jobs.py` / `run_ai_job`) from the job input payload.
4. Stamp the chosen `persona` onto the `AIJob` row alongside `prompt_version` for
   debugging (mirrors the existing prompt-version stamping in `config.py`).

### tac_calc caveat

The tactical calculator returns a rigid, fixed-format text block (parsed/rendered
by the frontend), not a validated schema. Persona flavor there is higher risk of
disturbing the format. Options: apply only a light touch for tac_calc, or skip
persona for tac_calc entirely. Decide during build; default to skipping it for
tac_calc until proven safe.

### Frontend

1. Add a persona selector to Settings (a radio group or select, like the model
   groups in `frontend/src/store/models.ts` / `SettingsPanel.tsx`). It is a single
   global setting, not per-feature.
2. Store the selection in the settings store. Persona is non-sensitive (unlike API
   keys, which are deliberately in-memory only), so it can persist to
   `localStorage` for convenience.
3. Include `persona` in the job-create payload (extend `JobInput` in
   `types/ai.ts` and the API client).

### Demo mode

Demo responses are pre-generated cached JSON in the default voice. Persona applies
to **live AI only**. In demo mode, either ignore the persona (with a small note)
or, as a showcase, pre-generate one persona variant for a single sample. Start
with live-only and a note; persona-per-scenario cached variants are out of scope.

## Build order

1. `personas.py` registry + `apply_persona` helper; unit-test that default is a
   no-op and a persona prepends the expected preamble.
2. Thread `persona` through `service.py` and the job runner; stamp it on `AIJob`.
3. Frontend: persona setting in the store + Settings UI; send it in the job
   payload.
4. Decide and implement the tac_calc handling (skip vs light touch).
5. Tests: for each persona, a structured feature still returns a schema-valid
   object (structure holds; only tone changes). A snapshot/sample check that the
   default persona output is unchanged from today.

## Acceptance criteria

- Settings offers a persona selector including "None / Default".
- A non-default persona visibly changes the tone of live AI responses across
  rules / strategy / move.
- Structured outputs still validate against their schemas under every persona.
- Accuracy and safety are unaffected; the persona is tone only.
- Demo mode behavior is defined (live-only) and clearly communicated.
- The chosen persona is recorded on the `AIJob` for debugging.
