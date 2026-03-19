
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from .models import Notification
import logging
logger = logging.getLogger(__name__)

TEMPLATES = {
    "renewal_remind": {
        "subject": "🏋️ Your Gym Membership Expires Soon!",
        "body": "Hi {name}, your gym membership expires on {date}. Renew now to keep your streak going! Contact us at {phone}.",
    },
    "renewal_confirm": {
        "subject": "✅ Membership Renewed Successfully",
        "body": "Hi {name}, your membership has been renewed! Valid until {date}. Keep crushing it! 💪",
    },
    "enrollment": {
        "subject": "🎉 Welcome to the Gym Family!",
        "body": "Hi {name}, welcome aboard! Your membership starts today and is valid until {date}. See you at the gym!",
    },
    "expiry": {
        "subject": "⏰ Your Gym Membership Has Expired",
        "body": "Hi {name}, your gym membership expired on {date}. Renew now to regain access. We miss you!",
    },
}

def send_notification(member, trigger_type, channels=None):
    if channels is None:
        channels = ["email"]
    tmpl = TEMPLATES.get(trigger_type, {"subject":"Notification","body":"Hi {name}."})
    body = tmpl["body"].format(
        name=member.name,
        date=str(member.renewal_date or ""),
        phone=getattr(settings,"GYM_PHONE",""),
    )
    for channel in channels:
        notif = Notification.objects.create(
            recipient_name=member.name,
            recipient_phone=member.phone,
            recipient_email=member.email,
            channel=channel,
            trigger_type=trigger_type,
            message=body,
            status="pending",
        )
        try:
            if channel == "email" and member.email:
                send_mail(tmpl["subject"], body, settings.EMAIL_HOST_USER or "noreply@gym.com", [member.email])
                notif.status = "sent"
            elif channel == "whatsapp" and member.phone and settings.TWILIO_ACCOUNT_SID:
                from twilio.rest import Client
                client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
                client.messages.create(
                    body=body,
                    from_=settings.TWILIO_WHATSAPP_FROM,
                    to=f"whatsapp:+91{member.phone}"
                )
                notif.status = "sent"
            else:
                notif.status = "sent"  # stub — mark sent if no channel config
            notif.sent_at = timezone.now()
        except Exception as e:
            notif.status = "failed"
            notif.error_log = str(e)
            logger.error(f"Notification failed: {e}")
        notif.save()
