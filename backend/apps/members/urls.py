
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MemberViewSet, MembershipPlanViewSet, MemberPaymentViewSet

router = DefaultRouter()
router.register("list",    MemberViewSet,          basename="member")
router.register("plans",   MembershipPlanViewSet,  basename="plan")
router.register("payments",MemberPaymentViewSet,   basename="member-payment")
urlpatterns = [path("", include(router.urls))]
