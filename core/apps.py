from django.apps import AppConfig
from django.db.backends.signals import connection_created


def _enable_sqlite_wal(sender, connection, **kwargs):
    """Put SQLite in WAL mode on every new connection.

    WAL lets readers and a writer work concurrently, which matters because the
    web request thread and the in-process AI job threads (the default async
    backend) write to the same SQLite file. ``synchronous=NORMAL`` is the
    standard, safe pairing with WAL. No-op for non-SQLite backends (Postgres).
    """
    if connection.vendor == 'sqlite':
        with connection.cursor() as cursor:
            cursor.execute('PRAGMA journal_mode=WAL;')
            cursor.execute('PRAGMA synchronous=NORMAL;')


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        connection_created.connect(_enable_sqlite_wal)
