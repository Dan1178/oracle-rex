"""Tests for the React SPA, which is the only frontend after the Milestone 5
cutover (Phase 8).

The SPA is served by Django at ``/``; the temporary ``/app`` mount and the legacy
plain-JS templates are gone. These tests assert the root route renders the
django-vite asset tags without requiring a built Vite manifest in CI: dev_mode=True
makes django-vite emit dev-server tags instead of reading the production manifest.

django-vite caches its asset loader as a singleton read once at first use, so we
reset that singleton around the dev_mode override for it to take effect.
"""

from django.test import TestCase, override_settings
from django.urls import resolve, reverse

from django_vite.core.asset_loader import DjangoViteAssetLoader

from core.views import frontend_view

_DEV_VITE = {
    "default": {
        "dev_mode": True,
        "dev_server_port": 5173,
    }
}


@override_settings(DJANGO_VITE=_DEV_VITE)
class TestSpaRoute(TestCase):
    def setUp(self):
        # Force django-vite to re-read settings (dev_mode=True) instead of the
        # production manifest, so the render works with no built frontend.
        DjangoViteAssetLoader._instance = None

    def tearDown(self):
        DjangoViteAssetLoader._instance = None

    def test_root_resolves_to_frontend_view(self):
        self.assertEqual(resolve("/").func, frontend_view)

    def test_root_renders_spa_shell(self):
        resp = self.client.get(reverse("frontend"))
        self.assertEqual(resp.status_code, 200)
        self.assertTemplateUsed(resp, "spa.html")
        # Mount node the React app renders into.
        self.assertContains(resp, 'id="root"')
        # django-vite emitted the dev-server entry module tag for our app.
        self.assertContains(resp, "src/main.tsx")

    def test_temporary_app_route_removed(self):
        # The migration-era /app mount was retired at cutover.
        self.assertEqual(self.client.get("/app/").status_code, 404)
