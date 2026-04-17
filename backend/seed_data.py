"""
GymDesk — comprehensive seed data script.

Run from the backend/ directory:
    ./venv/Scripts/python.exe seed_data.py

Populates every app with realistic, internally-consistent data:
    accounts     — admin + staff login users
    members      — plans, members, payments, installments, attendance, diet
    staff        — shifts, members, attendance, monthly payroll
    members(PT)  — trainer assignments + past PT renewals (Income-linked)
    equipment    — equipment catalogue + maintenance logs
    finances     — income, expenditure, to-buy list (GymSetting is seeded via migration)
    enquiries    — enquiries with scheduled followups
    notifications — welcome, renewal-remind, expiry, enquiry messages

The script is idempotent where possible (uses get_or_create on unique fields).
"""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "gym_crm.settings")
django.setup()

import random
from datetime import timedelta, date, time
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.members.models import (
    MembershipPlan, Member, MemberPayment,
    MemberAttendance, InstallmentPayment,
    DietPlan, Diet, TrainerAssignment, PTRenewal,
)
from apps.staff.models import (
    StaffMember, StaffShift, StaffAttendance, StaffPayment,
)
from apps.finances.models import Income, Expenditure, ToBuy, GymSetting
from apps.equipment.models import Equipment, MaintenanceLog
from apps.notifications.models import Notification
from apps.enquiries.models import Enquiry, EnquiryFollowup


# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
DAYS_BACK = 120        # how far back to generate historical data
random.seed(42)        # deterministic runs


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def rand_date(start, end):
    if end <= start:
        return start
    delta = end - start
    return start + timedelta(days=random.randint(0, delta.days))


def rand_time(start_hour=6, end_hour=21):
    return time(random.randint(start_hour, end_hour), random.choice([0, 15, 30, 45]))


def q2(val):
    return Decimal(val).quantize(Decimal("0.01"))


def gst_rate():
    obj = GymSetting.objects.filter(key="GST_RATE").first()
    return Decimal(obj.value) if obj else Decimal("18")


# ─────────────────────────────────────────────
# DATA POOLS
# ─────────────────────────────────────────────
MEMBER_NAMES = [
    "Arjun Sharma", "Priya Patel", "Rohit Verma", "Sneha Iyer", "Karan Mehta",
    "Anjali Singh", "Vikram Nair", "Divya Reddy", "Amit Joshi", "Pooja Gupta",
    "Rahul Khanna", "Neha Agarwal", "Suresh Kumar", "Meera Pillai", "Aakash Rao",
    "Ritu Desai", "Manish Tiwari", "Kavya Menon", "Deepak Pandey", "Swati Bose",
    "Nikhil Chandra", "Ananya Mishra", "Varun Shetty", "Ishaan Kapoor", "Tanvi Shah",
    "Gaurav Nanda", "Shruti Banerjee", "Rajesh Dubey", "Pallavi Patil", "Siddharth Jain",
    "Harini Raman", "Mohan Das", "Zara Hussain", "Keerthi Reddy", "Abhishek Roy",
]

# (name, role, shift_key, salary, personal_trainer_amt)
STAFF_NAMES = [
    ("Arun Kumar",      "trainer",      "morning", 28000, 2500),
    ("Sunita Sharma",   "receptionist", "morning", 18000, None),
    ("Vijay Menon",     "trainer",      "evening", 30000, 3000),
    ("Rekha Nair",      "receptionist", "evening", 17000, None),
    ("Manoj Tiwari",    "cleaner",      "morning", 12000, None),
    ("Geeta Pillai",    "cleaner",      "evening", 12000, None),
    ("Ravi Bhandari",   "manager",      "full",    40000, None),
    ("Sonal Desai",     "trainer",      "morning", 26000, 2200),
    ("Prakash Verma",   "trainer",      "evening", 27000, 2400),
    ("Lata Khanna",     "receptionist", "full",    19000, None),
]

VEG_FOODS = [
    ("Oats with Banana",    "1",    "cup",   320),
    ("Paneer Bhurji",       "150",  "g",     300),
    ("Brown Rice",          "200",  "g",     260),
    ("Mixed Veg Dal",       "1",    "cup",   220),
    ("Fruit Salad",         "200",  "g",     150),
    ("Whole Wheat Roti",    "2",    "piece", 180),
    ("Curd",                "100",  "ml",    98),
    ("Sprouts",             "100",  "g",     140),
    ("Soya Chunks",         "100",  "g",     345),
    ("Green Smoothie",      "300",  "ml",    180),
]

