from django.db import models


class PlanetTraits(models.TextChoices):
    INDUSTRIAL = "industrial", "Industrial"
    HAZARDOUS = "hazardous", "Hazardous"
    CULTURAL = "cultural", "Cultural"
    NONE = "none", "None"


class PlanetTechs(models.TextChoices):
    RED = "red", "Red"
    BLUE = "blue", "Blue"
    GREEN = "green", "Green"
    YELLOW = "yellow", "Yellow"
    NONE = "none", "None"
