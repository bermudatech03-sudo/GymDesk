from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (MemberViewSet, MembershipPlanViewSet, MemberPaymentViewSet,
    MemberAttendanceViewSet, KioskLookupView, KioskMarkAttendanceView)

router = DefaultRouter()
router.register("list",             MemberViewSet,          basename="member")
router.register("plans",            MembershipPlanViewSet,  basename="plan")
router.register("payments",         MemberPaymentViewSet,   basename="member-payment")
router.register("attendance-log",   MemberAttendanceViewSet,basename="member-attendance")

urlpatterns = [
    path("", include(router.urls)),
    path("kiosk/lookup/",   KioskLookupView.as_view()),
    path("kiosk/checkin/",  KioskMarkAttendanceView.as_view()),
]