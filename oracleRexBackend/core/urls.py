from django.urls import path
from .views import (
    FactionListView, FactionDetailView,
    PlayerListCreateView, PlayerDetailView,
    SystemListView, TileListView
)

urlpatterns = [
    path('factions/', FactionListView.as_view(), name='faction-list'),
    path('factions/<int:pk>/', FactionDetailView.as_view(), name='faction-detail'),
    path('players/', PlayerListCreateView.as_view(), name='player-list'),
    path('players/<int:pk>/', PlayerDetailView.as_view(), name='player-detail'),
    path('systems/', SystemListView.as_view(), name='system-list'),
    path('tiles/', TileListView.as_view(), name='tile-list')
]