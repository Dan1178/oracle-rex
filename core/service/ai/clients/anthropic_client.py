"""Anthropic (Claude) chat client (via LangChain).

``langchain_anthropic`` is imported lazily inside ``build_chat`` so the rest of
the app keeps working before the package is installed / an API key is set up.
Install with: ``pip install langchain-anthropic`` (already listed in
requirements.txt).
"""

from .. import config
from ..errors import ProviderError


def build_chat(model_name: str, api_key: str, max_tokens: int, reasoning_effort: str = None):
    # ``reasoning_effort`` is accepted for a uniform client signature; Claude
    # manages its own thinking depth, so it is not forwarded here.
    try:
        from langchain_anthropic import ChatAnthropic
    except ImportError as exc:  # pragma: no cover - depends on optional install
        raise ProviderError(
            "Anthropic (Claude) support is not installed on the server yet. "
            "Choose an OpenAI or Grok model, or install 'langchain-anthropic'.",
            detail=str(exc),
        )

    return ChatAnthropic(
        model=model_name,
        api_key=api_key,
        max_tokens=max_tokens,
        timeout=config.DEFAULT_REQUEST_TIMEOUT,
        max_retries=config.DEFAULT_MAX_RETRIES,
    )