NONVEG_FOODS = [
    ("Boiled Eggs",         "3",    "piece", 210),
    ("Grilled Chicken",     "200",  "g",     330),
    ("Egg Omelette",        "2",    "piece", 200),
    ("Tuna Salad",          "150",  "g",     200),
    ("Chicken Rice Bowl",   "1",    "cup",   410),
    ("Fish Curry",          "150",  "g",     220),
    ("Egg White Scramble",  "4",    "piece", 170),
    ("Mutton Curry",        "150",  "g",     300),
]

EQUIPMENT_LIST = [
    ("Treadmill",           "cardio",       "LifeFitness",  "T5",   "good",      3, 85000),
    ("Elliptical Trainer",  "cardio",       "Precor",       "EFX",  "excellent", 2, 60000),
    ("Stationary Cycle",    "cardio",       "Schwinn",      "AC25", "good",      4, 25000),
    ("Rowing Machine",      "cardio",       "Concept2",     "D",    "excellent", 2, 55000),
    ("Bench Press",         "strength",     "Technogym",    "BP10", "good",      3, 30000),
    ("Squat Rack",          "strength",     "Powertec",     "SR5",  "good",      2, 45000),
    ("Lat Pulldown",        "strength",     "LifeFitness",  "LP90", "fair",      2, 35000),
    ("Cable Crossover",     "strength",     "Cybex",        "CC7",  "good",      1, 90000),
    ("Dumbbell Set",        "free_weights", "Decathlon",    "Pro",  "good",      5, 40000),
    ("Barbell Set",         "free_weights", "York",         "OB6",  "fair",      3, 20000),
    ("Kettlebell Set",      "free_weights", "Rogue",        "KB-S", "excellent", 4, 15000),
    ("Yoga Mat",            "flexibility",  "Adidas",       "YM3",  "good",      15, 800),
    ("Resistance Bands",    "accessories",  "TheraBand",    "RB5",  "good",      10, 500),
    ("Pull-up Bar",         "strength",     "Generic",      "PB1",  "fair",       2, 3000),
    ("Leg Press Machine",   "strength",     "LifeFitness",  "LP55", "good",       1, 75000),
]

FINANCE_INCOME_NOTES = [
    "Monthly membership fee", "New enrollment", "Plan renewal",
    "Personal training session", "Locker rental", "Merchandise sale",
    "Pro-shop sale", "Drop-in pass",
]

FINANCE_EXPENSE_NOTES = [
    ("salary",      "Staff salary payment",         "HR"),
    ("equipment",   "Equipment repair parts",       "FixIT Services"),
    ("rent",        "Monthly gym rent",             "Property Owner"),
    ("supplies",    "Cleaning supplies",            "CleanMart"),
    ("marketing",   "Social media ads",             "AdAgency"),
    ("maintenance", "AC service and filter change", "CoolTech"),
    ("other",       "Miscellaneous expenses",       ""),
]

# (item_name, quantity, price, priority, status, notes, item_url, days_offset)
TOBUY_LIST = [
    ("Commercial Treadmill",        1,  95000,  "high",   "pending",   "Replace the broken unit in cardio zone",       "https://www.lifefitness.com",       10),
    ("Adjustable Dumbbells Set",    2,  18000,  "high",   "pending",   "5kg to 50kg range needed",                     "https://www.decathlon.in",          5),
    ("Foam Roller Pack",           10,   600,   "low",    "purchased", "For warm-up and recovery area",                "https://www.amazon.in",             20),
    ("Gym Mirrors (6x4 ft)",        4,  12000,  "medium", "pending",   "For the free weights section walls",           "",                                  7),
    ("Resistance Band Set",        15,   450,   "low",    "purchased", "Replacing worn-out bands",                     "https://www.amazon.in",             15),
    ("Pull-up Bar Wall Mount",      2,   3500,  "medium", "pending",   "Install near strength section",                "",                                  8),
    ("Air Purifier",                2,  22000,  "high",   "pending",   "Needed for main floor air quality",            "https://www.dyson.in",              3),
    ("Yoga Blocks",                20,   250,   "low",    "pending",   "For yoga and flexibility classes",             "https://www.decathlon.in",          12),
    ("Whey Protein (bulk)",         5,   4200,  "medium", "cancelled", "Decided not to sell supplements for now",      "",                                  25),
    ("Battle Ropes",                2,   8500,  "medium", "pending",   "For functional training zone",                 "https://www.amazon.in",             6),
    ("Digital Weighing Scale",      3,   1800,  "low",    "purchased", "For member body weight tracking",              "",                                  18),
    ("Spin Bike",                   2,  35000,  "high",   "pending",   "High demand in morning batch",                 "https://www.schwinn.com",           2),
    ("First Aid Kit",               2,   1200,  "high",   "purchased", "Monthly restocking",                           "",                                  22),
    ("Sound System",                1,  15000,  "medium", "pending",   "Current speakers have poor quality",           "https://www.bose.com",              9),
    ("Gym Flooring Tiles (10 sqm)", 1,   9000,  "medium", "pending",   "For the new functional training area",         "",                                  11),
]

