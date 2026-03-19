
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Q
from django.utils import timezone
from datetime import date
import calendar
from .models import Income, Expenditure
from .serializers import IncomeSerializer, ExpenditureSerializer

class IncomeViewSet(viewsets.ModelViewSet):
    queryset = Income.objects.all()
    serializer_class = IncomeSerializer
    filterset_fields = ["category","date"]
    ordering_fields  = ["date","amount"]

class ExpenditureViewSet(viewsets.ModelViewSet):
    queryset = Expenditure.objects.all()
    serializer_class = ExpenditureSerializer
    filterset_fields = ["category","date"]
    ordering_fields  = ["date","amount"]

from rest_framework.views import APIView

class FinanceSummaryView(APIView):
    def get(self, request):
        year  = int(request.query_params.get("year",  timezone.now().year))
        month = int(request.query_params.get("month", timezone.now().month))

        inc = Income.objects.filter(date__year=year, date__month=month)
        exp = Expenditure.objects.filter(date__year=year, date__month=month)

        total_income  = inc.aggregate(t=Sum("amount"))["t"] or 0
        total_expense = exp.aggregate(t=Sum("amount"))["t"] or 0
        savings       = total_income - total_expense

        # Month-by-month for last 12 months
        monthly = []
        for i in range(11, -1, -1):
            d = date(year, month, 1)
            m = ((d.month - 1 - i) % 12) + 1
            y = d.year + ((d.month - 1 - i) // 12)
            inc_m = Income.objects.filter(date__year=y, date__month=m).aggregate(t=Sum("amount"))["t"] or 0
            exp_m = Expenditure.objects.filter(date__year=y, date__month=m).aggregate(t=Sum("amount"))["t"] or 0
            monthly.append({
                "month": f"{calendar.month_abbr[m]} {y}",
                "income": float(inc_m),
                "expense": float(exp_m),
                "savings": float(inc_m - exp_m),
            })

        # Income by category
        inc_by_cat = list(inc.values("category").annotate(total=Sum("amount")).order_by("-total"))
        exp_by_cat = list(exp.values("category").annotate(total=Sum("amount")).order_by("-total"))

        return Response({
            "month": month, "year": year,
            "total_income":  float(total_income),
            "total_expense": float(total_expense),
            "savings":       float(savings),
            "monthly_trend": monthly,
            "income_by_category":  inc_by_cat,
            "expense_by_category": exp_by_cat,
        })
