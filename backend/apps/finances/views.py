from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum
from django.utils import timezone
from django.conf import settings as django_settings
from decimal import Decimal
import calendar
from .models import Income, Expenditure
from .serializers import IncomeSerializer, ExpenditureSerializer


def get_gst_rate():
    return Decimal(str(getattr(django_settings, "GST_RATE", 18)))


class IncomeViewSet(viewsets.ModelViewSet):
    queryset         = Income.objects.all()
    serializer_class = IncomeSerializer
    filterset_fields = ["category","date"]
    ordering_fields  = ["date","amount"]
    search_fields    = ["source","notes","invoice_number"]


class ExpenditureViewSet(viewsets.ModelViewSet):
    queryset         = Expenditure.objects.all()
    serializer_class = ExpenditureSerializer
    filterset_fields = ["category","date"]
    ordering_fields  = ["date","amount"]
    search_fields    = ["description","vendor"]


class FinanceSummaryView(APIView):
    def get(self, request):
        today = timezone.localdate()
        year  = int(request.query_params.get("year",  today.year))
        month = int(request.query_params.get("month", today.month))

        inc = Income.objects.filter(date__year=year, date__month=month)
        exp = Expenditure.objects.filter(date__year=year, date__month=month)
        
        total_income  = inc.aggregate(t=Sum("amount"))["t"] or 0
        total_gst     = inc.aggregate(t=Sum("gst_amount"))["t"] or 0
        total_base    = inc.aggregate(t=Sum("base_amount"))["t"] or 0
        total_expense = exp.aggregate(t=Sum("amount"))["t"] or 0

        all_income  = Income.objects.aggregate(t=Sum("amount"))["t"] or 0
        all_expense = Expenditure.objects.aggregate(t=Sum("amount"))["t"] or 0
        net_savings = all_income - all_expense

        # 12-month trend
        monthly = []
        for i in range(11, -1, -1):
            m = month - i
            y = year
            while m <= 0:
                m += 12; y -= 1
            inc_m = Income.objects.filter(date__year=y, date__month=m).aggregate(t=Sum("amount"))["t"] or 0
            exp_m = Expenditure.objects.filter(date__year=y, date__month=m).aggregate(t=Sum("amount"))["t"] or 0
            monthly.append({
                "month":   f"{calendar.month_abbr[m]} {y}",
                "income":  float(inc_m),
                "expense": float(exp_m),
                "savings": float(inc_m - exp_m),
            })

        inc_by_cat = list(inc.values("category").annotate(total=Sum("amount")).order_by("-total"))
        exp_by_cat = list(exp.values("category").annotate(total=Sum("amount")).order_by("-total"))

        from apps.members.models import MemberPayment
        outstanding = MemberPayment.objects.filter(
            status__in=["partial","pending"]
        ).aggregate(t=Sum("balance"))["t"] or 0

        return Response({
            "month": month, "year": year,
            "total_income":         float(total_income),
            "total_base_income":    float(total_base),
            "total_gst_collected":  float(total_gst),
            "total_expense":        float(total_expense),
            "net_savings":          float(net_savings),
            "outstanding_balance":  float(outstanding),
            "monthly_trend":        monthly,
            "income_by_category":   inc_by_cat,
            "expense_by_category":  exp_by_cat,
        })


class MonthlyReportView(APIView):
    """Returns full detail for GST report — all transactions for the month."""
    def get(self, request):
        today = timezone.localdate()
        year  = int(request.query_params.get("year",  today.year))
        month = int(request.query_params.get("month", today.month))

        incomes  = Income.objects.filter(date__year=year, date__month=month).order_by("date")
        expenses = Expenditure.objects.filter(date__year=year, date__month=month).order_by("date")

        total_income   = incomes.aggregate(t=Sum("amount"))["t"]     or 0
        total_gst      = incomes.aggregate(t=Sum("gst_amount"))["t"] or 0
        total_base     = incomes.aggregate(t=Sum("base_amount"))["t"] or 0
        total_expense  = expenses.aggregate(t=Sum("amount"))["t"]    or 0

        gym = {
            "name":    getattr(django_settings, "GYM_NAME",    "Gym"),
            "address": getattr(django_settings, "GYM_ADDRESS", ""),
            "phone":   getattr(django_settings, "GYM_PHONE",   ""),
            "email":   getattr(django_settings, "GYM_EMAIL",   ""),
            "gstin":   getattr(django_settings, "GYM_GSTIN",   ""),
        }

        def _parse_note_field(notes, key):
            """
            Extracts a keyed value embedded in the notes field.
            Format: '... | key:value'
            Returns the string value or None if not present.
            """
            if not notes:
                return None
            for part in notes.split("|"):
                part = part.strip()
                if part.startswith(f"{key}:"):
                    return part.split(":", 1)[1].strip()
            return None

        # Serialize incomes and attach plan_total + mode_of_payment per row
        income_data = IncomeSerializer(incomes, many=True).data
        for i, income_obj in enumerate(incomes):
            pt = _parse_note_field(income_obj.notes, "plan_total")
            income_data[i]["plan_total"] = float(pt) if pt is not None else None
            income_data[i]["mode_of_payment"] = _parse_note_field(income_obj.notes, "mode") or "cash"

        return Response({
            "gym":           gym,
            "month":         month,
            "year":          year,
            "month_name":    calendar.month_name[month],
            "total_income":  float(total_income),
            "total_base":    float(total_base),
            "total_gst":     float(total_gst),
            "total_expense": float(total_expense),
            "net":           float(total_income - total_expense),
            "incomes":       income_data,           # now includes plan_total per row
            "expenses":      ExpenditureSerializer(expenses, many=True).data,
        })


