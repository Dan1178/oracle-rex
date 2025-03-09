from django.db import models

from player import Player
from tile import Tile

class Game(models.Model):
    name = models.CharField(max_length=500, unique=True)
    players = models.ManyToManyField(Player, on_delete=models.CASCADE)
    board = models.ManyToManyField(Tile, on_delete=models.CASCADE)

    def __str__(self):
        return self.name
