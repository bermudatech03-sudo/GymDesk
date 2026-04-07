from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.db.models import Sum, Q
from decimal import Decimal, ROUND_HALF_UP
from datetime import timedelta
from .models import Diet, DietPlan, Member, MembershipPlan, MemberPayment, MemberAttendance, InstallmentPayment, TrainerAssignment
from .serializers import (DietSerializer, DietPlanSerializer, MemberSerializer, PlanSerializer, MemberPaymentSerializer,
    MemberAttendanceSerializer, EnrollSerializer, RenewSerializer, BalancePaymentSerializer,
    InstallmentPaymentSerializer, TrainerAssignmentSerializer)
from apps.notifications.utils import send_notification


from apps.finances.gst_utils import get_gst_rate as _get_gst_rate, get_gym_info as _gym_info

def _gst_rate():
    return _get_gst_rate()

def _calc_gst(base_price):
    rate    = _gst_rate()
    base    = Decimal(str(base_price)).quantize(Decimal("0.01"), ROUND_HALF_UP)
    gst_amt = (base * rate / 100).quantize(Decimal("0.01"), ROUND_HALF_UP)
    total   = base + gst_amt
    return base, gst_amt, total, rate

def _invoice_number(member_id, date, suffix=""):
    return f"INV-{date.year}{date.month:02d}-M{member_id:04d}{suffix}"

def _auto_expire_members():
    """
    Bulk-mark active members whose renewal_date has passed as expired.
    Skips cancelled/paused. Called on every list fetch — very cheap bulk UPDATE.
    """
    Member.objects.filter(
        status="active",
        renewal_date__lt=timezone.localdate(),
    ).update(status="expired")

def _record_income_for_installment(member, payment, installment):
    """
    Records an Income entry for a single installment.

    GST RULE (GST-first allocation):
      - GST is paid off first across all installments for the same invoice.
      - Each payment fills the remaining GST bucket first; the rest goes to base.
      - Once GST is fully paid, all subsequent installments are 100% base amount.

    plan_total (plan_price + gst = full plan value) is embedded in notes as
    "plan_total:XXXXXX" so MonthlyReportView can surface it in the report.
    """
    from apps.finances.models import Income

    amount_paid = Decimal(str(installment.amount))

    label_map = {
        "enrollment": "Enrollment",
        "renewal":    "Renewal",
        "balance":    "Balance Payment",
    }
    label = label_map.get(installment.installment_type, "Payment")

    # How much GST has already been collected for this invoice across prior installments
    already_paid_gst = (
        Income.objects.filter(invoice_number=payment.invoice_number)
        .aggregate(total=Sum("gst_amount"))["total"] or Decimal("0")
    )

    gst_remaining = max(Decimal("0"), payment.gst_amount - already_paid_gst)
    gst_now       = min(amount_paid, gst_remaining).quantize(Decimal("0.01"), ROUND_HALF_UP)
    base_now      = (amount_paid - gst_now).quantize(Decimal("0.01"), ROUND_HALF_UP)
    effective_rate = payment.gst_rate if gst_now > 0 else Decimal("0")

    plan_total = payment.total_with_gst

    Income.objects.create(
        source         = f"{label} — {member.name}",
        category       = "membership",
        base_amount    = base_now,
        gst_rate       = effective_rate,
        gst_amount     = gst_now,
        amount         = amount_paid,
        date           = installment.paid_date,
        member_id      = member.id,
        invoice_number = payment.invoice_number,
        notes          = (
            f"Plan: {member.plan.name if member.plan else 'N/A'} "
            f"| {payment.valid_from} → {payment.valid_to} "
            f"| Balance after: ₹{installment.balance_after} "
            f"| plan_total:{plan_total} "
            f"| mode:{installment.mode_of_payment or 'cash'}"
        ),
    )

