from django.db import models

from .constants.unitConstants import ShipClass, StructureClass, GroundUnitClass
from .planet import Planet
from .player import Player
from .system import System


class Ship(models.Model):
    ship_class = models.CharField(
        max_length=20,
        choices=ShipClass.choices
    )
    owner = models.ForeignKey(Player, on_delete=models.CASCADE)
    position = models.ForeignKey(System, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return self.ship_class


class Structure(models.Model):
    struct_class = models.CharField(
        max_length=20,
        choices=StructureClass.choices
    )
    owner = models.ForeignKey(Player, on_delete=models.CASCADE)
    planet = models.ForeignKey(Planet, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return self.struct_class


class GroundUnit(models.Model):
    unit_class = models.CharField(
        max_length=20,
        choices=GroundUnitClass.choices
    )
    owner = models.ForeignKey(Player, on_delete=models.CASCADE)
    planet = models.ForeignKey(Planet, on_delete=models.SET_NULL, null=True)
    ship = models.ForeignKey(Ship, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return self.unit_class
