from decimal import Decimal
from django.conf import settings


def get_gst_rate():
    return Decimal(str(getattr(settings, "GST_RATE", 18)))


def calc_gst(base_amount):
    """
    Given a base amount (excluding GST), return (base, gst_amount, total).
    If GST_RATE is 0, all amounts equal base.
    """
    base    = Decimal(str(base_amount))
    rate    = get_gst_rate()
    gst_amt = (base * rate / 100).quantize(Decimal("0.01"))
    total   = base + gst_amt
    return base, gst_amt, total, float(rate)


def calc_gst_from_total(total_amount):
    """
    Given a total (GST-inclusive), back-calculate base and GST.
    base = total / (1 + rate/100)
    """
    total   = Decimal(str(total_amount))
    rate    = get_gst_rate()
    if rate == 0:
        return total, Decimal("0"), total, float(rate)
    base    = (total / (1 + rate / 100)).quantize(Decimal("0.01"))
    gst_amt = total - base
    return base, gst_amt, total, float(rate)


def make_invoice_number(member_id, date):
    return f"INV-{date.year}{date.month:02d}-M{member_id:04d}"