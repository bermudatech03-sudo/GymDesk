import io
import requests
import logging
from django.conf import settings
from xhtml2pdf import pisa

logger = logging.getLogger(__name__)


def send_whatsapp_message(to: str, message: str) -> dict:
    """
    Send a WhatsApp text message via Meta Cloud API.
    `to` must include country code with no + or spaces, e.g. "919876543210"
    """
    access_token    = settings.META_WHATSAPP_ACCESS_TOKEN
    phone_number_id = settings.META_WHATSAPP_PHONE_NUMBER_ID
    logger.error(f"access token : {access_token} , phonenumber : {phone_number_id} , to : {to}")
    if not access_token or not phone_number_id:
        logger.error("META_WHATSAPP_ACCESS_TOKEN or META_WHATSAPP_PHONE_NUMBER_ID is not set in .env")
        return {"success": False, "error": "Missing WhatsApp credentials in environment."}

    # to = to[2:]

    url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": message},
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        logger.error(f"Meta API response status: {response.status_code}")
        logger.error(f"Meta API response body: {response.json()}")  # ADD THIS

        return {"success": True, "data": response.json()}
    except requests.exceptions.HTTPError as e:
        logger.error(f"Meta WhatsApp HTTP error: {e.response.text}")
        return {"success": False, "error": e.response.text}
    except requests.exceptions.RequestException as e:
        logger.error(f"Meta WhatsApp request failed: {e}")
        return {"success": False, "error": str(e)}


_BILL_CSS = """
@page { size: A4; margin: 15mm; }
body  { font-family: Helvetica, Arial, sans-serif; color: #111; font-size: 11px; }
.header { background: #1a1a2e; color: #fff; padding: 18px; text-align: center; }
.gym-name { font-size: 20px; font-weight: bold; letter-spacing: 1px; }
.gym-sub  { font-size: 10px; color: #cfcfe0; margin-top: 4px; }
.gym-gstin{ display: inline-block; margin-top: 6px; background: #2a2a4e; color: #a8ff57;
            border: 1px solid #a8ff57; padding: 2px 10px; font-size: 9px; font-weight: bold; }
.doc-title { background: #a8ff57; color: #08080a; text-align: center; padding: 8px;
             font-size: 12px; font-weight: bold; letter-spacing: 3px; }
.body-pad { padding: 14px 4px 4px 4px; }
.meta { width: 100%; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 10px; }
.meta td { vertical-align: top; }
.inv-no   { font-size: 12px; font-weight: bold; color: #444; }
.inv-date { font-size: 10px; color: #888; }
.badge { display: inline-block; padding: 3px 12px; font-size: 10px; font-weight: bold;
         letter-spacing: 1px; border: 1px solid; }
.s-paid    { background: #e8fff0; color: #1a7a00; border-color: #b0e0c0; }
.s-partial { background: #fff8e0; color: #a06000; border-color: #e0c070; }
.s-pending { background: #fff0f0; color: #cc0000; border-color: #f0c0c0; }
.section-label { font-size: 9px; font-weight: bold; text-transform: uppercase;
                 letter-spacing: 1px; color: #888; margin-bottom: 4px; }
.member-card { background: #f9f9f9; padding: 10px 12px; margin-bottom: 10px; }
.member-name { font-size: 15px; font-weight: bold; color: #111; }
.member-meta { font-size: 10px; color: #666; margin-top: 3px; }
.member-id   { background: #e8f0ff; color: #1a3a9a; padding: 1px 6px;
               font-family: monospace; font-size: 10px; font-weight: bold; }
.plan-box { background: #f0fff4; border: 1px solid #c0e8c0; padding: 10px 12px; margin-bottom: 10px; }
.plan-name { font-size: 12px; font-weight: bold; color: #1a5a00; }
.plan-dates { font-size: 10px; color: #4a7a4a; margin-top: 3px; }
.billing-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
.billing-table td { padding: 6px 4px; border-bottom: 1px solid #f0f0f0; font-size: 11px; }
.billing-table .lbl { color: #555; }
.billing-table .val { text-align: right; }
.b-gst .val   { color: #e05000; }
.b-total      { background: #f4f4f4; }
.b-total .lbl { font-size: 12px; font-weight: bold; color: #111; }
.b-total .val { font-size: 14px; font-weight: bold; color: #111; }
.b-paid .val  { color: #1a7a00; font-weight: bold; }
.b-bal  .val  { color: #cc0000; font-weight: bold; }
.partial-note { background: #fffbf0; border: 1px solid #f0e0a0; padding: 8px 12px;
                margin-bottom: 10px; font-size: 10px; color: #8a6000; }
.ctable { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 4px; }
.ctable th { background: #1a1a2e; color: #fff; padding: 6px; text-align: left;
             font-size: 10px; font-weight: bold; }
.ctable td { padding: 5px 6px; border-bottom: 1px solid #eee; }
.ctable .num { text-align: right; }
.ctable .paid { color: #1a7a00; font-weight: bold; }
.ctable .bal  { color: #cc5500; }
.footer { text-align: center; padding: 12px; border-top: 1px solid #eee;
          font-size: 9px; color: #999; margin-top: 14px; }
.footer strong { color: #555; }
"""


