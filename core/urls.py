from django.urls import path

from .views import (

    # Backend
    FactionListView, FactionDetailView,
    PlayerListCreateView, PlayerDetailView,
    SystemListView, TileListView, reset_database_api, build_game_from_tts_api,

    # Async AI jobs (Milestone 2)
    rules_job_create, strategy_job_create, move_job_create, tactical_job_create,
    ai_job_status,

    # Demo mode (Milestone 3)
    demo_catalog, demo_status, demo_job_create,

    # Front end

    frontend_view,
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
    path('build-game-from-tts/', build_game_from_tts_api, name='build_game_from_tts'),

    ### ASYNC AI JOBS (Milestone 2)
    path('jobs/rules/', rules_job_create, name='rules_job_create'),
    path('jobs/strategy/', strategy_job_create, name='strategy_job_create'),
    path('jobs/move/', move_job_create, name='move_job_create'),
    path('jobs/tactical/', tactical_job_create, name='tactical_job_create'),
    path('jobs/<uuid:job_id>/', ai_job_status, name='ai_job_status'),

    ### DEMO MODE (Milestone 3)
    path('demo/catalog/', demo_catalog, name='demo_catalog'),
    path('demo/status/', demo_status, name='demo_status'),
    path('demo/run/', demo_job_create, name='demo_job_create'),

    ### FRONTEND
    # The React/TS single-page app (served at '/'). Any non-API path renders the
    # SPA shell; client-side state drives the tabs.
    path('', frontend_view, name='frontend'),
]
