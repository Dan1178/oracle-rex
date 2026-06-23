import json
import logging

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.http import require_GET
from rest_framework import generics
from rest_framework.decorators import api_view

from . import demo
from .jobs import enqueue_ai_job, reap_if_stale
from .models import AIJob, Faction, Player, System, Tile
from .serializers import FactionSerializer, PlayerSerializer, SystemSerializer, TileSerializer
from .service.ai import config
from .service.ai.crypto import encrypt_key
from .service.combat import simulate as simulate_battle
from .service.tts_string_ingest import build_game_from_string
from .util.utils import reset_database

logger = logging.getLogger("core.jobs")


###########         FRONTEND        ################################
def frontend_view(request):
    """Serve the React/TS single-page app (templates/spa.html).

    django-vite emits the hashed bundle tags from the Vite build manifest in
    production, or points at the Vite dev server (HMR) when DJANGO_VITE_DEV_MODE
    is set. As of the Milestone 5 cutover this is the only frontend — the legacy
    plain-JS templates were removed."""
    return render(request, 'spa.html')


###########         BACKEND         ################################

@require_GET
def reset_database_api(request):
    try:
        reset_database()
        return JsonResponse({"message": "Database cleared, defaults restored."}, status=200)
    except Exception as e:
        return JsonResponse({"error": f"Unexpected error: {str(e)}"}, status=500)


class FactionListView(generics.ListAPIView):
    queryset = Faction.objects.all()
    serializer_class = FactionSerializer


class FactionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Faction.objects.all()
    serializer_class = FactionSerializer


class PlayerListCreateView(generics.ListCreateAPIView):
    queryset = Player.objects.all()
    serializer_class = PlayerSerializer


class PlayerDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Player.objects.all()
    serializer_class = PlayerSerializer


class SystemListView(generics.ListAPIView):
    queryset = System.objects.all()
    serializer_class = SystemSerializer


class TileListView(generics.ListAPIView):
    queryset = Tile.objects.all()
    serializer_class = TileSerializer


