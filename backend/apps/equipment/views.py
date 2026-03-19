
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Equipment, MaintenanceLog
from .serializers import EquipmentSerializer, MaintenanceLogSerializer

class EquipmentViewSet(viewsets.ModelViewSet):
    queryset = Equipment.objects.all()
    serializer_class = EquipmentSerializer
    search_fields   = ["name","brand","category"]
    filterset_fields = ["category","condition","is_active"]

    @action(detail=False, methods=["get"])
    def due_maintenance(self, request):
        today = timezone.now().date()
        qs = Equipment.objects.filter(next_service__lte=today, is_active=True)
        return Response(EquipmentSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        from django.db.models import Sum
        return Response({
            "total":           Equipment.objects.filter(is_active=True).count(),
            "out_of_service":  Equipment.objects.filter(condition="out_of_service").count(),
            "due_maintenance": Equipment.objects.filter(
                next_service__lte=timezone.now().date(), is_active=True).count(),
        })

class MaintenanceLogViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceLog.objects.select_related("equipment").all()
    serializer_class = MaintenanceLogSerializer
    filterset_fields = ["equipment"]

    def perform_create(self, serializer):
        log = serializer.save()
        if log.next_due:
            log.equipment.last_service = log.date
            log.equipment.next_service = log.next_due
            log.equipment.save()