def _bill_status_badge(bill: dict) -> str:
    balance = float(bill.get("balance") or 0)
    paid    = float(bill.get("amount_paid") or 0)
    if balance <= 0 and paid > 0:
        return '<span class="badge s-paid">&#10003; FULLY PAID</span>'
    if paid > 0:
        return '<span class="badge s-partial">&#9888; PARTIAL PAYMENT</span>'
    return '<span class="badge s-pending">&#9203; PENDING</span>'


def _fmt_money(val) -> str:
    try:
        return f"{float(val or 0):,.2f}"
    except (TypeError, ValueError):
        return "0.00"


def _build_bill_html(bill: dict) -> str:
    """
    Build the HTML bill, mirroring MemberBill.jsx layout but simplified for xhtml2pdf
    (table-based layout, no flexbox/gradients).
    """
    gym_name    = bill.get("gym_name") or "Gym"
    gym_address = bill.get("gym_address") or ""
    gym_phone   = bill.get("gym_phone") or ""
    gym_email   = bill.get("gym_email") or ""
    gym_gstin   = bill.get("gym_gstin") or ""

    gst_rate    = float(bill.get("gst_rate") or 0)
    has_gst     = gst_rate > 0
    balance     = float(bill.get("balance") or 0)
    amount_paid = float(bill.get("amount_paid") or 0)

    # Gym header block
    contact_parts = []
    if gym_phone: contact_parts.append(gym_phone)
    if gym_email: contact_parts.append(gym_email)
    contact_line = " | ".join(contact_parts)

    header_html = f"""
    <div class="header">
      <div class="gym-name">{gym_name}</div>
      <div class="gym-sub">
        {gym_address}{'<br/>' if gym_address else ''}
        {contact_line}
      </div>
      {f'<div class="gym-gstin">GSTIN: {gym_gstin}</div>' if gym_gstin else ''}
    </div>
    """

    # Meta row
    meta_html = f"""
    <table class="meta" cellpadding="0" cellspacing="0"><tr>
      <td>
        <div class="inv-no">Invoice: {bill.get('invoice_number', '—')}</div>
        <div class="inv-date">Date: {bill.get('date', '')}</div>
      </td>
      <td style="text-align: right;">{_bill_status_badge(bill)}</td>
    </tr></table>
    """

    # Member card
    member_html = f"""
    <div class="member-card">
      <div class="section-label">Member</div>
      <div class="member-name">{bill.get('member_name', '')}</div>
      <div class="member-meta">
        ID: <span class="member-id">{bill.get('member_id', '')}</span>
        {f" &nbsp;|&nbsp; {bill.get('phone', '')}" if bill.get('phone') else ''}
        {f"<br/>{bill.get('email', '')}" if bill.get('email') else ''}
      </div>
    </div>
    """

    # Plan box
    plan_html = ""
    if bill.get("plan_name"):
        plan_html = f"""
        <div class="plan-box">
          <div class="section-label">Membership Plan</div>
          <div class="plan-name">{bill.get('plan_name', '')}</div>
          <div class="plan-dates">
            Duration: {bill.get('plan_duration', '')} days<br/>
            Valid From: {bill.get('valid_from', '')} &nbsp;&rarr;&nbsp; Valid To: {bill.get('valid_to', '')}
          </div>
        </div>
        """

    # Billing breakdown
    gst_row = ""
    if has_gst:
        half = gst_rate / 2
        gst_row = f"""
        <tr class="b-gst">
          <td class="lbl">GST @ {gst_rate}% (CGST {half}% + SGST {half}%)</td>
          <td class="val">&#8377;{_fmt_money(bill.get('gst_amount'))}</td>
        </tr>
        """

    bal_row = ""
    if balance > 0:
        bal_row = f"""
        <tr class="b-bal">
          <td class="lbl">Balance Remaining</td>
          <td class="val">&#8377;{_fmt_money(balance)}</td>
        </tr>
        """

    billing_html = f"""
    <div class="section-label">Invoice Breakdown</div>
    <table class="billing-table" cellpadding="0" cellspacing="0">
      <tr>
        <td class="lbl">Membership Fee (Base)</td>
        <td class="val">&#8377;{_fmt_money(bill.get('plan_price'))}</td>
      </tr>
      {gst_row}
      <tr class="b-total">
        <td class="lbl">Total Payable</td>
        <td class="val">&#8377;{_fmt_money(bill.get('total_with_gst'))}</td>
      </tr>
      <tr class="b-paid">
        <td class="lbl">Total Paid So Far</td>
        <td class="val">&#8377;{_fmt_money(amount_paid)}</td>
      </tr>
      {bal_row}
    </table>
    """

    # Installments table
    inst_html = ""
    installments = bill.get("cycle_installments") or []
    if installments:
        rows = ""
        for inst in installments:
            type_label = {
                "enrollment": "Enrollment",
                "renewal":    "Renewal",
                "balance":    "Balance Payment",
            }.get(inst.get("installment_type", ""), "Payment")
            bal_after = float(inst.get("balance_after") or 0)
            rows += f"""
            <tr>
              <td>{inst.get('paid_date', '')}</td>
              <td>{type_label}</td>
              <td class="num paid">&#8377;{_fmt_money(inst.get('amount'))}</td>
              <td class="num bal">&#8377;{_fmt_money(bal_after)}</td>
              <td>{(inst.get('mode_of_payment') or 'cash').upper()}</td>
            </tr>
            """
        inst_html = f"""
        <div class="section-label" style="margin-top: 10px;">Payment Installments — This Invoice</div>
        <table class="ctable" cellpadding="0" cellspacing="0">
          <thead>
            <tr>
              <th>Date</th><th>Type</th>
              <th class="num">Amount Paid</th>
              <th class="num">Balance After</th>
              <th>Mode</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
        """

    # Partial note
    partial_html = ""
    if balance > 0:
        partial_html = f"""
        <div class="partial-note">
          &#9888; <strong>Partial Payment Recorded.</strong>
          Remaining <strong>&#8377;{_fmt_money(balance)}</strong> to be paid in future installments.
          GST already accounted above — no additional GST on balance payments.
        </div>
        """

    # Footer
    footer_html = f"""
    <div class="footer">
      Thank you for choosing <strong>{gym_name}</strong>!<br/>
      Computer-generated tax invoice. No signature required.
      {f'<br/>GSTIN: {gym_gstin}' if gym_gstin else ''}
    </div>
    """

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Invoice {bill.get('invoice_number', '')}</title>
  <style>{_BILL_CSS}</style>
