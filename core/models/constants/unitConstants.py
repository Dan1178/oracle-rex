from django.db import models


class ShipClass(models.TextChoices):
    DESTROYER = "destroyer", "Destroyer"
    CRUISER = "cruiser", "Cruiser"
    CARRIER = "carrier", "Carrier"
    DREADNOUGHT = "dreadnought", "Dreadnought"
    WAR_SUN = "warSun", "War Sun"
    FIGHTER = "fighter", "Fighter"


class StructureClass(models.TextChoices):
    SPACE_DOCK = "spaceDock", "Space Dock"
    PDS = "pds", "PDS"


class GroundUnitClass(models.TextChoices):
    INFANTRY = "infantry", "Infantry"
    MECH = "mech", "Mech"
