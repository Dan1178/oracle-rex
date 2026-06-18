# dev.ps1 — start the full local dev stack (Django API + Vite dev server) with
# one call, from the repo root:
#
#     .\dev.ps1
#
# Runs Django in the foreground and the Vite dev server in the background, both
# logging to this terminal. Press Ctrl+C once to stop both. Then open:
#
#     http://localhost:8000/      (React SPA, served by Django + Vite HMR)
#
# Sets the dev env vars for you:
#   DJANGO_VITE_DEV_MODE=1  -> the SPA loads its modules from Vite (hot reload)
#   DJANGO_DEBUG=1          -> dev error pages + the legacy '/' serves fresh static

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# Prefer the project venv's Python; fall back to whatever 'python' is on PATH.
$python = Join-Path $root '.venv\Scripts\python.exe'
if (-not (Test-Path $python)) { $python = 'python' }

$env:DJANGO_VITE_DEV_MODE = '1'
$env:DJANGO_DEBUG = '1'

Write-Host 'Starting Vite dev server + Django runserver (Ctrl+C to stop both)...' -ForegroundColor Cyan

# Vite in the background (shares this console so its output is visible). Launch
# via cmd.exe /c so Windows resolves `npm` -> `npm.cmd` through PATHEXT; passing
# 'npm' to Start-Process directly hits the extensionless Unix npm shim and fails
# with "%1 is not a valid Win32 application".
$vite = Start-Process -FilePath "$env:ComSpec" -ArgumentList '/c', 'npm', 'run', 'dev' `
    -WorkingDirectory (Join-Path $root 'frontend') -NoNewWindow -PassThru

try {
    # Django in the foreground — Ctrl+C lands here and returns to the finally.
    & $python (Join-Path $root 'manage.py') runserver
}
finally {
    if ($vite -and -not $vite.HasExited) {
        # /T kills the whole tree (npm.cmd -> node -> esbuild), avoiding an
        # orphaned Vite process — the usual Windows footgun here.
        taskkill /PID $vite.Id /T /F 2>$null | Out-Null
    }
    Write-Host 'Dev stack stopped.' -ForegroundColor Cyan
}
