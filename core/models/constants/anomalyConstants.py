from django.db import models


class AnomalyType(models.TextChoices):
    ASTEROID_FIELD = "asteroid-field", "Asteroid Field"
    GRAVITY_RIFT = "gravity-rift", "Gravity Rift"
    MUATT_SUPERNOVA = "muatt-supernova", "Muatt Supernova"
    NEBULA = "Nebula", "Nebula"
    SUPERNOVA = "supernova", "Supernova"
    NONE = "none", "None"