</head>
<body>
  {header_html}
  <div class="doc-title">TAX INVOICE</div>
  <div class="body-pad">
    {meta_html}
    {member_html}
    {plan_html}
    {billing_html}
    {inst_html}
    {partial_html}
  </div>
  {footer_html}
</body>
</html>
"""


_PT_BILL_CSS = """
@page { size: A4; margin: 15mm; }
body  { font-family: Helvetica, Arial, sans-serif; color: #111; font-size: 11px; }
.header { background: #1a1a2e; color: #fff; padding: 18px; text-align: center; }
.gym-name { font-size: 20px; font-weight: bold; letter-spacing: 1px; }
.gym-sub  { font-size: 10px; color: #cfcfe0; margin-top: 4px; }
.gym-gstin{ display: inline-block; margin-top: 6px; background: #2a2a4e; color: #a8ff57;
            border: 1px solid #a8ff57; padding: 2px 10px; font-size: 9px; font-weight: bold; }
.doc-title { background: #a8ff57; color: #08080a; text-align: center; padding: 8px;
             font-size: 12px; font-weight: bold; letter-spacing: 3px; }
.body-pad { padding: 14px 4px 4px 4px; }
.meta { width: 100%; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 10px; }
.meta td { vertical-align: top; }
.inv-no   { font-size: 12px; font-weight: bold; color: #444; }
.inv-date { font-size: 10px; color: #888; }
.badge { display: inline-block; padding: 3px 12px; font-size: 10px; font-weight: bold;
         letter-spacing: 1px; border: 1px solid; }
.s-paid    { background: #e8fff0; color: #1a7a00; border-color: #b0e0c0; }
.s-partial { background: #fff8e0; color: #a06000; border-color: #e0c070; }
.s-pending { background: #fff0f0; color: #cc0000; border-color: #f0c0c0; }
.section-label { font-size: 9px; font-weight: bold; text-transform: uppercase;
                 letter-spacing: 1px; color: #888; margin-bottom: 4px; }
.member-card { background: #f9f9f9; padding: 10px 12px; margin-bottom: 10px; }
.member-name { font-size: 15px; font-weight: bold; color: #111; }
.member-meta { font-size: 10px; color: #666; margin-top: 3px; }
.member-id   { background: #e8f0ff; color: #1a3a9a; padding: 1px 6px;
               font-family: monospace; font-size: 10px; font-weight: bold; }
.pt-box { background: #f0f8ff; border: 1px solid #b0d8f0; padding: 10px 12px; margin-bottom: 10px; }
.pt-title { font-size: 12px; font-weight: bold; color: #0a4a7a; margin-bottom: 4px; }
.pt-dates { font-size: 11px; color: #1a5a8a; }
.pt-days-badge { display: inline-block; background: #1a5a8a; color: #fff;
                 padding: 2px 8px; font-size: 10px; font-weight: bold; margin-left: 4px; }
.billing-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
.billing-table td { padding: 6px 4px; border-bottom: 1px solid #f0f0f0; font-size: 11px; }
.billing-table .lbl { color: #555; }
.billing-table .val { text-align: right; }
.b-gst .val   { color: #e05000; }
.b-total      { background: #f4f4f4; }
.b-total .lbl { font-size: 12px; font-weight: bold; color: #111; }
.b-total .val { font-size: 14px; font-weight: bold; color: #111; }
.b-paid .val  { color: #1a7a00; font-weight: bold; }
.b-bal  .val  { color: #cc0000; font-weight: bold; }
.prorated-note { background: #fff8e8; border: 1px solid #f0d090; padding: 8px 12px;
                 margin-bottom: 10px; font-size: 10px; color: #8a5000; }
.footer { text-align: center; padding: 12px; border-top: 1px solid #eee;
          font-size: 9px; color: #999; margin-top: 14px; }
.footer strong { color: #555; }
"""


def _pt_bill_status_badge(bill: dict) -> str:
    status = bill.get("status", "pending")
    if status == "paid":
        return '<span class="badge s-paid">&#10003; PAID</span>'
    if status == "partial":
        return '<span class="badge s-partial">&#9888; PARTIAL</span>'
    return '<span class="badge s-pending">&#9203; PENDING</span>'


def _build_pt_bill_html(bill: dict) -> str:
    """
    Build PT Renewal receipt HTML for xhtml2pdf, mirroring the frontend buildPtBillHtml layout.
    """
    gym_name    = bill.get("gym_name") or "Gym"
    gym_address = bill.get("gym_address") or ""
    gym_phone   = bill.get("gym_phone") or ""
    gym_email   = bill.get("gym_email") or ""
    gym_gstin   = bill.get("gym_gstin") or ""

    contact_parts = []
    if gym_phone: contact_parts.append(gym_phone)
    if gym_email: contact_parts.append(gym_email)
    contact_line = " | ".join(contact_parts)

    header_html = f"""
    <div class="header">
      <div class="gym-name">{gym_name}</div>
      <div class="gym-sub">
        {gym_address}{'<br/>' if gym_address else ''}
        {contact_line}
      </div>
      {f'<div class="gym-gstin">GSTIN: {gym_gstin}</div>' if gym_gstin else ''}
    </div>
    """

    meta_html = f"""
    <table class="meta" cellpadding="0" cellspacing="0"><tr>
      <td>
        <div class="inv-no">Invoice: {bill.get('invoice_number', '—')}</div>
        <div class="inv-date">Date: {bill.get('date', '')}</div>
      </td>
      <td style="text-align: right;">{_pt_bill_status_badge(bill)}</td>
    </tr></table>
    """

    member_html = f"""
    <div class="member-card">
      <div class="section-label">Member</div>
      <div class="member-name">{bill.get('member_name', '')}</div>
      <div class="member-meta">
        ID: <span class="member-id">{bill.get('member_id', '')}</span>
        {f" &nbsp;|&nbsp; {bill.get('phone', '')}" if bill.get('phone') else ''}
        {f"<br/>{bill.get('email', '')}" if bill.get('email') else ''}
        <br/>Plan: <strong>{bill.get('plan_name', '—')}</strong>
        &nbsp;|&nbsp; Plan valid till: <strong>{bill.get('plan_valid_to', '')}</strong>
        <br/>Trainer: <strong>{bill.get('trainer_name', '')}</strong> ({bill.get('trainer_id', '')})
      </div>
    </div>
    """

    pt_box_html = f"""
    <div class="pt-box">
      <div class="pt-title">Personal Training Period</div>
      <div class="pt-dates">
        Start: <strong>{bill.get('pt_start_date', '')}</strong>
        &nbsp;&rarr;&nbsp; End: <strong>{bill.get('pt_end_date', '')}</strong>
        <span class="pt-days-badge">{bill.get('pt_days', '')} days</span>
      </div>
    </div>
    """

    pt_days = int(bill.get("pt_days") or 0)
    full_pt_days = int(bill.get("full_pt_days") or 30)
    prorated_html = ""
    if pt_days < full_pt_days:
        prorated_html = f"""
        <div class="prorated-note">
          <strong>Prorated PT Fee:</strong> Only {pt_days} days remain in the membership plan.
          Fee calculated as {pt_days}/{full_pt_days} of the full monthly PT fee.
        </div>
        """

    gst_rate = float(bill.get("gst_rate") or 0)
    balance  = float(bill.get("balance") or 0)

    bal_row = ""
    if balance > 0:
        bal_row = f"""
        <tr class="b-bal">
          <td class="lbl">Balance Due</td>
          <td class="val">&#8377;{_fmt_money(balance)}</td>
        </tr>
        """

    billing_html = f"""
    <div class="section-label">Invoice Breakdown</div>
    <table class="billing-table" cellpadding="0" cellspacing="0">
      <tr>
        <td class="lbl">PT Base Fee ({pt_days} days)</td>
        <td class="val">&#8377;{_fmt_money(bill.get('base_amount'))}</td>
      </tr>
      <tr class="b-gst">
        <td class="lbl">GST ({gst_rate}%)</td>
        <td class="val">&#8377;{_fmt_money(bill.get('gst_amount'))}</td>
      </tr>
      <tr class="b-total">
        <td class="lbl">Total Amount</td>
        <td class="val">&#8377;{_fmt_money(bill.get('total_amount'))}</td>
      </tr>
      <tr class="b-paid">
        <td class="lbl">Amount Paid</td>
        <td class="val">&#8377;{_fmt_money(bill.get('amount_paid'))}</td>
      </tr>
      {bal_row}
    </table>
    """

    mode_html = ""
    if bill.get("mode_of_payment"):
        mode_html = f'<div style="font-size:10px;color:#888;margin-bottom:10px;">Mode of Payment: <strong style="color:#555">{bill["mode_of_payment"].upper()}</strong></div>'

    notes_html = ""
    if bill.get("notes"):
        notes_html = f'<div style="font-size:10px;color:#888;margin-bottom:10px;background:#f5f5f5;padding:6px 10px;">Note: {bill["notes"]}</div>'

    footer_html = f"""
    <div class="footer">
      Thank you for your continued commitment to your fitness journey!<br/>
      <strong>{gym_name}</strong> — This is a computer-generated receipt.
    </div>
    """

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>PT Renewal Receipt — {bill.get('member_name', '')}</title>
  <style>{_PT_BILL_CSS}</style>
</head>
<body>
  {header_html}
  <div class="doc-title">PERSONAL TRAINING RENEWAL RECEIPT</div>
  <div class="body-pad">
    {meta_html}
    {member_html}
    {pt_box_html}
    {prorated_html}
    {billing_html}
    {mode_html}
    {notes_html}
  </div>
  {footer_html}
</body>
</html>
"""


def generate_pt_bill_pdf(bill: dict) -> bytes:
    """Render PT bill HTML to PDF bytes using xhtml2pdf."""
    html = _build_pt_bill_html(bill)
    buffer = io.BytesIO()
    result = pisa.CreatePDF(src=html, dest=buffer, encoding="utf-8")
    if result.err:
        raise RuntimeError(f"xhtml2pdf failed with {result.err} errors")
    return buffer.getvalue()


def generate_bill_pdf(bill: dict) -> bytes:
    """
    Render the bill HTML to PDF bytes using xhtml2pdf.
    """
    html = _build_bill_html(bill)
    buffer = io.BytesIO()
    result = pisa.CreatePDF(src=html, dest=buffer, encoding="utf-8")
    if result.err:
        raise RuntimeError(f"xhtml2pdf failed with {result.err} errors")
    return buffer.getvalue()


def upload_whatsapp_media(pdf_bytes: bytes, filename: str = "bill.pdf") -> dict:
    """
    Upload a PDF to Meta's media endpoint and return the media_id.
    """
    access_token    = settings.META_WHATSAPP_ACCESS_TOKEN
    phone_number_id = settings.META_WHATSAPP_PHONE_NUMBER_ID

    url = f"https://graph.facebook.com/v18.0/{phone_number_id}/media"
    headers = {"Authorization": f"Bearer {access_token}"}
    files = {
        "file": (filename, pdf_bytes, "application/pdf"),
        "type": (None, "application/pdf"),
        "messaging_product": (None, "whatsapp"),
    }
    try:
        response = requests.post(url, headers=headers, files=files, timeout=30)
        response.raise_for_status()
        media_id = response.json().get("id")
        logger.info(f"Media uploaded successfully, id={media_id}")
        return {"success": True, "media_id": media_id}
    except requests.exceptions.HTTPError as e:
        logger.error(f"Media upload HTTP error: {e.response.text}")
        return {"success": False, "error": e.response.text}
    except requests.exceptions.RequestException as e:
        logger.error(f"Media upload request failed: {e}")
        return {"success": False, "error": str(e)}


def send_whatsapp_document(to: str, media_id: str, filename: str, caption: str) -> dict:
    """
    Send an already-uploaded document (by media_id) to a WhatsApp number.
    """
    access_token    = settings.META_WHATSAPP_ACCESS_TOKEN
    phone_number_id = settings.META_WHATSAPP_PHONE_NUMBER_ID

    url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "document",
        "document": {
            "id":       media_id,
            "filename": filename,
            "caption":  caption,
        },
    }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        logger.info(f"Document sent to {to}")
        return {"success": True, "data": response.json()}
    except requests.exceptions.HTTPError as e:
        logger.error(f"Document send HTTP error: {e.response.text}")
        return {"success": False, "error": e.response.text}
    except requests.exceptions.RequestException as e:
        logger.error(f"Document send request failed: {e}")
        return {"success": False, "error": str(e)}


def send_bill_on_whatsapp(phone: str, bill: dict, trigger_type: str) -> None:
    """
    Full flow: generate PDF → upload to Meta → send as WhatsApp document.
    Call this after enrollment or renewal.
    `phone` should already include country code e.g. "919876543210"
    """
    if not phone:
        logger.warning("send_bill_on_whatsapp: no phone number, skipping.")
        return

    if not bill:
        logger.warning("send_bill_on_whatsapp: no bill data, skipping.")
        return

    total = bill.get('total_with_gst') or bill.get('total_amount')
    logger.info(f"send_bill_on_whatsapp: amount_paid={bill.get('amount_paid')}, balance={bill.get('balance')}, total={total}")

    # Step 1: generate PDF
    is_pt = trigger_type in ("pt_renewal", "pt_balance")
    try:
        pdf_bytes = generate_pt_bill_pdf(bill) if is_pt else generate_bill_pdf(bill)
    except Exception as e:
        logger.error(f"Bill PDF generation failed: {e}")
        return

    # Step 2: upload to Meta
    filename = f"{bill.get('invoice_number', 'bill')}.pdf"
    upload   = upload_whatsapp_media(pdf_bytes, filename)
    if not upload["success"]:
        logger.error(f"Bill PDF upload failed: {upload['error']}")
        return

    # Step 3: send document
    caption_map = {
        "enrollment":  f"Welcome {bill.get('member_name', '')}! Your membership bill is attached.",
        "renewal":     f"Hi {bill.get('member_name', '')}! Your renewal bill is attached.",
        "balance":     f"Hi {bill.get('member_name', '')}! Your updated bill after the balance payment is attached.",
        "pt_renewal":  f"Hi {bill.get('member_name', '')}! Your personal training renewal receipt is attached.",
        "pt_balance":  f"Hi {bill.get('member_name', '')}! Your updated PT receipt after the balance payment is attached.",
    }
    caption = caption_map.get(trigger_type, "Your gym bill is attached.")
    send_whatsapp_document(
        to       = phone,
        media_id = upload["media_id"],
        filename = filename,
        caption  = caption,
    )