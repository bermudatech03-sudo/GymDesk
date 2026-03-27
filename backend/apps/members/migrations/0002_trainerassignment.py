import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("members", "0001_initial"),
        ("staff", "0001_initial"),
    ]

    operations = [
        # Add personal_trainer field that was missing from initial migration
        migrations.AddField(
            model_name="membershipplan",
            name="personal_trainer",
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name="TrainerAssignment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("startingtime", models.TimeField()),
                ("endingtime", models.TimeField()),
                ("working_days", models.CharField(default="0,1,2,3,4,5,6", max_length=20)),
                ("assigned_at", models.DateTimeField(auto_now_add=True)),
                (
                    "member",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="trainer_assignments",
                        to="members.member",
                    ),
                ),
                (
                    "trainer",
                    models.ForeignKey(
                        limit_choices_to={"role": "trainer"},
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="member_assignments",
                        to="staff.staffmember",
                    ),
                ),
                (
                    "plan",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="members.membershipplan",
                    ),
                ),
            ],
            options={
                "ordering": ["-assigned_at"],
            },
        ),
        migrations.AlterUniqueTogether(
            name="trainerassignment",
            unique_together={("member", "trainer", "startingtime")},
        ),
    ]
