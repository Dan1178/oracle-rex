"""Google Gemini chat client (via LangChain), keyed by a server-held API key."""

from .. import config


def build_chat(model_name: str, api_key: str, max_tokens: int, reasoning_effort: str = None):
    # Lazy import so the rest of the service stays importable without the Google
    # SDK installed (and tests that mock the chat never need it). Gemini manages
    # its own thinking depth, so ``reasoning_effort`` is accepted and ignored.
    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=api_key,
        max_output_tokens=max_tokens,
        timeout=config.DEFAULT_REQUEST_TIMEOUT,
        max_retries=config.DEFAULT_MAX_RETRIES,
    )
