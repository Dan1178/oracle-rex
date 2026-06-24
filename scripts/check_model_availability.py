#!/usr/bin/env python3
"""Check that every model Oracle Rex depends on is still served by its provider.

This is the "Layer 2" backstop from .features/done/api_model_retirement_monitor.md:
provider deprecation emails (Layer 1) are the source of truth, but this catches
anything those miss, grounded in the model lists the app actually uses.

The watch list is ``core/service/ai/config.py`` itself (OPENAI_MODELS /
XAI_MODELS / ANTHROPIC_MODELS / GEMINI_MODELS), imported here so the two can
never drift. For each provider we call its public list-models endpoint and check
that each configured id still appears.

Matching is prefix/date aware: a configured id counts as present if a live id is
exactly it, or is it followed by a dash and a date-like snapshot suffix (e.g.
configured ``claude-haiku-4-5`` matches live ``claude-haiku-4-5-20251001``). The
date-suffix guard is deliberate: a naive prefix match would let ``gpt-5.4-mini``
satisfy a retired ``gpt-5.4``, hiding exactly the kind of retirement we want to
catch.

Exit codes (any non-zero fails the GitHub Actions job, which emails the owner):
  0  every configured model is present on every checked provider
  1  at least one configured model is missing / retired  (the real alert)
  2  a provider could not be checked (missing key or API error) and no missing
     model was found  (a setup problem worth surfacing)

Stdlib only, so the workflow needs no dependency install. Read-only model-list
lookups: no inference is run, so the calls are cheap and safe.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

# Import the app's own config so the watch list is the single source of truth.
# config.py imports only the stdlib, so no Django setup is needed.
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from core.service.ai import config  # noqa: E402

REQUEST_TIMEOUT = 30  # seconds; a model-list lookup should be near-instant


# A date-like snapshot suffix: "20251001" or "2025-10-01". Used to tell a dated
# alias of a configured model from a different model that merely shares a prefix.
_DATE_SUFFIX = re.compile(r"\d{4}-?\d{2}-?\d{2}")


def _openai_shape(data: dict) -> list[str]:
    """OpenAI / xAI / Anthropic all return {"data": [{"id": ...}, ...]}."""
    return [m["id"] for m in data.get("data", []) if m.get("id")]


def _gemini_shape(data: dict) -> list[str]:
    """Gemini returns {"models": [{"name": "models/<id>"}, ...]}."""
    return [
        m["name"].removeprefix("models/")
        for m in data.get("models", [])
        if m.get("name")
    ]


# Each provider: the configured models to check, the env var holding its key, the
# list-models endpoint, how to build auth headers, and how to pull ids out of the
# response. All three OpenAI-style providers share one response shape; Gemini
# differs. Large page sizes are requested so the current (small) model sets come
# back in a single page.
PROVIDERS = [
    {
        "name": "OpenAI",
        "models": config.OPENAI_MODELS,
        "env": "OPENAI_API_KEY",
        "url": "https://api.openai.com/v1/models",
        "headers": lambda key: {"Authorization": f"Bearer {key}"},
        "extract": _openai_shape,
    },
    {
        "name": "xAI",
        "models": config.XAI_MODELS,
        "env": "XAI_API_KEY",
        "url": "https://api.x.ai/v1/models",
        "headers": lambda key: {"Authorization": f"Bearer {key}"},
        "extract": _openai_shape,
    },
    {
        "name": "Anthropic",
        "models": config.ANTHROPIC_MODELS,
        "env": "ANTHROPIC_API_KEY",
        "url": "https://api.anthropic.com/v1/models?limit=1000",
        "headers": lambda key: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
        },
        "extract": _openai_shape,
    },
    {
        "name": "Google",
        "models": config.GEMINI_MODELS,
        "env": "GEMINI_API_KEY",
        "url": "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000",
        "headers": lambda key: {"x-goog-api-key": key},
        "extract": _gemini_shape,
    },
]


def is_present(configured: str, live_ids: list[str]) -> bool:
    """True if ``configured`` matches a live id exactly or as a dated alias."""
    for live in live_ids:
        if live == configured:
            return True
        if live.startswith(configured + "-"):
            suffix = live[len(configured) + 1 :]
            if _DATE_SUFFIX.fullmatch(suffix):
                return True
    return False


def fetch_live_ids(provider: dict, key: str) -> list[str]:
    """Call the provider's list-models endpoint and return its live model ids."""
    req = urllib.request.Request(
        provider["url"],
        headers={"User-Agent": "oracle-rex-model-monitor", **provider["headers"](key)},
    )
    with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
        data = json.load(resp)
    return provider["extract"](data)


def check_provider(provider: dict, allow_missing_keys: bool) -> tuple[str, list[str]]:
    """Check one provider. Returns (status, missing_models).

    status is one of: "ok", "missing" (some configured models gone),
    "skipped" (no key and that's allowed), or "error" (no key / API failure).
    """
    name = provider["name"]
    configured = provider["models"]
    if not configured:
        print(f"  {name}: no models configured, skipping")
        return "ok", []

    key = os.environ.get(provider["env"], "").strip()
    # config.py seeds GEMINI_API_KEY with a "<PLACEHOLDER>" sentinel for local
    # use; treat that as unset.
    if not key or key.startswith("<"):
        if allow_missing_keys:
            print(f"  {name}: {provider['env']} not set, skipping (--allow-missing-keys)")
            return "skipped", []
        print(f"  {name}: ERROR {provider['env']} not set")
        return "error", []

    try:
        live_ids = fetch_live_ids(provider, key)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "replace")[:200]
        print(f"  {name}: ERROR HTTP {exc.code} from list-models endpoint: {body}")
        return "error", []
    except (urllib.error.URLError, OSError, ValueError) as exc:
        print(f"  {name}: ERROR could not reach list-models endpoint: {exc}")
        return "error", []

    missing = [m for m in configured if not is_present(m, live_ids)]
    if missing:
        present = [m for m in configured if m not in missing]
        print(f"  {name}: MISSING {missing}  (still present: {present})")
        return "missing", missing
    print(f"  {name}: all {len(configured)} configured models present")
    return "ok", []


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--allow-missing-keys",
        action="store_true",
        help="Skip (instead of failing on) providers whose API key env var is unset. "
        "Useful for local runs with only a subset of keys; CI should not pass this.",
    )
    args = parser.parse_args()

    print("Checking configured models against live provider model lists...")
    any_missing = False
    any_uncheckable = False
    for provider in PROVIDERS:
        status, _ = check_provider(provider, args.allow_missing_keys)
        if status == "missing":
            any_missing = True
        elif status == "error":
            any_uncheckable = True

    print()
    if any_missing:
        print(
            "RESULT: one or more configured models are no longer served. Update "
            "core/service/ai/config.py (and frontend model lists) and check the "
            "provider's deprecation notice for a replacement."
        )
        return 1
    if any_uncheckable:
        print(
            "RESULT: no missing models found, but a provider could not be checked "
            "(see ERROR lines above). Fix the key/secret or endpoint and re-run."
        )
        return 2
    print("RESULT: all configured models are present on every provider.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
