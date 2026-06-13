"""Provider client factory.

``get_chat`` is the one place that turns a model id + api key into a concrete
LangChain chat model. Provider selection is driven entirely by ``config``.
"""

from .. import config
from ..errors import MissingAPIKeyError
from . import anthropic_client, openai_client, xai_client

_BUILDERS = {
    config.OPENAI: openai_client.build_chat,
    config.XAI: xai_client.build_chat,
    config.ANTHROPIC: anthropic_client.build_chat,
}


def get_chat(model: str, api_key: str, max_tokens: int, reasoning_effort: str = None):
    """Build a chat model for ``model``, validating the API key is present.

    ``reasoning_effort`` applies only to OpenAI reasoning models; the xAI and
    Anthropic clients accept and ignore it (they manage their own thinking).
    """
    if not api_key:
        raise MissingAPIKeyError()

    resolved = config.resolve_model(model)
    provider = config.provider_for_model(resolved)
    builder = _BUILDERS[provider]
    return builder(resolved, api_key, max_tokens, reasoning_effort)
