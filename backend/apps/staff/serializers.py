from rest_framework import serializers
from .models import StaffMember, StaffAttendance, StaffPayment

class StaffSerializer(serializers.ModelSerializer):
    display_id = serializers.SerializerMethodField()

    class Meta:
        model  = StaffMember
        fields = "__all__"

    def get_display_id(self, obj):
        return obj.display_id()

class AttendanceSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.name", read_only=True)
    class Meta:
        model  = StaffAttendance
        fields = "__all__"
    read_only_fields = ["id"]

class PaymentSerializer(serializers.ModelSerializer):
    staff_name  = serializers.CharField(source="staff.name",  read_only=True)
    staff_role  = serializers.CharField(source="staff.role",  read_only=True)
    staff_shift = serializers.CharField(source="staff.shift", read_only=True)
    class Meta:
        model  = StaffPayment
        fields = "__all__"