@api_view(['POST'])
def build_game_from_tts_api(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            tts_string = data.get('tts_string', '')
            game_name = data.get('game_name', '')

            if not tts_string:
                return JsonResponse({'error': 'No TTS string provided'}, status=400)

            game = build_game_from_string(tts_string, game_name)
            game_json = game.to_json()

            return JsonResponse({'game': game_json})

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON format'}, status=400)
        except Exception as e:
            return JsonResponse({'error': f'Unexpected error: {str(e)}'}, status=500)
    return JsonResponse({'error': 'Method not allowed, use POST'}, status=405)


###########     ASYNC AI JOBS (Milestone 2)     ####################
# Every AI feature runs as a background job. The create endpoints return
# immediately with a job id; the worker (`manage.py qcluster`) runs the provider
# call; the frontend polls the status endpoint until the job is terminal. This
# keeps the long provider call off the request path so Render doesn't time it out.

class _CredentialError(Exception):
    """Raised when AI credentials can't be resolved (bad/locked live-demo code)."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


def _live_demo_allow_request() -> bool:
    """Soft daily cap on shared live-demo requests, counted in the cache.

    Resets each UTC day (and on process restart), which is an acceptable cost
    ceiling for a portfolio demo — the goal is to stop runaway owner spend, not
    to be an exact quota.
    """
    limit = settings.DEMO_LIVE_DAILY_LIMIT
    if limit <= 0:
        return True
    key = "live_demo_count:" + timezone.now().strftime("%Y%m%d")
    cache.add(key, 0, 60 * 60 * 24)
    if (cache.get(key) or 0) >= limit:
        return False
    try:
        cache.incr(key)
    except ValueError:  # key expired between add and incr
        cache.set(key, 1, 60 * 60 * 24)
    return True


def _resolve_ai_credentials(data):
    """Resolve (api_key, model, live_demo) for a live AI job.

    A ``access_code`` in the request unlocks the owner-paid private live demo
    (cheap model + per-feature output cap + daily limit) and returns
    ``live_demo=True``. Otherwise the user's own BYOK key and chosen model are
    used with no output cap. Raises ``_CredentialError`` when a supplied access
    code is rejected or the shared limit is reached.
    """
    access_code = (data.get("access_code") or "").strip()
    if access_code:
        if not settings.DEMO_LIVE_ENABLED:
            raise _CredentialError(
                "Live demo access is not enabled on this server. "
                "Use your own API key (BYOK), or try Demo mode."
            )
        if access_code != settings.DEMO_LIVE_ACCESS_CODE:
            raise _CredentialError("That live demo access code is not valid.", status=403)
        if not _live_demo_allow_request():
            raise _CredentialError(
                "The shared live-demo request limit for today has been reached. "
                "Try Demo mode, or use your own API key.",
                status=429,
            )
        logger.info("Live-demo request authorized (model=%s)", settings.DEMO_LIVE_MODEL)
        return settings.DEMO_LIVE_API_KEY, settings.DEMO_LIVE_MODEL, True

    model = data.get("model", "gpt-4")
    # Gemini runs on the server-held key (free tier), usable by anyone with no
    # BYOK key. Because it is the owner's shared key, it goes through the same
    # capped path as the live demo: per-feature output cap (live_demo=True) plus
    # the shared daily request limit, so the free quota can't be drained.
    if config.provider_for_model(config.resolve_model(model)) == config.GOOGLE:
        if not _live_demo_allow_request():
            raise _CredentialError(
                "The shared free-AI request limit for today has been reached. "
                "Try Demo mode, or use your own API key.",
                status=429,
            )
        return config.gemini_api_key(), model, True

    return data.get("api_key", ""), model, False


def _live_demo_token_cap(feature_type) -> int:
    """Output-token cap for a live-demo request, per feature.

    Defaults to the reasoning-safe per-feature cap; an explicit positive
    ``DEMO_LIVE_MAX_OUTPUT_TOKENS`` env value overrides it as a hard ceiling.
    """
    return settings.DEMO_LIVE_MAX_OUTPUT_TOKENS or config.live_demo_max_tokens(feature_type)


def _create_ai_job(feature_type, input_payload, api_key, model, live_demo=False):
    """Create an AIJob row and enqueue it for the background worker.

    The BYOK key is encrypted into the task argument and is never written to the
    AIJob row (see core.service.ai.crypto). For a live-demo request the output is
    capped per feature, carried as an internal ``_max_tokens`` directive on the
    input payload.
    """
    resolved = config.resolve_model(model)
    if live_demo:
        cap = _live_demo_token_cap(feature_type)
        input_payload = {**input_payload, "_max_tokens": int(cap)}
    job = AIJob.objects.create(
        feature_type=feature_type,
        input_payload_json=input_payload,
        model_name=resolved,
        model_provider=config.provider_for_model(resolved),
        prompt_version=config.prompt_version_for(feature_type),
    )
    # The BYOK key is encrypted into the task argument and never stored on the
    # row. enqueue_ai_job routes to the configured backend (thread or Django-Q).
    enqueue_ai_job(str(job.id), encrypt_key(api_key))
    logger.info("Enqueued AIJob %s (%s) on %s", job.id, feature_type, resolved)
    return job


def _job_created_response(job) -> JsonResponse:
    return JsonResponse({'job_id': str(job.id), 'status': job.status}, status=202)


def _job_to_dict(job) -> dict:
    return {
        'id': str(job.id),
        'feature_type': job.feature_type,
        'status': job.status,
        'is_terminal': job.is_terminal,
        'result': job.result_payload_json,
        'error': job.error_message or None,
        'model_name': job.model_name,
        'prompt_version': job.prompt_version,
        'created_at': job.created_at.isoformat() if job.created_at else None,
        'completed_at': job.completed_at.isoformat() if job.completed_at else None,
    }


@api_view(['POST'])
def rules_job_create(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON format'}, status=400)

    question = data.get('question', '')
    if not question:
        return JsonResponse({'error': 'No question provided'}, status=400)

    try:
        api_key, model, live_demo = _resolve_ai_credentials(data)
    except _CredentialError as exc:
        return JsonResponse({'error': exc.message}, status=exc.status)

    job = _create_ai_job(
        AIJob.FeatureType.RULES,
        {'question': question},
        api_key, model, live_demo,
    )
    return _job_created_response(job)


def suggest_job_create(request, type):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON format'}, status=400)

    feature_map = {
        'strategy': AIJob.FeatureType.STRATEGY,
        'move': AIJob.FeatureType.MOVE,
    }
    feature_type = feature_map.get(type)
    if feature_type is None:
        return JsonResponse({'error': f'Unknown suggestion type: {type}'}, status=400)

    game_json = data.get('game_json', {})
    player_faction = data.get('player_faction', '')
    if not game_json or not player_faction:
        return JsonResponse({'error': 'Missing game_json or player_faction'}, status=400)

    try:
        api_key, model, live_demo = _resolve_ai_credentials(data)
    except _CredentialError as exc:
        return JsonResponse({'error': exc.message}, status=exc.status)

    job = _create_ai_job(
        feature_type,
        {'game_json': game_json, 'player_faction': player_faction},
        api_key, model, live_demo,
    )
    return _job_created_response(job)


@api_view(['POST'])
def strategy_job_create(request):
    return suggest_job_create(request, 'strategy')


@api_view(['POST'])
def move_job_create(request):
    return suggest_job_create(request, 'move')


@api_view(['POST'])
def tactical_job_create(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON format'}, status=400)

    force_data = data.get('force_data', {})
    if not force_data:
        return JsonResponse({'error': 'Missing force data'}, status=400)

    try:
        api_key, model, live_demo = _resolve_ai_credentials(data)
    except _CredentialError as exc:
        return JsonResponse({'error': exc.message}, status=exc.status)

    # The LLM explains the numbers the deterministic simulator already produced
    # (M6C), so the job is seeded with the simulation result the client computed.
    job = _create_ai_job(
        AIJob.FeatureType.TAC_CALC,
        {'force_data': force_data, 'simulation': data.get('simulation', {})},
        api_key, model, live_demo,
    )
    return _job_created_response(job)


###########   DETERMINISTIC BATTLE SIM (Milestone 6C)   ############
# The win-odds math is fast, pure Python and needs no API key, so it runs
# *synchronously* in the request — unlike the AI features, which go through the
# async job queue only because the slow provider call must stay off the request
# path. The optional natural-language explanation still goes through the
# tactical AI job, now seeded with these numbers.

@api_view(['POST'])
def tactical_simulate_api(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON format'}, status=400)

    force_data = data.get('force_data', {})
    if not force_data:
        return JsonResponse({'error': 'Missing force data'}, status=400)

    try:
        result = simulate_battle(force_data)
    except Exception as exc:  # noqa: BLE001 - surface a clean error, log the cause
        logger.exception("Battle simulation failed: %s", exc)
        return JsonResponse(
            {'error': 'The battle could not be simulated from that input.'}, status=400
        )
    return JsonResponse(result)


###########         DEMO MODE (Milestone 3)         ################
# The public, no-API-key experience. The catalog drives the one-click sample
# entries in each tab; demo_job_create serves a pregenerated response as a
# pre-completed AIJob so the existing polling frontend renders it unchanged and
# no provider call is ever made (so demo mode can't run up owner AI cost).

@require_GET
def demo_catalog(request):
    return JsonResponse(demo.get_catalog())


@require_GET
def demo_status(request):
    """Tell the frontend which live-AI paths are available."""
    return JsonResponse({'live_demo_enabled': settings.DEMO_LIVE_ENABLED})


@api_view(['POST'])
def demo_job_create(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON format'}, status=400)

    scenario_key = data.get('scenario_key', '')
    result = demo.get_demo_result(scenario_key)
    if result is None:
        return JsonResponse(
            {'error': f'Unknown demo scenario: {scenario_key}'}, status=404
        )

    feature = demo.feature_for(scenario_key)
    now = timezone.now()
    # Pre-completed job: the cached result is already on the row, so the poll
    # endpoint returns it immediately. Tagged provider/model 'demo' so it's
    # obvious in the admin debug panel that no live call ran.
    job = AIJob.objects.create(
        feature_type=feature,
        input_payload_json={'scenario_key': scenario_key},
        result_payload_json=result,
        status=AIJob.Status.COMPLETED,
        model_provider='demo',
        model_name='demo',
        prompt_version=config.prompt_version_for(feature),
        started_at=now,
        completed_at=now,
    )
    logger.info("Served demo AIJob %s (%s) for scenario %s", job.id, feature, scenario_key)
    return _job_created_response(job)


@require_GET
def ai_job_status(request, job_id):
    try:
        job = AIJob.objects.get(pk=job_id)
    except AIJob.DoesNotExist:
        return JsonResponse({'error': 'Job not found'}, status=404)
    # Resolve orphaned 'running' jobs (web process died mid-run) on read.
    job = reap_if_stale(job)
    return JsonResponse(_job_to_dict(job))
