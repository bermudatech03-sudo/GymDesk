import logging
from .models import Notification

logger = logging.getLogger(__name__)

TEMPLATES = {
    "renewal_remind": "Hi {name}, your gym membership expires on {date}. Renew now to keep your streak going!",
    "renewal_confirm": "Hi {name}, your membership has been renewed and is valid until {date}. Keep crushing it! 💪",
    "enrollment":      "Hi {name}, welcome aboard! Your membership starts today and is valid until {date}. See you at the gym!",
    "expiry":          "Hi {name}, your gym membership expired on {date}. Renew now to regain access. We miss you!",
    "manual":          "Hi {name}, you have a notification from the gym.",
}


def send_notification(member, trigger_type: str):
    """
    Builds the message and inserts a Notification row with status='pending'.
    The post_save signal in signals.py handles the actual WhatsApp dispatch automatically.
    """
    template = TEMPLATES.get(trigger_type, "Hi {name}.")
    body = template.format(
        name=member.name,
        date=str(member.renewal_date or ""),
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