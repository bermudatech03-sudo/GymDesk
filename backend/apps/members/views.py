from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from .models import Diet, DietPlan, Member, MembershipPlan, MemberPayment, MemberAttendance
from .serializers import (DietSerializer, DietPlanSerializer, MemberSerializer, PlanSerializer, MemberPaymentSerializer,
    MemberAttendanceSerializer, EnrollSerializer, RenewSerializer, BalancePaymentSerializer)
from apps.notifications.utils import send_notification


def _record_income(member, amount, label, valid_from, valid_to, notes=""):
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
        if self.request.query_params.get("active_only") == "true":
            qs = qs.filter(is_active=True)
        return qs


class MemberViewSet(viewsets.ModelViewSet):
    queryset         = Member.objects.select_related("plan").all()
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

        join  = d.get("join_date", timezone.localdate())
        renew = d.get("renewal_date")
        if not renew and plan:
            renew = join + timedelta(days=plan.duration_days)

        diet = None
        if d.get("diet_id"):
            diet = DietPlan.objects.filter(pk=d["diet_id"]).first()

        member = Member.objects.create(
            name=d["name"], phone=d["phone"],
            email=d.get("email",""), gender=d.get("gender",""),
            address=d.get("address",""), plan=plan, diet=diet,
            join_date=join, renewal_date=renew,
            status=d.get("status","active"), notes=d.get("notes",""),
        )

        amount_paid = Decimal(str(d.get("amount_paid", 0)))
        plan_price  = plan.price if plan else Decimal("0")

        if plan and renew:
            payment = MemberPayment.objects.create(
                member=member, plan=plan,
                plan_price=plan_price, amount_paid=amount_paid,
                valid_from=join, valid_to=renew,
            )
            if amount_paid > 0:
                _record_income(member, amount_paid, "Enrollment", join, renew,
                    f"Enrolled | Paid ₹{amount_paid} of ₹{plan_price}")

        try: send_notification(member, "enrollment")
        except: pass

        return Response(MemberSerializer(member).data, status=201)

    def destroy(self, request, *args, **kwargs):
        member = self.get_object()
        member.delete()
        return Response({"detail": "Member deleted."}, status=204)

    @action(detail=True, methods=["post"])
    def renew(self, request, pk=None):
        member = self.get_object()
        s = RenewSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        if s.validated_data.get("plan_id"):
            member.plan = MembershipPlan.objects.get(pk=s.validated_data["plan_id"])

        old_renewal = member.renewal_date
        amount_paid = Decimal(str(s.validated_data["amount_paid"]))
        plan_price  = member.plan.price if member.plan else amount_paid

        member.renew()
        payment = MemberPayment.objects.create(
            member=member, plan=member.plan,
            plan_price=plan_price, amount_paid=amount_paid,
            valid_from=old_renewal or timezone.localdate(),
            valid_to=member.renewal_date,
            notes=s.validated_data.get("notes",""),
        )
        if amount_paid > 0:
            _record_income(member, amount_paid, "Renewal",
                payment.valid_from, payment.valid_to,
                f"Renewal | Paid ₹{amount_paid} of ₹{plan_price} | Balance ₹{payment.balance}")
        try: send_notification(member, "renewal_confirm")
        except: pass
        return Response(MemberSerializer(member).data)

    @action(detail=True, methods=["post"], url_path="pay-balance")
    def pay_balance(self, request, pk=None):
        member = self.get_object()
        s = BalancePaymentSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        payment = member.payments.filter(
            status__in=["partial","pending"]
        ).order_by("-paid_date").first()

        if not payment:
            return Response({"detail": "No outstanding balance."}, status=400)

        extra = Decimal(str(s.validated_data["amount_paid"]))
        if extra <= 0:
            return Response({"detail": "Amount must be > 0."}, status=400)
        if extra > payment.balance:
            return Response({"detail": f"Exceeds balance of ₹{payment.balance}."}, status=400)

        payment.amount_paid = payment.amount_paid + extra
        payment.save()
        _record_income(member, extra, "Balance Payment",
            payment.valid_from, payment.valid_to,
            f"Balance | Remaining ₹{payment.balance}")
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

    @action(detail=False, methods=["get"])
    def expiring_soon(self, request):
        days   = int(request.query_params.get("days", 7))
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
            "total":          Member.objects.count(),
            "active":         Member.objects.filter(status="active").count(),
            "expired":        Member.objects.filter(status="expired").count(),
            "cancelled":      Member.objects.filter(status="cancelled").count(),
            "expiring_7":     Member.objects.filter(
                status="active",
                renewal_date__lte=today+timedelta(days=7),
                renewal_date__gte=today
            ).count(),
            "new_this_month": Member.objects.filter(
                join_date__year=today.year,
                join_date__month=today.month
            ).count(),
        })


class MemberPaymentViewSet(viewsets.ModelViewSet):
    queryset         = MemberPayment.objects.select_related("member","plan").all()
    serializer_class = MemberPaymentSerializer
    filterset_fields = ["member","status"]
    ordering_fields  = ["paid_date"]


class MemberAttendanceViewSet(viewsets.ModelViewSet):
    queryset         = MemberAttendance.objects.select_related("member").all()
    serializer_class = MemberAttendanceSerializer
    filterset_fields = ["member","date"]
    ordering_fields  = ["date","check_in"]

    @action(detail=False, methods=["get"])
    def today(self, request):
        qs = MemberAttendance.objects.filter(
            date=timezone.localdate()
        ).select_related("member")
        return Response(MemberAttendanceSerializer(qs, many=True).data)


