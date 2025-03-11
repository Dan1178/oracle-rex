from django.db import models

from .faction import Faction
from .tile import Tile


class Player(models.Model):
    username = models.CharField(max_length=100, unique=True)
    faction = models.OneToOneField(Faction, on_delete=models.SET_NULL, null=True, blank=True)
    starting_position = models.ForeignKey(Tile, on_delete=models.SET_NULL,
                                          null=True)

    def __str__(self):
        return self.username

    def to_json(self):
        return {
            "username": self.username,
            "faction": self.faction.name if self.faction else None,
            "starting_position": self.starting_position.designation if self.starting_position else None
        }
