
from rest_framework import serializers
from .models import Equipment, MaintenanceLog

class MaintenanceLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceLog
        fields = "__all__"

class EquipmentSerializer(serializers.ModelSerializer):
    maintenance_logs = MaintenanceLogSerializer(many=True, read_only=True)
    class Meta:
        model = Equipment
        fields = "__all__"

class EquipmentListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipment
        exclude = ["maintenance_logs"]
        # lightweight for list view
        fields = ["id","name","category","brand","quantity","condition","next_service","is_active"]
