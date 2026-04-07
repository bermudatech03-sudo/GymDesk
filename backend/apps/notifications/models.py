from django.db import models


class Notification(models.Model):
    CHANNEL = [("whatsapp", "WhatsApp")]
    STATUS  = [("sent", "Sent"), ("failed", "Failed"), ("pending", "Pending")]
    TRIGGER = [
        ("renewal_remind",  "Renewal Reminder"),
        ("renewal_confirm",  "Renewal Confirmed"),
        ("enrollment",       "New Enrollment"),
        ("expiry",           "Membership Expired"),
        ("manual",           "Manual"),
        ("enquiry_welcome",  "Enquiry Welcome"),
        ("enquiry_followup", "Enquiry Follow-up"),
    ]

    recipient_name  = models.CharField(max_length=150)
    recipient_phone = models.CharField(max_length=20, blank=True)
    channel         = models.CharField(max_length=10, choices=CHANNEL, default="whatsapp")
    trigger_type    = models.CharField(max_length=20, choices=TRIGGER, default="manual")
    message         = models.TextField()
    status          = models.CharField(max_length=10, choices=STATUS, default="pending")
    sent_at         = models.DateTimeField(null=True, blank=True)
    error_log       = models.TextField(blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.trigger_type} → {self.recipient_name} [{self.status}]"