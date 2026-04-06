from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum
from apps.notifications.utils import send_notification, send_notification_admin
from apps.members.models import Member
from apps.finances.models import ToBuy,Expenditure,Income

def send_renewal_reminders():
    cutoff = timezone.now().date() + timedelta(days=7)
    members = Member.objects.filter(
        status = "active",
        renewal_date__lte = cutoff,
        renewal_date__gte = timezone.now().date(),
    )
    for member in members:
        send_notification(member, "renewal_remind")

def send_expiry_notices():
    members = Member.objects.filter(
        status = "active",
        renewal_date__lt = timezone.now().date(),
    )
    for member in members:
        member.status="expired"
        member.save()
        send_notification(member,"expiry")

def send_daily_notice():
    items = ToBuy.objects.filter(
        status = "pending",
    )
    today = timezone.localdate()
    income      = Income.objects.filter(date__year=today.year, date__month=today.month).aggregate(t=Sum("amount"))["t"] or 0
    expenditure = Expenditure.objects.filter(date__year=today.year, date__month=today.month).aggregate(t=Sum("amount"))["t"] or 0
    money_left  = income - expenditure

    for item in items:
        send_notification_admin(item,money_left,"daily_notice")