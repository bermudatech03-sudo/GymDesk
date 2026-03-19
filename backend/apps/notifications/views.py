
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Notification
from .serializers import NotificationSerializer
from apps.members.models import Member
from .utils import send_notification

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    filterset_fields = ["channel","status","trigger_type"]
    ordering_fields  = ["created_at"]

    @action(detail=False, methods=["post"])
    def send_renewal_reminders(self, request):
        from datetime import timedelta
        days = int(request.data.get("days", 3))
        cutoff = timezone.now().date() + timedelta(days=days)
        members = Member.objects.filter(
            status="active",
            renewal_date__lte=cutoff,
            renewal_date__gte=timezone.now().date()
        )
        count = 0
        for m in members:
            send_notification(m, "renewal_remind", channels=["email","whatsapp"])
            count += 1
        return Response({"sent": count, "message": f"Reminders sent to {count} members."})

    @action(detail=False, methods=["post"])
    def send_expiry_notices(self, request):
        members = Member.objects.filter(
            renewal_date__lt=timezone.now().date(),
            status="active"
        )
        count = 0
        for m in members:
            m.status = "expired"
            m.save()
            send_notification(m, "expiry")
            count += 1
        return Response({"processed": count})

    @action(detail=False, methods=["post"])
    def manual(self, request):
        member_ids = request.data.get("member_ids",[])
        trigger    = request.data.get("trigger_type","manual")
        channels   = request.data.get("channels",["email"])
        count = 0
        for mid in member_ids:
            try:
                m = Member.objects.get(pk=mid)
                send_notification(m, trigger, channels)
                count += 1
            except Member.DoesNotExist:
                pass
        return Response({"sent": count})
