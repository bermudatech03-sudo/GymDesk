
from rest_framework import serializers
from django.utils import timezone
from .models import Member, MembershipPlan, MemberPayment

class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipPlan
        fields = "__all__"

class MemberPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberPayment
        fields = "__all__"

class MemberSerializer(serializers.ModelSerializer):
    plan_name        = serializers.CharField(source="plan.name", read_only=True)
    plan_price       = serializers.DecimalField(source="plan.price", max_digits=10, decimal_places=2, read_only=True)
    days_until_expiry= serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = "__all__"

    def get_days_until_expiry(self, obj):
        return obj.days_until_expiry()

class RenewSerializer(serializers.Serializer):
    plan_id    = serializers.IntegerField(required=False)
    amount_paid= serializers.DecimalField(max_digits=10, decimal_places=2)
