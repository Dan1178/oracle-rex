from django.contrib import admin
from .models import Faction, System, Planet

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