"""Encrypt BYOK API keys before they enter the Django-Q broker.

BYOK keys are the bulk of live-AI traffic, so they go through the async worker
like everything else. But the worker reads its arguments from the broker table,
which means a plaintext key would otherwise sit in Postgres. To avoid that, the
create-job endpoint encrypts the key with Fernet and passes only the ciphertext
as the task argument; the worker decrypts it in memory. The key is never written
to the ``AIJob`` row.

The Fernet key comes from ``settings.AIJOB_FERNET_KEY`` when set; otherwise it is
derived deterministically from ``SECRET_KEY``. Both the web and worker processes
read the same settings, so they always agree on the key without extra config.
"""

import base64
import hashlib
import functools

from cryptography.fernet import Fernet
from django.conf import settings


@functools.lru_cache(maxsize=1)
def _fernet() -> Fernet:
    configured = getattr(settings, "AIJOB_FERNET_KEY", "")
    if configured:
        # A real, rotated Fernet key (urlsafe-base64, 32 bytes) from the env.
        key = configured.encode() if isinstance(configured, str) else configured
    else:
        # Derive a stable 32-byte key from SECRET_KEY. Both processes share
        # SECRET_KEY, so they derive the identical Fernet key.
        digest = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
        key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_key(plaintext: str) -> str:
    """Encrypt a plaintext API key into a token safe to store in the broker.

    An empty/missing key encrypts to an empty token so callers don't have to
    special-case the no-key path (the worker treats an empty token as no key,
    and the service layer raises the usual MissingAPIKeyError downstream).
    """
    if not plaintext:
        return ""
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt_key(token: str) -> str:
    """Decrypt a token produced by :func:`encrypt_key`.

    Returns "" for an empty token. A tampered/invalid token also yields "" so the
    worker fails with the normal missing-key error rather than a crypto traceback.
    """
    if not token:
        return ""
    try:
        return _fernet().decrypt(token.encode()).decode()
    except Exception:  # noqa: BLE001 - any decode failure -> treat as no key
        return ""
