from django.db import models

from .constants.anomalyConstants import AnomalyType
from .constants.wormholeConstants import WormholeType
from .planet import Planet


class System(models.Model):
    name = models.CharField(max_length=100)
    tile_id = models.CharField(max_length=4)
    planets = models.ManyToManyField(Planet, related_name="systems")
    anomaly = models.CharField(
        max_length=20,
        choices=AnomalyType,
        default="none"
    )
    wormhole = models.CharField(
        max_length=20,
        choices=WormholeType,
        default="none"
    )

    def __str__(self):
        return self.name
