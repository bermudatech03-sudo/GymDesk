
import os
import sys

from django.apps import AppConfig
class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.notifications"

    def ready(self):
        import apps.notifications.signals
        import sys
        if 'migrate' not in sys.argv and 'makemigrations' not in sys.argv:
            from apps.notifications.scheduler import start
            start()

        
       
        
        
        
        