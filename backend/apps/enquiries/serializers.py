from rest_framework import serializers
from .models import Enquiry, EnquiryFollowup


class EnquiryFollowupSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EnquiryFollowup
        fields = ["id", "scheduled_date", "sent", "sent_at"]


class EnquirySerializer(serializers.ModelSerializer):
    followups         = EnquiryFollowupSerializer(many=True, read_only=True)
    followups_pending = serializers.SerializerMethodField()
    followups_sent    = serializers.SerializerMethodField()

    class Meta:
        model  = Enquiry
        fields = "__all__"

    def get_followups_pending(self, obj):
        return obj.followups.filter(sent=False).count()

    def get_followups_sent(self, obj):
        return obj.followups.filter(sent=True).count()
