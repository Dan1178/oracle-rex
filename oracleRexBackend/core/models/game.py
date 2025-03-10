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

    def to_json(self): #todo: change this so it includes all relevant info the LLM will need
        data = {
            "name": self.name,
            "players": [player.id for player in self.players.all()],
            "board": [tile.__str__() for tile in self.board.all()]
        }
        return data
