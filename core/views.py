import json
import logging

from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_GET
from rest_framework import generics
from rest_framework.decorators import api_view

from .jobs import enqueue_ai_job, reap_if_stale
from .models import AIJob, Faction, Player, System, Tile
from .serializers import FactionSerializer, PlayerSerializer, SystemSerializer, TileSerializer
from .service.ai import config
from .service.ai.crypto import encrypt_key
from .service.tts_string_ingest import build_game_from_string
from .util.utils import reset_database

logger = logging.getLogger("core.jobs")


###########         FRONTEND        ################################
def frontend_view(request):
    return render(request, 'index.html')


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

def _create_ai_job(feature_type, input_payload, api_key, model):
    """Create an AIJob row and enqueue it for the background worker.

    The BYOK key is encrypted into the task argument and is never written to the
    AIJob row (see core.service.ai.crypto).
    """
    resolved = config.resolve_model(model)
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

    job = _create_ai_job(
        AIJob.FeatureType.RULES,
        {'question': question},
        data.get('api_key', ''),
        data.get('model', 'gpt-4'),
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

    job = _create_ai_job(
        feature_type,
        {'game_json': game_json, 'player_faction': player_faction},
        data.get('api_key', ''),
        data.get('model', 'gpt-4'),
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

    job = _create_ai_job(
        AIJob.FeatureType.TAC_CALC,
        {'force_data': force_data},
        data.get('api_key', ''),
        data.get('model', 'gpt-4'),
    )
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
