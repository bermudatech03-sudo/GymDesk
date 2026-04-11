from datetime import timedelta

from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.members.models import Member
from .models import Notification
from .serializers import NotificationSerializer
from .utils import send_notification


class NotificationViewSet(viewsets.ModelViewSet):
    queryset         = Notification.objects.all()
    serializer_class = NotificationSerializer
    filterset_fields = ["status", "trigger_type"]
    ordering_fields  = ["created_at"]

    @action(detail=False, methods=["post"])
    def send_renewal_reminders(self, request):
        # Fire exactly 3 days before renewal date
        target = timezone.now().date() + timedelta(days=3)
        members = Member.objects.filter(
            status="active",
            renewal_date=target,
        )
        count = 0
        for m in members:
            send_notification(m, "renewal_remind")
            count += 1
        return Response({"sent": count, "message": f"Reminders sent to {count} members."})

    @action(detail=False, methods=["post"])
    def send_expiry_notices(self, request):
        today = timezone.now().date()
        # Auto-expire any active member past renewal
        Member.objects.filter(
            status="active",
            renewal_date__lt=today,
        ).update(status="expired")

        # Send expiry notice exactly 3 days after expiry
        target = today - timedelta(days=3)
        members = Member.objects.filter(status="expired", renewal_date=target)
        count = 0
        for m in members:
            send_notification(m, "expiry")
            count += 1
        return Response({"processed": count})

    @action(detail=False, methods=["post"])
    def manual(self, request):
        member_ids = request.data.get("member_ids", [])
        trigger    = request.data.get("trigger_type", "manual")
        count = 0
        for mid in member_ids:
            try:
                m = Member.objects.get(pk=mid)
                send_notification(m, trigger)
                count += 1
            except Member.DoesNotExist:
                pass
        return Response({"sent": count})