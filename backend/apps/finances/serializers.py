from rest_framework import serializers
from .models import Income, Expenditure

class IncomeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Income
        fields = "__all__"

class ExpenditureSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Expenditure
        fields = "__all__"