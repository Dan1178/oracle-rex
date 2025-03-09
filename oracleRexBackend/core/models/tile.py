from django.db import models

from .system import System


class Tile(models.Model):
    designation = models.CharField(max_length=3, unique=True)
    adjacent_tiles = models.ManyToManyField('self', symmetrical=True, blank=True)
    system = models.ForeignKey(System, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.designation
