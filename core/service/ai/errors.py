"""Error types for the AI service layer.

Every failure the service can produce is one of these. Each carries a
``user_message`` (clear, non-technical, safe to show in the UI) and an
``http_status`` so views can translate it into a response with one helper.

``classify_provider_error`` maps the messy, provider-specific exceptions that
bubble up out of the underlying SDKs (OpenAI / xAI / Anthropic via LangChain)
into this small, stable set.
"""


class AIServiceError(Exception):
    """Base class for all AI service failures."""

    default_user_message = "Something went wrong while contacting the AI. Please try again."
    http_status = 500

    def __init__(self, user_message: str = None, *, detail: str = None):
        self.user_message = user_message or self.default_user_message
        # ``detail`` is the technical cause — logged, never shown to the user.
        self.detail = detail
        super().__init__(detail or self.user_message)


class MissingAPIKeyError(AIServiceError):
    default_user_message = (
        "No API key was provided. Add an API key for the selected model's "
        "provider in Settings and try again."
    )
    http_status = 400


class InvalidAPIKeyError(AIServiceError):
    default_user_message = (
        "The API key was rejected. Double-check that it is correct and active "
        "for the selected model's provider."
    )
    http_status = 401


class InputValidationError(AIServiceError):
    default_user_message = "The request was missing required information."
    http_status = 400


class ProviderTimeoutError(AIServiceError):
    default_user_message = (
        "The AI response took too long or failed to complete. Try a smaller "
        "scenario, use demo mode, or retry with a faster model."
    )
    http_status = 504


class ProviderRateLimitError(AIServiceError):
    default_user_message = (
        "The AI provider is rate-limiting requests right now. Wait a moment "
        "and try again."
    )
    http_status = 429


class QuotaExceededError(AIServiceError):
    """Account is out of quota/credits (e.g. OpenAI 'insufficient_quota').

    This is a 429 from the provider but it is a billing issue, not transient
    rate limiting — retrying will not help.
    """

    default_user_message = (
        "This provider's account has no remaining quota or credits, so the "
        "request was rejected. Check the plan and billing details for the API "
        "key's provider, or select a different model."
    )
    http_status = 402


class MalformedResponseError(AIServiceError):
    default_user_message = (
        "The AI returned a response that couldn't be understood. Please try "
        "again, or switch to a different model."
    )
    http_status = 502


class ProviderError(AIServiceError):
    """Generic, otherwise-unclassified provider-side failure."""

    default_user_message = (
        "The AI provider returned an error. Please try again, or switch to a "
        "different model."
    )
    http_status = 502


def classify_provider_error(exc: Exception) -> AIServiceError:
    """Translate a raw provider/LangChain exception into an ``AIServiceError``.

    We match on the exception's class name and message text rather than
    importing every provider SDK, so this stays correct whether the app is
    using OpenAI, xAI, or Anthropic — and whether or not each SDK is installed.
    """
    if isinstance(exc, AIServiceError):
        return exc

    text = (type(exc).__name__ + " " + str(exc)).lower()

    def has(*needles):
        return any(n in text for n in needles)

    if has("timeout", "timed out", "deadline"):
        return ProviderTimeoutError(detail=str(exc))
    # Quota/billing must be checked before rate limit: providers (e.g. OpenAI)
    # return these as a 429 with the same exception class as real rate limiting.
    if has("insufficient_quota", "exceeded your current quota", "quota", "billing", "insufficient credit"):
        return QuotaExceededError(detail=str(exc))
    if has("ratelimit", "rate limit", "rate_limit", "429", "too many requests"):
        return ProviderRateLimitError(detail=str(exc))
    if has(
        "authenticationerror",
        "invalid api key",
        "incorrect api key",
        "invalid_api_key",
        "unauthorized",
        "401",
        "no api key",
        "missing api key",
        "permissiondenied",
        "permission_denied",
        "403",
    ):
        return InvalidAPIKeyError(detail=str(exc))
    if has("notfound", "not_found", "404", "model not found", "does not exist"):
        return ProviderError(
            "The selected AI model is unavailable. Please choose a different model.",
            detail=str(exc),
        )

    return ProviderError(detail=str(exc))
