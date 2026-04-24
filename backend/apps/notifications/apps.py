
import os
import sys

from django.apps import AppConfig
class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.notifications"
    def ready(self):
        import apps.notifications.signals
        if "test" in sys.argv:
            return
        
        if 'migrate' not in sys.argv and 'makemigrations' not in sys.argv and 'createsuperuser' not in sys.argv and not any('seed_data' in arg for arg in sys.argv):
            from apps.notifications.scheduler import start
            start()

        
       
        
        
        
        