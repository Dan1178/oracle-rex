from django.db import models

from .constants.planetConstants import PlanetTraits, PlanetTechs
from .units import GroundForces


class Planet(models.Model):
    name = models.CharField(max_length=100)
    resources = models.PositiveIntegerField(default=0)
    influence = models.PositiveIntegerField(default=0)
    trait = models.CharField(max_length=20, choices=PlanetTraits, default="none")
    tech_specialty = models.CharField(max_length=20, choices=PlanetTechs, default="none")
    ground_forces = models.ForeignKey(GroundForces, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.name

    def to_json(self):
        return {
            "name": self.name,
            "resources": self.resources,
            "influence": self.influence,
            "trait": self.trait,
            "tech_specialty": self.tech_specialty,
            "ground_forces": self.ground_forces.to_json() if self.ground_forces else None,
        }

    class Meta:
        managed = True
