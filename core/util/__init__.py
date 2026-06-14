import os

from .utils import reset_database


def startup():
    reset_database()
    print("DB Initialized for new Session.")


# Skip the import-time DB rebuild for management commands / tooling that only
# need the schema (e.g. makemigrations, validate_data) by setting SKIP_DB_STARTUP=1.
if os.environ.get("SKIP_DB_STARTUP") != "1":
    startup()