# Feature: Gemini (server-held key) integration

## Status

Planned (2026-06-22). Not started. Owner has a free Gemini API key in hand.
Intended to be implemented in a fresh full-context session (this was scoped at
end of a session with little context left).

## Objective

Add Google Gemini as a model option that runs on a key held in the backend, so
demo users get free live AI without bringing their own key (BYOK) and without the
key ever reaching the browser. This is a new credential path alongside the
existing BYOK and access-code paths.

## Why this is bigger than "add a client"

The Gemini client itself is small. The real work is the **server-held-key
credential path**, which today does not exist:

- Every live request is currently BYOK (frontend sends `api_key`) or gated by a
  private-live-demo access code (owner key, server-side).
- A Gemini selection must be usable with **no user key and no access code**: the
  backend supplies the key from an env var. That changes job-create validation,
  the frontend `getCredentials` logic, and the settings UI.

## Security design (the crux)

- `GEMINI_API_KEY` is read from the environment into Django settings. It is never
  sent to the frontend and never echoed back. The client reads it server-side;
  any `api_key` in the request is ignored for Gemini models.
- Because anonymous users can trigger it on the owner's (free-tier) key, abuse /
  quota protection is REQUIRED before exposing it publicly. This is the plan's
  existing non-goal ("no unlimited public live AI on an owner-paid key"). Reuse
  the per-feature output caps (`live_demo_max_tokens` in `config.py`) and add
  lightweight rate limiting (per-IP and/or a global daily cap). Do not ship the
  public path without a cap.
- Treat it like the controlled live demo, minus the access code, with the free
  tier plus caps plus rate limiting as the cost ceiling.

## Backend changes

1. `requirements.txt`: add `langchain-google-genai` (Gemini via LangChain, so it
   reuses the existing `with_structured_output` flow in `service.py`).
2. `core/service/ai/config.py`: add `GOOGLE = "google"`, a `GEMINI_MODELS` list
   (use the exact model ids from AI Studio, e.g. the Flash model the owner sees),
   and extend `PROVIDER_FOR_MODEL`.
3. `core/service/ai/clients/gemini_client.py`: a client returning
   `ChatGoogleGenerativeAI(...)`. Crucially, it pulls the key from
   `settings.GEMINI_API_KEY` (env), NOT from a passed `api_key`.
4. `core/service/ai/clients/__init__.py` (`get_chat`): when the model's provider
   is `google`, build the Gemini client with the server key and ignore the
   request `api_key`.
5. Django settings: `GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")`.
6. Job create / validation (the view that builds `AIJob`): allow a request with
   no key and no access code when the selected model is a Google model. Apply the
   output cap and rate limiting here.
7. Add `GEMINI_API_KEY` to `render.yaml` / deploy env (as a secret, not committed).

## Frontend changes

1. `frontend/src/store/models.ts`: add Gemini option(s) with a new `apiMake`
   value (`'google'`). Extend the `ApiMake` union. Consider a label like
   "Gemini Flash (free, no key needed)".
2. `frontend/src/store/credentials.ts` + settings store `getCredentials`: when the
   selected model's provider is `google`, return ready creds with just `{ model }`
   (no `api_key`, no access code). A Gemini selection is always "ready", so the
   panels' credential-error path is skipped for it.
3. `frontend/src/api/oracleRexApi.ts` + `types/ai.ts`: the job-create payload omits
   `api_key` for Google models.
4. Settings UI: a short note that Gemini runs free on a server-provided key, no
   user key required.

## Tests

- Backend: `get_chat` routes a Google model to the Gemini client using the env
  key and ignores any passed `api_key`; a Google-model job is accepted with no key
  / no access code; the output cap and rate limit apply; structured output
  (RulesAnswer etc.) validates from a mocked Gemini response.
- Frontend: `getCredentials` returns ready creds (no key) for a Google model;
  `apiMakeFor` maps Gemini ids to `'google'`; a panel can submit a Gemini job with
  no key entered.

## Build order

1. Backend client + config + `get_chat` routing + settings env (no credential-path
   change yet; prove a Gemini call works with a unit test mocking the SDK).
2. Job-create validation: accept Google models with no key; apply caps.
3. Rate limiting on the server-keyed path.
4. Frontend: models list + `getCredentials` + payload + UI note.
5. Deploy env var; manual end-to-end check; tests; full suite + build + lint.

## Acceptance criteria

- Selecting a Gemini model runs live AI with no user key and no access code.
- The key lives only in the backend env; it never appears in any response or the
  bundle.
- The server-keyed path is rate-limited and output-capped so it cannot run away on
  the free tier.
- Structured features still validate under Gemini.
- BYOK and access-code paths are unchanged.

## Decision to confirm at implementation time

Whether the server-keyed Gemini path is open to all demo users (with rate limiting
plus caps, as written here) or instead gated behind the existing access-code
mechanism. Recommended: open with caps plus rate limiting, since the free tier
bounds cost and the goal is free demo access. Related: [[oracle-rex-upgrade]].
