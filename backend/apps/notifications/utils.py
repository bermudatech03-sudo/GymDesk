import logging
from django.utils import timezone

from gym_crm import settings
from .models import Notification

logger = logging.getLogger(__name__)

# Free-form rendered-text fallback (stored on Notification.message for display/history).
# The actual delivery goes through Meta-approved WhatsApp templates — see TRIGGER_TEMPLATES.
TEMPLATES = {
    "renewal_remind":       "Hi {name}, your gym membership expires on {date}. Renew now to keep your fitness streak going!",
    "renewal_confirm":      "Hi {name}, your membership has been renewed and is valid until {date}. Keep crushing it!",
    "enrollment":           "Hi {name}, welcome aboard! Your membership starts today and is valid until {date}. See you at the gym!",
    "expiry":               "Hi {name}, your gym membership expired on {date}. Renew now to regain access. We miss you!",
    "manual":               "Hi {name}, you have a notification from the gym.",
    "absent":               "Hi {name}, you did not check in at the gym on {date}. Please try to stay consistent to maintain a healthy routine.",
    "daily_notice":         "Hi Admin, you need to restock {itemName}. Current balance: Rs.{moneyLeft}. Please purchase {itemName} by {date}.",
    "staff_absent_self":    "Hi {name}, you have not checked in for your shift on {date}. Please contact the gym management if you need to apply for leave.",
    "staff_absent_admin":   "Hi Admin, {staff_name} ({role}) has not checked in for their shift on {date}. Please follow up.",
    "new_plan":             "Hi {name}, we just launched a new membership plan - {plan_name} for {duration} days at Rs.{price}. Visit us or call to enroll today!",
    "diet_reminder":        "Hi {name}, diet reminder! Time to have {quantity}{unit} of {food} ({calories} cal). Stay consistent with your diet plan!",
}


# trigger_type → approved Meta template name.
# Keep names in sync with WhatsApp Manager → Message templates.
TRIGGER_TEMPLATES = {
    "renewal_remind":   "renewal_remind",
    "renewal_confirm":  "renewal_confirm",
    "enrollment":       "enrollment_welcome",
    "expiry":           "membership_expiry",
    "absent":           "absent_reminder",
    "new_plan":         "new_plan_launch",
    "diet_reminder":    "diet_reminder",
    "daily_notice":     "stock_alert_admin",
    "staff_absent_self":  "staff_absent_self",
    "staff_absent_admin": "staff_absent_admin",
}


_TRIGGER_SETTING_KEY = {
    "enrollment":      "NOTIFY_ENROLLMENT",
    "renewal_confirm": "NOTIFY_RENEWAL_CONFIRM",
    "renewal_remind":  "NOTIFY_RENEWAL_REMIND",
    "expiry":          "NOTIFY_EXPIRY",
    "absent":          "NOTIFY_ABSENT",
}


def _normalize_phone(raw: str) -> str:
    phone = str(raw or "").strip().replace(" ", "").replace("-", "")
    if phone and not phone.startswith("91"):
        phone = f"91{phone}"
    return phone


def send_notification(member, trigger_type: str):
    """
    Builds the message + template-parameter payload and inserts a Notification row with
    status='pending'. The post_save signal in signals.py routes delivery through the
    approved WhatsApp template (see TRIGGER_TEMPLATES).
    Skips silently if the corresponding WhatsApp notification toggle is disabled.
    """
    from apps.finances.gst_utils import is_notify_enabled
    setting_key = _TRIGGER_SETTING_KEY.get(trigger_type)
    if setting_key and not is_notify_enabled(setting_key):
        return

    template = TEMPLATES.get(trigger_type, "Hi {name}.")
    date = str(timezone.now().date()) if trigger_type == "absent" else str(member.renewal_date or "")
    body = template.format(name=member.name, date=date)
    phone = _normalize_phone(member.phone)

    # Template params — ORDER MUST MATCH the approved template body ({{1}}, {{2}}, ...)
    template_name = TRIGGER_TEMPLATES.get(trigger_type, "")
    template_params: list = []
    if trigger_type in ("renewal_remind", "renewal_confirm", "enrollment", "expiry", "absent"):
        template_params = [member.name, date]

    Notification.objects.create(
        recipient_name=member.name,
        recipient_phone=phone,
        channel="whatsapp",
        trigger_type=trigger_type,
        message=body,
        template_name=template_name,
        template_params=template_params,
        status="pending",
    )


def send_staff_notification(staff, trigger_type: str):
    """
    Sends a WhatsApp notification to a staff member and to the admin
    about the staff member's absence. Skips silently if NOTIFY_STAFF_ABSENT is disabled.
    """
    from apps.finances.gst_utils import is_notify_enabled
    if not is_notify_enabled("NOTIFY_STAFF_ABSENT"):
        return

    today = str(timezone.now().date())

    # Staff self
    body_self = TEMPLATES["staff_absent_self"].format(name=staff.name, date=today)
    Notification.objects.create(
        recipient_name=staff.name,
        recipient_phone=_normalize_phone(staff.phone),
        channel="whatsapp",
        trigger_type=trigger_type,
        message=body_self,
        template_name=TRIGGER_TEMPLATES["staff_absent_self"],
        template_params=[staff.name, today],
        status="pending",
    )

    # Admin
    role = staff.get_role_display()
    body_admin = TEMPLATES["staff_absent_admin"].format(
        staff_name=staff.name, role=role, date=today,
    )
    Notification.objects.create(
        recipient_name="Admin",
        recipient_phone=_normalize_phone(settings.ADMIN_WHATSAPP_NUMBER),
        channel="whatsapp",
        trigger_type=trigger_type,
        message=body_admin,
        template_name=TRIGGER_TEMPLATES["staff_absent_admin"],
        template_params=[staff.name, role, today],
        status="pending",
    )


def send_notification_admin(item, moneyleft, trigger_type: str):
    template = TEMPLATES.get(trigger_type, "Hi {name}.")
    date_str = str(item.BuyingDate or "")
    body = template.format(itemName=item.item_name, moneyLeft=moneyleft, date=date_str)

    Notification.objects.create(
        recipient_name=item.item_name,
        recipient_phone=_normalize_phone(settings.ADMIN_WHATSAPP_NUMBER),
        channel="whatsapp",
        trigger_type=trigger_type,
        message=body,
        template_name=TRIGGER_TEMPLATES.get(trigger_type, ""),
        template_params=[item.item_name, str(moneyleft), date_str],
        status="pending",
    )
