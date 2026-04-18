import logging
from django.utils import timezone

from gym_crm import settings
from .models import Notification

logger = logging.getLogger(__name__)

TEMPLATES = {
    "renewal_remind":       "Hi {name}, your gym membership expires on {date}. Renew now to keep your streak going!",
    "renewal_confirm":      "Hi {name}, your membership has been renewed and is valid until {date}. Keep crushing it! 💪",
    "enrollment":           "Hi {name}, welcome aboard! Your membership starts today and is valid until {date}. See you at the gym!",
    "expiry":               "Hi {name}, your gym membership expired on {date}. Renew now to regain access. We miss you!",
    "manual":               "Hi {name}, you have a notification from the gym.",
    "absent":               "Hi {name}, you didnt came to gym on {date}. Please try to be consistent inoder to have a healthy life ",
    "daily_notice":         "Hi Admin,  You need to buy {itemName} and right now you have {moneyLeft} ruppes. You need to buy this {itemName} by {date}",
    "staff_absent_self":    "Hi {name}, you have not checked in for your shift on {date}. Please contact the gym management if you need to apply for leave.",
    "staff_absent_admin":   "Hi Admin, {staff_name} ({role}) has not checked in for their shift on {date}. Please follow up.",
    "new_plan":             "Hi {name}, we just launched a new membership plan! *{plan_name}* — {duration} days for ₹{price}. {description}Visit us or call to enroll today!",
    "diet_reminder":        "Hi {name}, diet reminder! Time to have {quantity}{unit} of *{food}* ({calories} cal).{notes} Stay consistent with your diet plan!",
}


_TRIGGER_SETTING_KEY = {
    "enrollment":      "NOTIFY_ENROLLMENT",
    "renewal_confirm": "NOTIFY_RENEWAL_CONFIRM",
    "renewal_remind":  "NOTIFY_RENEWAL_REMIND",
    "expiry":          "NOTIFY_EXPIRY",
    "absent":          "NOTIFY_ABSENT",
}


def send_notification(member, trigger_type: str):
    """
    Builds the message and inserts a Notification row with status='pending'.
    The post_save signal in signals.py handles the actual WhatsApp dispatch automatically.
    Skips silently if the corresponding WhatsApp notification toggle is disabled.
    """
    from apps.finances.gst_utils import is_notify_enabled
    setting_key = _TRIGGER_SETTING_KEY.get(trigger_type)
    if setting_key and not is_notify_enabled(setting_key):
        return

    template = TEMPLATES.get(trigger_type, "Hi {name}.")
    date = str(timezone.now().date()) if trigger_type == "absent" else str(member.renewal_date or "")
    body = template.format(
        name=member.name,
        date=date,
    )

    # Normalise phone: strip spaces/dashes, ensure country code prefix
    phone = str(member.phone or "").strip().replace(" ", "").replace("-", "")
    if phone and not phone.startswith("91"):
        phone = f"91{phone}"  # prepend India country code if missing

    Notification.objects.create(
        recipient_name=member.name,
        recipient_phone=phone,
        channel="whatsapp",
        trigger_type=trigger_type,
        message=body,
        status="pending",       # signal fires on this insert and dispatches immediately
    )

def send_staff_notification(staff, trigger_type: str):
    """
    Sends a WhatsApp notification to a staff member and to the admin
    about the staff member's absence.
    Skips silently if NOTIFY_STAFF_ABSENT is disabled.
    """
    from apps.finances.gst_utils import is_notify_enabled
    if not is_notify_enabled("NOTIFY_STAFF_ABSENT"):
        return

    today = str(timezone.now().date())
    phone = str(staff.phone or "").strip().replace(" ", "").replace("-", "")
    if phone and not phone.startswith("91"):
        phone = f"91{phone}"

    # Message to the staff member
    body_self = TEMPLATES["staff_absent_self"].format(name=staff.name, date=today)
    Notification.objects.create(
        recipient_name=staff.name,
        recipient_phone=phone,
        channel="whatsapp",
        trigger_type=trigger_type,
        message=body_self,
        status="pending",
    )

    # Message to the admin
    admin_phone = str(settings.ADMIN_WHATSAPP_NUMBER or "").strip().replace(" ", "").replace("-", "")
    if admin_phone and not admin_phone.startswith("91"):
        admin_phone = f"91{admin_phone}"

    body_admin = TEMPLATES["staff_absent_admin"].format(
        staff_name=staff.name,
        role=staff.get_role_display(),
        date=today,
    )
    Notification.objects.create(
        recipient_name="Admin",
        recipient_phone=admin_phone,
        channel="whatsapp",
        trigger_type=trigger_type,
        message=body_admin,
        status="pending",
    )


def send_notification_admin(item,moneyleft,trigger_type: str):
    template = TEMPLATES.get(trigger_type, "Hi {name}.")
    adminPhoneNumber = settings.ADMIN_WHATSAPP_NUMBER
    body = template.format(
        itemName=item.item_name,
        moneyLeft = moneyleft,
        date=str(item.BuyingDate or ""),
    )

    # Normalise phone: strip spaces/dashes, ensure country code prefix
    phone = str(adminPhoneNumber or "").strip().replace(" ", "").replace("-", "")
    if phone and not phone.startswith("91"):
        phone = f"91{phone}"  # prepend India country code if missing

    Notification.objects.create(
        recipient_name=item.item_name,
        recipient_phone=phone,
        channel="whatsapp",
        trigger_type=trigger_type,
        message=body,
        status="pending",       # signal fires on this insert and dispatches immediately
    )