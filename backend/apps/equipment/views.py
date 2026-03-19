from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Equipment, MaintenanceLog
from .serializers import EquipmentSerializer, MaintenanceLogSerializer


def _record_equipment_expense(equipment, amount, description, date):
    """Auto-create Expenditure when equipment is purchased or maintained."""
    if amount and float(amount) > 0:
        from apps.finances.models import Expenditure
        Expenditure.objects.create(
            category="equipment",
            description=description,
            amount=amount,
            date=date or timezone.localdate(),
            vendor="",
            notes=f"Equipment: {equipment.name}",
        )


class EquipmentViewSet(viewsets.ModelViewSet):
    queryset = Equipment.objects.all()
    serializer_class = EquipmentSerializer
    search_fields    = ["name","brand","category"]
    filterset_fields = ["category","condition","is_active"]

    def perform_create(self, serializer):
        eq = serializer.save()
        # If purchase price provided, record as equipment expense
        if eq.purchase_price:
            _record_equipment_expense(
                eq, eq.purchase_price,
                f"Equipment Purchase — {eq.name}",
                eq.purchase_date or timezone.localdate(),
            )

    @action(detail=False, methods=["get"])
    def due_maintenance(self, request):
        today = timezone.localdate()
        qs = Equipment.objects.filter(next_service__lte=today, is_active=True)
        return Response(EquipmentSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        return Response({
            "total":           Equipment.objects.filter(is_active=True).count(),
            "out_of_service":  Equipment.objects.filter(condition="out_of_service").count(),
            "due_maintenance": Equipment.objects.filter(
                next_service__lte=timezone.localdate(), is_active=True).count(),
        })


class MaintenanceLogViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceLog.objects.select_related("equipment").all()
    serializer_class = MaintenanceLogSerializer
    filterset_fields = ["equipment"]

    def perform_create(self, serializer):
        log = serializer.save()
        # Update equipment service dates
        if log.next_due:
            log.equipment.last_service = log.date
            log.equipment.next_service = log.next_due
            log.equipment.save()
        # Auto-record maintenance cost as expense
        if log.cost and float(log.cost) > 0:
            _record_equipment_expense(
                log.equipment, log.cost,
                f"Equipment Maintenance — {log.equipment.name}",
                log.date,
            )