def _create_installment(payment, member, amount, installment_type, notes="", mode_of_payment="cash"):
    balance_after = max(Decimal("0"), payment.balance - Decimal(str(amount)))

    installment = InstallmentPayment.objects.create(
        payment          = payment,
        member           = member,
        installment_type = installment_type,
        amount           = Decimal(str(amount)),
        balance_after    = balance_after,
        paid_date        = timezone.localdate(),
        notes            = notes,
        mode_of_payment  = mode_of_payment,
    )

    payment.amount_paid = payment.amount_paid + Decimal(str(amount))
    payment.save()

    return installment

def _build_bill(member, payment, gym):
    installments = list(payment.installment_payments.all().order_by("paid_date", "created_at"))
    installment_data = []
    for inst in installments:
        installment_data.append({
            "id":               inst.id,
            "installment_type": inst.installment_type,
            "amount":           float(inst.amount),
            "balance_after":    float(inst.balance_after),
            "paid_date":        str(inst.paid_date),
            "notes":            inst.notes,
            "mode_of_payment":  inst.mode_of_payment,
        })

    return {
        "invoice_number":    payment.invoice_number,
        "member_id":         member.display_id(),
        "member_name":       member.name,
        "phone":             member.phone,
        "email":             member.email,
        "plan_name":         payment.plan.name if payment.plan else "",
        "plan_duration":     payment.plan.duration_days if payment.plan else 0,
        "plan_price":        float(payment.plan_price),
        "gst_rate":          float(payment.gst_rate),
        "gst_amount":        float(payment.gst_amount),
        "total_with_gst":    float(payment.total_with_gst),
        "amount_paid":       float(payment.amount_paid),
        "balance":           float(payment.balance),
        "valid_from":        str(payment.valid_from),
        "valid_to":          str(payment.valid_to),
        "date":              str(timezone.localdate()),
        "status":            payment.status,
        "gym_name":          gym["name"],
        "gym_address":       gym["address"],
        "gym_phone":         gym["phone"],
        "gym_email":         gym["email"],
        "gym_gstin":         gym["gstin"],
        "cycle_installments": installment_data,
    }


# ─── ViewSets ────────────────────────────────────────

