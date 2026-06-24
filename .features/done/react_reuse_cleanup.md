# Feature: React reuse / DRY cleanup

## Status

Done (2026-06-23). Extracted `JobResultArea`, `DemoBox`, and `EmptyHint`
components; the four panels and their CSS modules now route the result-area
ladder, demo callout, and empty-hint styling through them. tsc / eslint / 79
tests all pass; behavior and appearance unchanged.

## Context

The React migration already leverages reusable components and hooks well
(`components/` library, shared hooks like `useAiJob` / `useBoardSuggester`,
data-driven Settings model groups, `AdvisorCard` for all structured results). The
items below are remaining duplication a reuse pass would tighten. None is a
correctness issue; this is `/simplify`-style cleanup.

## Three points

1. **Shared async-result component.** The result-area ladder
   (`credentialError ? ... : isLoading ? <LoadingState> : error ? <ErrorState> :
   success ? <JobResultView> : <empty hint>`) is hand-rolled almost identically in
   `RulesPanel`, `StrategyPanel`, `MovePanel`, and `BattleCalculator`. Extract one
   component (e.g. `<JobResultArea loading error result empty hints... />`) so each
   panel passes state in instead of repeating the branch logic.

2. **`<DemoBox>` component.** The demo callout markup (`h4` heading + description
   paragraph + action button, inside `.demoBox`) repeats across Strategy / Move /
   Battle with the same structure. Extract a `<DemoBox title description
   buttonLabel onClick disabled />`.

3. **Shared demo-button / hint styles.** The demo-button rule and the `.hint`
   empty-state box are copy-pasted across several panel `.module.css` files
   (StrategyPanel, MovePanel, BattleCalculator, RulesPanel). Move them into a
   shared stylesheet (or fold into the components from points 1 and 2).

## Acceptance criteria

- The four panels render their result area through one shared component.
- The demo callout is a single component used by all board/battle panels.
- Duplicated demo-button / hint CSS lives in one place.
- Behavior and appearance are unchanged; tests still pass.
