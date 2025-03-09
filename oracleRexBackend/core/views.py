from rest_framework import generics
from .models import Faction, Player, System, Tile
from .serializers import FactionSerializer, PlayerSerializer, SystemSerializer, TileSerializer


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