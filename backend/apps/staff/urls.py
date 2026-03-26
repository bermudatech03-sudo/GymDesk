from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StaffViewSet, AttendanceViewSet, PaymentViewSet, StaffShiftViewSet, MemberCalendarView

router = DefaultRouter()
router.register("members",    StaffViewSet,      basename="staff")
router.register("attendance", AttendanceViewSet,  basename="attendance")
router.register("payments",   PaymentViewSet,     basename="staff-payment")
router.register("shifts",     StaffShiftViewSet,  basename="staff-shift")

urlpatterns = [
    path("", include(router.urls)),
    # Member calendar — wire separately if preferred in members/urls.py
    path("member-calendar/<int:pk>/", MemberCalendarView.as_view(), name="member-calendar"),
]