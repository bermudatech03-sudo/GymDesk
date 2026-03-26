# ADD these to your existing staff/serializers.py
# (keep MemberSerializer, PlanSerializer etc. unchanged)

from rest_framework import serializers
from .models import StaffMember, StaffShift, StaffAttendance, StaffPayment


class StaffShiftSerializer(serializers.ModelSerializer):
    working_day_names     = serializers.ReadOnlyField()
    shift_duration_minutes = serializers.SerializerMethodField()
    assigned_count        = serializers.SerializerMethodField()

    class Meta:
        model  = StaffShift
        fields = [
            "id", "name", "working_days_preset", "working_days",
            "start_time", "end_time", "late_grace_minutes",
            "overtime_threshold_minutes", "notes", "created_at",
            "working_day_names", "shift_duration_minutes", "assigned_count",
        ]

    def get_assigned_count(self, obj):
        return obj.staff_members.count()

    def get_shift_duration_minutes(self, obj):
        return obj.shift_duration_minutes()


class StaffSerializer(serializers.ModelSerializer):
    staff_id_display       = serializers.SerializerMethodField()
    shift_template_name    = serializers.SerializerMethodField()
    shift_duration_minutes = serializers.SerializerMethodField()

    class Meta:
        model  = StaffMember
        fields = "__all__"

    def get_staff_id_display(self, obj):
        return obj.display_id()

    def get_shift_template_name(self, obj):
        return obj.shift_template.name if obj.shift_template else None

    def get_shift_duration_minutes(self, obj):
        return obj.shift_template.shift_duration_minutes() if obj.shift_template else None


class AttendanceSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.name", read_only=True)
    staff_role = serializers.CharField(source="staff.role", read_only=True)

    class Meta:
        model  = StaffAttendance
        fields = [
            "id", "staff", "staff_name", "staff_role",
            "date", "check_in", "check_out", "status", "notes",
            "worked_minutes", "late_minutes", "overtime_minutes",
        ]


class PaymentSerializer(serializers.ModelSerializer):
    staff_name  = serializers.CharField(source="staff.name",  read_only=True)
    staff_role  = serializers.CharField(source="staff.role",  read_only=True)
    staff_shift = serializers.CharField(source="staff.shift", read_only=True)

    class Meta:
        model  = StaffPayment
        fields = "__all__"