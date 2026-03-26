import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "gym_crm.settings")
django.setup()

import random
from datetime import timedelta, date, datetime, time
from decimal import Decimal

from django.utils import timezone

from apps.members.models import (
    MembershipPlan, Member, MemberPayment,
    MemberAttendance, InstallmentPayment,
    DietPlan, Diet
)
from apps.staff.models import (
    StaffMember, StaffShift, StaffAttendance, StaffPayment
)
from apps.finances.models import Income, Expenditure
from apps.equipment.models import Equipment, MaintenanceLog
from apps.notifications.models import Notification


# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
DAYS_BACK = 60


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def rand_date(start, end):
    delta = end - start
    return start + timedelta(days=random.randint(0, delta.days))


def rand_time(start_hour=6, end_hour=21):
    return time(random.randint(start_hour, end_hour), random.choice([0, 15, 30, 45]))


# ─────────────────────────────────────────────
# MAIN SEED FUNCTION
# ─────────────────────────────────────────────
def run():
    print("Seeding data...")

    today = timezone.localdate()
    start_date = today - timedelta(days=DAYS_BACK)

    # ─────────────────────────────
    # 1. PLANS
    # ─────────────────────────────
    plans = [
        ("Basic Plan", 30, 1000, "basic"),
        ("Standard Plan", 90, 2500, "standard"),
        ("Premium Plan", 180, 4500, "premium"),
    ]

    plan_objs = []
    for name, days, price, code in plans:
        p, _ = MembershipPlan.objects.get_or_create(
            name=name,
            defaults={
                "duration_days": days,
                "price": price,
                "plans": code,
            },
        )
        plan_objs.append(p)

    # ─────────────────────────────
    # 2. DIET PLANS
    # ─────────────────────────────
    diet_plans = []
    for i in range(3):
        dp, _ = DietPlan.objects.get_or_create(name=f"Diet Plan {i+1}")
        diet_plans.append(dp)

        for _ in range(5):
            Diet.objects.create(
                plan=dp,
                time=rand_time(),
                food=random.choice(["Rice", "Eggs", "Chicken", "Oats", "Milk"]),
                quantity=Decimal(random.randint(1, 3)),
                calories=random.randint(100, 400),
            )

    # ─────────────────────────────
    # 3. MEMBERS
    # ─────────────────────────────
    members = []
    for i in range(25):
        join = rand_date(start_date, today)
        plan = random.choice(plan_objs)

        m = Member.objects.create(
            name=f"Member {i}",
            phone=f"90000{i:05}",
            plan=plan,
            diet=random.choice(diet_plans),
            join_date=join,
            renewal_date=join + timedelta(days=plan.duration_days),
        )
        members.append(m)

    # ─────────────────────────────
    # 4. PAYMENTS + INSTALLMENTS
    # ─────────────────────────────
    for m in members:
        plan = m.plan
        if not plan:
            continue

        base = Decimal(plan.price)
        gst_rate = Decimal("18")
        gst_amount = (base * gst_rate) / 100
        total = base + gst_amount

        mp = MemberPayment.objects.create(
            member=m,
            plan=plan,
            plan_price=base,
            gst_rate=gst_rate,
            gst_amount=gst_amount,
            total_with_gst=total,
            amount_paid=0,
            valid_from=m.join_date,
            valid_to=m.renewal_date,
        )

        # simulate installments
        paid = Decimal(random.randint(0, int(total)))
        mp.amount_paid = paid
        mp.save()

        if paid > 0:
            InstallmentPayment.objects.create(
                payment=mp,
                member=m,
                amount=paid,
                balance_after=mp.balance,
            )

    # ─────────────────────────────
    # 5. MEMBER ATTENDANCE
    # ─────────────────────────────
    for m in members:
        for _ in range(random.randint(10, 25)):
            d = rand_date(start_date, today)

            MemberAttendance.objects.create(
                member=m,
                date=d,
                check_in=rand_time(6, 10),
                check_out=rand_time(16, 21),
            )

    # ─────────────────────────────
    # 6. STAFF + SHIFTS
    # ─────────────────────────────
    shift, _ = StaffShift.objects.get_or_create(
        name="Morning",
        defaults={"start_time": time(6, 0), "end_time": time(14, 0)},
    )

    staff_list = []
    for i in range(8):
        s = StaffMember.objects.create(
            name=f"Staff {i}",
            phone=f"80000{i:05}",
            role=random.choice(["trainer", "receptionist"]),
            salary=random.randint(10000, 30000),
            shift_template=shift,
        )
        staff_list.append(s)

    # attendance
    for s in staff_list:
        used_dates = set()
        for _ in range(20):
            d = rand_date(start_date, today)
            if d in used_dates:
                continue
            used_dates.add(d)
            StaffAttendance.objects.create(
                staff=s,
                date=d,
                check_in=time(6, random.randint(0, 30)),
                check_out=time(14, random.randint(0, 30)),
            )

    # payments
    for s in staff_list:
        StaffPayment.objects.create(
            staff=s,
            month=today.replace(day=1),
            amount=s.salary,
            status="paid",
            paid_date=today,
        )

    # ─────────────────────────────
    # 7. EQUIPMENT
    # ─────────────────────────────
    equipments = []
    for i in range(10):
        eq = Equipment.objects.create(
            name=f"Equipment {i}",
            category=random.choice(["cardio", "strength"]),
            quantity=random.randint(1, 5),
            condition=random.choice(["good", "fair"]),
        )
        equipments.append(eq)

        MaintenanceLog.objects.create(
            equipment=eq,
            description="Routine check",
            cost=random.randint(100, 1000),
        )

    # ─────────────────────────────
    # 8. FINANCE
    # ─────────────────────────────
    for _ in range(40):
        d = rand_date(start_date, today)

        Income.objects.create(
            source="Membership",
            amount=random.randint(500, 3000),
            base_amount=1000,
            gst_rate=18,
            gst_amount=180,
            date=d,
        )

        Expenditure.objects.create(
            category=random.choice(["salary", "maintenance", "rent"]),
            description="Expense",
            amount=random.randint(500, 5000),
            date=d,
        )

    # ─────────────────────────────
    # 9. NOTIFICATIONS
    # ─────────────────────────────
    for m in members[:10]:
        Notification.objects.create(
            recipient_name=m.name,
            recipient_phone=m.phone,
            message="Your membership is expiring soon",
            trigger_type="renewal_remind",
            status=random.choice(["sent", "pending"]),
        )

    print("✅ Seeding complete!")


if __name__ == "__main__":
    run()