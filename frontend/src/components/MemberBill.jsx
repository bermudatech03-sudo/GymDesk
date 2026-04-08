import "./MemberBill.css";

/* ── tiny helpers ─────────────────────────────────────── */
const fmt  = (n) => Number(n || 0).toLocaleString("en-IN");
const fmtF = (n) => parseFloat(n || 0);

/** Group payments by invoice_number, preserving insertion order. */
function groupByInvoice(payments) {
  const map = new Map();
  for (const p of payments) {
    const key = p.invoice_number || `__no_inv_${p.id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  }
  return [...map.entries()].map(([inv, rows]) => ({ inv, rows }));
}

/* ── shared CSS for the standalone downloaded HTML ────── */
const HTML_CSS = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f4;padding:32px 16px;color:#111}
  .page{max-width:700px;margin:0 auto;background:#fff;border-radius:12px;
        box-shadow:0 4px 24px rgba(0,0,0,.12);overflow:hidden}
  .header{background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:28px 32px;text-align:center}
  .gym-name{font-size:22px;font-weight:800;letter-spacing:1px;margin-bottom:4px}
  .gym-sub{font-size:12px;color:rgba(255,255,255,.65);line-height:1.7}
  .gym-gstin{display:inline-block;margin-top:8px;background:rgba(168,255,87,.15);
    color:#a8ff57;border:1px solid rgba(168,255,87,.3);border-radius:100px;
    padding:3px 14px;font-size:11px;font-weight:700;letter-spacing:1px}
  .doc-title{background:#a8ff57;color:#08080a;text-align:center;padding:10px;
    font-size:13px;font-weight:800;letter-spacing:3px;text-transform:uppercase}
  .body{padding:24px 32px}
  .section-label{font-size:10px;font-weight:800;text-transform:uppercase;
    letter-spacing:1.5px;color:#888;margin-bottom:8px}
  .meta{display:flex;justify-content:space-between;margin-bottom:16px;
    padding-bottom:14px;border-bottom:1px solid #eee;flex-wrap:wrap;gap:10px}
  .inv-no{font-size:13px;font-weight:700;color:#444;margin-bottom:3px}
  .inv-date{font-size:12px;color:#888}
  .status-badge{display:inline-block;padding:4px 14px;border-radius:100px;
    font-size:11px;font-weight:800;letter-spacing:1px}
  .s-paid   {background:#e8fff0;color:#1a7a00;border:1px solid #b0e0c0}
  .s-partial{background:#fff8e0;color:#a06000;border:1px solid #e0c070}
  .s-pending{background:#fff0f0;color:#cc0000;border:1px solid #f0c0c0}
  .member-card{background:#f9f9f9;border-radius:8px;padding:14px 16px;margin-bottom:16px}
  .member-name{font-size:17px;font-weight:800;color:#111;margin-bottom:4px}
  .member-meta{font-size:12px;color:#666;line-height:1.7}
  .member-id{display:inline-block;background:#e8f0ff;color:#1a3a9a;border-radius:4px;
    padding:2px 8px;font-family:monospace;font-size:12px;font-weight:700}
  .plan-box{background:#f0fff4;border:1px solid #c0e8c0;border-radius:8px;
    padding:12px 16px;margin-bottom:16px}
  .plan-name{font-size:14px;font-weight:800;color:#1a5a00;margin-bottom:4px}
  .plan-dates{font-size:12px;color:#4a7a4a;line-height:1.7}
  .billing{margin-bottom:16px}
  .b-row{display:flex;justify-content:space-between;align-items:center;
    padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#555}
  .b-row:last-child{border-bottom:none}
  .b-row.gst .val{color:#e05000}
  .b-row.total{background:#f8f8f8;margin:4px -4px 0;padding:9px 4px;
    border-radius:6px;border-bottom:none}
  .b-row.total .lbl{font-size:14px;font-weight:800;color:#111}
  .b-row.total .val{font-size:17px;font-weight:800;color:#111}
  .b-row.paid  .val{color:#1a7a00;font-weight:800}
  .b-row.bal   .val{color:#cc0000;font-weight:800}
  .partial-note{background:#fffbf0;border:1px solid #f0e0a0;border-radius:8px;
    padding:10px 14px;margin-bottom:16px;font-size:12px;color:#8a6000;line-height:1.7}
  .cycle{margin-bottom:14px;border:1px solid #ddd;border-radius:8px;overflow:hidden}
  .cycle-head{background:#1a1a2e;color:#fff;padding:9px 14px;
    display:flex;justify-content:space-between;align-items:center;font-size:12px}
  .tag-enroll{color:#a8ff57;font-weight:800;letter-spacing:.5px}
  .tag-renew {color:#4df0ff;font-weight:800;letter-spacing:.5px}
  .cycle-inv {color:rgba(255,255,255,.5);font-family:monospace;font-size:11px;margin-left:8px}
  .cycle-plan{color:rgba(255,255,255,.7);font-size:11px}
  .ctable{width:100%;border-collapse:collapse;font-size:12px}
  .ctable th{padding:6px 10px;font-weight:700;color:#555;background:#f5f5f5;
    border-bottom:1px solid #ddd;text-align:right}
  .ctable th:first-child,.ctable th:nth-child(2){text-align:left}
  .ctable td{padding:7px 10px;border-bottom:1px solid #f5f5f5;text-align:right;color:#444}
  .ctable td:first-child,.ctable td:nth-child(2){text-align:left}
  .ctable tr:last-child td{border-bottom:none}
  .cycle-info{background:#f0f8f0;padding:8px 14px;border-bottom:1px solid #ddd;
    font-size:12px;color:#444;line-height:1.8}
  .cycle-foot{background:#f5f5f5;padding:6px 12px;
    display:flex;justify-content:space-between;font-size:12px;border-top:1px solid #ddd}
  .grand{background:#1a1a2e;border-radius:8px;padding:14px 18px;margin-top:10px}
  .grand .section-label{color:rgba(255,255,255,.5);margin-bottom:10px}
  .g-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;
    border-bottom:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.75)}
  .g-row:last-child{border-bottom:none;font-size:15px;font-weight:800;padding-top:10px;color:#fff}
  .g-row .val{font-family:monospace;font-weight:700}
  .gc-paid{color:#a8ff57}.gc-bal{color:#ff8c6b}.gc-total{color:#fff}
  .footer{text-align:center;padding:18px 32px;border-top:1px solid #eee;
    font-size:11px;color:#999;line-height:1.8;background:#fafafa}
  .footer strong{color:#555}
  @media print{body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0}}
`;

/* ── HTML fragments ──────────────────────────────────── */
function hGymHeader(b) {
  return `
  <div class="header">
    <div class="gym-name">${b.gym_name || "Gym"}</div>
    <div class="gym-sub">
      ${b.gym_address || ""}${b.gym_address ? "<br/>" : ""}
      ${b.gym_phone ? "📞 " + b.gym_phone : ""}
      ${b.gym_email ? " &nbsp;|&nbsp; ✉ " + b.gym_email : ""}
    </div>
    ${b.gym_gstin ? `<div class="gym-gstin">GSTIN: ${b.gym_gstin}</div>` : ""}
  </div>`;
}

function hMemberCard(b) {
  return `
  <div class="member-card">
    <div class="section-label">Member</div>
    <div class="member-name">${b.member_name}</div>
    <div class="member-meta">
      ID: <span class="member-id">${b.member_id}</span>
      ${b.phone ? " &nbsp;|&nbsp; 📞 " + b.phone : ""}
      ${b.email ? "<br/>✉ " + b.email : ""}
    </div>
  </div>`;
}

function hCycleBadge(inv) {
  return inv.includes("-R")
    ? `<span class="tag-renew">RENEWAL</span>`
    : `<span class="tag-enroll">ENROLLMENT</span>`;
}

function hStatusBadge(status) {
  const cls = status === "paid" ? "s-paid" : status === "partial" ? "s-partial" : "s-pending";
  const lbl = status === "paid" ? "✓ PAID" : status === "partial" ? "⚠ PARTIAL" : "⏳ PENDING";
  return `<span class="status-badge ${cls}">${lbl}</span>`;
}

function hCycleCard(inv, rows, idx) {
  const first      = rows[0];
  const isRenewal  = inv.includes("-R");
  const billed     = fmtF(first.total_with_gst || first.plan_price);
  const installments = first.cycle_installments || [];

  let totalPaid = 0;
  let instRows  = "";

  if (installments.length > 0) {
    instRows = installments.map((inst, ri) => {
      totalPaid += fmtF(inst.amount);
      const typeLabel =
        inst.installment_type === "enrollment" ? "Enrollment" :
        inst.installment_type === "renewal"    ? "Renewal"    : "Balance Payment";
      const balColor = fmtF(inst.balance_after) > 0 ? "#cc5500" : "#777";
      return `<tr>
        <td>${inst.paid_date}</td>
        <td style="color:#1a5a9a;font-weight:600">${typeLabel}</td>
        <td style="color:#1a7a00;font-weight:700">₹${fmt(inst.amount)}</td>
        <td style="color:${balColor}">₹${fmt(inst.balance_after)}</td>
        <td style="text-align:center;text-transform:uppercase;font-size:11px;font-weight:600;color:#555">${(inst.mode_of_payment || "cash").toUpperCase()}</td>
        ${ri === 0 ? `<td rowspan="${installments.length}" style="text-align:center;vertical-align:middle">
          ${hStatusBadge(first.status)}
        </td>` : ""}
      </tr>`;
    }).join("");
  } else {
    totalPaid = fmtF(first.amount_paid);
    instRows  = `<tr>
      <td>${first.paid_date}</td>
      <td style="color:#1a5a9a;font-weight:600">${isRenewal ? "Renewal" : "Enrollment"}</td>
      <td style="color:#1a7a00;font-weight:700">₹${fmt(first.amount_paid)}</td>
      <td style="color:${fmtF(first.balance) > 0 ? "#cc5500" : "#777"}">₹${fmt(first.balance)}</td>
      <td style="text-align:center;text-transform:uppercase;font-size:11px;font-weight:600;color:#555">${(first.mode_of_payment || "CASH").toUpperCase()}</td>
      <td style="text-align:center">${hStatusBadge(first.status)}</td>
    </tr>`;
  }

  const lastBal = installments.length > 0
    ? fmtF(installments[installments.length - 1].balance_after)
    : fmtF(first.balance);

  return `
  <div class="cycle">
    <div class="cycle-head">
      <span>
        ${hCycleBadge(inv)} #${idx + 1}
        <span class="cycle-inv">${inv}</span>
      </span>
      <span class="cycle-plan">
        ${first.plan_name || "—"} &nbsp;·&nbsp; ${first.valid_from || "—"} → ${first.valid_to || "—"}
      </span>
    </div>
    <div class="cycle-info">
      Total billed: <strong>₹${fmt(billed)}</strong>
      &ensp;|&ensp; GST @ ${first.gst_rate || 0}%: <strong>₹${fmt(first.gst_amount || 0)}</strong>
      &ensp;|&ensp; Base price: <strong>₹${fmt(first.plan_price || 0)}</strong>
    </div>
    <table class="ctable">
      <thead><tr>
        <th>Date</th><th>Type</th>
        <th>Amount Paid</th><th>Balance After</th><th>Mode</th><th>Status</th>
      </tr></thead>
      <tbody>${instRows}</tbody>
    </table>
    <div class="cycle-foot">
      <span>Billed: <strong>₹${fmt(billed)}</strong> &ensp; Total Paid: <strong style="color:#1a7a00">₹${fmt(totalPaid)}</strong></span>
      <strong style="color:${lastBal > 0 ? "#cc5500" : "#1a7a00"}">Balance: ₹${fmt(lastBal)}</strong>
    </div>
  </div>`;
}

function hGrandSummary(grandBilled, grandPaid, outstanding) {
  return `
  <div class="grand">
    <div class="section-label">Grand Summary — All Cycles</div>
    <div class="g-row"><span>Total Billed (incl. GST)</span><span class="val gc-total">₹${fmt(grandBilled)}</span></div>
    <div class="g-row"><span>Total Paid</span><span class="val gc-paid">₹${fmt(grandPaid)}</span></div>
    <div class="g-row"><span>Outstanding Balance</span><span class="val gc-bal">₹${fmt(outstanding)}</span></div>
  </div>`;
}

/* ═══════════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════════ */
export default function MemberBill({ bill, onClose }) {
  if (!bill) return null;

  const isPaid      = fmtF(bill.balance) <= 0;
  const hasGST      = fmtF(bill.gst_rate) > 0;
  const isPartial   = !isPaid && fmtF(bill.amount_paid) > 0;
  const isStatement = !!bill.isStatement;

  const cycles = bill.installments?.length
    ? groupByInvoice(bill.installments)
    : [];

  // Grand totals — sum across ALL cycles, not just the last one
  const grandBilled = cycles.reduce((s, { rows }) =>
    s + fmtF(rows[0]?.total_with_gst || rows[0]?.plan_price), 0);

  const grandPaid = cycles.reduce((s, { rows }) => {
    const insts = rows[0]?.cycle_installments || [];
    if (insts.length > 0) return s + insts.reduce((ss, i) => ss + fmtF(i.amount), 0);
    return s + rows.reduce((ss, r) => ss + fmtF(r.amount_paid), 0);
  }, 0);

  // ── FIX: outstanding = sum of balance across ALL payment cycles ──
  // Each payment row has a .balance field = total_with_gst - amount_paid for that cycle.
  // Summing them gives the true total owed across all cycles.
  const outstandingBal = bill.installments
    ? bill.installments.reduce((s, p) => s + fmtF(p.balance), 0)
    : fmtF(bill.balance);

  /* ── HTML generator ──────────────────────────────── */
  const generateBillHTML = () => {
    const cyclesBlock = cycles.map(({ inv, rows }, i) => hCycleCard(inv, rows, i)).join("");
    const grandBlock  = cycles.length > 0
      ? hGrandSummary(grandBilled, grandPaid, outstandingBal)
      : "";

    const footer = `
  <div class="footer">
    Thank you for choosing <strong>${bill.gym_name || "our gym"}</strong>!<br/>
    Computer-generated ${isStatement ? "member statement" : "tax invoice"}. No signature required.
    ${bill.gym_gstin ? "<br/>GSTIN: " + bill.gym_gstin : ""}
  </div>`;

    if (isStatement) {
      const overallBadge = outstandingBal > 0
        ? `<span class="status-badge s-partial">⚠ BALANCE DUE</span>`
        : `<span class="status-badge s-paid">✓ FULLY CLEAR</span>`;
      return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"/><title>Statement — ${bill.member_name}</title>
<style>${HTML_CSS}</style></head><body><div class="page">
  ${hGymHeader(bill)}
  <div class="doc-title">Member Statement</div>
  <div class="body">
    <div class="meta">
      <div>
        <div class="inv-no">Statement for: ${bill.member_name}</div>
        <div class="inv-date">Generated: ${bill.date}</div>
      </div>
      <div>${overallBadge}</div>
    </div>
    ${hMemberCard(bill)}
    <div class="section-label" style="margin-bottom:12px">Payment History — All Cycles</div>
    ${cyclesBlock}
    ${grandBlock}
  </div>
  ${footer}
</div></body></html>`;
    }

    // ── Invoice mode ──
    const cycleInsts = bill.cycle_installments || [];
    const isPaidH    = fmtF(bill.balance) <= 0;
    const isPartialH = !isPaidH && fmtF(bill.amount_paid) > 0;
    const badge      = isPaidH
      ? `<span class="status-badge s-paid">✓ FULLY PAID</span>`
      : isPartialH
        ? `<span class="status-badge s-partial">⚠ PARTIAL PAYMENT</span>`
        : `<span class="status-badge s-pending">⏳ PENDING</span>`;

    const instRowsHTML = cycleInsts.map((inst, ri) => {
      const typeLabel =
        inst.installment_type === "enrollment" ? "Enrollment" :
        inst.installment_type === "renewal"    ? "Renewal"    : "Balance Payment";
      return `<tr>
        <td>${inst.paid_date}</td>
        <td style="color:#1a5a9a;font-weight:600">${typeLabel}</td>
        <td style="color:#1a7a00;font-weight:700">₹${fmt(inst.amount)}</td>
        <td style="color:${fmtF(inst.balance_after) > 0 ? "#cc5500" : "#777"}">₹${fmt(inst.balance_after)}</td>
        <td style="text-align:center;text-transform:uppercase;font-size:11px;font-weight:600;color:#555">${(inst.mode_of_payment || "cash").toUpperCase()}</td>
      </tr>`;
    }).join("");

    const instTableHTML = cycleInsts.length > 0 ? `
    <div class="billing" style="margin-top:16px">
      <div class="section-label">Payment Installments — This Invoice</div>
      <table class="ctable">
        <thead><tr>
          <th style="text-align:left">Date</th>
          <th style="text-align:left">Type</th>
          <th>Amount Paid</th>
          <th>Balance After</th>
          <th>Mode</th>
        </tr></thead>
        <tbody>${instRowsHTML}</tbody>
      </table>
    </div>` : "";

    return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"/><title>Invoice ${bill.invoice_number}</title>
<style>${HTML_CSS}</style></head><body><div class="page">
  ${hGymHeader(bill)}
  <div class="doc-title">Tax Invoice</div>
  <div class="body">
    <div class="meta">
      <div>
        <div class="inv-no">Invoice: ${bill.invoice_number || "—"}</div>
        <div class="inv-date">Date: ${bill.date}</div>
      </div>
      <div>${badge}</div>
    </div>
    ${hMemberCard(bill)}
    ${bill.plan_name ? `
    <div class="plan-box">
      <div class="section-label">Membership Plan</div>
      <div class="plan-name">${bill.plan_name}</div>
      <div class="plan-dates">
        Duration: ${bill.plan_duration} days<br/>
        Valid From: ${bill.valid_from} &nbsp;→&nbsp; Valid To: ${bill.valid_to}
      </div>
    </div>` : ""}
    <div class="billing">
      <div class="section-label">Invoice Breakdown</div>
      <div class="b-row"><span class="lbl">Membership Fee (Base)</span><span class="val">₹${fmt(bill.membership_fee ?? bill.plan_price)}</span></div>
      ${fmtF(bill.diet_plan_amount) > 0 ? `<div class="b-row"><span class="lbl">Diet Plan</span><span class="val">₹${fmt(bill.diet_plan_amount)}</span></div>` : ""}
      ${hasGST ? `<div class="b-row gst"><span class="lbl">GST @ ${bill.gst_rate}% (CGST ${bill.gst_rate/2}% + SGST ${bill.gst_rate/2}%)</span><span class="val">₹${fmt(bill.gst_amount)}</span></div>` : ""}
      <div class="b-row total"><span class="lbl">Total Payable</span><span class="val">₹${fmt(bill.total_with_gst)}</span></div>
      <div class="b-row paid"><span class="lbl">Total Paid So Far</span><span class="val">₹${fmt(bill.amount_paid)}</span></div>
      ${fmtF(bill.balance) > 0 ? `<div class="b-row bal"><span class="lbl">Balance Remaining</span><span class="val">₹${fmt(bill.balance)}</span></div>` : ""}
    </div>
    ${instTableHTML}
    ${fmtF(bill.balance) > 0 ? `
    <div class="partial-note">
      ⚠ <strong>Partial Payment Recorded.</strong>
      Remaining <strong>₹${fmt(bill.balance)}</strong> to be paid in future installments.
      GST already accounted above — no additional GST on balance payments.
    </div>` : ""}
    ${cycles.length > 0 ? `
    <div class="section-label" style="margin:12px 0 10px">Full Payment History — All Cycles</div>
    ${cyclesBlock}
    ${grandBlock}` : ""}
  </div>
  ${footer}
</div></body></html>`;
  };

  /* ── Download ───────────────────────────────────── */
  const handleDownload = () => {
    const html = generateBillHTML();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = isStatement
      ? `statement-${bill.member_id}-${bill.date}.html`
      : `${bill.invoice_number || "invoice"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ── Print ─────────────────────────────────────── */
  const handlePrint = () => {
    const win = window.open("", "_blank", "width=760,height=960");
    win.document.write(generateBillHTML());
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  /* ── Preview JSX: per-installment cycle block ──── */
  const CycleBlock = ({ inv, rows, idx }) => {
    const isRen  = inv.includes("-R");
    const first  = rows[0];
    const insts  = first.cycle_installments || [];
    const billed = fmtF(first.total_with_gst || first.plan_price);

    const totPaid = insts.length > 0
      ? insts.reduce((s, i) => s + fmtF(i.amount), 0)
      : rows.reduce((s, r) => s + fmtF(r.amount_paid), 0);

    const lastBal = insts.length > 0
      ? fmtF(insts[insts.length - 1].balance_after)
      : fmtF(first.balance);

    return (
      <div style={{ marginBottom:12, border:"1px solid var(--border)", borderRadius:8, overflow:"hidden" }}>
        {/* cycle header */}
        <div style={{
          background:"var(--surface2)", padding:"8px 14px",
          display:"flex", justifyContent:"space-between", alignItems:"center",
          borderBottom:"1px solid var(--border)", flexWrap:"wrap", gap:6
        }}>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{
              fontSize:10, fontWeight:800, letterSpacing:.8, padding:"2px 8px", borderRadius:100,
              background: isRen ? "rgba(77,240,255,.12)" : "rgba(168,255,87,.12)",
              color:       isRen ? "var(--teal)"         : "var(--accent)",
              border:      isRen ? "1px solid rgba(77,240,255,.3)" : "1px solid rgba(168,255,87,.3)"
            }}>
              {isRen ? "RENEWAL" : "ENROLLMENT"} #{idx + 1}
            </span>
            <span style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--text3)"}}>{inv}</span>
          </div>
          <span style={{fontSize:11,color:"var(--text2)"}}>
            {first.plan_name || "—"} &nbsp;·&nbsp; {first.valid_from || "—"} → {first.valid_to || "—"}
          </span>
        </div>

        {/* GST info bar */}
        <div style={{
          background:"var(--surface)", padding:"6px 14px",
          borderBottom:"1px solid var(--border)", fontSize:11, color:"var(--text3)"
        }}>
          Billed: <strong style={{color:"var(--text1)"}}>₹{fmt(billed)}</strong>
          &ensp;|&ensp; Base: <strong>₹{fmt(first.plan_price)}</strong>
          &ensp;+&ensp; GST {first.gst_rate || 0}%: <strong style={{color:"var(--warn)"}}>₹{fmt(first.gst_amount || 0)}</strong>
        </div>

        {/* installment rows */}
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead>
            <tr style={{background:"var(--surface)"}}>
              {["Date","Type","Amount Paid","Balance After","Mode"].map((h,i) => (
                <th key={h} style={{
                  padding:"5px 10px", fontWeight:700, color:"var(--text3)", fontSize:11,
                  textAlign: i >= 2 ? "center" : "left"
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {insts.length > 0 ? insts.map((inst, ri) => {
              const typeLabel =
                inst.installment_type === "enrollment" ? "Enrollment" :
                inst.installment_type === "renewal"    ? "Renewal"    : "Balance Payment";
              return (
                <tr key={inst.id || ri} style={{borderTop:"1px solid var(--border)"}}>
                  <td style={{padding:"6px 10px",color:"var(--text2)"}}>{inst.paid_date}</td>
                  <td style={{padding:"6px 10px",color:"var(--info)",fontWeight:600,fontSize:11}}>{typeLabel}</td>
                  <td style={{padding:"6px 10px",textAlign:"right",fontFamily:"var(--font-mono)",color:"var(--accent)",fontWeight:700}}>
                    ₹{fmt(inst.amount)}
                  </td>
                  <td style={{padding:"6px 10px",textAlign:"right",fontFamily:"var(--font-mono)",
                    color: fmtF(inst.balance_after) > 0 ? "var(--warn)" : "var(--text3)"}}>
                    ₹{fmt(inst.balance_after)}
                  </td>
                  <td style={{padding:"6px 10px",textAlign:"center",fontSize:11,fontWeight:700,color:"var(--text2)",textTransform:"uppercase"}}>
                    {(inst.mode_of_payment || "cash").toUpperCase()}
                  </td>
                </tr>
              );
            }) : rows.map(r => (
              <tr key={r.id} style={{borderTop:"1px solid var(--border)"}}>
                <td style={{padding:"6px 10px",color:"var(--text2)"}}>{r.paid_date}</td>
                <td style={{padding:"6px 10px",color:"var(--info)",fontWeight:600,fontSize:11}}>
                  {isRen ? "Renewal" : "Enrollment"}
                </td>
                <td style={{padding:"6px 10px",textAlign:"right",fontFamily:"var(--font-mono)",color:"var(--accent)",fontWeight:700}}>
                  ₹{fmt(r.amount_paid)}
                </td>
                <td style={{padding:"6px 10px",textAlign:"right",fontFamily:"var(--font-mono)",
                  color: fmtF(r.balance) > 0 ? "var(--warn)" : "var(--text3)"}}>
                  ₹{fmt(r.balance)}
                </td>
                <td style={{padding:"6px 10px",textAlign:"center",fontSize:11,fontWeight:700,color:"var(--text2)",textTransform:"uppercase"}}>
                  {(r.mode_of_payment || "CASH")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* cycle subtotal */}
        <div style={{
          background:"var(--surface2)", padding:"6px 12px",
          display:"flex", justifyContent:"space-between",
          borderTop:"1px solid var(--border)", fontSize:12
        }}>
          <span style={{color:"var(--text3)"}}>
            Billed <strong style={{color:"var(--text1)"}}>₹{fmt(billed)}</strong>
            &ensp; Total Paid <strong style={{color:"var(--accent)"}}>₹{fmt(totPaid)}</strong>
          </span>
          <strong style={{color: lastBal > 0 ? "var(--warn)" : "var(--teal)"}}>
            Balance: ₹{fmt(lastBal)}
          </strong>
        </div>
      </div>
    );
  };

  const cycleInsts = bill.cycle_installments || [];

  /* ── render ─────────────────────────────────────── */
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal bill-modal"
        style={{ maxWidth: isStatement ? 820 : 680 }}
        onClick={e => e.stopPropagation()}
      >
        {/* action bar */}
        <div className="bill-actions">
          <div style={{fontFamily:"var(--font-display)",fontSize:14,fontWeight:700}}>
            {isStatement ? `📋 Statement — ${bill.member_name}` : `🧾 Invoice — ${bill.invoice_number}`}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-sm btn-secondary" onClick={handlePrint}>🖨 Print</button>
            <button className="btn btn-sm btn-primary"   onClick={handleDownload}>⬇ Download</button>
            <button className="btn btn-sm btn-secondary" onClick={onClose}>✕ Close</button>
          </div>
        </div>

        {/* scrollable preview */}
        <div className="bill-preview">

          {/* gym header */}
          <div className="bill-header">
            <div className="bill-gym-name">{bill.gym_name}</div>
            <div className="bill-gym-sub">{bill.gym_address}</div>
            {bill.gym_phone && <div className="bill-gym-sub">📞 {bill.gym_phone}</div>}
            {bill.gym_gstin && <div className="bill-gstin-pill">GSTIN: {bill.gym_gstin}</div>}
            <div className="bill-title-tag">{isStatement ? "MEMBER STATEMENT" : "TAX INVOICE"}</div>
          </div>

          {/* meta row */}
          <div className="bill-meta-row">
            <div>
              <div className="bill-inv-no">
                {isStatement ? `Statement — ${bill.member_name}` : bill.invoice_number}
              </div>
              <div className="bill-inv-date">Date: {bill.date}</div>
            </div>
            <span className={`badge ${
              isStatement
                ? (outstandingBal > 0 ? "badge-yellow" : "badge-green")
                : (isPaid ? "badge-green" : isPartial ? "badge-yellow" : "badge-red")
            }`} style={{fontSize:11}}>
              {isStatement
                ? (outstandingBal > 0 ? "⚠ BALANCE DUE" : "✓ FULLY CLEAR")
                : (isPaid ? "✓ FULLY PAID" : isPartial ? "⚠ PARTIAL" : "⏳ PENDING")}
            </span>
          </div>

          {/* member */}
          <div className="bill-section-box">
            <div className="bill-section-label">{isStatement ? "Member" : "Bill To"}</div>
            <div className="bill-member-name">{bill.member_name}</div>
            <div className="bill-member-meta">
              <span className="bill-member-id">{bill.member_id}</span>
              {bill.phone && <span> &nbsp;|&nbsp; {bill.phone}</span>}
            </div>
          </div>

          {/* ── INVOICE-only ── */}
          {!isStatement && (
            <>
              {bill.plan_name && (
                <div className="bill-plan-box">
                  <div className="bill-section-label">Plan</div>
                  <div className="bill-plan-name">{bill.plan_name}</div>
                  <div className="bill-plan-validity">
                    {bill.plan_duration} days &nbsp;·&nbsp;
                    {bill.valid_from} → {bill.valid_to}
                  </div>
                </div>
              )}

              <div className="bill-breakdown">
                <div className="bill-section-label">Invoice Breakdown</div>
                <div className="bill-line">
                  <span>Membership Fee (Base)</span>
                  <span>₹{fmt(bill.membership_fee ?? bill.plan_price)}</span>
                </div>
                {fmtF(bill.diet_plan_amount) > 0 && (
                  <div className="bill-line">
                    <span>Diet Plan</span>
                    <span>₹{fmt(bill.diet_plan_amount)}</span>
                  </div>
                )}
                {hasGST && (
                  <div className="bill-line bill-line--gst">
                    <span>GST @ {bill.gst_rate}%
                      <small> (CGST {bill.gst_rate/2}% + SGST {bill.gst_rate/2}%)</small>
                    </span>
                    <span>₹{fmt(bill.gst_amount)}</span>
                  </div>
                )}
                <div className="bill-line bill-line--total">
                  <span>Total Payable</span>
                  <span>₹{fmt(bill.total_with_gst)}</span>
                </div>
                <div className="bill-line bill-line--paid">
                  <span>Total Paid So Far</span>
                  <span>₹{fmt(bill.amount_paid)}</span>
                </div>
                {fmtF(bill.balance) > 0 && (
                  <div className="bill-line bill-line--balance">
                    <span>Balance Remaining</span>
                    <span>₹{fmt(bill.balance)}</span>
                  </div>
                )}
              </div>

              {cycleInsts.length > 0 && (
                <div style={{paddingBottom:8}}>
                  <div className="bill-section-label" style={{marginBottom:8}}>
                    Payment Installments — This Invoice
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead>
                      <tr style={{background:"var(--surface)"}}>
                        {["Date","Type","Amount Paid","Balance After","Mode"].map((h,i) => (
                          <th key={h} style={{
                            padding:"5px 10px", fontWeight:700, color:"var(--text3)", fontSize:11,
                            textAlign: i >= 2 ? "center" : "left",
                            borderBottom:"1px solid var(--border)"
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cycleInsts.map((inst, ri) => {
                        const typeLabel =
                          inst.installment_type === "enrollment" ? "Enrollment" :
                          inst.installment_type === "renewal"    ? "Renewal"    : "Balance Payment";
                        return (
                          <tr key={inst.id || ri} style={{borderTop:"1px solid var(--border)"}}>
                            <td style={{padding:"6px 10px",color:"var(--text2)"}}>{inst.paid_date}</td>
                            <td style={{padding:"6px 10px",color:"var(--info)",fontWeight:600,fontSize:11}}>
                              {typeLabel}
                            </td>
                            <td style={{padding:"6px 10px",textAlign:"right",fontFamily:"var(--font-mono)",color:"var(--accent)",fontWeight:700}}>
                              ₹{fmt(inst.amount)}
                            </td>
                            <td style={{padding:"6px 10px",textAlign:"right",fontFamily:"var(--font-mono)",
                              color: fmtF(inst.balance_after) > 0 ? "var(--warn)" : "var(--teal)"}}>
                              ₹{fmt(inst.balance_after)}
                            </td>
                            <td style={{padding:"6px 10px",textAlign:"center",fontSize:11,fontWeight:700,color:"var(--text2)",textTransform:"uppercase"}}>
                              {(inst.mode_of_payment || "cash").toUpperCase()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {fmtF(bill.balance) > 0 && (
                <div className="bill-note">
                  ⚠ Partial payment recorded. Remaining ₹{fmt(bill.balance)} to be paid in installments.
                  GST fully accounted above — no additional GST on balance payments.
                </div>
              )}
            </>
          )}

          {/* ── All cycles history ── */}
          {cycles.length > 0 && (
            <div style={{paddingBottom:8}}>
              <div style={{padding:"12px 16px 6px"}}>
                <div className="bill-section-label">
                  {isStatement ? "Payment History — All Cycles" : "Full Payment History"}
                </div>
              </div>
              <div style={{padding:"0 16px"}}>
                {cycles.map(({ inv, rows }, idx) => (
                  <CycleBlock key={inv} inv={inv} rows={rows} idx={idx} />
                ))}

                {/* grand summary */}
                <div style={{
                  background:"var(--surface2)", border:"1px solid var(--border)",
                  borderRadius:8, padding:"14px 16px", marginBottom:16
                }}>
                  <div className="bill-section-label" style={{marginBottom:10}}>Grand Summary</div>
                  {[
                    { label:"Total Billed (incl. GST)", val:`₹${fmt(grandBilled)}`,   color:"var(--text1)"  },
                    { label:"Total Paid",               val:`₹${fmt(grandPaid)}`,      color:"var(--accent)" },
                    { label:"Outstanding Balance",      val:`₹${fmt(outstandingBal)}`, color: outstandingBal > 0 ? "var(--warn)" : "var(--teal)" },
                  ].map(row => (
                    <div key={row.label} style={{
                      display:"flex", justifyContent:"space-between",
                      padding:"7px 0", borderBottom:"1px solid var(--border)", fontSize:13
                    }}>
                      <span style={{color:"var(--text2)"}}>{row.label}</span>
                      <span style={{fontFamily:"var(--font-mono)",fontWeight:700,color:row.color}}>
                        {row.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bill-footer-text">
            Thank you for choosing {bill.gym_name}!<br/>
            Computer-generated {isStatement ? "statement" : "tax invoice"}. No signature required.
          </div>
        </div>
      </div>
    </div>
  );
}