from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0004_notification_retry_count_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="notification",
            name="template_name",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="notification",
            name="template_params",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="notification",
            name="language_code",
            field=models.CharField(blank=True, default="en", max_length=10),
        ),
    ]
