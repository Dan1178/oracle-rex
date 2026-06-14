"""Worker-side execution of asynchronous AI jobs (Milestone 2).

``run_ai_job`` is the function Django-Q runs in the background worker. It loads an
``AIJob`` row, decrypts the BYOK key handed in as a task argument, dispatches to
the centralized AI service by ``feature_type``, and writes the result (or a
terminal failure state) back onto the row. The browser, meanwhile, only polls the
job's status — the long provider call never runs inside an HTTP request, which is
what fixes the Render timeout.

Known failures (``AIServiceError``) are caught here and mapped onto terminal
statuses, so the task itself "succeeds" from Django-Q's point of view. The
``ai_job_complete`` hook is a safety net for the *un*caught case — chiefly the
Q-cluster killing a task that blew past its hard timeout — where ``run_ai_job``
never got to save a terminal state and the row would otherwise be stuck at
``running``.
"""

import logging
import time

from django.utils import timezone

from .models import AIJob
from .service.ai import config, service
from .service.ai.crypto import decrypt_key
from .service.ai.errors import (
    AIServiceError,
    MalformedResponseError,
    ProviderTimeoutError,
)

logger = logging.getLogger("core.jobs")


# --- result builders -------------------------------------------------------
# Each returns the dict the frontend renders, mirroring the legacy sync
# endpoints so the polling UI can read the same fields.

def _run_rules(payload, api_key, model):
    answer = service.get_rules_response(payload.get("question", ""), api_key, model)
    return {
        "question": payload.get("question", ""),
        "answer": answer.to_display_text(),
        "structured": answer.model_dump(),
    }


def _run_strategy(payload, api_key, model):
    result = service.get_strategy_response(
        payload.get("game_json", {}), payload.get("player_faction", ""), api_key, model
    )
    return {
        "faction": payload.get("player_faction", ""),
        "strategy": result.to_display_text(),
        "structured": result.model_dump(),
    }


def _run_move(payload, api_key, model):
    result = service.get_move_response(
        payload.get("game_json", {}), payload.get("player_faction", ""), api_key, model
    )
    return {
        "faction": payload.get("player_faction", ""),
        "strategy": result.to_display_text(),
        "structured": result.model_dump(),
    }


def _run_tac_calc(payload, api_key, model):
    text = service.get_tac_calc_response(payload.get("force_data", {}), api_key, model)
    return {"calc_results": text}


_DISPATCH = {
    AIJob.FeatureType.RULES: _run_rules,
    AIJob.FeatureType.STRATEGY: _run_strategy,
    AIJob.FeatureType.MOVE: _run_move,
    AIJob.FeatureType.TAC_CALC: _run_tac_calc,
}


def _status_for_error(exc: AIServiceError) -> str:
    """Map an AIServiceError onto a terminal job status."""
    if isinstance(exc, ProviderTimeoutError):
        return AIJob.Status.TIMEOUT
    if isinstance(exc, MalformedResponseError):
        return AIJob.Status.VALIDATION_FAILED
    return AIJob.Status.FAILED


def run_ai_job(job_id, encrypted_key: str = "") -> str:
    """Execute one AIJob. Returns the terminal status string.

    Always saves a terminal state and never re-raises a known failure, so the
    Django-Q task is considered successful even when the AI call failed — the
    failure lives on the AIJob row, which is what the frontend reads.
    """
    try:
        job = AIJob.objects.get(pk=job_id)
    except AIJob.DoesNotExist:
        logger.error("run_ai_job called for missing job %s", job_id)
        return AIJob.Status.FAILED

    job.status = AIJob.Status.RUNNING
    job.started_at = timezone.now()
    job.save(update_fields=["status", "started_at"])

    api_key = decrypt_key(encrypted_key)
    runner = _DISPATCH.get(job.feature_type)
    started = time.monotonic()

    if runner is None:
        job.status = AIJob.Status.FAILED
        job.error_message = f"Unknown feature type: {job.feature_type}"
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "error_message", "completed_at"])
        logger.error("AIJob %s has unknown feature_type %r", job.id, job.feature_type)
        return job.status

    try:
        result = runner(job.input_payload_json or {}, api_key, job.model_name)
    except AIServiceError as exc:
        job.status = _status_for_error(exc)
        job.error_message = exc.user_message
        logger.warning(
            "AIJob %s (%s) failed in %.1fs: %s | %s",
            job.id, job.feature_type, time.monotonic() - started,
            type(exc).__name__, exc.detail or exc.user_message,
        )
    except Exception as exc:  # noqa: BLE001 - last-resort guard, keep job terminal
        job.status = AIJob.Status.FAILED
        job.error_message = "An unexpected error occurred while processing the request."
        logger.exception("AIJob %s crashed: %s", job.id, exc)
    else:
        job.status = AIJob.Status.COMPLETED
        job.result_payload_json = result
        logger.info(
            "AIJob %s (%s) completed in %.1fs",
            job.id, job.feature_type, time.monotonic() - started,
        )

    job.completed_at = timezone.now()
    job.save(
        update_fields=["status", "result_payload_json", "error_message", "completed_at"]
    )
    return job.status


def ai_job_complete(task) -> None:
    """Django-Q hook: catch jobs the worker killed before they could finish.

    ``run_ai_job`` handles known errors itself and leaves the task successful, so
    this only fires meaningfully when the task did *not* succeed — almost always
    the Q-cluster killing a run that exceeded its hard ``timeout``. In that case
    ``run_ai_job`` never saved a terminal status, so the row is stuck at
    ``running``; mark it ``timeout`` so the frontend stops polling and shows a
    usable error.
    """
    if task.success:
        return

    job_id = task.args[0] if task.args else None
    if not job_id:
        logger.error("ai_job_complete: failed task %s has no job id", task.id)
        return

    updated = (
        AIJob.objects.filter(pk=job_id)
        .exclude(status__in=list(AIJob.TERMINAL_STATUSES))
        .update(
            status=AIJob.Status.TIMEOUT,
            error_message=ProviderTimeoutError().user_message,
            completed_at=timezone.now(),
        )
    )
    if updated:
        logger.warning(
            "AIJob %s force-failed to 'timeout' by worker (task result: %s)",
            job_id, task.result,
        )
