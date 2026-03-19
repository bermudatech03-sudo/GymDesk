
from django.db import models
from django.utils import timezone

INCOME_CATEGORIES = [
    ("membership","Membership Fee"),("personal_training","Personal Training"),
    ("merchandise","Merchandise"),("locker","Locker Rental"),("other","Other"),
]

EXPENSE_CATEGORIES = [
    ("salary","Staff Salary"),("equipment","Equipment Purchase/Repair"),
    ("rent","Rent & Utilities"),("supplies","Supplies"),
    ("marketing","Marketing"),("maintenance","Maintenance"),("other","Other"),
]

class Income(models.Model):
    source     = models.CharField(max_length=200)
    category   = models.CharField(max_length=30, choices=INCOME_CATEGORIES, default="membership")
    amount     = models.DecimalField(max_digits=12, decimal_places=2)
    date       = models.DateField(default=timezone.now)
    member_id  = models.IntegerField(null=True, blank=True)  # soft FK to avoid circular
    notes      = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

class Expenditure(models.Model):
    category    = models.CharField(max_length=30, choices=EXPENSE_CATEGORIES, default="other")
    description = models.CharField(max_length=255)
    amount      = models.DecimalField(max_digits=12, decimal_places=2)
    date        = models.DateField(default=timezone.now)
    vendor      = models.CharField(max_length=150, blank=True)
    receipt     = models.FileField(upload_to="receipts/", null=True, blank=True)
    notes       = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
