from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import StaffMember, StaffAttendance, StaffPayment
from .serializers import StaffSerializer, AttendanceSerializer, PaymentSerializer


def _record_expense(staff, amount, month):
    from apps.finances.models import Expenditure
    import calendar
    month_name = calendar.month_name[month.month]
    Expenditure.objects.create(
        category="salary",
        description=f"Salary — {staff.name} ({month_name} {month.year})",
        amount=amount,
        date=timezone.localdate(),
        vendor=staff.name,
        notes=f"Role: {staff.role} | Shift: {staff.shift} | Month: {month_name} {month.year}",
    )


def _delete_expense(staff, month):
    """Remove the Finance Expenditure record when salary is marked unpaid."""
    from apps.finances.models import Expenditure
    import calendar
    month_name = calendar.month_name[month.month]
    label = f"Salary — {staff.name} ({month_name} {month.year})"
    Expenditure.objects.filter(
        category="salary",
        vendor=staff.name,
        description=label,
    ).delete()


class StaffViewSet(viewsets.ModelViewSet):
    queryset = StaffMember.objects.all()
    serializer_class = StaffSerializer
    search_fields    = ["name", "phone", "email"]
    filterset_fields = ["role", "shift", "status"]

    @action(detail=False, methods=["get"])
    def stats(self, request):
        return Response({
            "total":    StaffMember.objects.count(),
            "active":   StaffMember.objects.filter(status="active").count(),
            "on_leave": StaffMember.objects.filter(status="on_leave").count(),
        })

    @action(detail=False, methods=["post"], url_path="generate-payments")
    def generate_payments(self, request):
        import datetime
        year  = int(request.data.get("year",  timezone.localdate().year))
        month = int(request.data.get("month", timezone.localdate().month))
        month_date = datetime.date(year, month, 1)
        created = 0
        for staff in StaffMember.objects.filter(status="active", salary__gt=0):
            _, made = StaffPayment.objects.get_or_create(
                staff=staff, month=month_date,
                defaults={"amount": staff.salary, "status": "pending"}
            )
            if made:
                created += 1
        return Response({"created": created, "month": str(month_date)})


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = StaffAttendance.objects.select_related("staff").all()
    serializer_class = AttendanceSerializer
    filterset_fields = ["staff", "date", "status"]
    ordering_fields  = ["date"]

    @action(detail=False, methods=["get"])
    def today(self, request):
        today = timezone.localdate()
        qs = StaffAttendance.objects.filter(date=today).select_related("staff")
        return Response(AttendanceSerializer(qs, many=True).data)

    @action(detail=False, methods=["post"])
    def bulk_mark(self, request):
        records = request.data.get("records", [])
        created = 0
        for r in records:
            StaffAttendance.objects.update_or_create(
                staff_id=r["staff"],
                date=r.get("date", timezone.localdate()),
                defaults={
                    "status":    r.get("status", "present"),
                    "check_in":  r.get("check_in"),
                    "check_out": r.get("check_out"),
                }
            )
            created += 1
        return Response({"marked": created})


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = StaffPayment.objects.select_related("staff").all()
    serializer_class = PaymentSerializer
    filterset_fields = ["staff", "status", "month"]

    @action(detail=True, methods=["post"])
    def mark_paid(self, request, pk=None):
        p = self.get_object()
        if p.status == "paid":
            return Response({"detail": "Already paid."}, status=400)
        p.status    = "paid"
        p.paid_date = timezone.localdate()
        p.save()
        _record_expense(p.staff, p.amount, p.month)
        return Response(PaymentSerializer(p).data)

    @action(detail=True, methods=["post"])
    def mark_unpaid(self, request, pk=None):
        p = self.get_object()
        if p.status != "paid":
            return Response({"detail": "Not marked as paid."}, status=400)
        _delete_expense(p.staff, p.month)
        p.status    = "pending"
        p.paid_date = None
        p.save()
        return Response(PaymentSerializer(p).data)