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
    ("to-buy","To-Buy Items"),
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

class GymSetting(models.Model):
    """
    Key-value store for gym-wide configuration.
    Add more keys here in the future without schema changes.
    """
    key        = models.CharField(max_length=100, unique=True)
    value      = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.key} = {self.value}"


class ToBuy(models.Model):
    PRIORITY = [("low","Low"), ("medium","Medium"), ("high","High")]
    STATUS = [("pending","Pending"), ("purchased","Purchased"),("cancelled","Cancelled")]
    item_name = models.CharField(max_length=255)
    quantity  = models.IntegerField(default=1)
    price     = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    BuyingDate = models.DateField(null=True, blank=True)
    Priority   = models.CharField(max_length=10, choices=PRIORITY, default="medium")
    status     = models.CharField(max_length=10, choices=STATUS, default="pending")
    notes      = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    item_url   = models.URLField(blank=True)
