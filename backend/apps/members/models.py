from django.db import models
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

class MembershipPlan(models.Model):
    PLAN = [("basic","Basic"),("standard","Standard"),("premium","Premium")]
    name          = models.CharField(max_length=100)
    duration_days = models.PositiveIntegerField(default=30)
    price         = models.DecimalField(max_digits=10, decimal_places=2)
    description   = models.TextField(blank=True)
    is_active     = models.BooleanField(default=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    plans         = models.CharField(max_length=10, choices=PLAN, default="basic")

    def __str__(self):
        return f"{self.name} ({self.duration_days}d — ₹{self.price}) {self.plans} "

class Member(models.Model):
    GENDER = [("M","Male"),("F","Female"),("O","Other")]
    STATUS = [("active","Active"),("expired","Expired"),("cancelled","Cancelled"),("paused","Paused")]

    name         = models.CharField(max_length=150)
    phone        = models.CharField(max_length=15, unique=True)
    email        = models.EmailField(blank=True)
    dob          = models.DateField(null=True, blank=True)
    gender       = models.CharField(max_length=1, choices=GENDER, blank=True)
    address      = models.TextField(blank=True)
    photo_url    = models.URLField(blank=True)
    plan         = models.ForeignKey(MembershipPlan, on_delete=models.SET_NULL, null=True, blank=True)
    diet         = models.ForeignKey('DietPlan', on_delete=models.SET_NULL, null=True, blank=True)
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
            return (self.renewal_date - timezone.localdate()).days
        return None

    def total_paid(self):
        from django.db.models import Sum
        result = self.payments.aggregate(t=Sum("amount_paid"))["t"]
        return result or 0

    def total_due(self):
        from django.db.models import Sum
        result = self.payments.aggregate(t=Sum("total_with_gst"))["t"]
        return result or 0

    def balance_due(self):
        return self.total_due() - self.total_paid()

    def renew(self):
        if self.plan:
            base = max(self.renewal_date, timezone.localdate()) if self.renewal_date else timezone.localdate()
            self.renewal_date = base + timedelta(days=self.plan.duration_days)
            self.status = "active"
            self.save()

    def display_id(self):
        return f"M{self.id:04d}"

class MemberPayment(models.Model):
    """
    One record per enrollment / renewal cycle.
    GST is calculated once on the plan price.
    Members can pay in installments — amount_paid grows,
    balance shrinks. GST is NOT re-applied on installments.
    """
    STATUS = [("paid","Paid"),("partial","Partial"),("pending","Pending")]
 
    member         = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="payments")
    plan           = models.ForeignKey(MembershipPlan, on_delete=models.SET_NULL, null=True, blank=True)
    invoice_number = models.CharField(max_length=60, blank=True)
 
    # Plan base price (before GST)
    plan_price     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    # GST fields — computed once at enrollment/renewal
    gst_rate       = models.DecimalField(max_digits=5,  decimal_places=2, default=0)
    gst_amount     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    # Total the member owes = plan_price + gst_amount
    total_with_gst = models.DecimalField(max_digits=10, decimal_places=2, default=0)
 
    # Running installment tracking
    amount_paid    = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    balance        = models.DecimalField(max_digits=10, decimal_places=2, default=0)
 
    paid_date      = models.DateField(default=timezone.localdate)
    valid_from     = models.DateField()
    valid_to       = models.DateField()
    status         = models.CharField(max_length=10, choices=STATUS, default="pending")
    notes          = models.TextField(blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)
 
    class Meta:
        ordering = ["-paid_date"]
 
    def save(self, *args, **kwargs):
        # Recalculate balance and status on every save
        self.balance = self.total_with_gst - self.amount_paid
        if self.balance <= Decimal("0"):
            self.status = "paid"
            self.balance = Decimal("0")
        elif self.amount_paid > Decimal("0"):
            self.status = "partial"
        else:
            self.status = "pending"
        super().save(*args, **kwargs)

    def add_installment(self, amount, paid_date=None, notes="", installment_type="balance"):
        """
        Convenience method: record a new installment, update amount_paid, save.
        GST is intentionally NOT touched here.
        """
        amount = Decimal(str(amount))
        inst = InstallmentPayment(
            payment          = self,
            member           = self.member,
            installment_type = installment_type,
            amount           = amount,
            paid_date        = paid_date or timezone.localdate(),
            notes            = notes,
        )
        self.amount_paid += amount
        # Snapshot the balance AFTER this installment is applied
        inst.balance_after = max(self.total_with_gst - self.amount_paid, Decimal("0"))
        inst.save()
        self.save()   # triggers balance / status recalc
        return inst
    
class MemberAttendance(models.Model):
    member     = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="attendance")
    date       = models.DateField(default=timezone.localdate)
    check_in   = models.TimeField(null=True, blank=True)
    check_out  = models.TimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
 
    class Meta:
        ordering = ["-date", "-check_in"]
 
    def __str__(self):
        return f"{self.member.name} — {self.date}"
    
class DietPlan(models.Model):
    name       = models.CharField(max_length=100, default="Unnamed Plan")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Diet(models.Model):
    UNIT_CHOICES = [
        ("g",     "Grams"),
        ("kg",    "Kilograms"),
        ("ml",    "Milliliters"),
        ("l",     "Liters"),
        ("cup",   "Cup"),
        ("tbsp",  "Tablespoon"),
        ("tsp",   "Teaspoon"),
        ("piece", "Piece"),
    ]

    plan     = models.ForeignKey(DietPlan, on_delete=models.CASCADE, related_name="items")
    time     = models.TimeField()
    food     = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=7, decimal_places=2, default=1)
    unit     = models.CharField(max_length=10, choices=UNIT_CHOICES, default="g")
    calories = models.IntegerField()
    notes    = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ["time"]

    def __str__(self):
        return f"{self.food} ({self.quantity}{self.unit}) at {self.time} and the note is {self.notes}"





class InstallmentPayment(models.Model):
    """
    One record per individual payment made against a MemberPayment cycle.
    Enrollment first payment, subsequent balance payments — all stored here.
    """
    INSTALLMENT_TYPE = [
        ("enrollment", "Enrollment"),
        ("renewal",    "Renewal"),
        ("balance",    "Balance Payment"),
    ]
 
    payment        = models.ForeignKey(MemberPayment, on_delete=models.CASCADE,
                                       related_name="installment_payments")
    member         = models.ForeignKey(Member, on_delete=models.CASCADE,
                                       related_name="installments")
    installment_type = models.CharField(max_length=20, choices=INSTALLMENT_TYPE, default="balance")
    amount         = models.DecimalField(max_digits=10, decimal_places=2)
    # Snapshot of balance AFTER this installment was applied
    balance_after  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    paid_date      = models.DateField(default=timezone.localdate)
    notes          = models.TextField(blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)
 
    class Meta:
        ordering = ["paid_date", "created_at"]
 
    def __str__(self):
        return f"{self.member.name} — ₹{self.amount} on {self.paid_date}"