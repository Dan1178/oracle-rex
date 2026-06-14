"""Demo mode data (Milestone 3).

The public hosted app must be usable by an interviewer with no API key and no
Twilight Imperium knowledge. Demo mode delivers that: every major feature has a
one-click sample scenario backed by a *pregenerated* AI response stored as JSON,
so the demo never makes a provider call and can never run up the owner's AI bill.

Layout::

    demo/
      scenarios/   sample inputs (board TTS strings, fleet counts, rules chips)
      responses/   cached AI outputs, one file per ``response_key``

``scenarios/*.json`` is either a single runnable scenario (it has a ``key``) or a
group of runnable items (it has ``chips`` — used for the rules questions). Each
runnable item names the ``response_key`` whose cached payload the frontend
renders. This module flattens all of that into a small lookup and serves it.
"""

import copy
import json
from functools import lru_cache
from pathlib import Path

_DIR = Path(__file__).resolve().parent
_SCENARIOS_DIR = _DIR / "scenarios"
_RESPONSES_DIR = _DIR / "responses"

# Shown alongside every demo result so it is never mistaken for a live answer.
DEMO_LABEL = (
    "Demo response generated from a saved scenario. "
    "Use Live AI Mode (your own API key or an access code) to generate a fresh response."
)


@lru_cache(maxsize=1)
def _scenario_files() -> tuple:
    """All scenario JSON files, parsed, in a stable order."""
    files = sorted(_SCENARIOS_DIR.glob("*.json"))
    return tuple(json.loads(p.read_text(encoding="utf-8")) for p in files)


@lru_cache(maxsize=1)
def _runnable_index() -> dict:
    """Map every runnable scenario key -> {feature, response_key, ...}.

    Single-scenario files contribute one entry; ``chips`` files contribute one
    entry per chip (each chip carries its own ``key``/``response_key``).
    """
    index = {}
    for scen in _scenario_files():
        feature = scen.get("feature", "")
        chips = scen.get("chips")
        if chips:
            for chip in chips:
                index[chip["key"]] = {
                    "feature": feature,
                    "response_key": chip["response_key"],
                    "question": chip.get("question", ""),
                }
        elif scen.get("key"):
            index[scen["key"]] = {
                "feature": feature,
                "response_key": scen["response_key"],
            }
    return index


@lru_cache(maxsize=None)
def _load_response(response_key: str) -> dict:
    path = _RESPONSES_DIR / f"{response_key}.json"
    if not path.exists():
        raise KeyError(f"Unknown demo response: {response_key!r}")
    return json.loads(path.read_text(encoding="utf-8"))


def runnable_keys() -> list:
    """All scenario keys that can be run via :func:`get_demo_result`."""
    return list(_runnable_index().keys())


def feature_for(scenario_key: str) -> str:
    """Return the feature_type a runnable scenario belongs to, or ''."""
    item = _runnable_index().get(scenario_key)
    return item["feature"] if item else ""


def get_demo_result(scenario_key: str) -> dict | None:
    """Return the cached AI result for a scenario, tagged as a demo response.

    The returned dict mirrors the shape the worker produces for a live job
    (``answer`` / ``strategy`` / ``calc_results`` + ``structured``) so the
    existing polling frontend renders it with no special-casing. Returns
    ``None`` for an unknown key.
    """
    item = _runnable_index().get(scenario_key)
    if item is None:
        return None
    result = copy.deepcopy(_load_response(item["response_key"]))
    result["demo"] = True
    result["demo_label"] = DEMO_LABEL
    return result


def get_catalog() -> dict:
    """The demo catalog the frontend uses to render one-click sample entries.

    Grouped by feature so each tab can find its scenario(s) directly.
    """
    scenarios = {}
    for scen in _scenario_files():
        feature = scen.get("feature")
        if feature:
            scenarios[feature] = scen
    return {"label": DEMO_LABEL, "scenarios": scenarios}
