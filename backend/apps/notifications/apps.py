
import os
import sys

from django.apps import AppConfig
class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.notifications"

    def ready(self):
        if 'runserver' in sys.argv and os.environ.get('RUN_MAIN') == 'true':
            import apps.notifications.signals
            from apps.notifications.scheduler import start
            start()
        
       
        
        
        
        