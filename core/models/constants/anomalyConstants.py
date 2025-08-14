from django.db import models


class AnomalyType(models.TextChoices):
    ASTEROID_FIELD = "asteroid-field", "Asteroid Field"
    GRAVITY_RIFT = "gravity-rift", "Gravity Rift"
    MUATT_SUPERNOVA = "muatt-supernova", "Muatt Supernova"
    NEBULA = "Nebula", "Nebula"
    SUPERNOVA = "supernova", "Supernova"
    ZELIAN_ASTEROID_FIELD = "zelian-asteroid-field", "Zelian Asteroid Field"
    MYKO_CATACLYSM = "myko-cataclysm", "Myko Cataclysm"
    ASTEROID_NEBULA = "asteroid-nebula", "Asteroid Nebula"
    ASTEROID_RIFT = "asteroid-rift", "Asteroid Rift"
    NONE = "none", "None"
