from django.db import models

from .constants.anomalyConstants import AnomalyType
from .constants.wormholeConstants import WormholeType
from .planet import Planet
from .units import Fleet


class System(models.Model):
    name = models.CharField(max_length=100)
    tile_id = models.CharField(max_length=4)
    planets = models.ManyToManyField(Planet, related_name="systems")
    anomaly = models.CharField(
        max_length=21,
        choices=AnomalyType,
        default="none"
    )
    wormhole = models.CharField(
        max_length=20,
        choices=WormholeType,
        default="none"
    )
    fleet = models.ForeignKey(Fleet, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.name

    def to_json(self):
        return {
            "name": self.name,
            "tile_id": self.tile_id, #todo: make a different set of to_json methods for passing to LLM
            "anomaly": self.anomaly,
            "wormhole": self.wormhole,
            "planets": [planet.to_json() for planet in self.planets.all()],
            "fleet": self.fleet.to_json() if self.fleet else None,
        }
