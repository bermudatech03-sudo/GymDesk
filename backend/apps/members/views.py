
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
from .models import Member, MembershipPlan, MemberPayment
from .serializers import MemberSerializer, PlanSerializer, MemberPaymentSerializer, RenewSerializer
from apps.notifications.utils import send_notification

class MembershipPlanViewSet(viewsets.ModelViewSet):
    queryset = MembershipPlan.objects.filter(is_active=True)
    serializer_class = PlanSerializer

class MemberViewSet(viewsets.ModelViewSet):
    queryset = Member.objects.select_related("plan").all()
    serializer_class = MemberSerializer
    search_fields  = ["name","phone","email"]
    filterset_fields = ["status","gender","plan"]
    ordering_fields  = ["name","join_date","renewal_date","status"]

    @action(detail=True, methods=["post"])
    def renew(self, request, pk=None):
        member = self.get_object()
        s = RenewSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        if s.validated_data.get("plan_id"):
            from apps.members.models import MembershipPlan as MP
            member.plan = MP.objects.get(pk=s.validated_data["plan_id"])
        old_renewal = member.renewal_date
        member.renew()
        MemberPayment.objects.create(
            member=member,
            plan=member.plan,
            amount=s.validated_data["amount_paid"],
            valid_from=old_renewal or timezone.now().date(),
            valid_to=member.renewal_date,
        )
        send_notification(member, "renewal_confirm")
        return Response(MemberSerializer(member).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        member = self.get_object()
        member.status = "cancelled"
        member.notes = request.data.get("reason","") + "\n" + member.notes
        member.save()
        return Response({"detail":"Member cancelled"})

    @action(detail=False, methods=["get"])
    def expiring_soon(self, request):
        days = int(request.query_params.get("days", 7))
        cutoff = timezone.now().date() + timedelta(days=days)
        qs = Member.objects.filter(
            status="active",
            renewal_date__lte=cutoff,
            renewal_date__gte=timezone.now().date()
        )
        return Response(MemberSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        today = timezone.now().date()
        return Response({
            "total":     Member.objects.count(),
            "active":    Member.objects.filter(status="active").count(),
            "expired":   Member.objects.filter(status="expired").count(),
            "cancelled": Member.objects.filter(status="cancelled").count(),
            "expiring_7": Member.objects.filter(
                status="active",
                renewal_date__lte=today+timedelta(days=7),
                renewal_date__gte=today
            ).count(),
            "new_this_month": Member.objects.filter(
                join_date__year=today.year,
                join_date__month=today.month
            ).count(),
        })

class MemberPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MemberPayment.objects.select_related("member","plan").all()
    serializer_class = MemberPaymentSerializer
    filterset_fields = ["member","status"]
    ordering_fields  = ["paid_date"]
