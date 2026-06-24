# Feature: API / Model Retirement Monitor

## Status

Done (2026-06-23). Implemented as `scripts/check_model_availability.py` (stdlib
only, imports `config.py` as the watch list) plus
`.github/workflows/model-retirement-check.yml` (weekly cron + `workflow_dispatch`,
job-fail alerting). Two refinements over the original sketch:

- **Google / Gemini is also checked.** `config.py` now has `GEMINI_MODELS`
  served by a server-held key, and a retired Gemini model would silently break
  the free live-demo path. The script lists all four providers (Gemini via
  `generativelanguage.googleapis.com/v1beta/models`, a different response shape).
- **Matching is date-suffix aware, not bare prefix.** A configured id is present
  only if a live id equals it or appends `-<date>` (e.g. `claude-haiku-4-5` ->
  `claude-haiku-4-5-20251001`). Bare prefix matching would let `gpt-5.4-mini`
  satisfy a retired `gpt-5.4` and hide the retirement.

Exit codes: 0 = all present; 1 = a model is missing (the alert); 2 = a provider
could not be checked (missing key / API error). `--allow-missing-keys` lets a
local run skip providers whose key is absent; CI runs without it so a missing
secret surfaces. Remaining manual step: add the four API keys as repository
secrets, then trigger once via `workflow_dispatch` to confirm a clean pass.

## Objective

Get notified when one of the AI models Oracle Rex depends on is scheduled for
retirement or quietly disappears from a provider, so a deprecated model never
breaks the hosted demo without warning.

This is the "Layer 2" backstop described below. It does not replace the
provider-native notices (Layer 1), which are the authoritative source.

## Two layers

### Layer 1: provider-native notices (do this regardless, no code)

OpenAI and Anthropic email the account owner when a model is scheduled for
deprecation, and both publish a deprecations page with retirement dates. These
give the most lead time and are the source of truth. Action item: make sure the
billing / owner email on each provider account (OpenAI, xAI, Anthropic) is one
that is actually monitored. xAI is less formal about advance notice.

### Layer 2: a scheduled repo-side check (this document)

A GitHub Actions workflow that catches anything the emails miss, grounded in the
model lists the app actually uses.

## Source of truth in the repo

`core/service/ai/config.py` already enumerates every model the app depends on:

- `OPENAI_MODELS`
- `XAI_MODELS`
- `ANTHROPIC_MODELS`

The monitor compares these against what each provider currently serves. No new
list of "models to watch" is needed; the config is the watch list.

## Design

A workflow at `.github/workflows/model-retirement-check.yml`:

1. Trigger on a weekly `schedule: cron` (plus `workflow_dispatch` for manual runs).
2. For each provider, call its list-models endpoint (all three are
   OpenAI-compatible):
   - OpenAI: `GET https://api.openai.com/v1/models`
   - xAI: `GET https://api.x.ai/v1/models`
   - Anthropic: `GET https://api.anthropic.com/v1/models`
3. Parse the configured model lists out of `config.py` (import the module, or
   read the three lists) and compare each configured id against the live ids.
4. If a configured model no longer appears, treat it as retired / renamed and
   raise an alert.

A small Python script (run by the workflow, reusing the repo's own
`config.py` so the lists never drift) does the comparison and exits non-zero on a
miss.

## Alerting options (pick one)

1. Fail the job (`exit 1`) on any missing model. GitHub emails the repo owner
   automatically when a scheduled workflow fails. Zero extra setup, no secrets
   beyond the API keys. Recommended starting point.
2. Open (or update) a GitHub issue assigned to the owner, listing the missing
   models. Gives a tracked to-do and a normal issue email.
3. An SMTP send-mail step for a custom message body. Needs mail credentials as
   secrets. Use only if the job-fail / issue emails are not enough.

## Secrets required

- `OPENAI_API_KEY`, `XAI_API_KEY`, `ANTHROPIC_API_KEY` as repository secrets.
  The calls are read-only model-list lookups, cheap and safe; no inference is
  run.

## Caveats (so this does not give false confidence)

- There is no universal machine-readable "retirement date" feed across all three
  providers. "Model disappeared from the live list" is the practical signal, but
  by the time it disappears it may already be gone. Pair this with the Layer 1
  emails for advance warning. Anthropic does publish dated deprecation info that
  could be scraped for true lead time if more notice is wanted.
- Alias mismatch: config ids are aliases (e.g. `claude-haiku-4-5`) while the API
  often returns dated ids (e.g. `claude-haiku-4-5-20251001`). The comparison must
  be prefix-aware (configured id is a prefix of a live id) or it will
  false-positive. Same care for the xAI / Grok ids.
- GitHub disables scheduled workflows after 60 days of repo inactivity. Not a
  concern for an active repo, but worth knowing for a dormant project.

## Build steps

1. Add the three API keys as repository secrets.
2. Add `scripts/check_model_availability.py`: imports `config.py`, calls the
   three list-models endpoints, prefix-matches configured ids against live ids,
   prints any misses, exits non-zero if any are missing.
3. Add `.github/workflows/model-retirement-check.yml`: weekly cron +
   `workflow_dispatch`, sets up Python, runs the script with the secrets in env.
4. Choose the alert mechanism (start with job-fail; upgrade to an issue if
   desired).
5. Run once via `workflow_dispatch` to confirm a clean pass, then temporarily
   add a fake model id to confirm it fails and emails as expected.

## Acceptance criteria

- A weekly workflow checks every model in `config.py` against the live provider
  model lists.
- A missing / retired model produces an email to the owner (via job failure or
  an opened issue).
- The check is prefix-aware so dated provider ids do not cause false alarms.
- A manual `workflow_dispatch` run passes cleanly against the current model set.
