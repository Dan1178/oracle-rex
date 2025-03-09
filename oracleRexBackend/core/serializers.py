from rest_framework import serializers
from .models import Faction, Player, Planet, System, Tile

class FactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Faction
        fields = ['id', 'name', 'home_system']

class PlayerSerializer(serializers.ModelSerializer):
    faction = FactionSerializer(read_only=True)
    faction_id = serializers.PrimaryKeyRelatedField(
        queryset=Faction.objects.all(), source='faction', write_only=True, required=False
    )

    class Meta:
        model = Player
        fields = ['id', 'username', 'faction', 'faction_id']

class PlanetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Planet
        fields = ['id', 'name', 'resources', 'influence', 'trait', 'tech_specialty']

class SystemSerializer(serializers.ModelSerializer):
    planets = PlanetSerializer(many=True, read_only=True)

    class Meta:
        model = System
        fields = ['id', 'name', 'planets', 'anomaly', 'wormhole']

class TileSerializer(serializers.ModelSerializer):
    adjacent_tiles = serializers.SlugRelatedField(
        many=True,
        read_only=True,
        slug_field="designation"
    )
    system = serializers.SlugRelatedField(
        slug_field="name",
        read_only=True
    )

    class Meta:
        model = Tile
        fields = ['id', 'designation', 'adjacent_tiles', 'system']