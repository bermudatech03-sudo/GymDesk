
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EquipmentViewSet, MaintenanceLogViewSet

router = DefaultRouter()
router.register("list",        EquipmentViewSet,      basename="equipment")
router.register("maintenance", MaintenanceLogViewSet,  basename="maintenance")
urlpatterns = [path("", include(router.urls))]
