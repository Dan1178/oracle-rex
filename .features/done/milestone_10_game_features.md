# Milestone 10 — TI Game-Feature Depth (Techs & Game State)

> Companion to `oracle_rex_upgrade_plan.md` → "Milestone 10 — TI Game-Feature
> Depth". **Planning only** — no code is written here. **Post-core:** this is
> feature expansion and should not start until the M1–M9 modernization is done.
>
> **Branch:** suggested `epic/m10-game-features` off `main` (post-M6–M9). Tier 1
> is small and self-contained; Tiers 2–3 are larger and full-stack.

---

## 0. Context & Scope Boundary

The AI features currently rely on the model's own recall of Twilight Imperium
data. That's adequate for *generic* mechanics but unreliable for the
**faction-specific** detail that matters most (faction techs, abilities,
unit-stat exceptions) — exactly where LLMs hallucinate prereqs and invent
effects.

This milestone adds authoritative game data, **starting with faction
technologies**, behind the existing data pipeline.

**Why this is post-core, and bounded:** the main plan's Explicit Non-Goals lists
_"Full TI card/rule database unless already available and manageable"_ and warns
against feature expansion before reliability is solved. Tier 1 fits the
"manageable subset" exception (reference data that makes an existing feature more
correct, not a new database or a new tab). Tiers 2–3 are genuine expansion and are
sequenced explicitly so they don't creep into the M6 calculator/strategy work.

---

## 1. Data Source of Truth (resolved 2026-06-17)

A structured, vendorable source exists — confirmed, no rulebook scraping needed.

### Primary: AsyncTI4 / TI4_map_generator_bot

- Repo: <https://github.com/AsyncTI4/TI4_map_generator_bot> — the data engine
  behind **asyncti4.com**, the de-facto digital TI4 platform. ~11.7k commits,
  very actively maintained.
- **Coverage:** dedicated data directories for `technologies/`, `factions/`,
  `units/`, `abilities/` (plus leaders, strategy cards, relics, public/secret
  objectives, action cards, agendas, combat modifiers). Includes Prophecy of
  Kings **and Discordant Stars** — which the strategy prompt already references.
- **License: The Unlicense** (public-domain dedication) — free to copy, modify,
  and distribute, commercial or not, **no attribution required**.
  - ⚠️ The dedication explicitly covers **software/tooling/data, NOT art
    assets**. So: vendor the **mechanical JSON only**, **never the images**
    (those remain Asmodee/FFG IP — and we already serve our own tile/unit art).
  - ⚠️ The Unlicense waives the *repo authors'* rights, but the underlying game
    content is Asmodee IP. For a personal/portfolio project a mechanical subset
    is low-risk; keep to **facts/mechanics (tech name, prereqs, type, stat
    effects), not flavor text**, and **attribute the source** anyway (as done for
    Milty Draft in M4) for good hygiene.

### Cross-checks / alternates

