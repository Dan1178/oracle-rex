"""Public AI service layer.

Every AI-powered feature calls one of the functions here. Each function:

  * validates its inputs,
  * builds the prompt (from ``prompts/``),
  * builds the provider client (from ``clients/``),
  * runs the request with structured-output validation where applicable,
  * and converts any provider failure into a clear ``AIServiceError``.

Structured features (rules, strategy, move) return a validated Pydantic object
and gracefully fall back to plain text wrapped in the same schema when a model
cannot produce structured output. The battle calculator returns a rigid,
fixed-format text block and is returned as plain text.
"""

import logging
from typing import Any, Dict

from . import config
from .clients import get_chat
from .errors import (
    AIServiceError,
    InputValidationError,
    InvalidAPIKeyError,
    MalformedResponseError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    QuotaExceededError,
    classify_provider_error,
)
from .prompts import (
    rules_chat,
    strategic_plan as strategic_plan_prompt,
    tactical_calculator,
    tactical_move as tactical_move_prompt,
)
from .schemas import RulesAnswer, StrategicPlan, TacticalMove

logger = logging.getLogger(__name__)

# Errors that re-running as plain text would only hit again, so we never fall
# back on these — we surface them straight away.
_NON_RECOVERABLE = (
    InvalidAPIKeyError,
    ProviderTimeoutError,
    ProviderRateLimitError,
    QuotaExceededError,
)


# --- internal helpers ------------------------------------------------------

def _classify_and_log(exc: Exception, feature: str) -> AIServiceError:
    """Classify a provider exception and log its real cause for debugging."""
    err = classify_provider_error(exc)
    # ``detail`` carries the raw provider message — log it so the actual cause
    # (e.g. OpenAI 'insufficient_quota') is visible even though the user only
    # sees the friendly message.
    logger.warning(
        "AI provider error in %s: %s | %s",
        feature,
        type(err).__name__,
        err.detail or exc,
    )
    return err


def _invoke_plain(chat, messages, feature: str) -> str:
    """Invoke a chat model and return its text content, or raise AIServiceError."""
    try:
        response = chat.invoke(messages)
    except Exception as exc:  # noqa: BLE001 - re-classified into AIServiceError
        raise _classify_and_log(exc, feature)

    content = getattr(response, "content", response)
    if not isinstance(content, str) or not content.strip():
        raise MalformedResponseError(detail=f"Empty/invalid content: {content!r}")
    return content


def _invoke_structured(chat, messages, schema, feature: str):
    """Run a structured-output request, falling back to plain text on failure."""
    try:
        structured = chat.with_structured_output(schema)
        result = structured.invoke(messages)
    except Exception as exc:  # noqa: BLE001
        classified = _classify_and_log(exc, feature)
        if isinstance(classified, _NON_RECOVERABLE):
            raise classified
        # Structured output unsupported or unparseable for this model — fall
        # back to a plain-text call so the feature still works.
        logger.warning(
            "Structured output failed for %s (%s); falling back to plain text.",
            feature,
            type(exc).__name__,
        )
        text = _invoke_plain(chat, messages, feature)
        return schema.fallback_from_text(text)

    # Normalize whatever the provider handed back into a validated schema object.
    if isinstance(result, schema):
        return result
    if isinstance(result, dict):
        try:
            return schema.model_validate(result)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Validation failed for %s: %s", feature, exc)
            raise MalformedResponseError(detail=str(exc))
    logger.warning("Unexpected structured result type for %s: %r", feature, type(result))
    raise MalformedResponseError(detail=f"Unexpected result type: {type(result)!r}")


def _require(condition: bool, message: str):
    if not condition:
        raise InputValidationError(message)


# --- public API ------------------------------------------------------------

def _token_budget(default: int, override) -> int:
    """Resolve the max-token budget for a call.

    ``override`` (when a positive int) caps output below the per-feature default
    — used by the private live-demo path to bound owner-paid cost. A None/0/
    larger value leaves the generous default in place.
    """
    if override and 0 < int(override) < default:
        return int(override)
    return default


def get_rules_response(
    question: str, api_key: str, model: str, max_tokens: int = None
) -> RulesAnswer:
    _require(bool(question and question.strip()), "No question was provided.")
    chat = get_chat(
        model, api_key,
        _token_budget(config.RULES_MAX_TOKENS, max_tokens),
        config.RULES_REASONING_EFFORT,
    )
    messages = rules_chat.build_messages(question)
    return _invoke_structured(chat, messages, RulesAnswer, "rules")


def get_strategy_response(
    game_json: Dict[str, Any], player_faction: str, api_key: str = None,
    model: str = None, max_tokens: int = None,
) -> StrategicPlan:
    _require(bool(game_json), "No board state was provided.")
    _require(bool(player_faction), "No faction was selected.")
    chat = get_chat(
        model, api_key,
        _token_budget(config.STRATEGY_MAX_TOKENS, max_tokens),
        config.STRATEGY_REASONING_EFFORT,
    )
    messages = strategic_plan_prompt.build_messages(game_json, player_faction)
    return _invoke_structured(chat, messages, StrategicPlan, "strategy")


def get_move_response(
    game_json: Dict[str, Any], player_faction: str, api_key: str = None,
    model: str = None, max_tokens: int = None,
) -> TacticalMove:
    _require(bool(game_json), "No board state was provided.")
    _require(bool(player_faction), "No faction was selected.")
    chat = get_chat(
        model, api_key,
        _token_budget(config.MOVE_MAX_TOKENS, max_tokens),
        config.MOVE_REASONING_EFFORT,
    )
    messages = tactical_move_prompt.build_messages(game_json, player_faction)
    return _invoke_structured(chat, messages, TacticalMove, "move")


def get_tac_calc_response(
    force_data: Dict[str, Any], simulation: Dict[str, Any] = None,
    api_key: str = None, model: str = None, max_tokens: int = None,
) -> str:
    _require(bool(force_data), "No fleet data was provided.")
    chat = get_chat(
        model, api_key,
        _token_budget(config.TAC_CALC_MAX_TOKENS, max_tokens),
        config.TAC_CALC_REASONING_EFFORT,
    )
    messages = tactical_calculator.build_messages(force_data, simulation)
    return _invoke_plain(chat, messages, "tac_calc")


__all__ = [
    "AIServiceError",
    "get_rules_response",
    "get_strategy_response",
    "get_move_response",
    "get_tac_calc_response",
]
