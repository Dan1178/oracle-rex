"""Smoke tests for the synchronous battle-simulation endpoint (Milestone 6C)."""

import json

from django.test import Client, SimpleTestCase
from django.urls import reverse


class TestTacticalSimulateEndpoint(SimpleTestCase):
    def setUp(self):
        self.client = Client()
        self.url = reverse("tactical_simulate")

    def _post(self, body):
        return self.client.post(
            self.url, data=json.dumps(body), content_type="application/json"
        )

    def test_returns_structured_result_without_a_key(self):
        resp = self._post(
            {
                "force_data": {
                    "friendly_fleet": {"cruiser": 3},
                    "enemy_fleet": {"cruiser": 2},
                    "friendly_ground_forces": {},
                    "enemy_ground_forces_and_structures": {},
                }
            }
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(
            set(body),
            {"win_probability", "win_percent", "minimum_fleet", "recommended_fleet", "breakdown"},
        )
        self.assertIsInstance(body["win_percent"], int)
        self.assertGreaterEqual(body["win_percent"], 0)
        self.assertLessEqual(body["win_percent"], 100)

    def test_missing_force_data_is_400(self):
        self.assertEqual(self._post({}).status_code, 400)

    def test_invalid_json_is_400(self):
        resp = self.client.post(
            self.url, data="not json", content_type="application/json"
        )
        self.assertEqual(resp.status_code, 400)
