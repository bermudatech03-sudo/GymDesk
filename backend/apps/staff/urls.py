
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StaffViewSet, AttendanceViewSet, PaymentViewSet

router = DefaultRouter()
router.register("members",    StaffViewSet,      basename="staff")
router.register("attendance", AttendanceViewSet,  basename="attendance")
router.register("payments",   PaymentViewSet,     basename="staff-payment")
urlpatterns = [path("", include(router.urls))]
