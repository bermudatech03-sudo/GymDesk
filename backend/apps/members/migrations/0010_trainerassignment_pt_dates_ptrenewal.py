from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("members", "0009_trainer_fee_paid"),
        ("staff",   "0001_initial"),
    ]

    operations = [
        # 1. Add pt_start_date and pt_end_date to TrainerAssignment
        migrations.AddField(
            model_name="trainerassignment",
            name="pt_start_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="trainerassignment",
            name="pt_end_date",
            field=models.DateField(blank=True, null=True),
        ),
        # 2. Create PTRenewal model
        migrations.CreateModel(
            name="PTRenewal",
            fields=[
                ("id",              models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("assignment",      models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="pt_renewals", to="members.trainerassignment")),
                ("member",          models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="pt_renewals", to="members.member")),
                ("trainer",         models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="pt_renewals_as_trainer", to="staff.staffmember")),
                ("pt_start_date",   models.DateField()),
                ("pt_end_date",     models.DateField()),
                ("pt_days",         models.PositiveIntegerField()),
                ("base_amount",     models.DecimalField(decimal_places=2, max_digits=10)),
                ("gst_rate",        models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ("gst_amount",      models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("total_amount",    models.DecimalField(decimal_places=2, max_digits=10)),
                ("amount_paid",     models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("mode_of_payment", models.CharField(choices=[("cash","Cash"),("card","Card"),("upi","UPI"),("other","Other")], default="cash", max_length=10)),
                ("invoice_number",  models.CharField(blank=True, max_length=80)),
                ("status",          models.CharField(choices=[("paid","Paid"),("partial","Partial"),("pending","Pending")], default="pending", max_length=10)),
                ("paid_date",       models.DateField(default=django.utils.timezone.localdate)),
                ("notes",           models.TextField(blank=True)),
                ("created_at",      models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
