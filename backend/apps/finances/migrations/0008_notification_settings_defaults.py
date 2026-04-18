from django.db import migrations

NOTIFY_DEFAULTS = [
    ("NOTIFY_ENROLLMENT",      "true"),
    ("NOTIFY_RENEWAL_CONFIRM", "true"),
    ("NOTIFY_RENEWAL_REMIND",  "true"),
    ("NOTIFY_EXPIRY",          "true"),
    ("NOTIFY_ABSENT",          "true"),
    ("NOTIFY_STAFF_ABSENT",    "true"),
    ("NOTIFY_DIET_REMINDER",   "true"),
    ("NOTIFY_ENQUIRY_FOLLOWUP","true"),
    ("NOTIFY_NEW_PLAN",        "true"),
    ("NOTIFY_PT_RENEWAL",      "true"),
    ("NOTIFY_DAILY_NOTICE",    "true"),
]


def seed_defaults(apps, schema_editor):
    GymSetting = apps.get_model("finances", "GymSetting")
    for key, value in NOTIFY_DEFAULTS:
        GymSetting.objects.get_or_create(key=key, defaults={"value": value})


def remove_defaults(apps, schema_editor):
    GymSetting = apps.get_model("finances", "GymSetting")
    GymSetting.objects.filter(key__in=[k for k, _ in NOTIFY_DEFAULTS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("finances", "0007_alter_expenditure_amount"),
    ]

    operations = [
        migrations.RunPython(seed_defaults, remove_defaults),
    ]
