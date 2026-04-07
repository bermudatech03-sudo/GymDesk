from rest_framework import serializers
from decimal import Decimal, ROUND_HALF_UP
from .models import Diet, DietPlan, Member, MembershipPlan, MemberPayment, MemberAttendance, InstallmentPayment, TrainerAssignment, PTRenewal
from apps.finances.gst_utils import get_gst_rate as _get_gst_rate


def _gst_rate():
    return _get_gst_rate()


class PlanSerializer(serializers.ModelSerializer):
    # GST-inclusive total — computed from settings.GST_RATE once here
    # so all frontends always show the correct final price without extra calls.
    gst_rate       = serializers.SerializerMethodField()
    price_with_gst = serializers.SerializerMethodField()

    
    class Meta:
        model  = MembershipPlan
        fields = "__all__"

    def get_gst_rate(self, obj):
        return float(_gst_rate())

    def get_price_with_gst(self, obj):
        rate  = _gst_rate()
        base  = Decimal(str(obj.price))
        total = (base + base * rate / 100).quantize(Decimal("0.01"), ROUND_HALF_UP)
        return float(total)


class InstallmentPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = InstallmentPayment
        fields = "__all__"


class DietSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diet
        fields = "__all__"

class DietPlanSerializer(serializers.ModelSerializer):
    items                  = DietSerializer(many=True, read_only=True)
    assigned_members_count = serializers.SerializerMethodField()
    assigned_members       = serializers.SerializerMethodField()

    class Meta:
        model  = DietPlan
        fields = "__all__"

    def get_assigned_members_count(self, obj):
        return obj.member_set.count()

    def get_assigned_members(self, obj):
        return list(obj.member_set.values_list("name", flat=True))


class MemberPaymentSerializer(serializers.ModelSerializer):
    plan_name            = serializers.CharField(source="plan.name",   read_only=True)
    member_name          = serializers.CharField(source="member.name", read_only=True)
    installment_payments = InstallmentPaymentSerializer(many=True, read_only=True)

    class Meta:
        model  = MemberPayment
        fields = "__all__"


class MemberSerializer(serializers.ModelSerializer):
    plan_name          = serializers.CharField(source="plan.name",  read_only=True)
    plan_price_val     = serializers.DecimalField(source="plan.price",
                             max_digits=10, decimal_places=2, read_only=True)
    plan_allows_trainer = serializers.SerializerMethodField()
    diet_id            = serializers.IntegerField(source="diet.id",  read_only=True, allow_null=True)
    diet_name          = serializers.CharField(source="diet.name",  read_only=True, allow_null=True)
    days_until_expiry  = serializers.SerializerMethodField()
    total_paid         = serializers.SerializerMethodField()
    balance_due        = serializers.SerializerMethodField()
    member_id_display  = serializers.SerializerMethodField()

    class Meta:
        model  = Member
        fields = "__all__"

    def get_days_until_expiry(self, obj): return obj.days_until_expiry()
    def get_total_paid(self, obj):        return float(obj.total_paid())
    def get_balance_due(self, obj):       return float(obj.balance_due())
    def get_member_id_display(self, obj): return obj.display_id()
    def get_plan_allows_trainer(self, obj):
        return obj.plan_type in ("standard", "premium") and obj.personal_trainer


class MemberAttendanceSerializer(serializers.ModelSerializer):
    member_name       = serializers.CharField(source="member.name", read_only=True)
    member_display_id = serializers.SerializerMethodField()

    class Meta:
        model  = MemberAttendance
        fields = "__all__"

    def get_member_display_id(self, obj):
        return obj.member.display_id()


class EnrollSerializer(serializers.Serializer):
    name         = serializers.CharField()
    phone        = serializers.CharField()
    email        = serializers.EmailField(required=False, allow_blank=True)
    gender       = serializers.CharField(required=False, allow_blank=True)
    address      = serializers.CharField(required=False, allow_blank=True)
    plan_id      = serializers.IntegerField(required=False, allow_null=True)
    diet_id      = serializers.IntegerField(required=False, allow_null=True)
    join_date    = serializers.DateField(required=False)
    renewal_date = serializers.DateField(required=False, allow_null=True)
    amount_paid  = serializers.DecimalField(max_digits=10, decimal_places=2,
                       required=False, default=0)
    notes             = serializers.CharField(required=False, allow_blank=True)
    status            = serializers.CharField(required=False, default="active")
    plan_type         = serializers.CharField(required=False, default="basic")
    personal_trainer  = serializers.BooleanField(required=False, default=False)
    mode_of_payment   = serializers.CharField(required=False, default="cash")


class RenewSerializer(serializers.Serializer):
    plan_id     = serializers.IntegerField(required=False, allow_null=True)
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=2)
    notes       = serializers.CharField(required=False, allow_blank=True, default="")
    mode_of_payment   = serializers.CharField(required=False, default="cash")

class BalancePaymentSerializer(serializers.Serializer):
    amount_paid     = serializers.DecimalField(max_digits=10, decimal_places=2)
    notes           = serializers.CharField(required=False, allow_blank=True, default="")
    mode_of_payment = serializers.CharField(required=False, default="cash")

