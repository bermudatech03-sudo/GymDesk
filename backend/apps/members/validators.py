import re
from rest_framework import serializers

def is_valid_phone(value):
    if not re.fullmatch(r"[6-9]\d{9}", value):
        raise serializers.ValidationError("Invalid phone number")
    return value

def is_valid_domain(email):
    try:
        if email:
            domain = email.split('@')[1]
            if domain == "gmail.com":
                return True
            elif domain == "yahoo.com":
                return True
        elif not email:
            return True
    except:
        print("came here")
        return False