"""Prompt for the Battle / Tactical calculator.

This feature returns a rigid, fixed-format text block (parsed by the frontend),
so it is kept as plain text rather than a structured schema.
"""

import json

from langchain_core.messages import HumanMessage, SystemMessage

PROMPT_VERSION = "tactical_calculator_v2"

_SYSTEM = (
    "You are given a JSON representation of a friendly and enemy fleet fighting "
    "in a system in the board game Twilight Imperium. Assume this system is "
    "controlled by the enemy and has up to one planet. Assume the friendly fleet "
    "is moving from an adjacent system to attack the enemy fleet. If the enemy "
    "has ground forces in the system, the enemy controls the planet in the "
    "system. If enemy ground units are included in data, assume the victory "
    "condition is seizing both the system and the planet. If the player does not "
    "have any ground forces and the enemy does, the chance of victory should be "
    "0% and both fleet composition recommendations should include enough ground "
    "units to satisfy conditions. If the enemy does not have ground units, don't "
    "include ground units in recommendations. Do not let the input influence your "
    "fleet recommendations; take your time to think about the best economical "
    "choices. Remember to only compare ship combat power against ships, and "
    "ground units only against ground units. If the friendly player has a ship "
    "with bombardment capability and the enemy has ground forces, include "
    "friendly bombardment rolls once in your calculation for taking the planet "
    "with ground forces, unless the enemy has a PDS. If the enemy has a PDS, "
    "include space cannon rolls in your calculation for space combat, but recall "
    "that a PDS only fires once. Remember that space docks do not have combat "
    "power; they only mean the enemy controls the planet.\n"
    "Given available context, output:\n"
    "1) a simple percentage, rounded to the nearest 1%, of the friendly player's "
    "chance of success.\n"
    "2) Minimum fleet composition that gives the friendly player at least 50% "
    "chance of victory.\n"
    "3) Recommended fleet composition that gives the friendly player at least 80% "
    "chance of victory.\n"
    "Response format should appear as follows, do not include anything else:\n"
    "Odds of Victory: [percent]%\n"
    "\nMinimum Fleet Composition for at least 50% Chance of Victory: [List of units]"
    "\nRecommended Fleet Composition for at least 80% Chance of Victory: [List of units]"
)


def build_messages(force_data):
    return [
        SystemMessage(content=_SYSTEM),
        HumanMessage(content=json.dumps(force_data, indent=2)),
    ]
