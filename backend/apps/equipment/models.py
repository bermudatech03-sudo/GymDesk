
from django.db import models
from django.utils import timezone

class Equipment(models.Model):
    CONDITION = [("excellent","Excellent"),("good","Good"),("fair","Fair"),("poor","Poor"),("out_of_service","Out of Service")]
    CATEGORY  = [("cardio","Cardio"),("strength","Strength"),("flexibility","Flexibility"),("free_weights","Free Weights"),("accessories","Accessories"),("other","Other")]

    name          = models.CharField(max_length=150)
    category      = models.CharField(max_length=20, choices=CATEGORY, default="strength")
    brand         = models.CharField(max_length=100, blank=True)
    model_number  = models.CharField(max_length=100, blank=True)
    serial_number = models.CharField(max_length=100, blank=True)
    quantity      = models.PositiveIntegerField(default=1)
    purchase_date = models.DateField(null=True, blank=True)
    purchase_price= models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    condition     = models.CharField(max_length=20, choices=CONDITION, default="good")
    last_service  = models.DateField(null=True, blank=True)
    next_service  = models.DateField(null=True, blank=True)
    location      = models.CharField(max_length=100, blank=True)
    photo         = models.ImageField(upload_to="equipment/", null=True, blank=True)
    notes         = models.TextField(blank=True)
    is_active     = models.BooleanField(default=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category","name"]

    def __str__(self):
        return f"{self.name} ({self.category})"

class MaintenanceLog(models.Model):
    equipment   = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name="maintenance_logs")
    date        = models.DateField(default=timezone.now)
    description = models.TextField()
    cost        = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    technician  = models.CharField(max_length=100, blank=True)
    next_due    = models.DateField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
