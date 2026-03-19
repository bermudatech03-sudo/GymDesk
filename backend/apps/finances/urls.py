
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import IncomeViewSet, ExpenditureViewSet, FinanceSummaryView

router = DefaultRouter()
router.register("income",      IncomeViewSet,      basename="income")
router.register("expenditure", ExpenditureViewSet,  basename="expenditure")
urlpatterns = [
    path("", include(router.urls)),
    path("summary/", FinanceSummaryView.as_view()),
]
