from django.db import models
from django.utils import timezone

INCOME_CATEGORIES = [
    ("membership","Membership Fee"),
    ("personal_training","Personal Training"),
    ("merchandise","Merchandise"),
    ("locker","Locker Rental"),
    ("other","Other"),
]

EXPENSE_CATEGORIES = [
    ("salary","Staff Salary"),
    ("equipment","Equipment Purchase/Repair"),
    ("rent","Rent & Utilities"),
    ("supplies","Supplies"),
    ("marketing","Marketing"),
    ("maintenance","Maintenance"),
    ("other","Other"),
]

class Income(models.Model):
    source         = models.CharField(max_length=200)
    category       = models.CharField(max_length=30, choices=INCOME_CATEGORIES, default="membership")
    base_amount    = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst_rate       = models.DecimalField(max_digits=5,  decimal_places=2, default=0)
    gst_amount     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount         = models.DecimalField(max_digits=12, decimal_places=2)   # total incl. GST
    date           = models.DateField(default=timezone.localdate)
    member_id      = models.IntegerField(null=True, blank=True)
    notes          = models.TextField(blank=True)
    invoice_number = models.CharField(max_length=50, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

class Expenditure(models.Model):
    category    = models.CharField(max_length=30, choices=EXPENSE_CATEGORIES, default="other")
    description = models.CharField(max_length=255)
    amount      = models.DecimalField(max_digits=12, decimal_places=2)
    date        = models.DateField(default=timezone.localdate)
    vendor      = models.CharField(max_length=150, blank=True)
    notes       = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]