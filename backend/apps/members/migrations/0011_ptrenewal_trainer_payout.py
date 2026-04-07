from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("members", "0010_trainerassignment_pt_dates_ptrenewal"),
    ]

    operations = [
        migrations.AddField(
            model_name="ptrenewal",
            name="trainer_payable_amount",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name="ptrenewal",
            name="trainer_paid",
            field=models.BooleanField(default=False),
        ),
    ]
