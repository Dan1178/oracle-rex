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

After the above steps have been completed, you can run the application locally.
AI features now run as **asynchronous background jobs** (so long provider calls
don't time out the web request — see "Async AI jobs" below), which means two
processes: the web server and the Django-Q worker.

    python manage.py runserver        # web (terminal 1)
    python manage.py qcluster         # AI job worker (terminal 2)

If the worker isn't running, AI jobs are created but never processed and the
frontend polls forever. To launch both at once, use a Procfile runner such as
[honcho](https://github.com/nickstenning/honcho):

    honcho start

### Database

The database is configured from the `DATABASE_URL` environment variable
(`dj-database-url`). With no `DATABASE_URL` set it falls back to a local SQLite
file, which is fine for quick local runs. For a setup that matches production —
and to avoid SQLite write-lock contention between the web and worker processes —
point it at Postgres (Docker is fine):

    DATABASE_URL=postgres://user:pass@localhost:5432/oracle_rex

### Async AI jobs

Each AI feature POSTs to a `/api/jobs/<feature>/` endpoint that returns a job id
immediately; the worker runs the provider call; the frontend polls
`/api/jobs/<id>/` until the job is `completed`/`failed`/`timeout`. BYOK API keys
are encrypted (Fernet) before they enter the Django-Q broker and decrypted only
in the worker — they are never stored on the job row. Recent jobs (including
failures and the prompt version used) are visible in the Django admin under
**AI jobs**.

Optional environment variables:

- `AIJOB_FERNET_KEY` — stable key for BYOK encryption shared by web + worker.
  If unset, one is derived from `SECRET_KEY` (both processes derive it
  identically).
- `Q_WORKERS` — worker process count (default 2).

## Deployment:

This application automatically deploys on Render when a successful build runs on the main branch.
See CI.yml for details.

Render runs **two services** against the same Postgres instance:

- a **Web Service** with start command `gunicorn oracle-rex.wsgi:application`
- a **Background Worker** with start command `python manage.py qcluster`

The simplest way to provision all three resources (web, worker, Postgres) wired
together is the included **`render.yaml` Blueprint**: in the Render dashboard
choose *New > Blueprint* and point it at this repo. It generates a shared
`DJANGO_SECRET_KEY` on the web service and references it from the worker, so both
processes derive the same BYOK-encryption key with no manual step.

Notes:

- The background worker needs a **paid** instance — Render's free tier doesn't
  offer background workers. Without a running worker, AI jobs are created but
  never processed.
- Free-tier Postgres expires after ~30 days; switch the `oracle-rex-db` plan to a
  paid tier for anything long-lived.
- To set your own `AIJOB_FERNET_KEY` instead of deriving it from the secret key,
  add the **same** value to both the web and worker services.

## LLMs in Use:
    - grok-4.3
    - grok-4.20
    - gpt-5.5
    - gpt-5.4
    - gpt-5.4-mini
    - gpt-5.4-nano