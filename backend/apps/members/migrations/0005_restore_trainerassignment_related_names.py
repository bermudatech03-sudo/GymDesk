import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('members', '0004_member_personal_trainer'),
        ('staff', '0001_initial'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='trainerassignment',
            options={'ordering': ['-assigned_at']},
        ),
        migrations.AlterField(
            model_name='trainerassignment',
            name='member',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='trainer_assignments',
                to='members.member',
            ),
        ),
        migrations.AlterField(
            model_name='trainerassignment',
            name='trainer',
            field=models.ForeignKey(
                limit_choices_to={'role': 'trainer'},
                on_delete=django.db.models.deletion.CASCADE,
                related_name='member_assignments',
                to='staff.staffmember',
            ),
        ),
        migrations.AlterUniqueTogether(
            name='trainerassignment',
            unique_together={('member', 'trainer')},
        ),
    ]
