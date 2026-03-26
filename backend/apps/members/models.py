from django.db import models
from django.utils import timezone
from datetime import timedelta

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
        result = self.payments.aggregate(t=Sum("plan_price"))["t"]
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
    STATUS = [("paid","Paid"),("partial","Partial"),("pending","Pending")]

    member      = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="payments")
    plan        = models.ForeignKey(MembershipPlan, on_delete=models.SET_NULL, null=True, blank=True)
    plan_price  = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # full plan price
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # actual collected
    balance     = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # yet to collect
    paid_date   = models.DateField(default=timezone.localdate)
    valid_from  = models.DateField()
    valid_to    = models.DateField()
    status      = models.CharField(max_length=10, choices=STATUS, default="paid")
    notes       = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-paid_date"]

    def save(self, *args, **kwargs):
        self.balance = self.plan_price - self.amount_paid
        if self.balance <= 0:
            self.status = "paid"
        elif self.amount_paid > 0:
            self.status = "partial"
        else:
            self.status = "pending"
        super().save(*args, **kwargs)

    def __str__(self):
        return f'''member: {self.member} 
                   Status : {self.status}
                   plan   : {self.plan}
                   amount : {self.amount}


'''
    
class MemberAttendance(models.Model):
    member     = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="attendance")
    date       = models.DateField(default=timezone.localdate)
    check_in   = models.TimeField(default=timezone.now)
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



