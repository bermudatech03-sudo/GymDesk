from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('members', '0005_restore_trainerassignment_related_names'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='membershipplan',
            name='plans',
        ),
        migrations.AddField(
            model_name='member',
            name='plan_type',
            field=models.CharField(
                choices=[('basic', 'Basic'), ('standard', 'Standard'), ('premium', 'Premium')],
                default='basic',
                max_length=20,
            ),
        ),
    ]
