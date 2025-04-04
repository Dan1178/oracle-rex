from django.db import models

from .constants.planetConstants import PlanetTraits, PlanetTechs


class Planet(models.Model):
    name = models.CharField(max_length=100)
    resources = models.PositiveIntegerField(default=0)
    influence = models.PositiveIntegerField(default=0)
    trait = models.CharField(max_length=20, choices=PlanetTraits, default="none")
    tech_specialty = models.CharField(max_length=20, choices=PlanetTechs, default="none")

    def __str__(self):
        return self.name

    def to_json(self):
        return {
            "name": self.name,
            "resources": self.resources,
            "influence": self.influence,
            "trait": self.trait,
            "tech_specialty": self.tech_specialty
            # todo: units, structures
        }

    class Meta:
        managed = True
