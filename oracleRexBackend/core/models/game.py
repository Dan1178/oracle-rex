import json

from django.db import models

from .player import Player
from .tile import Tile


class Game(models.Model):
    name = models.CharField(max_length=500, unique=True)
    players = models.ManyToManyField(Player, related_name="games")
    board = models.ManyToManyField(Tile, related_name="games")

    def __str__(self):
        return self.name

    def to_json(self):
        data = {
            "name": self.name,
            "players": [player.to_json() for player in self.players.all()],
            "board": [tile.to_json() for tile in self.board.all()]
        }
        return data