- **TwilightImperiumUltimate** (<https://github.com/Lazik10/TwilightImperiumUltimate>)
  — comprehensive, includes tech trees + Discordant Stars; good second opinion.
- **TI4 Wiki — Faction Technologies**
  (<https://twilight-imperium.fandom.com/wiki/Faction_Technologies>) —
  human-readable; the verification reference (same role Milty Draft's data played
  in M4), not for machine ingestion.
- **Living Rules Reference (LRR) PDF** — authoritative *rules text*; unstructured.
  Only needed if the rules chatbot later wants grounded citations (out of scope
  here).

### Ingestion — reuse the M4 pipeline

Same source → normalized → validated flow already built in Milestone 4:

1. Copy the needed subset into `core/data/source/` (e.g. `ti4_technologies.json`,
   `ti4_faction_techs.json`), recording provenance/commit in a header or note.
2. Normalize naming to Oracle Rex conventions (the milty→oracle map work in M4 is
   the template: e.g. tech color/type naming, faction-id alignment — note that
   M4 already renamed several faction ids like `muaat`/`norr`/`freesystems`, so
   the tech data's faction keys must be mapped to those).
3. Add validators to `core/data/validators.py` (tech references a real faction;
   prereqs reference real techs; unit-upgrade techs reference real units) and wire
   them into `run_all_validations()` / `manage.py validate_data`.

---

## 2. Tiered Approach

### Tier 1 — Faction-tech context in the Strategy Suggester (do first)

**Goal:** the strategy suggester reasons about the selected faction's real techs
and abilities instead of the model guessing.

- **Data:** a normalized, faction-keyed `faction_techs.json` (and optionally
  faction abilities) under `core/data/source/` → validated.
- **Prompt:** in [strategic_plan.py](../core/service/ai/prompts/strategic_plan.py),
  look up the selected faction's faction-specific techs + abilities and append a
  compact authoritative reference block to the system/context message.
- **No schema change, no UI, no game-state.** Pure prompt enrichment keyed off the
  faction the user already selects.
- **Payload coordination (M6/6B):** this *adds* to the prompt, but it's small and
  high-signal. Fold it into the pruned/structured context from 6B rather than
  appending raw JSON, so the two efforts don't fight. Net token impact should be
  roughly neutral after 6B's pruning.
- **Caveat:** keep to mechanical facts (tech name, type, prereqs, effect summary),
  not full card flavor text — both for IP hygiene and payload size.

**Acceptance (Tier 1):** dataset vendored + validated; strategy output references
the faction's actual techs/abilities; covered by a prompt-builder test and a
`validate_data` check.

### Tier 2 — Researched techs as game state

**Goal:** track what a player has *actually* researched in a given game and feed
it to the AI.

- **State:** add researched-tech tracking to the game model (e.g. `Player.techs`,
  M2M or JSON), serialized via the existing `to_json()` graph (and the separate
  LLM serializer from 6B).
- **UI:** a tech picker in the React app (Strategy / Move tabs), persisted in the
  per-feature game state already managed by `useBoardSuggester`.
- **Prompt:** strategy/move prompts state what the player has/has-not researched
  ("has Plasma Scoring; no Cruiser II yet").
- **Scope:** real feature expansion (new model field + migration + UI). Sequence
  after Tier 1 proves the data is good.

**Acceptance (Tier 2):** a player's researched techs are editable in the UI,
persisted in game state, and reflected in strategy/move recommendations.

### Tier 3 — Unit-upgrade techs into the combat simulator

**Goal:** make the M6/6C deterministic simulator honor unit upgrades — directly
**closing the "tech upgrades not modeled" ⚠️ caveat** in
`phase_6_implementation.md`.

- **Data:** the unit-upgrade techs (Cruiser II, Fighter II, Destroyer II,
  Dreadnought II, War Sun, PDS II, etc.) and their stat deltas, from the same
  AsyncTI4 `technologies/` + `units/` data.
- **Sim:** the combat simulator's base-stats table becomes upgrade-aware —
  applied per side based on Tier 2's researched-tech state.
- **Depends on Tier 2** (it needs the researched-tech state to know which upgrades
  apply). Without Tier 2 it could still expose manual upgrade toggles in the
  calculator UI as a lighter interim step.

**Acceptance (Tier 3):** the simulator's win-probability and fleet recommendations
change correctly when relevant unit-upgrade techs are present; covered by
known-scenario tests (base vs. upgraded fleets).

---

## 3. Cross-Cutting Caveats

- **Faction-data overlap with M4.** M4 already renamed faction ids; the tech
  data's faction keys must map onto those ids (validator should catch mismatches).
- **Discordant Stars coverage.** The strategy prompt already mentions DS factions;
  ensure the vendored dataset includes them (AsyncTI4 does) or scope DS out
  explicitly.
- **Mechanical facts, not flavor.** Reinforced across all tiers — IP hygiene +
  payload size.
- **Don't vendor art.** The Unlicense excludes art assets; we keep our own.

---

## 4. Definition of Done (Milestone 10)

- A vendored, attributed, validated faction-tech dataset lives under
  `core/data/source/` and is checked by `manage.py validate_data`.
- Tier 1 shipped: the strategy suggester reasons about real faction techs.
- Tiers 2–3 are documented and explicitly optional / later, with the Tier 3 → 6C
  link recorded.
