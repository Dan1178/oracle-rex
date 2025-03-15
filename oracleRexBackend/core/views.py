import json

from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET
from rest_framework import generics

from .models import Faction, Player, System, Tile
from .serializers import FactionSerializer, PlayerSerializer, SystemSerializer, TileSerializer
from .service.ai.rules_chatbot import get_rule_answer
from .service.ai.rules_test import test_rule_chatbot
from .service.ai.strategy_suggester import get_strategy_suggestion
from .service.ai.strategy_test import test_strategy_suggester
from .service.json_output import output_game_as_json
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


# todo: replace with actual csrf settings
@csrf_exempt
def rules_chat_api(request):
    if request.method == 'POST':
        try:
            # Parse JSON body from POST request
            data = json.loads(request.body)
            question = data.get('question', '')

            if not question:
                return JsonResponse({'error': 'No question provided'}, status=400)

            # Get the answer from your rules chatbot
            answer = get_rule_answer(question)
            print(answer)  # todo: remove when satisfied with testing

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

@csrf_exempt
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

@csrf_exempt
def strategy_suggester_api(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            game_json = data.get('game_json', {})
            player_faction = data.get('player_faction', '')
            system_prompt = data.get('system_prompt', None)

            if not game_json or not player_faction:
                return JsonResponse({'error': 'Missing game_json or player_faction'}, status=400)

            strategy = get_strategy_suggestion(game_json, player_faction, system_prompt)

            return JsonResponse({
                'faction': player_faction,
                'strategy': strategy
            })

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON format'}, status=400)
        except Exception as e:
            return JsonResponse({'error': f'Unexpected error: {str(e)}'}, status=500)

    return JsonResponse({'error': 'Method not allowed, use POST'}, status=405)


# todo remove or rename when testing complete
@require_GET
def test_api(request):
    try:
        build_game_from_string(
            "78 40 42 67 28 38 76 43 21 44 77 63 50 64 74 48 49 39 1 71 35 16 27 36 55 31 20 58 69 45 4 23 22 57 34 25",
            "Test")
        return JsonResponse({"message": "Test board created successfully."}, status=200)
    except Exception as e:
        return JsonResponse({"error": f"Unexpected error: {str(e)}"}, status=500)


@require_GET
def test_json_api(request):
    try:
        json = output_game_as_json("Test")
        return JsonResponse(json, status=200)
    except Exception as e:
        return JsonResponse({"error": f"Unexpected error: {str(e)}"}, status=500)


@require_GET
def test_rule_chatbot_api(request):
    try:
        rule_answer = test_rule_chatbot()
        return JsonResponse(rule_answer, status=200)
    except Exception as e:
        return JsonResponse({"error": f"Unexpected error: {str(e)}"}, status=500)


@require_GET
def test_rule_chatbot_api(request):
    try:
        strategy_answer = test_strategy_suggester()
        return JsonResponse(strategy_answer, status=200)
    except Exception as e:
        return JsonResponse({"error": f"Unexpected error: {str(e)}"}, status=500)
