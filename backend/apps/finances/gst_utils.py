from decimal import Decimal, ROUND_HALF_UP


def get_setting(key, default=""):
    """Read a GymSetting value from the DB. Falls back to default if not found."""
    try:
        from apps.finances.models import GymSetting
        obj = GymSetting.objects.filter(key=key).first()
        return obj.value if obj else default
    except Exception:
        return default


def is_notify_enabled(setting_key):
    """Return True if the WhatsApp notification toggle is on (default: True)."""
    return get_setting(setting_key, "true").lower() not in ("false", "0", "no")


def get_gst_rate():
    return Decimal(get_setting("GST_RATE", "18"))


def get_pt_payable_percent():
    return Decimal(get_setting("PT_PAYABLE_PERCENT", "100"))


def get_diet_plan_amount():
    return Decimal(get_setting("DIET_PLAN_AMOUNT", "0"))


def calc_gst(base_price):
    """
    Given a base amount (excluding GST), return (base, gst_amount, total, rate).
    If GST_RATE is 0, all amounts equal base.
    """
    base    = Decimal(str(base_price))
    rate    = get_gst_rate()
    gst_amt = (base * rate / 100).quantize(Decimal("0.01"), ROUND_HALF_UP)
    total   = base + gst_amt
    return base, gst_amt, total, float(rate)


def calc_gst_from_total(total_amount):
    """
    Given a total (GST-inclusive), back-calculate base and GST.
    """
    total = Decimal(str(total_amount))
    rate  = get_gst_rate()
    if rate == 0:
        return total, Decimal("0"), total, float(rate)
    base    = (total / (1 + rate / 100)).quantize(Decimal("0.01"), ROUND_HALF_UP)
    gst_amt = total - base
    return base, gst_amt, total, float(rate)


def get_gym_info():
    """Return gym details from GymSetting DB table."""
    return {
        "name":    get_setting("GYM_NAME",    "Gym"),
        "address": get_setting("GYM_ADDRESS", ""),
        "phone":   get_setting("GYM_PHONE",   ""),
        "email":   get_setting("GYM_EMAIL",   ""),
        "gstin":   get_setting("GYM_GSTIN",   ""),
    }


def make_invoice_number(member_id, date):
    return f"INV-{date.year}{date.month:02d}-M{member_id:04d}"
