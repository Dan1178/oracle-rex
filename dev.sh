#!/usr/bin/env bash
# dev.sh — start the full local dev stack (Django API + Vite dev server) with one
# call, from the repo root:
#
#     bash dev.sh        # or  ./dev.sh  (after chmod +x dev.sh)
#
# Runs Django in the foreground and the Vite dev server in the background, both
# logging to this terminal. Press Ctrl+C once to stop both. Then open:
#
#     http://localhost:8000/      (React SPA, served by Django + Vite HMR)
#
# Sets the dev env vars for you:
#   DJANGO_VITE_DEV_MODE=1  -> the SPA loads its modules from Vite (hot reload)
#   DJANGO_DEBUG=1          -> dev error pages + the legacy '/' serves fresh static
#
# The PowerShell equivalent is dev.ps1.

set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Prefer the project venv's Python; .venv/Scripts on Windows (Git Bash),
# .venv/bin on Linux/macOS. Fall back to whatever 'python' is on PATH.
if [ -x "$root/.venv/Scripts/python.exe" ]; then
  python="$root/.venv/Scripts/python.exe"
elif [ -x "$root/.venv/bin/python" ]; then
  python="$root/.venv/bin/python"
else
  python="python"
fi

export DJANGO_VITE_DEV_MODE=1
export DJANGO_DEBUG=1

echo "Starting Vite dev server + Django runserver (Ctrl+C to stop both)..."

# Vite in the background.
( cd "$root/frontend" && npm run dev ) &
vite_pid=$!

cleanup() {
  # Stop Vite (and the node child npm spawns) when Django exits / on Ctrl+C.
  kill "$vite_pid" 2>/dev/null || true
  pkill -P "$vite_pid" 2>/dev/null || true
  echo "Dev stack stopped."
}
trap cleanup INT TERM EXIT

# Django in the foreground — Ctrl+C lands here, then the trap tears down Vite.
"$python" "$root/manage.py" runserver
