from django.db import models

from .constants.unitConstants import ShipClass, StructureClass, GroundUnitClass
from .planet import Planet


class Ship(models.Model):
    ship_class = models.CharField(
        max_length=20,
        choices=ShipClass.choices
    )

    def __str__(self):
        return self.ship_class


class Fleet(models.Model):
    owner = models.CharField(max_length=100)
    ships = models.ManyToManyField(Ship, related_name="fleets")

    def __str__(self):
        return self.ships

    def to_json(self):
        return {
            "owner": self.owner,
            "ships": [ship.ship_class for ship in self.ships.all()]
        }


class Structure(models.Model):
    struct_class = models.CharField(
        max_length=20,
        choices=StructureClass.choices
    )
    owner = models.CharField(max_length=100)
    planet = models.ForeignKey(Planet, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return self.struct_class


class GroundUnit(models.Model):
    unit_class = models.CharField(
        max_length=20,
        choices=GroundUnitClass.choices
    )
    owner = models.CharField(max_length=100)
    ship = models.ForeignKey(Ship, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return self.unit_class
