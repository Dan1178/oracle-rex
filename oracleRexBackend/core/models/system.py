from django.db import models

from .planet import Planet
from .constants.anomalyConstants import AnomalyType
from .constants.wormholeConstants import WormholeType


class System(models.Model):
    name = models.CharField(max_length=100, unique=True)
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