class AssignTrainerSerializer(serializers.Serializer):
    trainer_id = serializers.IntegerField()
    plan_id    = serializers.IntegerField(required=False, allow_null=True)
    startingtime = serializers.TimeField()
    endingtime   = serializers.TimeField()
    working_days = serializers.CharField(required=False, default="0,1,2,3,4,5,6")


class PTRenewalSerializer(serializers.ModelSerializer):
    member_name  = serializers.CharField(source="member.name",  read_only=True)
    trainer_name = serializers.CharField(source="trainer.name", read_only=True)

    class Meta:
        model  = PTRenewal
        fields = "__all__"


class TrainerAssignmentSerializer(serializers.ModelSerializer):
    member_name        = serializers.CharField(source="member.name",  read_only=True)
    member_display_id  = serializers.SerializerMethodField()
    trainer_name       = serializers.CharField(source="trainer.name", read_only=True)
    trainer_display_id = serializers.SerializerMethodField()
    plan_name          = serializers.CharField(source="plan.name",    read_only=True, allow_null=True)
    working_day_names  = serializers.SerializerMethodField()
    trainer_pt_amt     = serializers.SerializerMethodField()
    member_amount_paid = serializers.SerializerMethodField()
    member_plan_total  = serializers.SerializerMethodField()
    # PT period computed fields
    pt_days_remaining               = serializers.SerializerMethodField()
    pt_renewal_days                 = serializers.SerializerMethodField()
    pt_renewal_amount               = serializers.SerializerMethodField()
    can_renew_pt                    = serializers.SerializerMethodField()
    member_plan_expiry              = serializers.SerializerMethodField()
    member_status                   = serializers.SerializerMethodField()
    # Pending trainer payout from PT renewals (unpaid PTRenewal records)
    pending_pt_renewal_trainer_amount = serializers.SerializerMethodField()

    class Meta:
        model  = TrainerAssignment
        fields = "__all__"

    def get_member_display_id(self, obj):
        return obj.member.display_id()

    def get_trainer_display_id(self, obj):
        return f"S{obj.trainer.id:04d}"

    def get_working_day_names(self, obj):
        return obj.working_day_names

    def get_trainer_pt_amt(self, obj):
        from apps.finances.gst_utils import get_pt_payable_percent
        amt = obj.trainer.personal_trainer_amt
        if not amt:
            return 0
        pct = get_pt_payable_percent()
        payable = (Decimal(str(amt)) * pct / 100).quantize(Decimal("0.01"), ROUND_HALF_UP)
        return float(payable)

    def get_member_amount_paid(self, obj):
        payment = obj.member.payments.order_by("-created_at").first()
        return float(payment.amount_paid) if payment else 0

    def get_member_plan_total(self, obj):
        payment = obj.member.payments.order_by("-created_at").first()
        return float(payment.total_with_gst) if payment else 0

    def get_pt_days_remaining(self, obj):
        """Days left in the current PT period (negative = expired)."""
        if not obj.pt_end_date:
            return None
        from django.utils import timezone
        return (obj.pt_end_date - timezone.localdate()).days

    def get_member_plan_expiry(self, obj):
        return str(obj.member.renewal_date) if obj.member.renewal_date else None

    def get_member_status(self, obj):
        return obj.member.status

    def get_pt_renewal_days(self, obj):
        """
        Days available for the NEXT PT renewal:
        min(30, days remaining in the member's plan from today).
        Returns 0 if plan is expired or member is inactive.
        """
        from django.utils import timezone
        today = timezone.localdate()
        if obj.member.status != "active":
            return 0
        if not obj.member.renewal_date or obj.member.renewal_date <= today:
            return 0
        remaining = (obj.member.renewal_date - today).days
        return min(30, remaining)

    def get_pt_renewal_amount(self, obj):
        """GST-inclusive prorated PT fee for the next renewal period."""
        from apps.finances.gst_utils import get_gst_rate
        pt_days = self.get_pt_renewal_days(obj)
        if pt_days <= 0:
            return 0.0
        full_amt = obj.trainer.personal_trainer_amt
        if not full_amt:
            return 0.0
        base = (Decimal(str(full_amt)) / 30 * pt_days).quantize(Decimal("0.01"), ROUND_HALF_UP)
        rate = get_gst_rate()
        gst  = (base * rate / 100).quantize(Decimal("0.01"), ROUND_HALF_UP)
        return float(base + gst)

    def get_can_renew_pt(self, obj):
        """True when the member's plan is active and has days remaining."""
        from django.utils import timezone
        today = timezone.localdate()
        if obj.member.status != "active":
            return False
        if not obj.member.renewal_date or obj.member.renewal_date <= today:
            return False
        return True

    def get_pending_pt_renewal_trainer_amount(self, obj):
        """Sum of trainer_payable_amount for all unpaid PTRenewal records on this assignment."""
        from django.db.models import Sum
        result = obj.pt_renewals.filter(trainer_paid=False).aggregate(
            t=Sum("trainer_payable_amount")
        )["t"]
        return float(result or 0)

    def validate(self, data):
        if data.get("startingtime") and data.get("endingtime"):
            if data["startingtime"] >= data["endingtime"]:
                raise serializers.ValidationError("Start time must be before end time.")
        return data