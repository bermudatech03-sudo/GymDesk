import logging
from django.utils import timezone

from gym_crm import settings
from .models import Notification

logger = logging.getLogger(__name__)

TEMPLATES = {
    "renewal_remind": "Hi {name}, your gym membership expires on {date}. Renew now to keep your streak going!",
    "renewal_confirm": "Hi {name}, your membership has been renewed and is valid until {date}. Keep crushing it! 💪",
    "enrollment":      "Hi {name}, welcome aboard! Your membership starts today and is valid until {date}. See you at the gym!",
    "expiry":          "Hi {name}, your gym membership expired on {date}. Renew now to regain access. We miss you!",
    "manual":          "Hi {name}, you have a notification from the gym.",
    "absent":          "Hi {name}, you didnt came to gym on {date}. Please try to be consistent inoder to have a healthy life ",
    "daily_notice":    "Hi Admin,  You need to buy {itemName} and right now you have {moneyLeft} ruppes. You need to buy this {itemName} by {date}"
}


def send_notification(member, trigger_type: str):
    """
    Builds the message and inserts a Notification row with status='pending'.
    The post_save signal in signals.py handles the actual WhatsApp dispatch automatically.
    """
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