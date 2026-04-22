import logging
import time
import threading
from concurrent.futures import ThreadPoolExecutor
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Notification
from .whatsapp import send_whatsapp_message, send_whatsapp_template
from .utils import TEMPLATES, TRIGGER_TEMPLATES

logger = logging.getLogger(__name__)

# Max 10 concurrent WhatsApp HTTP calls at a time
_executor = None
_executor_lock = threading.Lock()

def _get_executor():
    global _executor
    if _executor is None:
        with _executor_lock:
            if _executor is None:
                _executor = ThreadPoolExecutor(max_workers=10)
    return _executor


@receiver(post_save, sender="members.MembershipPlan")
def notify_members_on_new_plan(sender, instance, created, **kwargs):
    """
    Fires when a new MembershipPlan is saved for the first time.
    Queues a WhatsApp notification to every active member.
    Skips if NOTIFY_NEW_PLAN is disabled.
    """
    if not created:
        return
    from apps.finances.gst_utils import is_notify_enabled
    if not is_notify_enabled("NOTIFY_NEW_PLAN"):
        return
    from apps.members.models import Member
    from apps.enquiries.models import Enquiry
    template = TEMPLATES["new_plan"]
    template_name = TRIGGER_TEMPLATES.get("new_plan", "")

    recipients = []
    for member in Member.objects.filter(status="active").only("name", "phone"):
        recipients.append((member.name, member.phone))
    for enquiry in Enquiry.objects.filter(status__in=("new", "followup")).only("name", "phone"):
        recipients.append((enquiry.name, enquiry.phone))

    for name, raw_phone in recipients:
        phone = str(raw_phone or "").strip().replace(" ", "").replace("-", "")
        if not phone:
            continue
        if not phone.startswith("91"):
            phone = f"91{phone}"
        body = template.format(
            name=name,
            plan_name=instance.name,
            duration=instance.duration_days,
            price=instance.price,
        )
        Notification.objects.create(
            recipient_name=name,
            recipient_phone=phone,
            channel="whatsapp",
            trigger_type="new_plan",
            message=body,
            template_name=template_name,
            template_params=[name, instance.name, str(instance.duration_days), str(instance.price)],
            status="pending",
        )


@receiver(post_save, sender=Notification)
def dispatch_whatsapp_on_create(sender, instance, created, **kwargs):
    """
    Triggers on every new Notification row (status=pending).
    Uses queryset.update() to avoid re-triggering the signal on status update.
    """
    if not created:
        return
    if instance.status != "pending":
        return
    if not instance.recipient_phone:
        logger.warning(f"Notification {instance.pk} skipped — no phone number.")
        Notification.objects.filter(pk=instance.pk).update(
            status="failed",
            error_log="No recipient phone number provided.",
        )
        return

    pk            = instance.pk
    phone         = instance.recipient_phone
    message       = instance.message
    template_name = instance.template_name or ""
    template_params = list(instance.template_params or [])
    language_code = instance.language_code or "en"

    def _send():
        # Small delay to avoid hammering Meta API when bulk-creating
        from django.db import connection
        connection.close()
        time.sleep(0.1)
        try:
            if template_name:
                result = send_whatsapp_template(
                    to=phone,
                    template_name=template_name,
                    language_code=language_code,
                    body_params=template_params,
                )
            else:
                result = send_whatsapp_message(to=phone, message=message)

            if result["success"]:
                Notification.objects.filter(pk=pk).update(
                    status="sent",
                    sent_at=timezone.now(),
                )
                logger.info(f"Notification {pk} sent to {phone}")
            else:
                Notification.objects.filter(pk=pk).update(
                    status="failed",
                    error_log=result.get("error", "Unknown error"),
                )
                logger.error(f"Notification {pk} failed: {result.get('error')}")
        except Exception as e:
            logger.exception(f"Notification {pk} thread crashed: {e}")

    _get_executor().submit(_send)
