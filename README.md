# Oracle Rex

### Live Demo

Currently deployed at https://oracle-rex.onrender.com/

Oracle Rex is an AI-powered companion application for the board game Twilight Imperium. This application was built with a Python (Django) backend and a simple Javascript / HTML frontend, with Django static loading.
TTS Strings required for many functions of this application can be retrieved from a board generated with this tool: https://milty.shenanigans.be/

### Ways to use it (modes)

Oracle Rex supports three modes so it can be explored with or without an API key:

- **Demo mode** — the default public experience. Every feature has a one-click
  sample (the **Demo** boxes in each tab, and prompt chips on Rules Q&A) backed by
  *pregenerated* AI responses stored in [`core/demo/`](core/demo). No API key is
  required and **no provider call is made**, so demo mode can never run up the
  owner's AI bill. Demo results are clearly labeled as saved responses.
- **Live AI (BYOK)** — paste your own provider API key in **Settings** to generate
  fresh responses. Keys stay in the browser and are sent only with your own
  requests (encrypted on the backend before the job runs; never stored).
- **Private live demo** — for interviews: an owner-set access code unlocks a
  controlled backend key behind a cheap model, an output-token cap, and a daily
  request limit (see the live-demo env vars under *Deployment*).

The following tabs make up all the functions of this application:
  
  - **Settings**: This tab allows the user to enter an api key for X AI and OpenAI. These keys are not stored in the backend.
    This tab also allows the user to select an AI model to use for each tab.
  
    **Planned Features**: 
    - Add additional LLM integrations
    - Allow the user to select between AI 'personalities'
  

  - **Rules Q&A**: A text chatbot that can answer questions about TI rules. Prompt has been tweaked to make the response more to-the-point.
  
    **Planned Features**:
    - Allow the user to check a box for a more verbose, beginner-friendly response.


  - **Strategy Suggester**: Accepts a TTS String to recreate a board and allows the user to select a faction to get overall strategy advice for.
  
    **Planned Features**:
    - Allow the user to select what stages of the game to get strategies for, i.e. first turn, mid-game, etc.
    - Stylize / better format for the AI response.


  - **Fleet Manager**: This tab builds a board state for use with the Move Suggester. Like the Strategy tab, it accepts a TTS String to build a board.
  It then allows the user to click each individual tile and add units for a given player to the system and any planets within the system.
  Once complete, the user can export this board state to the move suggester. The board state json can be copied to clipboard, saved in a .json file, or uploaded from a .json file.
  
    **Planned Features**:
    - JSON validation
    - Allow a user to copy and paste fleets between tiles
    - Once ships are added to a tile, have the tile display the player number the fleet belongs to and the number of ships in the tile.


  - **Move Suggester**: This tab accepts a board state from the Fleet Manager and allows the user to get a suggestion for the next move for a given player.
  
    **Planned Features**:
    - Parse the AI response to determine tiles being mentioned, and highlight those tiles once a response is received.
    - Stylize / better format for the AI response.
    

  - **Tactical Calculator**: This tab allows a user to build a fleet for a friendly and enemy player. The user can then get an AI assessment of the odds of victory for the attacker,
  plus the minimum (50% odds of success) and recommended (80+% odds of success) fleet composition for the attack.
  User has the option of including ground units to calculate odds for taking the planet as well.
  
    **Planned Features**:
    - Stylize / better format for the AI response.

Currently, this application supports the 4th Edition of the game with the Prophecy of Kings expansion, 6-player board only.

**Planned Improvements to Game Data**
- Revealed public objectives
- Technologies
- Current score
- Secret objectives


## To Run Locally:

Execute the following commands to install dependencies:

    python -m pip install --upgrade pip
    pip install -r requirements.txt

Apply database migrations:

    python manage.py migrate

Run the application with a single process. For local development set
`DJANGO_DEBUG=1` so your edited `static/` files (JS/CSS) are served directly:

    # PowerShell
    $env:DJANGO_DEBUG = "1"
    python manage.py runserver

    # bash
    DJANGO_DEBUG=1 python manage.py runserver

Without `DJANGO_DEBUG=1`, the app runs in production mode (`DEBUG=False`) and
WhiteNoise serves the **collected** copies in `staticfiles/` — so after any
JS/CSS change you must re-run `python manage.py collectstatic`. (Stale collected
assets calling old endpoints is a common source of "Unexpected token '<'" JSON
errors in the browser.)

