"""xAI (Grok) chat client (via LangChain)."""

from langchain_xai import ChatXAI

from .. import config


def build_chat(model_name: str, api_key: str, max_tokens: int, reasoning_effort: str = None):
    # Grok 4.x models reason automatically; ``reasoning_effort`` is accepted for
    # a uniform client signature but intentionally not forwarded.
    return ChatXAI(
        model=model_name,
        api_key=api_key,
        max_tokens=max_tokens,
        timeout=config.DEFAULT_REQUEST_TIMEOUT,
        max_retries=config.DEFAULT_MAX_RETRIES,
    )
