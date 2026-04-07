
from django.apps import AppConfig
class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.notifications"

    def ready(self):
        import apps.notifications.signals  # noqa: F401  — registers the signal
        import sys
        if "runserver" in sys.argv or "gunicorn" in sys.argv[0]:
            from apps.notifications.scheduler import start
            start()