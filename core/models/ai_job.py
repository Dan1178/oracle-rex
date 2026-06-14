import uuid

from django.db import models


class AIJob(models.Model):
    """A single asynchronous AI request.

    The browser submits a request, the backend creates one of these rows
    (status ``queued``) and enqueues a Django-Q task, and the frontend polls the
    status endpoint until the job reaches a terminal state. This is what keeps
    the long provider call off the web request path so Render doesn't time it out
    (Milestone 2).

    The user's BYOK API key is **never** stored here. It is encrypted and passed
    as a Django-Q task argument instead (see ``core.service.ai.crypto`` and
    ``core.jobs``), so no plaintext key sits in the database.
    """

    class FeatureType(models.TextChoices):
        RULES = "rules", "Rules Chat"
        STRATEGY = "strategy", "Strategic Plan"
        MOVE = "move", "Tactical Move"
        TAC_CALC = "tac_calc", "Battle Calculator"

    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        TIMEOUT = "timeout", "Timed Out"
        VALIDATION_FAILED = "validation_failed", "Validation Failed"

    # States past which a job will never change again.
    TERMINAL_STATUSES = frozenset(
        {Status.COMPLETED, Status.FAILED, Status.TIMEOUT, Status.VALIDATION_FAILED}
    )

    # Non-guessable primary key — job ids are exposed in the polling URL.
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    feature_type = models.CharField(max_length=20, choices=FeatureType.choices)
    input_payload_json = models.JSONField(
        default=dict,
        help_text="Feature inputs (question / board / fleets). Never the API key.",
    )
    result_payload_json = models.JSONField(
        null=True,
        blank=True,
        help_text="The response the frontend renders, once the job completes.",
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.QUEUED
    )
    error_message = models.TextField(blank=True, default="")

    model_provider = models.CharField(max_length=30, blank=True, default="")
    model_name = models.CharField(max_length=60, blank=True, default="")
    prompt_version = models.CharField(max_length=60, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"AIJob {self.id} ({self.feature_type}/{self.status})"

    @property
    def is_terminal(self) -> bool:
        return self.status in self.TERMINAL_STATUSES
