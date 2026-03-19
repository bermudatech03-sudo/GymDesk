
from django.contrib import admin
from .models import StaffMember, StaffAttendance, StaffPayment
admin.site.register(StaffMember)
admin.site.register(StaffAttendance)
admin.site.register(StaffPayment)
