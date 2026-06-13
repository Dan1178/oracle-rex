"""Backward-compatible entry point for the AI service.

The implementation now lives in the ``core.service.ai`` package (see
``ai/service.py``). This module re-exports the public functions so older import
paths keep working.

Note: the structured features now return validated Pydantic objects
(``RulesAnswer``, ``StrategicPlan``, ``TacticalMove``) rather than raw strings.
Call ``.to_display_text()`` for a human-readable string.
"""

from .ai.errors import AIServiceError
from .ai.service import (
    get_move_response,
    get_rules_response,
    get_strategy_response,
    get_tac_calc_response,
)

__all__ = [
    "AIServiceError",
    "get_rules_response",
    "get_strategy_response",
    "get_move_response",
    "get_tac_calc_response",
]
