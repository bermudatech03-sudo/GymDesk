import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "gym_crm.settings")
django.setup()

import random
from datetime import timedelta, date, time
from decimal import Decimal

from django.utils import timezone

from apps.members.models import (
    MembershipPlan, Member, MemberPayment,
    MemberAttendance, InstallmentPayment,
    DietPlan, Diet, TrainerAssignment
)
from apps.staff.models import (
    StaffMember, StaffShift, StaffAttendance, StaffPayment
)
from apps.finances.models import Income, Expenditure, ToBuy
from apps.equipment.models import Equipment, MaintenanceLog
from apps.notifications.models import Notification


# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
DAYS_BACK = 90


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def rand_date(start, end):
    delta = end - start
    return start + timedelta(days=random.randint(0, delta.days))


def rand_time(start_hour=6, end_hour=21):
    return time(random.randint(start_hour, end_hour), random.choice([0, 15, 30, 45]))


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
]

STAFF_NAMES = [
    ("Arun Kumar",      "trainer",      "morning", 28000),
    ("Sunita Sharma",   "receptionist", "morning", 18000),
    ("Vijay Menon",     "trainer",      "evening", 30000),
    ("Rekha Nair",      "receptionist", "evening", 17000),
    ("Manoj Tiwari",    "cleaner",      "morning", 12000),
    ("Geeta Pillai",    "cleaner",      "evening", 12000),
    ("Ravi Bhandari",   "manager",      "full",    40000),
    ("Sonal Desai",     "trainer",      "morning", 26000),
    ("Prakash Verma",   "trainer",      "evening", 27000),
    ("Lata Khanna",     "receptionist", "full",    19000),
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
    ("Treadmill",           "cardio",       "LifeFitness",  "T5",   "good",     3, 85000),
    ("Elliptical Trainer",  "cardio",       "Precor",       "EFX",  "excellent",2, 60000),
    ("Stationary Cycle",    "cardio",       "Schwinn",      "AC25", "good",     4, 25000),
    ("Rowing Machine",      "cardio",       "Concept2",     "D",    "excellent",2, 55000),
    ("Bench Press",         "strength",     "Technogym",    "BP10", "good",     3, 30000),
    ("Squat Rack",          "strength",     "Powertec",     "SR5",  "good",     2, 45000),
    ("Lat Pulldown",        "strength",     "LifeFitness",  "LP90", "fair",     2, 35000),
    ("Cable Crossover",     "strength",     "Cybex",        "CC7",  "good",     1, 90000),
    ("Dumbbell Set",        "free_weights", "Decathlon",    "Pro",  "good",     5, 40000),
    ("Barbell Set",         "free_weights", "York",         "OB6",  "fair",     3, 20000),
    ("Kettlebell Set",      "free_weights", "Rogue",        "KB-S", "excellent",4, 15000),
    ("Yoga Mat",            "flexibility",  "Adidas",       "YM3",  "good",     15, 800),
    ("Resistance Bands",    "accessories",  "TheraBand",    "RB5",  "good",     10, 500),
    ("Pull-up Bar",         "strength",     "Generic",      "PB1",  "fair",     2, 3000),
    ("Leg Press Machine",   "strength",     "LifeFitness",  "LP55", "good",     1, 75000),
]

