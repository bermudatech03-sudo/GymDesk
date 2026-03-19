
from rest_framework import serializers
from .models import StaffMember, StaffAttendance, StaffPayment

class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffMember
        fields = "__all__"

class AttendanceSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.name", read_only=True)
    class Meta:
        model = StaffAttendance
        fields = "__all__"

class PaymentSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.name", read_only=True)
    class Meta:
        model = StaffPayment
        fields = "__all__"
