from rest_framework import serializers
from django.conf import settings as djconf
from decimal import Decimal, ROUND_HALF_UP
from .models import Diet, DietPlan, Member, MembershipPlan, MemberPayment, MemberAttendance, InstallmentPayment, TrainerAssignment


def _gst_rate():
    return Decimal(str(getattr(djconf, "GST_RATE", 18)))


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
    plan_type          = serializers.CharField(source="plan.plans", read_only=True)
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
        if obj.plan and obj.plan.plans in ("standard", "premium") and obj.plan.personal_trainer:
            return obj.personal_trainer
        return False


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
    personal_trainer  = serializers.BooleanField(required=False, default=False)


class RenewSerializer(serializers.Serializer):
    plan_id     = serializers.IntegerField(required=False, allow_null=True)
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=2)
    notes       = serializers.CharField(required=False, allow_blank=True, default="")


class BalancePaymentSerializer(serializers.Serializer):
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=2)
    notes       = serializers.CharField(required=False, allow_blank=True, default="")

class AssignTrainerSerializer(serializers.Serializer):
    trainer_id = serializers.IntegerField()
    plan_id    = serializers.IntegerField(required=False, allow_null=True)
    startingtime = serializers.TimeField()
    endingtime   = serializers.TimeField()
    working_days = serializers.CharField(required=False, default="0,1,2,3,4,5,6")


class TrainerAssignmentSerializer(serializers.ModelSerializer):
    member_name  = serializers.CharField(source="member.name",   read_only=True)
    member_display_id = serializers.SerializerMethodField()
    trainer_name = serializers.CharField(source="trainer.name",  read_only=True)
    trainer_display_id = serializers.SerializerMethodField()
    plan_name    = serializers.CharField(source="plan.name",     read_only=True, allow_null=True)
    working_day_names = serializers.SerializerMethodField()

    class Meta:
        model  = TrainerAssignment
        fields = "__all__"

    def get_member_display_id(self, obj):
        return obj.member.display_id()

    def get_trainer_display_id(self, obj):
        return f"S{obj.trainer.id:04d}"

    def get_working_day_names(self, obj):
        return obj.working_day_names

    def validate(self, data):
        if data.get("startingtime") and data.get("endingtime"):
            if data["startingtime"] >= data["endingtime"]:
                raise serializers.ValidationError("Start time must be before end time.")
        return data