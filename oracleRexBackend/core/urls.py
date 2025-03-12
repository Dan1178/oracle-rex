from django.urls import path

from .views import (

#Backend
    FactionListView, FactionDetailView,
    PlayerListCreateView, PlayerDetailView,
    SystemListView, TileListView, reset_database_api, rules_chat_api, strategy_suggester_api,

# Front end

    frontend_view,
    #todo remove
    test_json_api, test_api, test_rule_chatbot_api
)

urlpatterns = [

    ### BACKEND
    path('admin/reset', reset_database_api, name='reset-database'),
    path('factions/', FactionListView.as_view(), name='faction-list'),
    path('factions/<int:pk>/', FactionDetailView.as_view(), name='faction-detail'),
    path('players/', PlayerListCreateView.as_view(), name='player-list'),
    path('players/<int:pk>/', PlayerDetailView.as_view(), name='player-detail'),
    path('systems/', SystemListView.as_view(), name='system-list'),
    path('tiles/', TileListView.as_view(), name='tile-list'),
    path('rules-chat/', rules_chat_api, name='rules-chat'),
    path('strategy-suggester/', strategy_suggester_api, name='strategy_suggester'),

    ### FRONTEND
    path('', frontend_view, name='frontend'),

    # todo: remove or rename when testing complete
    path('test/', test_api, name='test'),
    path('testJson/', test_json_api, name='testJson'),
    path('testChatbot/', test_rule_chatbot_api, name='testChatbot'),
    path('testStrategySuggester/', test_rule_chatbot_api, name='testChatbot'),
]