class MembershipPlanViewSet(viewsets.ModelViewSet):
    queryset         = MembershipPlan.objects.all()
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
    ordering_fields  = ["name","join_date","renewal_date","status","personal_trainer"]

    def get_queryset(self):
        # Auto-expire members whose renewal date has passed
        _auto_expire_members()

        qs     = Member.objects.select_related("plan").all()
        params = self.request.query_params

        # status filter
        if params.get("status"):
            qs = qs.filter(status=params["status"])

        # gender filter
        if params.get("gender"):
            qs = qs.filter(gender=params["gender"])

        # plan filter (by plan id)
        if params.get("plan"):
            qs = qs.filter(plan_id=params["plan"])

        # plan filter (by personal trainer requirement)
        if params.get("personal_trainer") == "true":
            qs = qs.filter(personal_trainer=True)

        # search
        if params.get("search"):
            q  = params["search"]
            qs = qs.filter(Q(name__icontains=q) | Q(phone__icontains=q) | Q(email__icontains=q))

        # expiring within N days (only makes sense for active members)
        expiring_days = params.get("expiring_days")
        if expiring_days:
            try:
                n      = int(expiring_days)
                today  = timezone.localdate()
                cutoff = today + timedelta(days=n)
                qs = qs.filter(
                    status="active",
                    renewal_date__gte=today,
                    renewal_date__lte=cutoff,
                )
            except ValueError:
                pass

        # balance filter
        balance_filter = params.get("balance_filter")
        if balance_filter == "has_balance":
            # Members with at least one partial or pending payment cycle
            qs = qs.filter(payments__status__in=["partial", "pending"]).distinct()
        elif balance_filter == "no_balance":
            # Members with NO partial or pending cycles
            qs = qs.exclude(payments__status__in=["partial", "pending"]).distinct()

        return qs

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

        plan_type = d.get("plan_type", "basic")

        member = Member.objects.create(
            name=d["name"], phone=d["phone"],
            email=d.get("email",""), gender=d.get("gender",""),
            address=d.get("address",""), plan=plan, diet=diet,
            join_date=join, renewal_date=renew,
            status=d.get("status","active"), notes=d.get("notes",""),
            plan_type=plan_type,
            personal_trainer=d.get("personal_trainer", False),
        )

        amount_paid = Decimal(str(d.get("amount_paid", 0)))
        bill_data   = None

        if plan:
            base, gst_amt, total, rate = _calc_gst(plan.price)
            inv_no = _invoice_number(member.id, join)

            payment = MemberPayment.objects.create(
                member         = member,
                plan           = plan,
                invoice_number = inv_no,
                plan_price     = base,
                gst_rate       = rate,
                gst_amount     = gst_amt,
                total_with_gst = total,
                amount_paid    = Decimal("0"),
                valid_from     = join,
                valid_to       = renew or join,
            )

            if amount_paid > 0:
                if not d.get("personal_trainer", False):
                    installment = _create_installment(
                        payment, member, amount_paid, "enrollment",
                        notes=d.get("notes", ""),
                        mode_of_payment=d.get("mode_of_payment", "cash"),
                    )
                    _record_income_for_installment(member, payment, installment)

            bill_data = _build_bill(member, payment, _gym_info())

        try: send_notification(member, "enrollment")
        except: pass

        return Response({
            **MemberSerializer(member).data,
            "bill": bill_data,
        }, status=201)

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

        member.renew()

        base, gst_amt, total, rate = _calc_gst(member.plan.price if member.plan else amount_paid)
        inv_no = _invoice_number(member.id, timezone.localdate(), "-R")

        payment = MemberPayment.objects.create(
            member         = member,
            plan           = member.plan,
            invoice_number = inv_no,
            plan_price     = base,
            gst_rate       = rate,
            gst_amount     = gst_amt,
            total_with_gst = total,
            amount_paid    = Decimal("0"),
            valid_from     = old_renewal or timezone.localdate(),
            valid_to       = member.renewal_date,
            notes          = s.validated_data.get("notes",""),
        )

        if amount_paid > 0:
            installment = _create_installment(
                payment, member, amount_paid, "renewal",
                notes=s.validated_data.get("notes", ""),
                mode_of_payment=s.validated_data.get("mode_of_payment", "cash"),
            )
            _record_income_for_installment(member, payment, installment)

        try: send_notification(member, "renewal_confirm")
        except: pass

        bill_data = _build_bill(member, payment, _gym_info())
        return Response({
            **MemberSerializer(member).data,
            "bill": bill_data,
        })

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
            return Response({
                "detail": f"Amount ₹{extra} exceeds balance of ₹{payment.balance}."
            }, status=400)

        installment = _create_installment(
            payment, member, extra, "balance",
            notes=s.validated_data.get("notes", ""),
            mode_of_payment=s.validated_data.get("mode_of_payment", "cash"),
        )
        _record_income_for_installment(member, payment, installment)

        bill_data = _build_bill(member, payment, _gym_info())
        return Response({
            **MemberPaymentSerializer(payment).data,
            "bill": bill_data,
        })

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
        _auto_expire_members()
        today = timezone.localdate()
        return Response({
            "total":          Member.objects.count(),
            "active":         Member.objects.filter(status="active").count(),
            "expired":        Member.objects.filter(status="expired").count(),
            "cancelled":      Member.objects.filter(status="cancelled").count(),
            "expiring_7":     Member.objects.filter(
                status="active",
                renewal_date__lte=today+timedelta(days=7),
                renewal_date__gte=today).count(),
            "new_this_month": Member.objects.filter(
                join_date__year=today.year,
                join_date__month=today.month).count(),
        })


class MemberPaymentViewSet(viewsets.ModelViewSet):
    queryset         = MemberPayment.objects.select_related("member","plan").prefetch_related("installment_payments").all()
    serializer_class = MemberPaymentSerializer
    filterset_fields = ["member","status"]
    ordering_fields  = ["paid_date"]

