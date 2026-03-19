
from django.db import models
from django.utils import timezone

class StaffMember(models.Model):
    SHIFT  = [("morning","Morning 6AM-2PM"),("evening","Evening 2PM-10PM"),("full","Full Day"),("off","Day Off")]
    ROLE   = [("trainer","Trainer"),("receptionist","Receptionist"),("cleaner","Cleaner"),("manager","Manager"),("other","Other")]
    STATUS = [("active","Active"),("inactive","Inactive"),("on_leave","On Leave")]

    name       = models.CharField(max_length=150)
    phone      = models.CharField(max_length=15, unique=True)
    email      = models.EmailField(blank=True)
    role       = models.CharField(max_length=20, choices=ROLE, default="trainer")
    shift      = models.CharField(max_length=10, choices=SHIFT, default="morning")
    salary     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    join_date  = models.DateField(default=timezone.localdate)
    status     = models.CharField(max_length=12, choices=STATUS, default="active")
    photo      = models.ImageField(upload_to="staff/", null=True, blank=True)
    address    = models.TextField(blank=True)
    notes      = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.role})"
    def display_id(self):
        return f"S{self.id:04d}"

class StaffAttendance(models.Model):
    STATUS = [("present","Present"),("absent","Absent"),("half","Half Day"),("leave","Leave")]
    staff     = models.ForeignKey(StaffMember, on_delete=models.CASCADE, related_name="attendance")
    date      = models.DateField(default=timezone.localdate)
    check_in  = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    status    = models.CharField(max_length=10, choices=STATUS, default="present")
    notes     = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-date"]
        unique_together = ["staff","date"]

class StaffPayment(models.Model):
    STATUS = [("paid","Paid"),("pending","Pending"),("partial","Partial")]
    staff      = models.ForeignKey(StaffMember, on_delete=models.CASCADE, related_name="payments")
    month      = models.DateField()          # first day of the month
    amount     = models.DecimalField(max_digits=10, decimal_places=2)
    paid_date  = models.DateField(null=True, blank=True)
    status     = models.CharField(max_length=10, choices=STATUS, default="pending")
    notes      = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-month"]
        unique_together = ["staff","month"]
