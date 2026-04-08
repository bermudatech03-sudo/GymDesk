from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("members", "0011_ptrenewal_trainer_payout"),
    ]

    operations = [
        migrations.AddField(
            model_name="memberpayment",
            name="diet_plan_amount",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
    ]
