# Feature: Unit count caps + per-tab Reset

## Status

Planned (2026-06-22). Not started. Two related UX improvements, anchored on the
Tactical Calculator.

---

## Part A: Unit count limits in the Tactical Calculator

### Objective

Stop the calculator from letting a player field more units than Twilight
Imperium's per-player component limits allow. When a unit reaches its cap, its
increment (up) control is disabled.

### Rule (per the game)

Each player has a hard plastic limit per unit type. The cap applies to every unit
EXCEPT fighters and infantry, which are token-extendable and so are treated as
effectively unlimited in the calculator.

Starting cap values to VERIFY against an authoritative source before coding
(the M4 / M10 data pipeline under `core/data/`, or the LRR component-limits list).
Per player, PoK:

| Unit | Cap |
|---|---|
| Flagship | 1 |
| War Sun | 2 |
| Dreadnought | 5 |
| Carrier | 4 |
| Cruiser | 8 |
| Destroyer | 8 |
| PDS | 6 |
| Space Dock | 3 |
| Mech | 4 |
| Fighter | uncapped (token-extendable) |
| Infantry | uncapped (token-extendable) |

The cap is PER SIDE: friendly and enemy represent two different players, so each
side gets its own independent cap (e.g. each side may field up to 2 war suns).

### Where it plugs in (current code)

- `frontend/src/features/battleCalculator/units.ts`: `UnitDef` defines each unit
  (`unit`, `label`, `icon`) in `FLEET_UNITS`, `FRIENDLY_GROUND_UNITS`,
  `ENEMY_GROUND_UNITS`. Add an optional `max?: number` per `UnitDef` (omit for
  fighters/infantry = uncapped).
- `frontend/src/components/UnitCounter/UnitCounter.tsx`: already renders up/down
  arrows with a disabled state (`.arrow:disabled` exists in its CSS). Add a
  `max?: number` (or `canIncrement: boolean`) prop and disable the up arrow when
  `count >= max`.
- `frontend/src/features/battleCalculator/BattleCalculator.tsx`: `increment(id)`
  already bumps a count; also clamp it to the unit's `max` so the value can never
  exceed the cap even via fast clicks, and pass `max` down to each `UnitCounter`
  in `renderSection`.

### Notes / decisions

- Clamp in `increment` as the source of truth; the disabled arrow is the visible
  affordance, not the only guard.
- The backend simulator should also reject/clamp over-cap counts defensively, but
  the primary fix is the UI.
- Confirm whether the calculator targets base game or PoK limits (PoK assumed
  here; mechs are PoK).

### Acceptance criteria

- Each capped unit's up arrow disables at its limit; fighters and infantry never
  cap.
- Caps apply independently per side.
- Counts cannot exceed the cap by any input path.
- Cap values are sourced from / checked against authoritative data, not guessed.

---

## Part B: Per-tab Reset button (with confirmation)

### Objective

Give each tab a Reset button that, after a confirmation popup, returns that tab to
its empty/initial state. Requested first for the Tactical Calculator, but applies
to every feature tab.

### Design

- A small reusable confirmation step. Two options: a themed `ConfirmDialog`
  component (matches the console theme, preferred) or `window.confirm` as a
  minimal fallback. Recommend the themed dialog for portfolio polish.
- A shared `ResetButton` placed consistently per tab; the actual reset logic lives
  in each panel since each owns its state.

### Per-tab reset targets

- Tactical Calculator: `counts` -> `emptyCounts()`, clear the sim result
  (`sim.reset()`), clear the AI job (`job.reset()`), clear `credentialError`, and
  reset the `explain` toggle to false.
- Rules Q&A: clear `question`, the result/job, and `credentialError`.
- Strategy Suggester: clear `ttsInput`, the board/faction (`useBoardSuggester`
  state), results, and errors.
- Move Suggester: clear the board/faction and results (note its board can come
  from a Fleet Manager export seed; reset clears the current board).
- Fleet Manager: clear the built board / TTS input and any open popover.
- Settings: SPECIAL CASE. Do not silently wipe API keys. Either exclude Settings
  from Reset, or scope its reset to model selections only (back to defaults),
  leaving keys alone. Decide at implementation; default to excluding Settings.

### Where it plugs in

- New `frontend/src/components/ConfirmDialog/` (themed modal; remember the M7
  rule that modals need a normal-flow faux-viewport wrapper, not `position:
  fixed`, when there is no real viewport).
- New `frontend/src/components/ResetButton/` (button + wired confirm).
- Each panel adds a `handleReset` that clears its own state, gated by the confirm.

### Acceptance criteria

- Every feature tab (except possibly Settings) has a Reset button.
- Reset asks for confirmation before clearing.
- Confirming returns the tab to its initial empty state (inputs, board, results,
  errors all cleared).
- Settings keys are never wiped without explicit, separate intent.

---

## Build order (suggested)

1. Part A caps: add `max` to `UnitDef`, plumb through `UnitCounter` + clamp in
   `BattleCalculator`; verify cap values first.
2. Part B: build `ConfirmDialog` + `ResetButton`, wire Tactical first, then the
   other tabs.
3. Tests: cap disables the arrow and clamps the count; reset clears each tab's
   state after confirmation.
4. Full suite + build + lint.