class GSTRateView(APIView):
    def get(self, request):
        return Response({"gst_rate": float(get_gst_rate())})
    
class ToBuyView(APIView):
    def _serialize(self, item):
        return {
            "id": item.id,
            "item_name": item.item_name,
            "quantity": item.quantity,
            "price": float(item.price) if item.price else None,
            "BuyingDate": item.BuyingDate,
            "Priority": item.Priority,
            "status": item.status,
            "notes": item.notes,
            "created_at": item.created_at,
            "item_url": item.item_url,
        }

    def get(self, request):
        from .models import ToBuy
        items = ToBuy.objects.all().order_by("-created_at")
        return Response([self._serialize(item) for item in items])

    def post(self, request):
        from .models import ToBuy
        data = request.data
        if not data.get("item_name"):
            return Response({"error": "item_name is required"}, status=400)
        item = ToBuy.objects.create(
            item_name=data["item_name"],
            quantity=data.get("quantity", 1),
            price=data.get("price") or None,
            BuyingDate=data.get("BuyingDate") or None,
            Priority=data.get("Priority", "medium"),
            status=data.get("status", "pending"),
            notes=data.get("notes", ""),
            item_url=data.get("item_url", ""),
        )
        return Response(self._serialize(item), status=201)

    def put(self, request):
        from .models import ToBuy
        data = request.data
        item_id = data.get("id")
        if not item_id:
            return Response({"error": "ID is required for update"}, status=400)
        try:
            item = ToBuy.objects.get(id=item_id)
        except ToBuy.DoesNotExist:
            return Response({"error": "Item not found"}, status=404)
        item.item_name = data.get("item_name", item.item_name)
        item.quantity  = data.get("quantity",  item.quantity)
        item.price     = data.get("price",     item.price)
        item.BuyingDate= data.get("BuyingDate",item.BuyingDate) or None
        item.Priority  = data.get("Priority",  item.Priority)
        item.status    = data.get("status",    item.status)
        item.notes     = data.get("notes",     item.notes)
        item.item_url  = data.get("item_url",  item.item_url)
        item.save()
        return Response(self._serialize(item))

    def delete(self, request):
        from .models import ToBuy
        item_id = request.query_params.get("id")
        if not item_id:
            return Response({"error": "ID is required"}, status=400)
        try:
            ToBuy.objects.get(id=item_id).delete()
            return Response({"deleted": True})
        except ToBuy.DoesNotExist:
            return Response({"error": "Item not found"}, status=404)


class CanAffordView(APIView):
    def get(self, request):
        from .models import ToBuy
        today   = timezone.localdate()
        item_id = request.query_params.get("id")
        year    = int(request.query_params.get("year",  today.year))
        month   = int(request.query_params.get("month", today.month))

        if not item_id:
            return Response({"error": "id is required"}, status=400)
        try:
            item = ToBuy.objects.get(id=item_id)
        except ToBuy.DoesNotExist:
            return Response({"error": "Item not found"}, status=404)

        income      = Income.objects.filter(date__year=year, date__month=month).aggregate(t=Sum("amount"))["t"] or 0
        expenditure = Expenditure.objects.filter(date__year=year, date__month=month).aggregate(t=Sum("amount"))["t"] or 0
        money_left  = income - expenditure

        return Response({
            "can_buy":    money_left >= (item.price or 0),
            "money_left": float(money_left),
            "item_price": float(item.price) if item.price else None,
            "month":      month,
            "year":       year,
        })
