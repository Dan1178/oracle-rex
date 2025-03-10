from django.http import JsonResponse
from django.views.decorators.http import require_GET
from rest_framework import generics

from .models import Faction, Player, System, Tile
from .serializers import FactionSerializer, PlayerSerializer, SystemSerializer, TileSerializer
from .service.tts_string_ingest import build_game_from_string
from .service.json_output import output_game_as_json
from .util.utils import reset_database


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
