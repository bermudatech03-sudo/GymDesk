from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import IncomeViewSet, ExpenditureViewSet, FinanceSummaryView, MonthlyReportView, GSTRateView, ToBuyView, CanAffordView, GymSettingsView

router = DefaultRouter()
router.register("income",      IncomeViewSet,      basename="income")
router.register("expenditure", ExpenditureViewSet,  basename="expenditure")

urlpatterns = [
    path("", include(router.urls)),
    path("summary/",        FinanceSummaryView.as_view()),
    path("monthly-report/", MonthlyReportView.as_view()),
    path("gst-rate/",       GSTRateView.as_view()),
    path("to-buy/",         ToBuyView.as_view()),
    path("to-buy/can-afford/", CanAffordView.as_view()),
    path("gym-settings/",      GymSettingsView.as_view()),
]