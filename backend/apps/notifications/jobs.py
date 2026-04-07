from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum
from apps.notifications.utils import send_notification, send_notification_admin, send_staff_notification
from apps.members.models import Member, MemberAttendance
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

def send_message_for_absentees():
    today = timezone.now().date()
    attended_ids = MemberAttendance.objects.filter(date=today).values_list("member_id", flat=True)
    absentees = Member.objects.filter(status="active", personal_trainer=False).exclude(id__in=attended_ids)
    for member in absentees:
        send_notification(member, "absent")


def send_message_for_pt_absentees():
    from apps.members.models import TrainerAssignment
    today = timezone.localdate()
    now_time = timezone.localtime(timezone.now()).time()
    weekday = today.weekday()  # 0=Mon … 6=Sun

    attended_ids = set(
        MemberAttendance.objects.filter(date=today).values_list("member_id", flat=True)
    )

    assignments = TrainerAssignment.objects.filter(
        member__status="active",
        member__personal_trainer=True,
    ).select_related("member")

    notified_member_ids = set()
    for assignment in assignments:
        if weekday not in assignment.working_days_list:
            continue
        if assignment.member_id in attended_ids:
            continue
        if now_time < assignment.startingtime:
            continue
        if assignment.member_id in notified_member_ids:
            continue
        send_notification(assignment.member, "absent")
        notified_member_ids.add(assignment.member_id)





def send_staff_absent_notifications():
    from apps.staff.models import StaffMember, StaffAttendance
    today = timezone.localdate()
    now_time = timezone.localtime(timezone.now()).time()
    weekday = today.weekday()  # 0=Mon … 6=Sun

    checked_in_ids = set(
        StaffAttendance.objects.filter(
            date=today,
            status__in=("present", "late", "overtime", "late_overtime", "half"),
        ).values_list("staff_id", flat=True)
    )

    staff_list = StaffMember.objects.filter(status="active").select_related("shift_template")

    for staff in staff_list:
        shift = staff.shift_template
        if shift:
            if weekday not in shift.working_days_list:
                continue
            if now_time < shift.start_time:
                continue
        if staff.id in checked_in_ids:
            continue
        send_staff_notification(staff, "staff_absent")


def send_enquiry_followups():
    """
    Runs daily at 10:00 AM. Finds all due enquiry follow-ups and sends WhatsApp messages.
    """
    from apps.enquiries.models import EnquiryFollowup
    from apps.notifications.models import Notification
    from apps.finances.gst_utils import get_setting
    from django.utils import timezone

    today     = timezone.localdate()
    gym_name  = get_setting("GYM_NAME", "the Gym")
    gym_phone = get_setting("GYM_PHONE", "")

    due = EnquiryFollowup.objects.filter(
        scheduled_date=today, sent=False
    ).select_related("enquiry")

    for followup in due:
        enquiry = followup.enquiry
        if enquiry.status in ("converted", "lost"):
            followup.sent = True
            followup.sent_at = timezone.now()
            followup.save()
            continue

        phone = str(enquiry.phone or "").strip().replace(" ", "").replace("-", "")
        if phone and not phone.startswith("91"):
            phone = f"91{phone}"

        message = (
            f"Hi {enquiry.name}, friendly reminder from {gym_name}! "
            f"We'd love to welcome you to our fitness family. "
            f"Call us at {gym_phone} or just walk in anytime. 💪"
        )

        Notification.objects.create(
            recipient_name=enquiry.name,
            recipient_phone=phone,
            channel="whatsapp",
            trigger_type="enquiry_followup",
            message=message,
            status="pending",
        )

        followup.sent    = True
        followup.sent_at = timezone.now()
        followup.save()


