from django.db import models

from .system import System


class Faction(models.Model):
    name = models.CharField(max_length=50, unique=True)
    home_system = models.ForeignKey(System, on_delete=models.CASCADE, related_name="factions")

    def __str__(self):
        return self.name

    class Meta:
        managed = True
