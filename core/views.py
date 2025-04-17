import json

from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_GET
from rest_framework import generics
from rest_framework.decorators import api_view

from .models import Faction, Player, System, Tile
from .serializers import FactionSerializer, PlayerSerializer, SystemSerializer, TileSerializer
from .service.ai_service import get_rules_response, get_strategy_response, get_move_response, get_tac_calc_response
from .service.tts_string_ingest import build_game_from_string
from .util.utils import reset_database


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
def rules_chat_api(request):
    if request.method == 'POST':
        try:
            # Parse JSON body from POST request
            data = json.loads(request.body)
            question = data.get('question', '')
            api_key = data.get('api_key', '')
            model = data.get('model', 'gpt-4')

            if not question:
                return JsonResponse({'error': 'No question provided'}, status=400)

            # Get the answer from your rules chatbot
            answer = get_rules_response(question, api_key, model)

            # Return the response as JSON
            return JsonResponse({
                'question': question,
                'answer': answer
            })

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON format'}, status=400)
        except Exception as e:
            return JsonResponse({'error': f'Unexpected error: {str(e)}'}, status=500)

    return JsonResponse({'error': 'Method not allowed, use POST'}, status=405)


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


def ai_suggest(request, type):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            game_json = data.get('game_json', {})
            player_faction = data.get('player_faction', '')
            system_prompt = data.get('system_prompt', None)
            api_key = data.get('api_key', '')
            model = data.get('model', 'gpt-4')

            if not game_json or not player_faction:
                return JsonResponse({'error': 'Missing game_json or player_faction'}, status=400)

            strategy = "replaceme"
            if type == 'strategy':
                strategy = get_strategy_response(game_json, player_faction, system_prompt, api_key, model)
            elif type == 'move':
                strategy = get_move_response(game_json, player_faction, system_prompt, api_key, model)

            return JsonResponse({
                'faction': player_faction,
                'strategy': strategy
            })

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON format'}, status=400)
        except Exception as e:
            return JsonResponse({'error': f'Unexpected error: {str(e)}'}, status=500)

    return JsonResponse({'error': 'Method not allowed, use POST'}, status=405)


@api_view(['POST'])
def strategy_suggester_api(request):
    return ai_suggest(request, 'strategy')


@api_view(['POST'])
def move_suggester_api(request):
    return ai_suggest(request, 'move')


@api_view(['POST'])
def tactical_calculator_api(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            force_data = data.get('force_data', {})
            system_prompt = data.get('system_prompt', None)
            api_key = data.get('api_key', '')
            model = data.get('model', 'gpt-4')

            if not force_data:
                return JsonResponse({'error': 'Missing force data'}, status=400)

            calc_results = get_tac_calc_response(force_data, system_prompt, api_key, model)

            return JsonResponse({
                'calc_results': calc_results
            })

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON format'}, status=400)
        except Exception as e:
            return JsonResponse({'error': f'Unexpected error: {str(e)}'}, status=500)

    return JsonResponse({'error': 'Method not allowed, use POST'}, status=405)
