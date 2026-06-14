from django.contrib import admin
from .models import AIJob, Faction, System, Planet

@admin.register(Faction)
class FactionAdmin(admin.ModelAdmin):
    list_display = ("name", "home_system")
    readonly_fields = ("name", "home_system")
    def has_add_permission(self, request): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False

@admin.register(System)
class SystemAdmin(admin.ModelAdmin):
    list_display = ("name",)
    readonly_fields = ("name", "planets")
    def has_add_permission(self, request): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False

@admin.register(Planet)
class PlanetAdmin(admin.ModelAdmin):
    list_display = ("name", "resources", "influence")
    readonly_fields = ("name", "resources", "influence")
    def has_add_permission(self, request): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False


@admin.register(AIJob)
class AIJobAdmin(admin.ModelAdmin):
    """Read-only debug panel for async AI jobs: see what ran, what failed, and why."""
    list_display = (
        "id", "feature_type", "status", "model_name",
        "prompt_version", "created_at", "completed_at",
    )
    list_filter = ("status", "feature_type", "model_provider")
    search_fields = ("id", "model_name", "error_message")
    readonly_fields = (
        "id", "feature_type", "status", "model_provider", "model_name",
        "prompt_version", "input_payload_json", "result_payload_json",
        "error_message", "created_at", "started_at", "completed_at",
    )
    def has_add_permission(self, request): return False
    def has_change_permission(self, request, obj=None): return False