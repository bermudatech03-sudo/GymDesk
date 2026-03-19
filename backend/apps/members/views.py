from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import Member, MembershipPlan, MemberPayment
from .serializers import (MemberSerializer, PlanSerializer,
    MemberPaymentSerializer, EnrollSerializer, RenewSerializer, BalancePaymentSerializer)
from apps.notifications.utils import send_notification
from decimal import Decimal


def _record_income(member, amount, label, valid_from, valid_to, notes=""):
    """Create an Income entry in finances for a member payment."""
    from apps.finances.models import Income
    Income.objects.create(
        source=f"{label} — {member.name}",
        category="membership",
        amount=amount,
        date=timezone.localdate(),
        member_id=member.id,
        notes=notes or f"Plan: {member.plan.name if member.plan else 'N/A'} | {valid_from} → {valid_to}",
    )


class MembershipPlanViewSet(viewsets.ModelViewSet):
    queryset = MembershipPlan.objects.all()
    serializer_class = PlanSerializer

    def get_queryset(self):
        qs = MembershipPlan.objects.all()
        active_only = self.request.query_params.get("active_only")
        if active_only == "true":
            qs = qs.filter(is_active=True)
        return qs


class MemberViewSet(viewsets.ModelViewSet):
    queryset = Member.objects.select_related("plan").all()
    serializer_class = MemberSerializer
    search_fields    = ["name","phone","email"]
    filterset_fields = ["status","gender","plan"]
    ordering_fields  = ["name","join_date","renewal_date","status"]

    def create(self, request, *args, **kwargs):
        s = EnrollSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data

        plan = None
        if d.get("plan_id"):
            plan = MembershipPlan.objects.get(pk=d["plan_id"])

        # Calculate renewal date
        join   = d.get("join_date", timezone.localdate())
        renew  = d.get("renewal_date")
        if not renew and plan:
            renew = join + timedelta(days=plan.duration_days)

        member = Member.objects.create(
            name=d["name"], phone=d["phone"],
            email=d.get("email",""), gender=d.get("gender",""),
            address=d.get("address",""), plan=plan,
            join_date=join, renewal_date=renew,
            status=d.get("status","active"), notes=d.get("notes",""),
        )

        amount_paid = float(d.get("amount_paid", 0))
        plan_price  = float(plan.price) if plan else 0

        if plan and renew:
            payment = MemberPayment.objects.create(
                member=member, plan=plan,
                plan_price=plan_price,
                amount_paid=amount_paid,
                valid_from=join, valid_to=renew,
            )
            if amount_paid > 0:
                _record_income(member, amount_paid, "Enrollment",
                               join, renew,
                               f"Enrolled | Paid ₹{amount_paid} of ₹{plan_price}")

        try:
            send_notification(member, "enrollment")
        except Exception:
            pass

        return Response(MemberSerializer(member).data, status=201)

    @action(detail=True, methods=["post"])
    def renew(self, request, pk=None):
        member = self.get_object()
        s = RenewSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        if s.validated_data.get("plan_id"):
            member.plan = MembershipPlan.objects.get(pk=s.validated_data["plan_id"])

        old_renewal  = member.renewal_date
        amount_paid  = float(s.validated_data["amount_paid"])
        plan_price   = float(member.plan.price) if member.plan else amount_paid

        member.renew()

        payment = MemberPayment.objects.create(
            member=member, plan=member.plan,
            plan_price=plan_price,
            amount_paid=amount_paid,
            valid_from=old_renewal or timezone.localdate(),
            valid_to=member.renewal_date,
            notes=s.validated_data.get("notes",""),
        )

        if amount_paid > 0:
            _record_income(member, amount_paid, "Renewal",
                           payment.valid_from, payment.valid_to,
                           f"Renewal | Paid ₹{amount_paid} of ₹{plan_price} | Balance ₹{payment.balance}")

        try:
            send_notification(member, "renewal_confirm")
        except Exception:
            pass

        return Response(MemberSerializer(member).data)

    @action(detail=True, methods=["post"], url_path="pay-balance")
    def pay_balance(self, request, pk=None):
        """Record a balance payment against the latest partial/pending payment."""
        member = self.get_object()
        s = BalancePaymentSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        # Find latest unpaid/partial payment
        payment = member.payments.filter(
            status__in=["partial","pending"]
        ).order_by("-paid_date").first()

        if not payment:
            return Response({"detail": "No outstanding balance found."}, status=400)

        extra = float(s.validated_data["amount_paid"])
        if extra <= 0:
            return Response({"detail": "Amount must be greater than 0."}, status=400)
        if extra > float(payment.balance):
            return Response({"detail": f"Amount exceeds balance of ₹{payment.balance}."}, status=400)

        payment.amount_paid = payment.amount_paid + Decimal(str(s.validated_data["amount_paid"]))
        payment.save()  # auto-recalculates balance and status

        _record_income(member, extra, "Balance Payment",
                       payment.valid_from, payment.valid_to,
                       f"Balance payment | Remaining ₹{payment.balance}")

        return Response(MemberPaymentSerializer(payment).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        member = self.get_object()
        member.status = "cancelled"
        reason = request.data.get("reason","")
        if reason:
            member.notes = reason + "\n" + member.notes
        member.save()
        return Response({"detail": "Member cancelled"})
    def destroy(self, request, *args, **kwargs):
        member = self.get_object()
        member.delete()
        return Response({"detail": "Member deleted permanently."}, status=204)

    @action(detail=False, methods=["get"])
    def expiring_soon(self, request):
        days = int(request.query_params.get("days", 7))
        cutoff = timezone.localdate() + timedelta(days=days)
        qs = Member.objects.filter(
            status="active",
            renewal_date__lte=cutoff,
            renewal_date__gte=timezone.localdate()
        )
        return Response(MemberSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        today = timezone.localdate()
        return Response({
            "total":           Member.objects.count(),
            "active":          Member.objects.filter(status="active").count(),
            "expired":         Member.objects.filter(status="expired").count(),
            "cancelled":       Member.objects.filter(status="cancelled").count(),
            "expiring_7":      Member.objects.filter(
                status="active",
                renewal_date__lte=today+timedelta(days=7),
                renewal_date__gte=today
            ).count(),
            "new_this_month":  Member.objects.filter(
                join_date__year=today.year,
                join_date__month=today.month
            ).count(),
        })


class MemberPaymentViewSet(viewsets.ModelViewSet):
    queryset = MemberPayment.objects.select_related("member","plan").all()
    serializer_class = MemberPaymentSerializer
    filterset_fields = ["member","status"]
    ordering_fields  = ["paid_date"]