class MemberAttendanceViewSet(viewsets.ModelViewSet):
    queryset         = MemberAttendance.objects.select_related("member").all()
    serializer_class = MemberAttendanceSerializer
    filterset_fields = ["member","date"]
    ordering_fields  = ["date","check_in"]

    def list(self, request, *args, **kwargs):
        try:
            from apps.staff.views import _auto_mark_absent_members
            _auto_mark_absent_members()
        except Exception:
            pass
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=["get"])
    def today(self, request):
        qs = MemberAttendance.objects.filter(
            date=timezone.localdate()).select_related("member")
        return Response(MemberAttendanceSerializer(qs, many=True).data)


# ─── Public kiosk endpoints (no auth) ────────────────

class KioskLookupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        raw = str(request.data.get("id_input","")).strip().upper()
        if not raw:
            return Response({"detail":"Enter an ID."}, status=400)

        if raw.startswith("M"):
            try:
                member = Member.objects.select_related("plan").get(pk=int(raw[1:]))
                return Response({
                    "type":"member", "id":member.id,
                    "display_id": member.display_id(),
                    "name": member.name, "role":"Member",
                    "plan": member.plan.name if member.plan else "No Plan",
                    "status": member.status,
                    "renewal": str(member.renewal_date) if member.renewal_date else None,
                    "photo": member.photo_url or "",
                })
            except (ValueError, Member.DoesNotExist):
                return Response({"detail":f"No member found with ID {raw}."}, status=404)

        elif raw.startswith("S"):
            from apps.staff.models import StaffMember
            try:
                staff = StaffMember.objects.get(pk=int(raw[1:]))
                return Response({
                    "type":"staff", "id":staff.id,
                    "display_id": f"S{staff.id:04d}",
                    "name": staff.name,
                    "role": staff.role.capitalize(),
                    "shift": staff.shift, "status": staff.status,
                    "photo": staff.photo_url or "",
                })
            except (ValueError, StaffMember.DoesNotExist):
                return Response({"detail":f"No staff found with ID {raw}."}, status=404)

        return Response({"detail":"ID must start with M (member) or S (staff)."}, status=400)


class KioskMarkAttendanceView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ptype = request.data.get("type")
        pid   = request.data.get("id")
        now   = timezone.now()
        today = timezone.localdate()

        # ── KEY FIX: convert UTC→IST before extracting time ──
        local_now  = timezone.localtime(now)
        local_time = local_now.time()           # IST time e.g. 09:17, not 03:47

        if ptype == "member":
            try:
                member   = Member.objects.get(pk=pid)
                existing = MemberAttendance.objects.filter(member=member, date=today).first()
                if existing and not existing.check_out:
                    existing.check_out = local_time
                    existing.save()
                    act = "check_out"
                elif existing:
                    MemberAttendance.objects.create(
                        member=member, date=today, check_in=local_time
                    )
                    act = "check_in"
                else:
                    MemberAttendance.objects.create(
                        member=member, date=today, check_in=local_time
                    )
                    act = "check_in"
                return Response({
                    "action": act, "name": member.name,
                    "time":   local_now.strftime("%I:%M %p"),   # display IST
                    "date":   str(today), "type": "member",
                })
            except Member.DoesNotExist:
                return Response({"detail": "Member not found."}, status=404)

        # ── PATCH: apps/members/views.py — KioskMarkAttendanceView ──────────────────
