
from django.contrib import admin
from .models import Member, MembershipPlan, MemberPayment
admin.site.register(Member)
admin.site.register(MembershipPlan)
admin.site.register(MemberPayment)
