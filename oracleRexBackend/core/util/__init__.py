from .utils import reset_database

def startup():
    reset_database()
    print("DB Initialized for new Session.")

startup()