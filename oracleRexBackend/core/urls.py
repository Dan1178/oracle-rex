from django.urls import path

from .views import (
    FactionListView, FactionDetailView,
    PlayerListCreateView, PlayerDetailView,
    SystemListView, TileListView, reset_database_api, rules_chat_api, test_json_api, test_api, test_rule_chatbot_api
)

urlpatterns = [
    path('admin/reset', reset_database_api, name='reset-database'),
    path('factions/', FactionListView.as_view(), name='faction-list'),
    path('factions/<int:pk>/', FactionDetailView.as_view(), name='faction-detail'),
    path('players/', PlayerListCreateView.as_view(), name='player-list'),
    path('players/<int:pk>/', PlayerDetailView.as_view(), name='player-detail'),
    path('systems/', SystemListView.as_view(), name='system-list'),
    path('tiles/', TileListView.as_view(), name='tile-list'),
    path('rules-chat/', rules_chat_api, name='rules-chat'),
    # todo: remove or rename when testing complete
    path('test/', test_api, name='test'),
    path('testJson/', test_json_api, name='testJson'),
    path('testChatbot/', test_rule_chatbot_api, name='testChatbot'),
]
