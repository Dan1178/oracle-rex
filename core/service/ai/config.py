"""Centralized configuration for the Oracle Rex AI service layer.

This is the single place to control:
  - which providers exist and which models belong to each,
  - the default/fallback model,
  - per-feature token limits,
  - request timeouts.

Views and the rest of the backend should never hard-code model names or
provider choices; they pass a model string through to the service layer, and
everything here decides how that maps to a concrete provider client.
"""

# --- Providers -------------------------------------------------------------

OPENAI = "openai"
XAI = "xai"
ANTHROPIC = "anthropic"

# Models grouped by provider. Add new models here (and, if they belong to a new
# provider, add a client in ``clients/``) — nothing else needs to change.
#
# These are all current-generation reasoning ("thinking") models: they deliberate
# before answering, which improves quality but uses extra tokens and latency (see
# the token limits and ``*_REASONING_EFFORT`` settings below).
OPENAI_MODELS = ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.4-nano"]
XAI_MODELS = ["grok-4.3", "grok-4.20"]
ANTHROPIC_MODELS = ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"]

# Reverse lookup: model id -> provider. Built once at import time.
PROVIDER_FOR_MODEL = {
    **{m: OPENAI for m in OPENAI_MODELS},
    **{m: XAI for m in XAI_MODELS},
    **{m: ANTHROPIC for m in ANTHROPIC_MODELS},
}

# Used when an unknown / deprecated model id comes in (e.g. the old "gpt-4"
# default the legacy frontend still sends). The cheapest/fastest reasoning model.
FALLBACK_MODEL = "gpt-5.4-nano"


def provider_for_model(model: str) -> str:
    """Return the provider that serves ``model``, falling back to OpenAI."""
    return PROVIDER_FOR_MODEL.get(model, OPENAI)


def resolve_model(model) -> str:
    """Normalize an incoming model id to one we actually support."""
    if model and model in PROVIDER_FOR_MODEL:
        return model
    return FALLBACK_MODEL


# --- Token limits (per feature) -------------------------------------------

# Reasoning models spend a large share of ``max_tokens`` on hidden thinking
# before producing visible output, so these limits cover BOTH the reasoning and
# the answer. They are deliberately much higher than the old non-reasoning
# values (500 / 5000 / 250) — set them too low and a reasoning model returns an
# empty response because the whole budget went to thinking.
RULES_MAX_TOKENS = 4000
STRATEGY_MAX_TOKENS = 12000
MOVE_MAX_TOKENS = 12000
TAC_CALC_MAX_TOKENS = 4000

# --- Reasoning effort (OpenAI GPT-5.x only) -------------------------------

# Controls how much these models deliberate before answering. Lower = faster
# and cheaper; higher = more thorough. Applied only to OpenAI reasoning models;
# xAI (Grok) and Anthropic (Claude) decide their own thinking depth and ignore
# this. Valid values: "none", "low", "medium", "high", "xhigh".
RULES_REASONING_EFFORT = "low"          # quick factual lookups
STRATEGY_REASONING_EFFORT = "medium"    # deep, multi-factor planning
MOVE_REASONING_EFFORT = "medium"        # tactical evaluation
TAC_CALC_REASONING_EFFORT = "medium"    # probability / combat arithmetic

# --- Timeouts --------------------------------------------------------------

# Hard ceiling (seconds) on a single blocking provider request. Bumped from 60s
# because reasoning models are slower. This is a stop-gap so a hung request
# fails with a usable error instead of holding the worker open; Milestone 2
# moves long AI work onto async jobs.
DEFAULT_REQUEST_TIMEOUT = 90.0

# Provider SDKs retry timeouts/5xx automatically (OpenAI defaults to 2 retries).
# For a slow reasoning model that exceeds the timeout, that turns one 90s wait
# into ~3x90s of silent hanging before failing — and each aborted attempt never
# completes on the provider side, so it doesn't even show up in their logs.
# Fail fast instead and let the user retry from the UI.
DEFAULT_MAX_RETRIES = 0