FINANCE_INCOME_NOTES = [
    "Monthly membership fee", "New enrollment", "Plan renewal",
    "Personal training session", "Locker rental", "Merchandise sale",
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


# ─────────────────────────────────────────────
# MAIN SEED FUNCTION
# ─────────────────────────────────────────────
def run():
    print("Seeding data...")

    today = timezone.localdate()
    start_date = today - timedelta(days=DAYS_BACK)

    # ─────────────────────────────
    # 1. MEMBERSHIP PLANS
    # ─────────────────────────────
    plans_data = [
        ("Basic Plan",          30,  1000, "basic",    False, "Access to gym floor and basic equipment."),
        ("Standard Plan",       90,  2500, "standard", False, "Includes group fitness classes and locker access."),
        ("Premium Plan",        180, 4500, "premium",  False, "Full access including sauna and diet consultation."),
        ("PT Basic Plan",       30,  2500, "basic",    True,  "Personal trainer included — 3 sessions/week."),
        ("PT Premium Plan",     180, 8000, "premium",  True,  "Personal trainer included — 5 sessions/week with diet plan."),
    ]

    plan_objs = []
    for name, days, price, code, pt, desc in plans_data:
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

    pt_plans    = [p for p in plan_objs if "PT" in p.name]
    no_pt_plans = [p for p in plan_objs if "PT" not in p.name]

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
            "working_days": "0,1,2,3,4,5",
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
            "working_days": "0,1,2,3,4,5",
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
            "working_days": "0,1,2,3,4,5,6",
            "late_grace_minutes": 15,
            "overtime_threshold_minutes": 30,
        },
    )
    shift_map = {"morning": shift_morning, "evening": shift_evening, "full": shift_full}

    # ─────────────────────────────
    # 4. STAFF MEMBERS
    # ─────────────────────────────
    staff_list = []
    for idx, (name, role, shift_key, salary) in enumerate(STAFF_NAMES):
        phone = f"8{idx:09}"
        s, _ = StaffMember.objects.get_or_create(
            phone=phone,
            defaults={
                "name": name,
                "role": role,
                "shift": shift_key,
                "shift_template": shift_map[shift_key],
                "salary": Decimal(salary),
                "join_date": rand_date(start_date, today - timedelta(days=30)),
                "status": "active",
            },
        )
        staff_list.append(s)

    trainer_staff = [s for s in staff_list if s.role == "trainer"]

    # staff attendance
    shift_time_map = {
        "morning": (time(6, 0),  time(14, 0)),
        "evening": (time(14, 0), time(22, 0)),
        "full":    (time(8, 0),  time(20, 0)),
    }
    for s in staff_list:
        base_in, base_out = shift_time_map.get(s.shift, (time(6, 0), time(14, 0)))
        used_dates = set()
        for _ in range(40):
            d = rand_date(start_date, today)
            if d in used_dates:
                continue
            used_dates.add(d)
            late_mins = random.choice([0, 0, 0, 5, 10, 20])
            actual_in = time(base_in.hour, base_in.minute + late_mins) if base_in.minute + late_mins < 60 else base_in
            status = "late" if late_mins > 15 else "present"
            StaffAttendance.objects.create(
                staff=s,
                date=d,
                check_in=actual_in,
                check_out=base_out,
                status=status,
            )

    # staff payments — last 3 months
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
    # 5. MEMBERS
    # ─────────────────────────────
    members = []
    genders = ["Male", "Female", "Other"]
    food_types = ["veg", "nonveg", "vegan"]

    for idx, full_name in enumerate(MEMBER_NAMES):
        phone = f"9{idx:09}"
        wants_pt = random.random() < 0.3
        plan = random.choice(pt_plans if wants_pt else no_pt_plans)
        join = rand_date(start_date, today - timedelta(days=10))

        # some members expired, some active
        if random.random() < 0.15:
            join = today - timedelta(days=plan.duration_days + random.randint(5, 30))
            status = "expired"
        else:
            status = "active"

        food_type = random.choice(food_types)
        diet = next((dp for dp in diet_plan_objs if food_type in dp.foodType), diet_plan_objs[0])

        plan_type = "premium" if "Premium" in plan.name else ("standard" if "Standard" in plan.name else "basic")

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
                "address": f"Flat {random.randint(1,50)}, Sector {random.randint(1,20)}, City",
            },
        )
        members.append(m)

    # ─────────────────────────────
    # 6. MEMBER PAYMENTS + INSTALLMENTS
    # ─────────────────────────────
    for m in members:
        plan = m.plan
        if not plan:
            continue

        base = Decimal(plan.price)
        gst_rate = Decimal("18")
        gst_amount = (base * gst_rate / 100).quantize(Decimal("0.01"))
        total = base + gst_amount

        pay_scenario = random.choices(["full", "partial", "pending"], weights=[60, 25, 15])[0]
        if pay_scenario == "full":
            paid = total
        elif pay_scenario == "partial":
            paid = (total * Decimal(random.randint(30, 80)) / 100).quantize(Decimal("0.01"))
        else:
            paid = Decimal("0")

        mp, created = MemberPayment.objects.get_or_create(
            member=m,
            valid_from=m.join_date,
            defaults={
                "plan": plan,
                "plan_price": base,
                "gst_rate": gst_rate,
                "gst_amount": gst_amount,
                "total_with_gst": total,
                "amount_paid": paid,
                "balance": total - paid,
                "valid_to": m.renewal_date,
                "status": pay_scenario if pay_scenario != "full" else "paid",
            },
        )

        if created and paid > 0:
            InstallmentPayment.objects.create(
                payment=mp,
                member=m,
                installment_type="enrollment",
                amount=paid,
                balance_after=total - paid,
                paid_date=m.join_date,
                mode_of_payment=random.choice(["cash", "upi", "card"]),
            )

    # ─────────────────────────────
    # 7. MEMBER ATTENDANCE
    # ─────────────────────────────
    for m in members:
        if m.status == "expired":
            attend_start = m.join_date
            attend_end = m.renewal_date
        else:
            attend_start = m.join_date
            attend_end = today

        if attend_end <= attend_start:
            continue

        used_dates = set()
        for _ in range(random.randint(15, 35)):
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
    # 8. TRAINER ASSIGNMENTS
    # ─────────────────────────────
    pt_members = [m for m in members if m.personal_trainer and m.status == "active"]
    for m in pt_members:
        trainer = random.choice(trainer_staff)
        start_h = random.choice([6, 7, 8, 16, 17, 18])
        TrainerAssignment.objects.get_or_create(
            member=m,
            trainer=trainer,
            defaults={
                "plan": m.plan,
                "startingtime": time(start_h, 0),
                "endingtime": time(start_h + 1, 0),
                "working_days": random.choice(["1,3,5", "0,2,4", "1,2,3,4,5"]),
            },
        )

    # ─────────────────────────────
    # 9. EQUIPMENT + MAINTENANCE
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
    # 10. FINANCES
    # ─────────────────────────────
    income_categories = ["membership", "personal_training", "merchandise", "locker", "other"]
    income_category_weights = [60, 20, 10, 7, 3]

    for d_offset in range(DAYS_BACK):
        d = today - timedelta(days=d_offset)

        # 1-3 income entries per day
        for _ in range(random.randint(1, 3)):
            cat = random.choices(income_categories, weights=income_category_weights)[0]
            base = Decimal(random.randint(500, 8000))
            gst_rate = Decimal("18")
            gst_amt = (base * gst_rate / 100).quantize(Decimal("0.01"))
            Income.objects.create(
                source=cat.replace("_", " ").title(),
                category=cat,
                base_amount=base,
                gst_rate=gst_rate,
                gst_amount=gst_amt,
                amount=base + gst_amt,
                date=d,
                notes=random.choice(FINANCE_INCOME_NOTES),
            )

        # occasional expenses
        if random.random() < 0.4:
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
    # 11. TO-BUY LIST
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
    # 12. NOTIFICATIONS
    # ─────────────────────────────
    expiring_members = [m for m in members if m.renewal_date and (m.renewal_date - today).days <= 7]
    expired_members  = [m for m in members if m.status == "expired"]
    recent_members   = sorted(members, key=lambda m: m.join_date, reverse=True)[:8]

    for m in expiring_members:
        Notification.objects.get_or_create(
            recipient_phone=m.phone,
            trigger_type="renewal_remind",
            defaults={
                "recipient_name": m.name,
                "channel": "whatsapp",
                "message": f"Hi {m.name.split()[0]}, your membership expires on {m.renewal_date}. Renew now to continue your fitness journey!",
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
                "message": f"Hi {m.name.split()[0]}, your membership has expired. Visit us to renew and get back on track!",
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
                "message": f"Welcome to the gym, {m.name.split()[0]}! Your {m.plan.name if m.plan else 'membership'} is now active. Let's crush those goals!",
                "status": "sent",
                "sent_at": timezone.now(),
            },
        )

    print("Seeding complete!")
    print(f"   Plans:         {MembershipPlan.objects.count()}")
    print(f"   Diet Plans:    {DietPlan.objects.count()}")
    print(f"   Members:       {Member.objects.count()}")
    print(f"   Staff:         {StaffMember.objects.count()}")
    print(f"   Equipment:     {Equipment.objects.count()}")
    print(f"   Income rows:   {Income.objects.count()}")
    print(f"   Expense rows:  {Expenditure.objects.count()}")
    print(f"   Notifications: {Notification.objects.count()}")
    print(f"   To-Buy items:  {ToBuy.objects.count()}")


if __name__ == "__main__":
    run()
