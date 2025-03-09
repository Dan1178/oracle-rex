from django.db import models

from .faction import Faction
from .tile import Tile

class Player(models.Model):
    username = models.CharField(max_length=100, unique=True)
    faction = models.OneToOneField(Faction, on_delete=models.SET_NULL, null=True, blank=True)
    starting_position = models.ForeignKey(Tile, on_delete=models.SET_NULL, null=True) #todo make this a number 1-6 instead?

    def __str__(self):
        return self.username