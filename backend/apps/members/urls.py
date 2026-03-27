from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (DietPlanViewSet, DietViewSet, MemberViewSet, MembershipPlanViewSet, MemberPaymentViewSet,
    MemberAttendanceViewSet, KioskLookupView, KioskMarkAttendanceView, MemberTrainerAssignmentViewSet)

router = DefaultRouter()
router.register("list",             MemberViewSet,          basename="member")
router.register("plans",            MembershipPlanViewSet,  basename="plan")
router.register("payments",         MemberPaymentViewSet,   basename="member-payment")
router.register("attendance-log",   MemberAttendanceViewSet,basename="member-attendance")
router.register("diet-plans",       DietPlanViewSet,        basename="diet-plan")
router.register("diets",            DietViewSet,            basename="diet")
router.register("assign-trainer",  MemberTrainerAssignmentViewSet, basename="assign-trainer")
urlpatterns = [
    path("", include(router.urls)),
    path("kiosk/lookup/",   KioskLookupView.as_view()),
    path("kiosk/checkin/",  KioskMarkAttendanceView.as_view()),
]