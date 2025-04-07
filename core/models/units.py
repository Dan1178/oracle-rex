from django.db import models

from .constants.unitConstants import ShipClass, StructureClass, GroundUnitClass


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

    def __str__(self):
        return self.struct_class

class GroundUnit(models.Model):
    unit_class = models.CharField(
        max_length=20,
        choices=GroundUnitClass.choices
    )

    def __str__(self):
        return self.unit_class

class GroundForces(models.Model):
    owner = models.CharField(max_length=100)
    structures = models.ManyToManyField(Structure, related_name="groundForces")
    units = models.ManyToManyField(GroundUnit, related_name="groundForces")

    def __str__(self):
        return self.structures + self.units

    def to_json(self):
        return {
            "owner": self.owner,
            "structures": [structure.struct_class for structure in self.structures.all()],
            "units": [unit.unit_class for unit in self.units.all()]
        }