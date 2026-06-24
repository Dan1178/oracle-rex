# Feature: Mobile / small-screen responsive UI

## Status

Done (2026-06-23). Diagnosed from two owner-supplied iPhone screenshots
(~390px width, portrait); root causes confirmed below. All fixes land behind a
single `@media (max-width: 640px)` block per module and leave every desktop rule
untouched. Verified in a 375px preview (tabs wrap to 2x3 and are all reachable,
the full 37-hex board fits with zero horizontal overflow and a ~319px height
instead of 160vh, the TTS row stacks) and at 1345px desktop (hex width still
168px = 12.5vw, grid still 80vw x 160vh, tabs still `nowrap` — i.e. desktop
pixel-identical). tsc / eslint / 79 tests pass.

Design call (owner): the board hexes deliberately keep their `6.5vw` font size on
mobile rather than shrinking — small phones zoom to read individual tiles. The
mobile board fix only retargets the grid BOX (full content width, content-height
instead of 160vh) so the map fits and stops ballooning the scroll.

### Files changed

- `components/TabNav/TabNav.module.css` — wrap to two rows of three, smaller type.
- `components/Board/Board.module.css` — mobile grid box `width: 100%`,
  `height: 85vw`, `.boardPreview min-height: 0`; hex size/offsets untouched.
- `App.module.css` — reduced `.container` side padding, smaller `.title`.
- `features/battleCalculator/BattleCalculator.module.css` — `.section min-width:
  0` so fleets stack; tighter unit-grid gaps.
- `features/strategicPlan/StrategyPanel.module.css` — `.ttsRow` stacks the input
  above the Generate button.

(Original diagnosis retained below for reference.)

## Problem

On a phone the page does not reflow to the narrow viewport. The viewport meta is
correct (`width=device-width, initial-scale=1.0` in `frontend/index.html`), so
the page renders at device width, but the layout was built desktop-first and is
almost entirely non-responsive (repo-wide, `@media` rules exist only in
`LoadingState.module.css` and `AdvisorCard.module.css`). Two things actually
break, plus secondary cramping.

## Confirmed issues

### 1. Tab bar overflows and hides two tabs (functional, highest priority)

There are **six** tabs (`App.tsx` `TABS`): Settings, Rules Q&A, Strategy
Suggester, Fleet Manager, Move Suggester, Tactical Calculator. In
`TabNav.module.css`, `.tabButton` is `flex: 1` with `font-size: 16px` and
`.tabNav` has no `flex-wrap` and no `overflow-x`. Flex items default to
`min-width: auto`, so each tab can't shrink below its widest word; the row's
min-content width exceeds ~390px and overflows to the right, clipping the bar.

Screenshot 1 confirms it: only Settings / Rules Q&A / Strategy Suggester are
fully visible, "Fleet Manager" is clipped mid-word, and **Move Suggester and
Tactical Calculator are off-screen with no way to scroll to them** — two features
are unreachable on mobile.

### 2. Board hex map overflows width and balloons vertically

`Board.module.css` sizes the map in viewport units tuned for a wide landscape
desktop:
- `.hexGrid { width: 80vw; height: 160vh; font-size: 6.5vw; }`
- `--hex-grid-width: 12.5vw`, with all 37 hex positions offset in `em`
  (`--hex-grid-vert: 1.68em`, `--hex-grid-horz: 1.46em`), i.e. relative to that
  `6.5vw` font size.
- `.boardPreview { min-height: 90vh; }`

Hex size (`vw`) and ring spacing (`em` off a `vw` font) scale on different
references, so the proportion that works in landscape breaks in narrow portrait:
the outer ring extends past the 80vw width and the left/right hexes clip at the
viewport edge (screenshot 2). Separately, `height: 160vh` + `min-height: 90vh`
force an enormous vertical scroll — screenshot 2 is nothing but board.

### 3. Secondary cramping (lower priority)

- **Shell padding.** `App.module.css` `.container` uses `padding: 34px 38px 44px`;
  the 38px side padding eats ~20% of a phone's width.
- **Fleet columns.** `BattleCalculator.module.css` `.section` has
  `min-width: 320px` in a flex-wrap row; two side-by-side fleets force horizontal
  overflow below ~660px. (Not in these screenshots, but will break the Tactical
  Calculator tab.)
- **Side-by-side input rows.** Strategy's `.ttsRow` (input + button) does not
  stack; it squeezes on a narrow screen.
- **Title size.** The Azonix `h1` is large and wraps to four lines; optional
  shrink at the small breakpoint.

## Approach

Add `@media (max-width: 640px)` (and possibly a `~960px` step for the fleet
columns) blocks; do not alter the existing desktop rules.

1. **Tabs (`TabNav.module.css`).** Make all six tabs reachable on mobile. Either
   (a) `flex-wrap: wrap` so they flow onto 2 rows, or (b) `overflow-x: auto` +
   `flex-wrap: nowrap` for a single swipeable row. Reduce `.tabButton`
   `font-size` (~13px) and side padding at the breakpoint. Recommend wrapping —
   no hidden tabs, no discoverability problem. Confirm the active-underline
   (`.active::after`) still reads when wrapped.
2. **Board (`Board.module.css`).** At the small breakpoint, retune the hex-grid
   scale so the assembled map fits the content width with no horizontal overflow
   and a height proportional to its real content: override `.hexGrid`
   `font-size` / `width` / `height` and `--hex-grid-width` together (they must be
   re-related so hex size and `em` ring offsets stay consistent), and lower
   `.boardPreview min-height`. Values tuned empirically against ~390px until the
   full 37-hex map is visible and centered. Verify Fleet Manager hex hit targets
   and the `:hover`/`.active` scale still behave.
3. **Shell (`App.module.css`).** Reduce `.container` padding (~16px sides) at the
   breakpoint; keep the corner brackets sensible.
4. **Fleet + input rows.** At the breakpoint, drop/lower `.section`
   `min-width: 320px` and stack the fleets one per row; stack `.ttsRow` (full-
   width input above full-width button).
5. **Title.** Optional `h1` font-size reduction at the breakpoint.
6. **Verify** on a real ~390px viewport against both screenshots; confirm desktop
   (>= the breakpoint) renders identically to today and existing tests pass.

## Acceptance criteria

- All six tabs are reachable and legible on a phone (no clipped/hidden tabs).
- The board map fits the width with no horizontal overflow and a reasonable
  height; the full 37-hex layout is visible and centered.
- Tactical Calculator fleets, Strategy TTS input, and result cards are usable on
  a narrow screen with no horizontal overflow.
- Desktop layout at/above the breakpoint is visually unchanged; existing tests
  still pass.
