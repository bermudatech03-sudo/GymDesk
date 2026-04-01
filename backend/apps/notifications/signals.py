import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Notification
from .whatsapp import send_whatsapp_message

logger = logging.getLogger(__name__)


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

    result = send_whatsapp_message(
        to=instance.recipient_phone,
        message=instance.message,
    )

    if result["success"]:
        Notification.objects.filter(pk=instance.pk).update(
            status="sent",
            sent_at=timezone.now(),
        )
        logger.info(f"Notification {instance.pk} sent to {instance.recipient_phone}")
    else:
        Notification.objects.filter(pk=instance.pk).update(
            status="failed",
            error_log=result.get("error", "Unknown error"),
        )
        logger.error(f"Notification {instance.pk} failed: {result.get('error')}")