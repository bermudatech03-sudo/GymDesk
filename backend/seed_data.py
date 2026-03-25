import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "gym_crm.settings")
django.setup()

from datetime import timedelta
from django.utils import timezone
import random
from decimal import Decimal
from django.contrib.auth import get_user_model
from apps.members.models import MembershipPlan, Member, MemberPayment, MemberAttendance
from apps.equipment.models import Equipment, MaintenanceLog
from apps.finances.models import Income, Expenditure

User = get_user_model()

today = timezone.localdate()

print("🚀 Seeding data...")

# USERS
if not User.objects.filter(username="admin").exists():
    User.objects.create_superuser(username="admin", password="admin123", role="admin")

User.objects.get_or_create(username="trainer1", defaults={"password": "1234", "role": "staff"})
User.objects.get_or_create(username="trainer2", defaults={"password": "1234", "role": "staff"})


# PLANS
plans = []
for name, days, price in [
    ("Monthly", 30, 1500),
    ("Quarterly", 90, 4000),
    ("Yearly", 365, 12000),
]:
    plan, _ = MembershipPlan.objects.get_or_create(
        name=name,
        defaults={"duration_days": days, "price": price}
    )
    plans.append(plan)


# MEMBERS
members = []
for i in range(1, 21):
    plan = random.choice(plans)
    join_date = today - timedelta(days=random.randint(0, 60))

    member, _ = Member.objects.get_or_create(
        phone=f"90000000{i:02d}",
        defaults={
            "name": f"Member {i}",
            "email": f"member{i}@gym.com",
            "plan": plan,
            "join_date": join_date,
            "renewal_date": join_date + timedelta(days=plan.duration_days),
            "status": "active"
        }
    )
    members.append(member)


# PAYMENTS

for m in members:
    for _ in range(random.randint(1, 2)):

        # Plan price (base)
        base_price = Decimal(m.plan.price) if m.plan else Decimal("1500")

        # GST %
        gst_rate = Decimal(random.choice([0, 5, 12, 18]))  # realistic GST slabs

        # GST amount
        gst_amount = (base_price * gst_rate) / Decimal("100")

        # Total amount (including GST)
        total = base_price + gst_amount

        # Paid amount (full or partial)
        paid = random.choice([
            total,
            total / 2,
            total * Decimal("0.75")
        ])

        paid = paid.quantize(Decimal("0.01"))

        MemberPayment.objects.create(
            member=m,
            plan=m.plan,

            invoice_number=f"INV-{random.randint(1000,9999)}",

            plan_price=base_price,
            gst_rate=gst_rate,
            gst_amount=gst_amount.quantize(Decimal("0.01")),
            total_with_gst=total.quantize(Decimal("0.01")),

            amount_paid=paid,

            paid_date=today - timedelta(days=random.randint(0, 60)),

            valid_from=m.join_date,
            valid_to=m.renewal_date,

            notes="Dummy payment"
        )


# ATTENDANCE
for m in members:
    for d in range(60):
        day = today - timedelta(days=d)
        if random.random() < 0.7:
            MemberAttendance.objects.create(
                member=m,
                date=day,
                check_in=timezone.now().time()
            )


# EQUIPMENT
equipments = []
for i in range(1, 8):
    eq = Equipment.objects.create(
        name=f"Machine {i}",
        category=random.choice(["cardio", "strength", "free_weights"]),
        brand="FitBrand",
        quantity=random.randint(1, 5),
        condition=random.choice(["excellent", "good", "fair"]),
        purchase_date=today - timedelta(days=random.randint(100, 800)),
    )
    equipments.append(eq)


# MAINTENANCE
for eq in equipments:
    for _ in range(random.randint(1, 3)):
        MaintenanceLog.objects.create(
            equipment=eq,
            date=today - timedelta(days=random.randint(0, 60)),
            description="Routine maintenance",
            cost=random.randint(500, 3000)
        )


from decimal import Decimal

gst_rates = [0, 5, 12, 18]  # realistic GST slabs

for i in range(40):
    base_amount = Decimal(random.randint(1000, 5000))
    gst_rate = Decimal(random.choice(gst_rates))

    gst_amount = (base_amount * gst_rate) / Decimal(100)
    total_amount = base_amount + gst_amount

    Income.objects.create(
        source=random.choice([
            "Membership Fee",
            "Personal Training",
            "Locker Rental",
            "Supplement Sale"
        ]),
        category="membership",
        base_amount=base_amount,
        gst_rate=gst_rate,
        gst_amount=gst_amount,
        amount=total_amount,
        date=today - timedelta(days=random.randint(0, 60)),
        member_id=random.choice([None, random.randint(1, 20)]),  # optional link
        invoice_number=f"INV{today.strftime('%Y%m')}{i:03d}",
        notes="Auto generated"
    )

#expenses
vendors = ["Local Supplier", "Amazon", "Decathlon", "Urban Fitness", "PowerLift Co"]

for _ in range(30):
    Expenditure.objects.create(
        category=random.choice(["rent", "salary", "maintenance", "supplies"]),
        description=random.choice([
            "Monthly Rent",
            "Trainer Salary",
            "Equipment Repair",
            "Cleaning Supplies"
        ]),
        amount=random.randint(2000, 15000),
        date=today - timedelta(days=random.randint(0, 60)),
        vendor=random.choice(vendors),
        notes="Auto generated expense"
    )

print("✅ DONE: Dummy data created!")


# ---------------- STAFF MEMBERS ----------------
from apps.staff.models import StaffMember, StaffAttendance, StaffPayment

staff_list = []

staff_roles = ["trainer", "receptionist", "cleaner", "manager"]
staff_shifts = ["morning", "evening", "full"]

for i in range(1, 8):
    staff, _ = StaffMember.objects.get_or_create(
        phone=f"80000000{i:02d}",
        defaults={
            "name": f"Staff {i}",
            "email": f"staff{i}@gym.com",
            "role": random.choice(staff_roles),
            "shift": random.choice(staff_shifts),
            "salary": random.randint(10000, 30000),
            "join_date": today - timedelta(days=random.randint(30, 200)),
            "status": "active"
        }
    )
    staff_list.append(staff)


# ---------------- STAFF ATTENDANCE (60 DAYS) ----------------
for staff in staff_list:
    for d in range(60):
        day = today - timedelta(days=d)

        status = random.choices(
            ["present", "absent", "half", "leave"],
            weights=[70, 10, 10, 10]
        )[0]

        check_in = None
        check_out = None

        if status in ["present", "half"]:
            check_in = timezone.now().time()
            check_out = timezone.now().time()

        StaffAttendance.objects.get_or_create(
            staff=staff,
            date=day,
            defaults={
                "status": status,
                "check_in": check_in,
                "check_out": check_out,
                "notes": ""
            }
        )


# ---------------- STAFF PAYMENTS (LAST 2 MONTHS) ----------------
for staff in staff_list:
    for month_offset in range(2):  # last 2 months
        month_date = (today.replace(day=1) - timedelta(days=30 * month_offset)).replace(day=1)

        status = random.choice(["paid", "pending", "partial"])
        paid_date = None

        if status == "paid":
            paid_date = month_date + timedelta(days=random.randint(1, 10))

        StaffPayment.objects.get_or_create(
            staff=staff,
            month=month_date,
            defaults={
                "amount": staff.salary,
                "paid_date": paid_date,
                "status": status,
                "notes": ""
            }
        )

print("✅ STAFF DATA CREATED!")