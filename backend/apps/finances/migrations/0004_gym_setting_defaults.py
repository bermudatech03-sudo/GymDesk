from django.db import migrations

DEFAULTS = [
    ("GST_RATE",           "18"),
    ("GYM_NAME",           "Light Weight Fitness Gym"),
    ("GYM_ADDRESS",        "Chennai, Tamil Nadu — India"),
    ("GYM_PHONE",          "+91 97907 28732"),
    ("GYM_EMAIL",          "bermudatech@gmail.com"),
    ("GYM_GSTIN",          "33AAAAA0000A1Z5"),
    ("PT_PAYABLE_PERCENT", "100"),
]


def seed_defaults(apps, schema_editor):
    GymSetting = apps.get_model("finances", "GymSetting")
    for key, value in DEFAULTS:
        GymSetting.objects.get_or_create(key=key, defaults={"value": value})


def remove_defaults(apps, schema_editor):
    GymSetting = apps.get_model("finances", "GymSetting")
    GymSetting.objects.filter(key__in=[k for k, _ in DEFAULTS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("finances", "0003_gym_setting"),
    ]

    operations = [
        migrations.RunPython(seed_defaults, remove_defaults),
    ]
