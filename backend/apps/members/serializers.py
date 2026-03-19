from rest_framework import serializers
from django.utils import timezone
from .models import Member, MembershipPlan, MemberPayment, MemberAttendance

class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MembershipPlan
        fields = "__all__"

class MemberPaymentSerializer(serializers.ModelSerializer):
    plan_name   = serializers.CharField(source="plan.name",   read_only=True)
    member_name = serializers.CharField(source="member.name", read_only=True)
    class Meta:
        model  = MemberPayment
        fields = "__all__"

class MemberSerializer(serializers.ModelSerializer):
    plan_name         = serializers.CharField(source="plan.name",  read_only=True)
    plan_price_val    = serializers.DecimalField(source="plan.price", max_digits=10, decimal_places=2, read_only=True)
    days_until_expiry = serializers.SerializerMethodField()
    total_paid        = serializers.SerializerMethodField()
    balance_due       = serializers.SerializerMethodField()
    member_id_display = serializers.SerializerMethodField()

    class Meta:
        model  = Member
        fields = "__all__"

    def get_days_until_expiry(self, obj):  return obj.days_until_expiry()
    def get_total_paid(self, obj):         return float(obj.total_paid())
    def get_balance_due(self, obj):        return float(obj.balance_due())
    def get_member_id_display(self, obj):  return obj.display_id()

class MemberAttendanceSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source="member.name", read_only=True)
    member_display_id = serializers.SerializerMethodField()
    class Meta:
        model  = MemberAttendance
        fields = "__all__"
    def get_member_display_id(self, obj):
        return obj.member.member_id()

class EnrollSerializer(serializers.Serializer):
    name         = serializers.CharField()
    phone        = serializers.CharField()
    email        = serializers.EmailField(required=False, allow_blank=True)
    gender       = serializers.CharField(required=False, allow_blank=True)
    address      = serializers.CharField(required=False, allow_blank=True)
    plan_id      = serializers.IntegerField(required=False, allow_null=True)
    join_date    = serializers.DateField(required=False)
    renewal_date = serializers.DateField(required=False, allow_null=True)
    amount_paid  = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    notes        = serializers.CharField(required=False, allow_blank=True)
    status       = serializers.CharField(required=False, default="active")

class RenewSerializer(serializers.Serializer):
    plan_id     = serializers.IntegerField(required=False, allow_null=True)
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=2)
    notes       = serializers.CharField(required=False, allow_blank=True, default="")

class BalancePaymentSerializer(serializers.Serializer):
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=2)
    notes       = serializers.CharField(required=False, allow_blank=True, default="")