from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum
from django.utils import timezone
import calendar
from .models import Income, Expenditure, GymSetting
from .serializers import IncomeSerializer, ExpenditureSerializer
from .gst_utils import get_gst_rate, get_gym_info


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

        all_base_income = Income.objects.aggregate(t=Sum("base_amount"))["t"] or 0
        all_expense     = Expenditure.objects.aggregate(t=Sum("amount"))["t"] or 0
        net_savings     = all_base_income - all_expense

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
        from collections import defaultdict
        from decimal import Decimal

        today = timezone.localdate()
        year  = int(request.query_params.get("year",  today.year))
        month = int(request.query_params.get("month", today.month))

        incomes  = Income.objects.filter(date__year=year, date__month=month).order_by("date")
        expenses = Expenditure.objects.filter(date__year=year, date__month=month).order_by("date")

        total_income   = incomes.aggregate(t=Sum("amount"))["t"]     or 0
        total_expense  = expenses.aggregate(t=Sum("amount"))["t"]    or 0

        gym = get_gym_info()

        def _parse_note_field(notes, key):
            if not notes:
                return None
            for part in notes.split("|"):
                part = part.strip()
                if part.startswith(f"{key}:"):
                    return part.split(":", 1)[1].strip()
            return None

        # ── Group incomes by invoice_number ──────────────────────────────────
        # Enrollment + balance-payment rows share the same invoice number.
        # Merge them into one row showing the full plan totals.
        invoice_groups = defaultdict(list)
        standalone     = []

        for income in incomes:
            if income.invoice_number:
                invoice_groups[income.invoice_number].append(income)
            else:
                standalone.append(income)

        # ── Load MemberPayments as source of truth for plan totals ────────────
        # The Income.notes plan_total is written at enrollment time and goes stale
        # when a trainer assignment later updates the payment (adds PT fee).
        # MemberPayment.total_with_gst is always up-to-date.
        from apps.members.models import MemberPayment as _MemberPayment
        inv_nos = [i.invoice_number for i in incomes if i.invoice_number]
        payments_by_inv = {
            mp.invoice_number: mp
            for mp in _MemberPayment.objects.filter(invoice_number__in=inv_nos)
        }

        merged_incomes = []

        for income in incomes:
            mp = payments_by_inv.get(income.invoice_number) if income.invoice_number else None
            rate        = Decimal(str(income.gst_rate or 0))
            amount      = Decimal(str(income.amount))
            base_amount = Decimal(str(income.base_amount))
            gst_amount  = Decimal(str(income.gst_amount))
            
            pt_str = _parse_note_field(income.notes, "plan_total")
            plan_total = Decimal(str(pt_str)) if pt_str else (base_amount+gst_amount)

            if mp:
                plan_total = Decimal(str(mp.total_with_gst))

            merged_incomes.append({
                "id":             income.id,
                "date":           str(income.date),
                "invoice_number": income.invoice_number,
                "source":         income.source,
                "category":       income.category,
                "base_amount":    float(base_amount),
                "gst_rate":       float(rate),
                "gst_amount":     float(gst_amount),
                "plan_total":     float(plan_total),
                "amount":         float(amount),
                "mode_of_payment": _parse_note_field(income.notes,"mode") or "cash" ,
            })

        for income in standalone:
            pt_str = _parse_note_field(income.notes, "plan_total")
            plan_total = float(pt_str) if pt_str else float(income.base_amount + income.gst_amount)
            merged_incomes.append({
                "id":             income.id,
                "date":           str(income.date),
                "invoice_number": income.invoice_number,
                "source":         income.source,
                "category":       income.category,
                "base_amount":    float(income.base_amount),
                "gst_rate":       float(income.gst_rate),
                "gst_amount":     float(income.gst_amount),
                "plan_total":     plan_total,
                "amount":         float(income.amount),
                "mode_of_payment": _parse_note_field(income.notes, "mode") or "cash",
            })

        merged_incomes.sort(key=lambda x: x["date"])

        # Summary totals derived from merged rows (plan-level, not installment-level)
        total_base = sum(r["base_amount"] for r in merged_incomes)
        total_gst  = sum(r["gst_amount"]  for r in merged_incomes)

        return Response({
            "gym":           gym,
            "month":         month,
            "year":          year,
            "month_name":    calendar.month_name[month],
            "total_income":  float(total_income),
            "total_base":    total_base,
            "total_gst":     total_gst,
            "total_expense": float(total_expense),
            "net":           float(total_income - total_expense),
            "incomes":       merged_incomes,
            "expenses":      ExpenditureSerializer(expenses, many=True).data,
        })


class GSTRateView(APIView):
    def get(self, request):
        return Response({"gst_rate": float(get_gst_rate())})


class GymSettingsView(APIView):
    def get(self, request):
        return Response({s.key: s.value for s in GymSetting.objects.all()})

    def patch(self, request):
        for key, value in request.data.items():
            GymSetting.objects.update_or_create(key=key, defaults={"value": str(value)})
        return Response({s.key: s.value for s in GymSetting.objects.all()})
    
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
