"""OpenAI chat client (via LangChain)."""

from langchain_openai.chat_models import ChatOpenAI

from .. import config


def build_chat(model_name: str, api_key: str, max_tokens: int, reasoning_effort: str = None):
    # GPT-5.x are reasoning models: ``max_tokens`` is sent as
    # ``max_completion_tokens`` and covers reasoning + visible output.
    kwargs = {}
    if reasoning_effort:
        kwargs["reasoning_effort"] = reasoning_effort
    return ChatOpenAI(
        model=model_name,
        api_key=api_key,
        max_tokens=max_tokens,
        timeout=config.DEFAULT_REQUEST_TIMEOUT,
        max_retries=config.DEFAULT_MAX_RETRIES,
        **kwargs,
    )