AI features run as **asynchronous jobs** so long provider calls don't time out
the web request (see "Async AI jobs" below). By default they execute in an
in-process thread pool on the web server, so **no separate worker is needed** for
local development or a free single-service deployment.

### Database

The database is configured from the `DATABASE_URL` environment variable
(`dj-database-url`). With no `DATABASE_URL` set it falls back to a local SQLite
file (WAL mode is enabled automatically so the web request and in-process job
threads don't trip over each other), which is fine for local runs and the free
deployment. To match a Postgres production setup:

    DATABASE_URL=postgres://user:pass@localhost:5432/oracle_rex

### Async AI jobs

Each AI feature POSTs to a `/api/jobs/<feature>/` endpoint that returns a job id
immediately; the job runs in the background; the frontend polls `/api/jobs/<id>/`
until the job is `completed`/`failed`/`timeout`. BYOK API keys are encrypted
(Fernet) into the job's enqueue argument and decrypted only when the job runs —
they are never stored on the job row. Recent jobs (including failures and the
prompt version used) are visible in the Django admin under **AI jobs**.

The execution backend is chosen by `AI_JOB_BACKEND`:

- **`thread`** (default) — run jobs in an in-process thread pool on the web
  server. Zero extra infrastructure; runs on a single free host. An in-flight
  job is lost if the web process restarts (a stale-job reaper resolves the row to
  `timeout` on the next poll).
- **`django_q`** — enqueue to a separate, durable [Django-Q](https://django-q2.readthedocs.io/)
  worker that survives restarts. Run the worker as a second process:

      python manage.py qcluster        # only when AI_JOB_BACKEND=django_q

  Use a Procfile runner such as [honcho](https://github.com/nickstenning/honcho)
  (`honcho start`) to launch web + worker together. This path is best paired with
  Postgres (set `DATABASE_URL`).

Optional environment variables:

- `AI_JOB_BACKEND` — `thread` (default) or `django_q`.
- `AI_JOB_THREADS` — thread-pool size for the `thread` backend (default 4).
- `AIJOB_FERNET_KEY` — stable key for BYOK encryption. If unset, one is derived
  from `SECRET_KEY`. When using the `django_q` backend across two processes, both
  share `SECRET_KEY` (or set the same `AIJOB_FERNET_KEY` on both) so the key
  matches.
- `Q_WORKERS` — Django-Q worker process count (default 2; `django_q` backend only).

### Demo mode & private live access (Milestone 3)

Demo mode needs no configuration — the sample scenarios and cached responses live
in [`core/demo/`](core/demo) and are served by the `/api/demo/` endpoints.

The optional **private live demo** lets an interviewer run *live* AI on the
owner's key without exposing it. It is **off unless both** an access code and a
backend key are set:

- `DEMO_LIVE_ACCESS_CODE` — code a user enters in Settings to unlock live AI on
  the owner's key.
- `DEMO_LIVE_API_KEY` — the owner's provider API key used for those requests.
- `DEMO_LIVE_MODEL` — model forced for live-demo requests (default
  `gpt-5.4-nano`, a cheap/fast model).
- `DEMO_LIVE_MAX_OUTPUT_TOKENS` — optional hard output cap. Default `0` uses the
  reasoning-safe **per-feature** caps (`config.live_demo_max_tokens`: ~3000 for
  rules/calc, ~7000 for strategy/move) so the heavier reasoning features aren't
  starved into empty output. Set a positive value only to force one ceiling
  across all features (a low value can break strategy/move).
- `DEMO_LIVE_DAILY_LIMIT` — max shared live-demo requests per UTC day (default
  50; `0` disables the limit). Counted in the cache; resets daily and on restart.

### Data correctness & validation (Milestone 4)

The board data (systems, planets, factions, wormholes, anomalies, legendary
planets) lives in [`core/util/default_data/`](core/util/default_data) and is
loaded into the DB by `reset_database()` on each session start. The canonical
reference is the **Milty Draft** export, copied verbatim into
[`core/data/source/`](core/data/source) (`milty_draft_tiles.json`,
`milty_draft_factions.json`).

Oracle Rex preserves Milty Draft's data while using its own field names — e.g.
planet `specialty: "biotic"` is stored as `tech_specialty: "green"`
(`biotic→green`, `propulsion→blue`, `cybernetic→yellow`, `warfare→red`).

Run the validators locally (exits non-zero on any mismatch, so it can gate CI):

    python manage.py validate_data

The validators ([`core/data/validators.py`](core/data/validators.py)) check:

- **internal consistency** — unique tile ids; valid wormhole/anomaly/trait/tech
  values against the model constants; no orphan planets; systems reference real
  planets; factions reference real home systems.
- **Milty source parity** — every tile/planet/faction matches the canonical
  export (resources, influence, trait, tech specialty, legendary, wormhole,
  anomaly, planet membership, faction ids and home tiles).
- **tile images** — every system has a board graphic
  (`static/images/systems/ST_<tile_id>.png`).
- **TTS parser config** — the home-system ids the parser accepts are exactly the
  faction home tiles in the source data.

These checks are also run as part of the test suite
([`core/tests/test_data_validation.py`](core/tests/test_data_validation.py)).

### Running the tests

    python manage.py test core.tests

(Use `core.tests`, not `core` — the hyphenated project directory breaks bare
test discovery.)

## Frontend (React/TypeScript) — Milestone 5

The frontend is being migrated from the legacy plain-JS / Django-template UI to a
React + TypeScript single-page app built with **Vite** and integrated into
Django via **django-vite**. The app lives in `frontend/` and is served by the
same single web service (no separate host, no CORS) — Vite builds hashed bundles
into `frontend/dist`, `collectstatic` picks them up, and WhiteNoise serves them.

During the migration the React SPA is mounted at a **temporary `/app` route**;
the legacy UI stays at `/` until the final cutover.

**Prerequisites:** Node 22+ and npm 10+.

    cd frontend
    npm install

**Dev loop (HMR):** run Django and the Vite dev server side by side, and set
`DJANGO_VITE_DEV_MODE=1` so the SPA loads its modules from Vite (with hot reload)
while the API stays same-origin on Django:

    # terminal 1 — Django
    # PowerShell
    $env:DJANGO_VITE_DEV_MODE = "1"; python manage.py runserver
    # bash
    DJANGO_VITE_DEV_MODE=1 python manage.py runserver

    # terminal 2 — Vite dev server
    cd frontend
    npm run dev

Then open <http://localhost:8000/app/> (Django serves the shell; Vite serves the
React code with HMR). Alternatively, visit the Vite server directly at
<http://localhost:5173/> — it proxies `/api` to Django on :8000.

**Production build (what Render runs):**

    cd frontend
    npm run build            # tsc + vite build -> frontend/dist (+ manifest)
    cd ..
    python manage.py collectstatic --noinput

With `DJANGO_VITE_DEV_MODE` unset, django-vite resolves assets from the build
manifest — the same path used in production. Other frontend scripts:

    npm run lint             # ESLint
    npm run format           # Prettier (use format:check in CI)
    npm test                 # Vitest

CI (`.github/workflows/django.yml`) runs the frontend lint/format/test/build in a
dedicated `frontend` job alongside the Django job.

## Deployment:

This application automatically deploys on Render when a successful build runs on the main branch.
See CI.yml for details.

The included **`render.yaml` Blueprint** deploys the default setup as a **single
free web service** (`AI_JOB_BACKEND=thread`, in-process jobs, SQLite). In the
Render dashboard choose *New > Blueprint* and point it at this repo. It generates
`DJANGO_SECRET_KEY` automatically; no worker or database add-on is required.

To upgrade to the **durable separate-worker** setup (jobs survive restarts),
uncomment the worker service and Postgres database in `render.yaml` and set
`AI_JOB_BACKEND=django_q` on both services. Notes:

- A background worker needs a **paid** Render instance — the free tier doesn't
  offer background workers.
- Free-tier Postgres expires after ~30 days; use a paid plan for anything
  long-lived.
- The Blueprint shares the web service's generated `DJANGO_SECRET_KEY` with the
  worker, so both derive the same BYOK-encryption key with no manual step.

## LLMs in Use:
    - grok-4.3
    - grok-4.20
    - gpt-5.5
    - gpt-5.4
    - gpt-5.4-mini
    - gpt-5.4-nano