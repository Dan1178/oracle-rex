"""Management command: validate Oracle Rex board data.

Runs the data-correctness validators in ``core/data/validators.py`` and reports
any problems. Exits non-zero if any check fails, so it can gate CI.

    python manage.py validate_data
"""

import os

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Validate board data (internal consistency + parity with Milty Draft source)."

    def handle(self, *args, **options):
        # The validators only read in-memory data and JSON; skip the import-time
        # reset_database() side effect in core.util so this command is cheap.
        os.environ.setdefault("SKIP_DB_STARTUP", "1")
        from core.data.validators import run_all_validations

        results = run_all_validations()
        total = sum(len(v) for v in results.values())

        for check, issues in results.items():
            if issues:
                self.stdout.write(self.style.ERROR(f"\n{check}: {len(issues)} issue(s)"))
                for issue in issues:
                    self.stdout.write(f"  - {issue}")
            else:
                self.stdout.write(self.style.SUCCESS(f"{check}: OK"))

        if total:
            self.stderr.write(
                self.style.ERROR(f"\nData validation FAILED with {total} issue(s).")
            )
            raise SystemExit(1)

        self.stdout.write(self.style.SUCCESS("\nAll data validations passed."))