# Replace the entire `elif ptype == "staff":` block with this version.
# Change: block re-login if staff has already checked out today.
# ─────────────────────────────────────────────────────────────────────────────

        elif ptype == "staff":
            from apps.staff.models import StaffMember, StaffAttendance
            try:
                staff    = StaffMember.objects.get(pk=pid)
                existing = StaffAttendance.objects.filter(staff=staff, date=today).first()

                if existing and existing.check_out:
                    # ── Already checked out — block re-entry ──────────────
                    return Response({
                        "action":  "already_out",
                        "name":    staff.name,
                        "message": (
                            f"Already checked out at "
                            f"{existing.check_out.strftime('%I:%M %p')}."
                            f" No re-entry allowed for today."
                        ),
                        "time":  existing.check_out.strftime("%I:%M %p"),
                        "date":  str(today),
                        "type":  "staff",
                    }, status=200)

                elif existing and not existing.check_out:
                    # ── Checked in, not yet out → mark check-out ─────────
                    existing.check_out = local_time
                    existing.save()
                    act = "check_out"

                else:
                    # ── No record yet → first check-in ───────────────────
                    StaffAttendance.objects.create(
                        staff=staff, date=today,
                        check_in=local_time, status="present"
                    )
                    act = "check_in"

                return Response({
                    "action": act,
                    "name":   staff.name,
                    "time":   local_now.strftime("%I:%M %p"),
                    "date":   str(today),
                    "type":   "staff",
                })

            except StaffMember.DoesNotExist:
                return Response({"detail": "Staff not found."}, status=404)
    
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
        plan = DietPlan.objects.create(
            name=request.data.get("name", "Unnamed Plan"),
            foodType=request.data.get("foodType", "veg"),
        )
        self._save_items(plan, request.data.get("items", []))
        return Response(DietPlanSerializer(plan).data, status=201)

    def update(self, request, *args, **kwargs):
        plan = self.get_object()
        plan.name = request.data.get("name", plan.name)
        plan.foodType = request.data.get("foodType", plan.foodType)
        plan.save()
        plan.items.all().delete()
        self._save_items(plan, request.data.get("items", []))
        return Response(DietPlanSerializer(plan).data)


class DietViewSet(viewsets.ModelViewSet):
    queryset = Diet.objects.all()
    serializer_class = DietSerializer