# (name, phone, status, notes)
ENQUIRY_LIST = [
    ("Ramesh Pillai",   "7010000001", "new",       "Asked about premium plan pricing and PT availability."),
    ("Sita Sundaram",   "7010000002", "followup",  "Interested in weekend batches. Will confirm after trial."),
    ("Arvind Raj",      "7010000003", "converted", "Enrolled for standard plan on the second visit."),
    ("Meenakshi S",     "7010000004", "lost",      "Chose a nearby competitor due to timing."),
    ("Faisal Khan",     "7010000005", "followup",  "Wants diet consult included. Budget under 5000/quarter."),
    ("Dhanya Prakash",  "7010000006", "new",       "Walk-in. Collected brochure, will decide by weekend."),
    ("Bharath Kumar",   "7010000007", "followup",  "Needs to talk to family. Prefers evening slot."),
    ("Leena Mathew",    "7010000008", "converted", "Enrolled in PT Basic plan with trainer Arun."),
]


# ─────────────────────────────────────────────
# MAIN SEED FUNCTION
# ─────────────────────────────────────────────
def run():
    print("Seeding data...")

    today = timezone.localdate()
    start_date = today - timedelta(days=DAYS_BACK)

    # ─────────────────────────────
    # 0. ADMIN + STAFF LOGIN USERS
    # ─────────────────────────────
    User = get_user_model()
    if not User.objects.filter(username="admin").exists():
        User.objects.create_superuser(
            username="admin",
            email="admin@gymdesk.local",
            password="admin123",
            role="admin",
            phone="9000000000",
        )
    if not User.objects.filter(username="reception").exists():
        User.objects.create_user(
            username="reception",
            email="reception@gymdesk.local",
            password="reception123",
            role="staff",
            phone="9000000001",
        )

    # Ensure GymSetting defaults exist (migration seeds them — guard anyway)
    defaults = [
        ("GST_RATE", "18"),
        ("PT_PAYABLE_PERCENT", "100"),
        ("GYM_NAME", "Light Weight Fitness Gym"),
        ("GYM_ADDRESS", "Chennai, Tamil Nadu — India"),
        ("GYM_PHONE", "+91 97907 28732"),
        ("GYM_EMAIL", "bermudatech@gmail.com"),
        ("GYM_GSTIN", "33AAAAA0000A1Z5"),
    ]
    for k, v in defaults:
        GymSetting.objects.get_or_create(key=k, defaults={"value": v})

    GST = gst_rate()

    # ─────────────────────────────
    # 1. MEMBERSHIP PLANS
    # ─────────────────────────────
    plans_data = [
        ("Basic Plan",        30,  1000, "Access to gym floor and basic equipment."),
        ("Standard Plan",     90,  2500, "Includes group fitness classes and locker access."),
        ("Premium Plan",      180, 4500, "Full access including sauna and diet consultation."),
        ("Annual Plan",       365, 8000, "Best value. Full access for one year."),
    ]
    plan_objs = []
    for name, days, price, desc in plans_data:
        p, _ = MembershipPlan.objects.get_or_create(
            name=name,
            defaults={
                "duration_days": days,
                "price": Decimal(price),
                "description": desc,
                "is_active": True,
            },
        )
        plan_objs.append(p)

    # ─────────────────────────────
    # 2. DIET PLANS
    # ─────────────────────────────
    diet_plan_data = [
        ("Weight Loss Veg",     "veg"),
        ("Muscle Gain Nonveg",  "nonveg"),
        ("Balanced Vegan",      "vegan"),
    ]
    diet_plan_objs = []
    for dp_name, dp_type in diet_plan_data:
        dp, created = DietPlan.objects.get_or_create(
            name=dp_name,
            defaults={"foodType": dp_type},
        )
        diet_plan_objs.append(dp)
        if created:
            foods = VEG_FOODS if dp_type in ("veg", "vegan") else NONVEG_FOODS
            meal_times = [time(7, 0), time(10, 0), time(13, 0), time(16, 0), time(20, 0)]
            for t, (food, qty, unit, cal) in zip(meal_times, random.sample(foods, min(5, len(foods)))):
                Diet.objects.create(
                    plan=dp,
                    time=t,
                    food=food,
                    quantity=Decimal(qty),
                    unit=unit,
                    calories=cal,
                )

    # ─────────────────────────────
    # 3. STAFF SHIFTS
    # ─────────────────────────────
    shift_morning, _ = StaffShift.objects.get_or_create(
        name="Morning Shift",
        defaults={
            "start_time": time(6, 0),
            "end_time": time(14, 0),
            "working_days_preset": "mon_sat",
            "late_grace_minutes": 15,
            "overtime_threshold_minutes": 30,
        },
    )
    shift_evening, _ = StaffShift.objects.get_or_create(
        name="Evening Shift",
        defaults={
            "start_time": time(14, 0),
            "end_time": time(22, 0),
            "working_days_preset": "mon_sat",
            "late_grace_minutes": 15,
            "overtime_threshold_minutes": 30,
        },
    )
    shift_full, _ = StaffShift.objects.get_or_create(
        name="Full Day",
        defaults={
            "start_time": time(8, 0),
            "end_time": time(20, 0),
            "working_days_preset": "mon_sun",
            "late_grace_minutes": 15,
            "overtime_threshold_minutes": 30,
        },
    )
    shift_map = {"morning": shift_morning, "evening": shift_evening, "full": shift_full}

    # ─────────────────────────────
    # 4. STAFF MEMBERS
    # ─────────────────────────────
    staff_list = []
    for idx, (name, role, shift_key, salary, pt_amt) in enumerate(STAFF_NAMES):
        phone = f"8{idx:09}"
        s, _ = StaffMember.objects.get_or_create(
            phone=phone,
            defaults={
                "name": name,
                "email": f"{name.lower().replace(' ', '.')}@gymdesk.local",
                "role": role,
                "shift": shift_key,
                "shift_template": shift_map[shift_key],
                "salary": Decimal(salary),
                "personal_trainer_amt": Decimal(pt_amt) if pt_amt else None,
                "join_date": rand_date(start_date, today - timedelta(days=30)),
                "status": "active",
                "address": f"#{random.randint(1,99)}, {random.choice(['Anna Nagar','T Nagar','Adyar','Velachery'])}, Chennai",
            },
        )
        staff_list.append(s)

    trainer_staff = [s for s in staff_list if s.role == "trainer"]

    # ─────────────────────────────
    # 5. STAFF ATTENDANCE (computed fields auto-filled by save())
    # ─────────────────────────────
    for s in staff_list:
        base_in = s.shift_template.start_time if s.shift_template else time(9, 0)
        base_out = s.shift_template.end_time if s.shift_template else time(17, 0)
        used_dates = set()
        attempts = 0
        while len(used_dates) < 45 and attempts < 150:
            attempts += 1
            d = rand_date(max(start_date, s.join_date), today)
            if d in used_dates:
                continue
            used_dates.add(d)
            late_mins = random.choice([0, 0, 0, 0, 5, 10, 20, 45])
            new_minute = base_in.minute + late_mins
            actual_in = time(base_in.hour + new_minute // 60, new_minute % 60)
            StaffAttendance.objects.get_or_create(
                staff=s,
                date=d,
                defaults={
                    "check_in": actual_in,
                    "check_out": base_out,
                },
            )

    # ─────────────────────────────
    # 6. STAFF PAYMENTS — last 3 months
    # ─────────────────────────────
    for s in staff_list:
        for months_ago in range(3):
            pay_month = (today.replace(day=1) - timedelta(days=months_ago * 30)).replace(day=1)
            is_current = months_ago == 0
            StaffPayment.objects.get_or_create(
                staff=s,
                month=pay_month,
                defaults={
                    "amount": s.salary,
                    "status": "pending" if is_current else "paid",
                    "paid_date": None if is_current else pay_month.replace(day=28),
                },
            )

    # ─────────────────────────────
    # 7. MEMBERS
    # ─────────────────────────────
    members = []
    genders = ["Male", "Female", "Other"]
    food_types = ["veg", "nonveg", "vegan"]

    for idx, full_name in enumerate(MEMBER_NAMES):
        phone = f"9{idx:09}"
        plan = random.choice(plan_objs)
        join = rand_date(start_date, today - timedelta(days=5))
        wants_pt = random.random() < 0.35

        # ~15% expired profiles — renewal_date in the past
        if random.random() < 0.15:
            join = today - timedelta(days=plan.duration_days + random.randint(5, 30))
            status = "expired"
        else:
            status = "active"

        food_type = random.choice(food_types)
        diet = next((dp for dp in diet_plan_objs if food_type in dp.foodType), diet_plan_objs[0])

        if "Premium" in plan.name or "Annual" in plan.name:
            plan_type = "premium"
        elif "Standard" in plan.name:
            plan_type = "standard"
        else:
            plan_type = "basic"

        m, _ = Member.objects.get_or_create(
            phone=phone,
            defaults={
                "name": full_name,
                "email": f"{full_name.lower().replace(' ', '.')}@example.com",
                "age": random.randint(18, 50),
                "gender": random.choice(genders),
                "plan": plan,
                "plan_type": plan_type,
                "diet": diet,
                "join_date": join,
                "renewal_date": join + timedelta(days=plan.duration_days),
                "status": status,
                "foodType": food_type,
                "personal_trainer": wants_pt,
                "notes": "",
                "address": f"Flat {random.randint(1,50)}, Sector {random.randint(1,20)}, Chennai",
            },
        )
        members.append(m)

    # ─────────────────────────────
    # 8. MEMBER PAYMENTS + INSTALLMENTS (enrollment cycle)
    # ─────────────────────────────
    for m in members:
        plan = m.plan
        if not plan:
            continue
        if MemberPayment.objects.filter(member=m, valid_from=m.join_date).exists():
            continue

        # plan price may include a PT trainer fee later; for enrollment we
        # capture plan price here (PT fee is added separately in section 9).
        base = Decimal(plan.price)
        gst_amount = q2(base * GST / 100)
        total = base + gst_amount

        scenario = random.choices(["full", "partial", "pending"], weights=[60, 28, 12])[0]
        if scenario == "full":
            paid = total
        elif scenario == "partial":
            paid = q2(total * Decimal(random.randint(30, 80)) / 100)
        else:
            paid = Decimal("0")

        mp = MemberPayment.objects.create(
            member=m,
            plan=plan,
            plan_price=base,
            diet_plan_amount=Decimal("0"),
            gst_rate=GST,
            gst_amount=gst_amount,
            total_with_gst=total,
            amount_paid=paid,
            paid_date=m.join_date,
            valid_from=m.join_date,
            valid_to=m.renewal_date,
            invoice_number=f"INV-{m.join_date.strftime('%Y%m')}-M{m.id:04d}",
        )

        if paid > 0:
            InstallmentPayment.objects.create(
                payment=mp,
                member=m,
                installment_type="enrollment",
                amount=paid,
                balance_after=max(total - paid, Decimal("0")),
                paid_date=m.join_date,
                mode_of_payment=random.choice(["cash", "upi", "card"]),
            )
            # Mirror into Income ledger (real app does this via signal; seed is explicit)
            Income.objects.create(
                source=f"Enrollment — {m.name}",
                category="membership",
                base_amount=q2(paid * 100 / (100 + GST)),
                gst_rate=GST,
                gst_amount=q2(paid - (paid * 100 / (100 + GST))),
                amount=paid,
                date=m.join_date,
                member_id=m.id,
                invoice_number=mp.invoice_number,
                notes="Enrollment installment",
            )

        # ~30% of partial members pay a second installment within 10-25 days
        if scenario == "partial" and random.random() < 0.6:
            remaining = total - paid
            second_pay = q2(remaining * Decimal(random.randint(40, 100)) / 100)
            second_date = m.join_date + timedelta(days=random.randint(10, 25))
            if second_date <= today and second_pay > 0:
                mp.amount_paid += second_pay
                mp.save()
                InstallmentPayment.objects.create(
                    payment=mp,
                    member=m,
                    installment_type="balance",
                    amount=second_pay,
                    balance_after=max(total - mp.amount_paid, Decimal("0")),
                    paid_date=second_date,
                    mode_of_payment=random.choice(["cash", "upi", "card"]),
                )
                Income.objects.create(
                    source=f"Balance payment — {m.name}",
                    category="membership",
                    base_amount=q2(second_pay * 100 / (100 + GST)),
                    gst_rate=GST,
                    gst_amount=q2(second_pay - (second_pay * 100 / (100 + GST))),
                    amount=second_pay,
                    date=second_date,
                    member_id=m.id,
                    invoice_number=mp.invoice_number,
                    notes="Balance installment",
                )

    # ─────────────────────────────
    # 9. TRAINER ASSIGNMENTS + PT RENEWALS
    # ─────────────────────────────
    pt_members = [m for m in members if m.personal_trainer]
    for m in pt_members:
        trainer = random.choice(trainer_staff)
        start_h = random.choice([6, 7, 8, 16, 17, 18])

        pt_start = m.join_date
        pt_end = min(m.renewal_date, pt_start + timedelta(days=30)) if m.renewal_date else pt_start + timedelta(days=30)

        assignment, created = TrainerAssignment.objects.get_or_create(
            member=m,
            trainer=trainer,
            defaults={
                "plan": m.plan,
                "startingtime": time(start_h, 0),
                "endingtime": time(start_h + 1, 0),
                "working_days": random.choice(["1,3,5", "0,2,4", "1,2,3,4,5"]),
                "pt_start_date": pt_start,
                "pt_end_date": pt_end,
                "trainer_fee_paid": random.choice([True, False]),
            },
        )

        # For ~40% of active PT members: generate 1-2 past renewals so the
        # PT renewal Income ledger has history.
        if (created and m.status == "active"
                and trainer.personal_trainer_amt
                and random.random() < 0.4):
            cursor_end = pt_end
            for seq in range(random.randint(1, 2)):
                next_start = cursor_end + timedelta(days=1)
                if next_start >= today:
                    break
                plan_end = m.renewal_date or (next_start + timedelta(days=30))
                days_left = max(0, (plan_end - next_start).days)
                pt_days = min(30, days_left)
                if pt_days <= 0:
                    break
                next_end = next_start + timedelta(days=pt_days)
                base_amt = q2((trainer.personal_trainer_amt / Decimal(30)) * pt_days)
                gst_amt = q2(base_amt * GST / 100)
                total_amt = base_amt + gst_amt
                invoice = f"PT-{next_start.strftime('%Y%m')}-M{m.id:04d}-{(seq+1):02d}"

                PTRenewal.objects.create(
                    assignment=assignment,
                    member=m,
                    trainer=trainer,
                    pt_start_date=next_start,
                    pt_end_date=next_end,
                    pt_days=pt_days,
                    base_amount=base_amt,
                    gst_rate=GST,
                    gst_amount=gst_amt,
                    total_amount=total_amt,
                    amount_paid=total_amt,
                    mode_of_payment=random.choice(["cash", "upi", "card"]),
                    invoice_number=invoice,
                    status="paid",
                    paid_date=next_start,
                    trainer_payable_amount=base_amt,
                    trainer_paid=random.choice([True, False]),
                )
                Income.objects.create(
                    source=f"PT Renewal — {m.name}",
                    category="personal_training",
                    base_amount=base_amt,
                    gst_rate=GST,
                    gst_amount=gst_amt,
                    amount=total_amt,
                    date=next_start,
                    member_id=m.id,
                    invoice_number=invoice,
                    notes=f"PT renewal {pt_days} days with {trainer.name}",
                )

                # Advance assignment's pt window
                assignment.pt_start_date = next_start
                assignment.pt_end_date = next_end
                assignment.save(update_fields=["pt_start_date", "pt_end_date"])
                cursor_end = next_end

    # ─────────────────────────────
    # 10. MEMBER ATTENDANCE
    # ─────────────────────────────
    for m in members:
        attend_start = m.join_date
        attend_end = m.renewal_date if m.status == "expired" else today
        if attend_end <= attend_start:
            continue

        used_dates = set()
        target = random.randint(18, 40)
        attempts = 0
        while len(used_dates) < target and attempts < target * 4:
            attempts += 1
            d = rand_date(attend_start, attend_end)
            if d in used_dates:
                continue
            used_dates.add(d)
            check_in  = rand_time(6, 10)
            check_out = rand_time(17, 21)
            MemberAttendance.objects.create(
                member=m,
                date=d,
                check_in=check_in,
                check_out=check_out,
            )

    # ─────────────────────────────
    # 11. EQUIPMENT + MAINTENANCE
    # ─────────────────────────────
    for name, category, brand, model_no, condition, qty, price in EQUIPMENT_LIST:
        eq, created = Equipment.objects.get_or_create(
            name=name,
            defaults={
                "category": category,
                "brand": brand,
                "model_number": model_no,
                "quantity": qty,
                "condition": condition,
                "purchase_date": rand_date(start_date - timedelta(days=365), start_date),
                "purchase_price": Decimal(price),
                "is_active": True,
                "location": random.choice(["Main Floor", "Cardio Zone", "Free Weights Area", "Yoga Room"]),
                "last_service": rand_date(start_date, today - timedelta(days=10)),
                "next_service": today + timedelta(days=random.randint(30, 90)),
            },
        )
        if created:
            for _ in range(random.randint(1, 3)):
                MaintenanceLog.objects.create(
                    equipment=eq,
                    date=rand_date(start_date, today),
                    description=random.choice([
                        "Routine inspection and lubrication",
                        "Belt replacement",
                        "Electrical check",
                        "Display panel repair",
                        "Frame tightening",
                    ]),
                    cost=Decimal(random.randint(200, 3000)),
                    technician=random.choice(["Raj Electricals", "FitTech Services", "In-house"]),
                    next_due=today + timedelta(days=random.randint(30, 90)),
                )

    # ─────────────────────────────
    # 12. EXTRA INCOME + EXPENDITURE (non-member sources)
    # ─────────────────────────────
    aux_categories = ["merchandise", "locker", "other"]
    aux_seq = 0
    for d_offset in range(DAYS_BACK):
        d = today - timedelta(days=d_offset)

        # 0-2 supplemental income entries per day (merch, locker, walk-in)
        for _ in range(random.randint(0, 2)):
            aux_seq += 1
            cat = random.choice(aux_categories)
            base = Decimal(random.randint(200, 3500))
            gst_amt = q2(base * GST / 100)
            Income.objects.create(
                source=cat.replace("_", " ").title(),
                category=cat,
                base_amount=base,
                gst_rate=GST,
                gst_amount=gst_amt,
                amount=base + gst_amt,
                date=d,
                invoice_number=f"AUX-{d.strftime('%Y%m%d')}-{aux_seq:04d}",
                notes=random.choice(FINANCE_INCOME_NOTES),
            )

        if random.random() < 0.45:
            cat, desc, vendor = random.choice(FINANCE_EXPENSE_NOTES)
            Expenditure.objects.create(
                category=cat,
                description=desc,
                amount=Decimal(random.randint(500, 15000)),
                date=d,
                vendor=vendor,
                notes="",
            )

    # ─────────────────────────────
    # 13. TO-BUY LIST
    # ─────────────────────────────
    for item_name, qty, price, priority, status, notes, url, days_offset in TOBUY_LIST:
        buying_date = (today + timedelta(days=days_offset)) if status == "pending" else None
        ToBuy.objects.get_or_create(
            item_name=item_name,
            defaults={
                "quantity":    qty,
                "price":       Decimal(price),
                "Priority":    priority,
                "status":      status,
                "notes":       notes,
                "item_url":    url,
                "BuyingDate":  buying_date,
            },
        )

    # ─────────────────────────────
    # 14. ENQUIRIES + FOLLOWUPS
    # ─────────────────────────────
    for name, phone, status, notes in ENQUIRY_LIST:
        enq, created = Enquiry.objects.get_or_create(
            phone=phone,
            defaults={
                "name": name,
                "email": f"{name.lower().replace(' ', '.')}@example.com",
                "status": status,
                "notes": notes,
            },
        )
        if created:
            base_date = today - timedelta(days=random.randint(1, 20))
            EnquiryFollowup.objects.bulk_create([
                EnquiryFollowup(
                    enquiry=enq,
                    scheduled_date=base_date + timedelta(days=offset),
                    sent=(base_date + timedelta(days=offset) < today),
                    sent_at=timezone.now() if (base_date + timedelta(days=offset) < today) else None,
                )
                for offset in [0, 3, 7, 14, 21, 30, 45, 60, 75, 90]
            ])

    # ─────────────────────────────
    # 15. NOTIFICATIONS
    # ─────────────────────────────
    expiring_members = [m for m in members
                        if m.renewal_date and 0 <= (m.renewal_date - today).days <= 7]
    expired_members  = [m for m in members if m.status == "expired"]
    recent_members   = sorted(members, key=lambda m: m.join_date, reverse=True)[:8]

    for m in expiring_members:
        Notification.objects.get_or_create(
            recipient_phone=m.phone,
            trigger_type="renewal_remind",
            defaults={
                "recipient_name": m.name,
                "channel": "whatsapp",
                "message": (
                    f"Hi {m.name.split()[0]}, your membership expires on "
                    f"{m.renewal_date}. Renew now to continue your fitness journey!"
                ),
                "status": "sent",
                "sent_at": timezone.now(),
            },
        )

    for m in expired_members:
        Notification.objects.get_or_create(
            recipient_phone=m.phone,
            trigger_type="expiry",
            defaults={
                "recipient_name": m.name,
                "channel": "whatsapp",
                "message": (
                    f"Hi {m.name.split()[0]}, your membership has expired. "
                    "Visit us to renew and get back on track!"
                ),
                "status": random.choice(["sent", "pending"]),
            },
        )

    for m in recent_members:
        Notification.objects.get_or_create(
            recipient_phone=m.phone,
            trigger_type="enrollment",
            defaults={
                "recipient_name": m.name,
                "channel": "whatsapp",
                "message": (
                    f"Welcome to the gym, {m.name.split()[0]}! "
                    f"Your {m.plan.name if m.plan else 'membership'} is now active. Let's crush those goals!"
                ),
                "status": "sent",
                "sent_at": timezone.now(),
            },
        )

    for enq in Enquiry.objects.filter(status__in=["new", "followup"])[:5]:
        Notification.objects.get_or_create(
            recipient_phone=enq.phone,
            trigger_type="enquiry_welcome",
            defaults={
                "recipient_name": enq.name,
                "channel": "whatsapp",
                "message": f"Hi {enq.name.split()[0]}, thanks for your interest! Visit us anytime for a trial session.",
                "status": "sent",
                "sent_at": timezone.now(),
            },
        )

    # ─────────────────────────────
    # DONE
    # ─────────────────────────────
    print("Seeding complete!")
    print(f"   Users:          {User.objects.count()}  (login: admin / admin123)")
    print(f"   Plans:          {MembershipPlan.objects.count()}")
    print(f"   Diet Plans:     {DietPlan.objects.count()}  ({Diet.objects.count()} items)")
    print(f"   Members:        {Member.objects.count()}")
    print(f"   MemberPayments: {MemberPayment.objects.count()}")
    print(f"   Installments:   {InstallmentPayment.objects.count()}")
    print(f"   MemberAttend:   {MemberAttendance.objects.count()}")
    print(f"   Staff:          {StaffMember.objects.count()}")
    print(f"   StaffAttend:    {StaffAttendance.objects.count()}")
    print(f"   StaffPayments:  {StaffPayment.objects.count()}")
    print(f"   PT Assignments: {TrainerAssignment.objects.count()}")
    print(f"   PT Renewals:    {PTRenewal.objects.count()}")
    print(f"   Equipment:      {Equipment.objects.count()}")
    print(f"   MaintLogs:      {MaintenanceLog.objects.count()}")
    print(f"   Income rows:    {Income.objects.count()}")
    print(f"   Expense rows:   {Expenditure.objects.count()}")
    print(f"   To-Buy items:   {ToBuy.objects.count()}")
    print(f"   Enquiries:      {Enquiry.objects.count()}  ({EnquiryFollowup.objects.count()} followups)")
    print(f"   Notifications:  {Notification.objects.count()}")


if __name__ == "__main__":
    run()
