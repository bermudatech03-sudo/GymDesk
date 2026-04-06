
import os
import sys

from django.apps import AppConfig
class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.notifications"

    def ready(self):
        if 'runserver' not in sys.argv:
            return
        if os.environ.get('RUN_MAIN') != 'true':
            return
        
        import apps.notifications.signals  # noqa: F401  — registers the signal
        from apps.notifications.scheduler import start
        start()