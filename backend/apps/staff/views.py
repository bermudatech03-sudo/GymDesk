
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import StaffMember, StaffAttendance, StaffPayment
from .serializers import StaffSerializer, AttendanceSerializer, PaymentSerializer

class StaffViewSet(viewsets.ModelViewSet):
    queryset = StaffMember.objects.all()
    serializer_class = StaffSerializer
    search_fields   = ["name","phone","email"]
    filterset_fields = ["role","shift","status"]

    @action(detail=False, methods=["get"])
    def stats(self, request):
        return Response({
            "total":   StaffMember.objects.count(),
            "active":  StaffMember.objects.filter(status="active").count(),
            "on_leave":StaffMember.objects.filter(status="on_leave").count(),
        })

class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = StaffAttendance.objects.select_related("staff").all()
    serializer_class = AttendanceSerializer
    filterset_fields = ["staff","date","status"]
    ordering_fields  = ["date"]

    @action(detail=False, methods=["get"])
    def today(self, request):
        today = timezone.now().date()
        qs = StaffAttendance.objects.filter(date=today).select_related("staff")
        return Response(AttendanceSerializer(qs, many=True).data)

    @action(detail=False, methods=["post"])
    def bulk_mark(self, request):
        records = request.data.get("records", [])
        created = []
        for r in records:
            obj, _ = StaffAttendance.objects.update_or_create(
                staff_id=r["staff"], date=r.get("date", timezone.now().date()),
                defaults={"status": r.get("status","present"),
                          "check_in": r.get("check_in"),
                          "check_out": r.get("check_out")}
            )
            created.append(obj.id)
        return Response({"marked": len(created)})

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = StaffPayment.objects.select_related("staff").all()
    serializer_class = PaymentSerializer
    filterset_fields = ["staff","status","month"]

    @action(detail=True, methods=["post"])
    def mark_paid(self, request, pk=None):
        p = self.get_object()
        p.status = "paid"
        p.paid_date = timezone.now().date()
        p.save()
        return Response(PaymentSerializer(p).data)
