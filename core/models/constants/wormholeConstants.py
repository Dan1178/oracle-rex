from django.db import models


class WormholeType(models.TextChoices):
    ALPHA = "alpha", "Alpha"
    BETA = "beta", "Beta"
    GAMMA = "gamma", "Gamma"
    DELTA = "delta", "Delta"
    ALL = "all", "All"
    NONE = "none", "None"
