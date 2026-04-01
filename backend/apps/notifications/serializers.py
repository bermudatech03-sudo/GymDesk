
from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"


'''
API call / any trigger
       ↓
  send_notification()        ← utils.py: builds message, normalises phone
       ↓
  Notification.objects.create(status="pending")
       ↓
  post_save signal fires     ← signals.py: calls send_whatsapp_message()
       ↓
  Meta Cloud API             ← whatsapp.py: POST to graph.facebook.com
       ↓
  queryset.update(status="sent" / "failed")   ← no signal loop

'''