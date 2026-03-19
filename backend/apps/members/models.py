
from django.db import models
from django.utils import timezone
from datetime import timedelta

class MembershipPlan(models.Model):
    name         = models.CharField(max_length=100)
    duration_days= models.PositiveIntegerField(default=30)
    price        = models.DecimalField(max_digits=10, decimal_places=2)
    description  = models.TextField(blank=True)
    is_active    = models.BooleanField(default=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.duration_days}d — ₹{self.price})"

class Member(models.Model):
    GENDER   = [("M","Male"),("F","Female"),("O","Other")]
    STATUS   = [("active","Active"),("expired","Expired"),("cancelled","Cancelled"),("paused","Paused")]

    name         = models.CharField(max_length=150)
    phone        = models.CharField(max_length=15, unique=True)
    email        = models.EmailField(blank=True)
    dob          = models.DateField(null=True, blank=True)
    gender       = models.CharField(max_length=1, choices=GENDER, blank=True)
    address      = models.TextField(blank=True)
    photo        = models.ImageField(upload_to="members/", null=True, blank=True)
    plan         = models.ForeignKey(MembershipPlan, on_delete=models.SET_NULL, null=True)
    join_date    = models.DateField(default=timezone.localdate)
    renewal_date = models.DateField(null=True, blank=True)
    status       = models.CharField(max_length=12, choices=STATUS, default="active")
    notes        = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.phone})"

    def days_until_expiry(self):
        if self.renewal_date:
            return (self.renewal_date - timezone.now().date()).days
        return None

    def renew(self):
        if self.plan:
            base = max(self.renewal_date, timezone.now().date()) if self.renewal_date else timezone.now().date()
            self.renewal_date = base + timedelta(days=self.plan.duration_days)
            self.status = "active"
            self.save()

class MemberPayment(models.Model):
    STATUS = [("paid","Paid"),("pending","Pending"),("partial","Partial")]
    member     = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="payments")
    plan       = models.ForeignKey(MembershipPlan, on_delete=models.SET_NULL, null=True)
    amount     = models.DecimalField(max_digits=10, decimal_places=2)
    paid_date  = models.DateField(default=timezone.localdate)
    valid_from = models.DateField()
    valid_to   = models.DateField()
    status     = models.CharField(max_length=10, choices=STATUS, default="paid")
    notes      = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-paid_date"]