# ── Public kiosk lookup endpoints (no auth required) ──
class KioskLookupView(APIView):
    """
    POST { "id_input": "M0001" or "S0003" }
    Returns person details for confirmation screen.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        raw = str(request.data.get("id_input","")).strip().upper()
        if not raw:
            return Response({"detail":"Enter an ID."}, status=400)

        # Member: M0001 format
        if raw.startswith("M"):
            try:
                num    = int(raw[1:])
                member = Member.objects.select_related("plan").get(pk=num)
                return Response({
                    "type":    "member",
                    "id":      member.id,
                    "display_id": member.display_id(),
                    "name":    member.name,
                    "role":    "Member",
                    "plan":    member.plan.name if member.plan else "No Plan",
                    "status":  member.status,
                    "renewal": str(member.renewal_date) if member.renewal_date else None,
                    "photo":   member.photo_url or "",
                })
            except (ValueError, Member.DoesNotExist):
                return Response({"detail": f"No member found with ID {raw}."}, status=404)

        # Staff: S0001 format
        elif raw.startswith("S"):
            from apps.staff.models import StaffMember
            try:
                num   = int(raw[1:])
                staff = StaffMember.objects.get(pk=num)
                return Response({
                    "type":       "staff",
                    "id":         staff.id,
                    "display_id": f"S{staff.id:04d}",
                    "name":       staff.name,
                    "role":       staff.role.capitalize(),
                    "shift":      staff.shift,
                    "status":     staff.status,
                    "photo":      staff.photo_url or "",
                })
            except (ValueError, StaffMember.DoesNotExist):
                return Response({"detail": f"No staff found with ID {raw}."}, status=404)

        else:
            return Response({"detail": "ID must start with M (member) or S (staff)."}, status=400)


class KioskMarkAttendanceView(APIView):
    """
    POST { "type": "member"|"staff", "id": 1 }
    Marks attendance (check-in or check-out).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        person_type = request.data.get("type")
        person_id   = request.data.get("id")
        now         = timezone.now()
        today       = timezone.localdate()

        if person_type == "member":
            try:
                member  = Member.objects.get(pk=person_id)
                existing = MemberAttendance.objects.filter(
                    member=member, date=today
                ).first()

                if existing and not existing.check_out:
                    existing.check_out = now.time()
                    existing.save()
                    action_done = "check_out"
                    record = existing
                elif existing and existing.check_out:
                    # Already checked out — allow re-entry
                    record = MemberAttendance.objects.create(
                        member=member, date=today, check_in=now.time()
                    )
                    action_done = "check_in"
                else:
                    record = MemberAttendance.objects.create(
                        member=member, date=today, check_in=now.time()
                    )
                    action_done = "check_in"

                return Response({
                    "action":    action_done,
                    "name":      member.name,
                    "time":      now.strftime("%I:%M %p"),
                    "date":      str(today),
                    "type":      "member",
                })
            except Member.DoesNotExist:
                return Response({"detail":"Member not found."}, status=404)

        elif person_type == "staff":
            from apps.staff.models import StaffMember, StaffAttendance
            try:
                staff    = StaffMember.objects.get(pk=person_id)
                existing = StaffAttendance.objects.filter(
                    staff=staff, date=today
                ).first()

                if existing and not existing.check_out:
                    existing.check_out = now.time()
                    existing.save()
                    action_done = "check_out"
                elif existing and existing.check_out:
                    existing.check_in  = now.time()
                    existing.check_out = None
                    existing.save()
                    action_done = "check_in"
                else:
                    existing = StaffAttendance.objects.create(
                        staff=staff, date=today,
                        check_in=now.time(), status="present"
                    )
                    action_done = "check_in"

                return Response({
                    "action": action_done,
                    "name":   staff.name,
                    "time":   now.strftime("%I:%M %p"),
                    "date":   str(today),
                    "type":   "staff",
                })
            except StaffMember.DoesNotExist:
                return Response({"detail":"Staff not found."}, status=404)

        return Response({"detail":"Invalid type."}, status=400)
    
class DietPlanViewSet(viewsets.ModelViewSet):
    queryset = DietPlan.objects.prefetch_related("items").all()
    serializer_class = DietPlanSerializer

    def _save_items(self, plan, items):
        for item in items:
            Diet.objects.create(
                plan=plan,
                food=item.get("food", ""),
                time=item.get("time"),
                quantity=item.get("quantity", 1),
                unit=item.get("unit", "g"),
                calories=item.get("calories", 0),
                notes=item.get("notes", ""),
            )

    def create(self, request, *args, **kwargs):
        plan = DietPlan.objects.create(name=request.data.get("name", "Unnamed Plan"))
        self._save_items(plan, request.data.get("items", []))
        return Response(DietPlanSerializer(plan).data, status=201)

    def update(self, request, *args, **kwargs):
        print("Updating Diet Plan with data:", request.data.get("items", []))
        plan = self.get_object()
        plan.name = request.data.get("name", plan.name)
        plan.save()
        plan.items.all().delete()
        print("Updating Diet Plan with data:", request.data.get("items", []))
        self._save_items(plan, request.data.get("items", []))
        return Response(DietPlanSerializer(plan).data)


class DietViewSet(viewsets.ModelViewSet):
    queryset = Diet.objects.all()
    serializer_class = DietSerializer