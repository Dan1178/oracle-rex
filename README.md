# Oracle Rex

### Live Demo

Currently deployed at https://oracle-rex.onrender.com/

Oracle Rex is an AI-powered companion application for the board game Twilight Imperium. This application was built with a Python (Django) backend and a simple Javascript / HTML frontend, with Django static loading.
TTS Strings required for many functions of this application can be retrieved from a board generated with this tool: https://milty.shenanigans.be/
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

Execute the following command to generate static files:

    python manage.py collectstatic

Apply database migrations:

    python manage.py migrate

After the above steps have been completed, run the application with a single
process:

    python manage.py runserver

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