class MemberTrainerAssignmentViewSet(viewsets.ModelViewSet):
    queryset         = TrainerAssignment.objects.select_related("member", "trainer", "plan").all()
    serializer_class = TrainerAssignmentSerializer

    def get_queryset(self):
        qs     = TrainerAssignment.objects.select_related("member", "trainer", "plan").all()
        params = self.request.query_params
        if params.get("member"):
            qs = qs.filter(member_id=params["member"])
        if params.get("trainer"):
            qs = qs.filter(trainer_id=params["trainer"])
        if params.get("plan"):
            qs = qs.filter(plan_id=params["plan"])
        return qs

    @staticmethod
    def _check_plan_eligibility(member):
        """Returns (ok, error_msg). A member needs standard/premium plan_type and must have opted in for personal trainer."""
        if not member.plan:
            return False, "Member has no membership plan. Assign a Standard or Premium plan first."
        if member.plan_type not in ("standard", "premium"):
            return False, (
                f"Personal trainer is only available for Standard and Premium plans. "
                f"This member is on the '{member.plan_type}' plan."
            )
        if not member.personal_trainer:
            return False, (
                f"This member has not opted for Personal Trainer. "
                f"Enable the Personal Trainer option on the member's profile first."
            )
        return True, None

    def create(self, request, *args, **kwargs):
        from apps.staff.models import StaffMember
        from django.core.exceptions import ValidationError as DjValidationError
        data = request.data

        try:
            member  = Member.objects.select_related("plan").get(pk=data.get("member"))
            trainer = StaffMember.objects.get(pk=data.get("trainer"), role="trainer")
        except Member.DoesNotExist:
            return Response({"detail": "Member not found."}, status=400)
        except StaffMember.DoesNotExist:
            return Response({"detail": "Trainer not found or staff member is not a Trainer."}, status=400)

        ok, err = self._check_plan_eligibility(member)
        if not ok:
            return Response({"detail": err}, status=400)

        plan = None
        if data.get("plan"):
            plan = MembershipPlan.objects.filter(pk=data["plan"]).first()

        assignment = TrainerAssignment(
            member       = member,
            trainer      = trainer,
            plan         = plan,
            startingtime = data.get("startingtime"),
            endingtime   = data.get("endingtime"),
            working_days = data.get("working_days", "0,1,2,3,4,5,6"),
        )
        try:
            assignment.full_clean()
        except DjValidationError as exc:
            return Response({"detail": "; ".join(exc.messages)}, status=400)

        assignment.save()

        # Update the member's latest payment to include the trainer's PT fee
        if trainer.personal_trainer_amt:
            latest_payment = member.payments.select_related("plan").order_by("-created_at").first()
            if latest_payment and latest_payment.plan:
                base, gst_amt, total, rate = _calc_gst(
                    latest_payment.plan.price + trainer.personal_trainer_amt
                )
                latest_payment.plan_price     = base
                latest_payment.gst_amount     = gst_amt
                latest_payment.total_with_gst = total
                latest_payment.gst_rate       = rate
                latest_payment.save()
            amount_paid = Decimal(str(request.data.get("amount_paid",0)))
            if amount_paid>0:
                installment = _create_installment(
                    latest_payment,member,amount_paid,"enrollment",notes=request.data.get("notes",""),mode_of_payment=request.data.get("mode_of_payment","cash"),
                )
                _record_income_for_installment(member, latest_payment,installment)
        

        return Response(TrainerAssignmentSerializer(assignment).data, status=201)

    def update(self, request, *args, **kwargs):
        from apps.staff.models import StaffMember
        from django.core.exceptions import ValidationError as DjValidationError
        assignment = self.get_object()
        data       = request.data

        if data.get("trainer"):
            try:
                assignment.trainer = StaffMember.objects.get(pk=data["trainer"], role="trainer")
            except StaffMember.DoesNotExist:
                return Response({"detail": "Trainer not found or staff member is not a Trainer."}, status=400)

        if data.get("plan"):
            assignment.plan = MembershipPlan.objects.filter(pk=data["plan"]).first()
        elif "plan" in data and data["plan"] is None:
            assignment.plan = None

        if data.get("startingtime"):
            assignment.startingtime = data["startingtime"]
        if data.get("endingtime"):
            assignment.endingtime = data["endingtime"]
        if data.get("working_days"):
            assignment.working_days = data["working_days"]

        try:
            assignment.full_clean()
        except DjValidationError as exc:
            return Response({"detail": "; ".join(exc.messages)}, status=400)

        assignment.save()
        return Response(TrainerAssignmentSerializer(assignment).data)

    @action(detail=True, methods=["post"], url_path="pay-trainer-fee")
    def pay_trainer_fee(self, request, pk=None):
        from apps.finances.models import Expenditure
        from apps.finances.gst_utils import get_pt_payable_percent
        assignment = self.get_object()

        if assignment.trainer_fee_paid:
            return Response({"detail": "Trainer fee already paid for this member."}, status=400)

        pt_amt = assignment.trainer.personal_trainer_amt
        if not pt_amt or pt_amt <= 0:
            return Response({"detail": "This trainer has no PT fee configured."}, status=400)

        pt_payable_pct = get_pt_payable_percent()
        payable_amt    = (Decimal(str(pt_amt)) * pt_payable_pct / 100).quantize(Decimal("0.01"), ROUND_HALF_UP)

        Expenditure.objects.create(
            category    = "salary",
            description = f"PT Fee — {assignment.trainer.name} for {assignment.member.name}",
            amount      = payable_amt,
            date        = timezone.localdate(),
            vendor      = assignment.trainer.name,
            notes       = f"Trainer assignment ID: {assignment.id} | PT fee: ₹{pt_amt} × {pt_payable_pct}% = ₹{payable_amt} | Invoice: {assignment.member.payments.order_by('-created_at').values_list('invoice_number', flat=True).first() or ''}",
        )

        assignment.trainer_fee_paid = True
        assignment.save()

        return Response(TrainerAssignmentSerializer(assignment).data)