/**
 * MonthlyReport.jsx — detailed monthly finance report modal
 * for GST filing. Triggered from Finances page.
 */
import { useState, useEffect } from "react";
import XLSXStyle from "xlsx-js-style";
import api from "../api/axios";
import "./Monthlyreport.css";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function MonthlyReport({ defaultMonth, defaultYear, onClose }) {
  const now = new Date();
  const [month, setMonth] = useState(defaultMonth || now.getMonth() + 1);
  const [year, setYear] = useState(defaultYear || now.getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/finances/monthly-report/?year=${year}&month=${month}`);
      setReport(res.data);
      console.log(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDownload = () => {
    const html = document.getElementById("report-printable").outerHTML;
    const full = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Finance Report ${MONTHS[month - 1]} ${year}</title>
<style>
  *{margin:0;padding:0;box-sizing: border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f4;padding:32px 16px;color:#111;font-size:13px}
  .rp{max-width:1200px;margin:0 auto;background:#fff;border-radius:10px;
      box-shadow:0 4px 20px rgba(0,0,0,.1);overflow:hidden}
  .rp-body{padding:28px 24px}
  .rp-header{background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:24px 24px}
  .rp-header h1{font-size:20px;font-weight:800;margin-bottom:6px;letter-spacing:.5px}
  .rp-gym-info{font-size:12px;color:rgba(255,255,255,.65);line-height:1.8}
  .rp-period{display:inline-block;margin-top:8px;background:rgba(168,255,87,.15);
    color:#a8ff57;border:1px solid rgba(168,255,87,.3);border-radius:100px;
    padding:3px 14px;font-size:11px;font-weight:700;letter-spacing:1px}
  /* summary grid */
  .summary-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:20px 0}
  .summary-box{border:1px solid #e8e8e8;border-radius:8px;padding:10px 8px;text-align:center;background:#fafafa}
  .summary-box .s-lbl{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.5px;
    margin-bottom:6px;line-height:1.4}
  .summary-box .s-val{font-size:13px;font-weight:800;font-family:'Courier New',monospace;
    word-break:break-all;line-height:1.2}
  .s-green{color:#1a7a00}.s-red{color:#cc0000}.s-blue{color:#1a3a9a}
  /* section titles */
  .rp-section-title{font-size:12px;font-weight:800;text-transform:uppercase;
    letter-spacing:1px;color:#1a1a2e;padding-bottom:6px;margin:20px 0 10px;
    border-bottom:2px solid #1a1a2e;display:flex;justify-content:space-between;align-items:center}
  .rp-section-title .count{font-size:10px;font-weight:600;color:#888;
    background:#f0f0f0;padding:2px 8px;border-radius:100px;letter-spacing:0}
  /* tables */
  .rp-table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:4px;table-layout:fixed}
  .rp-table thead tr{background:#f5f5f5}
  .rp-table th{padding:7px 8px;text-align:left;font-size:9px;font-weight:800;
    text-transform:uppercase;letter-spacing:.5px;color:#555;
    border-bottom:2px solid #ddd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .rp-table th.r{text-align:right}
  .rp-table th.c{text-align:center}
  .rp-table td{padding:6px 8px;border-bottom:1px solid #f2f2f2;vertical-align:middle;color:#333;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rp-table td.r{text-align:right;font-family:'Courier New',monospace;white-space:nowrap;overflow:visible}
  .rp-table td.c{text-align:center}
  .rp-table td.mono{font-family:'Courier New',monospace;font-size:10px;color:#666}
  .rp-table .total-row td{font-weight:800;background:#f0f0f0;border-top:2px solid #ccc;
    border-bottom:none;font-size:12px}
  .rp-table tbody tr:hover td{background:#fafafa}
  /* income table col widths — 9 cols */
  .income-table col.col-date{width:11%}.income-table col.col-inv{width:13%}
  .income-table col.col-src{width:15%}
  .income-table col.col-base{width:11%}.income-table col.col-gp{width:9%}
  .income-table col.col-gamt{width:10%}.income-table col.col-plan{width:11%}
  .income-table col.col-paid{width:12%}.income-table col.col-mode{width:8%}
  /* expense table col widths */
  .expense-table col.col-date{width:12%}.expense-table col.col-desc{width:40%}
  .expense-table col.col-vendor{width:30%}
  .expense-table col.col-amt{width:18%}
  /* GST summary table */
  .gst-table{width:100%;border-collapse:collapse;font-size:13px;max-width:420px}
  .gst-table td{padding:9px 14px;border-bottom:1px solid #eee;color:#333}
  .gst-table td:last-child{text-align:right;font-family:'Courier New',monospace;font-weight:700}
  .gst-table .gst-total td{font-size:14px;font-weight:800;background:#f5f5f5;
    border-top:2px solid #ccc;border-bottom:none}
  .gst-table .gst-total td:last-child{color:#cc0000}
  /* footer */
  .rp-footer{margin-top:24px;text-align:center;font-size:11px;color:#aaa;
    border-top:1px solid #eee;padding:14px 24px;background:#fafafa;line-height:1.8}
  @media print{
    body{background:#fff;padding:0}
    .rp{box-shadow:none;border-radius:0}
  }
</style>
</head><body>${html}</body></html>`;
    const blob = new Blob([full], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Finance_Report_${MONTHS[month - 1]}_${year}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExcelDownload = () => {
    // ── shared style helpers ────────────────────────────────────────────────
    const DARK = "1A1A2E";   // gym dark navy
    const GREEN = "2D6A4F";   // header green
    const LTGRN = "D8F3DC";   // income row tint
    const LTRED = "FFE8E8";   // expense row tint
    const GOLD = "F9A825";   // total row accent
    const TOTBG = "FFF3CD";   // total row bg

    const font = (bold, color = "000000", sz = 10) => ({ bold, color: { rgb: color }, sz, name: "Calibri" });
    const fill = hex => ({ type: "pattern", pattern: "solid", fgColor: { rgb: hex } });
    const border = () => ({
      top: { style: "thin", color: { rgb: "CCCCCC" } },
      bottom: { style: "thin", color: { rgb: "CCCCCC" } },
      left: { style: "thin", color: { rgb: "CCCCCC" } },
      right: { style: "thin", color: { rgb: "CCCCCC" } },
    });
    const align = (h, wrapText = false) => ({ horizontal: h, vertical: "center", wrapText });

    const hdrStyle = (bg = GREEN) => ({ font: font(true, "FFFFFF", 10), fill: fill(bg), border: border(), alignment: align("center") });
    const titleStyle = () => ({ font: font(true, "FFFFFF", 13), fill: fill(DARK), alignment: align("center") });
    const totalStyle = (color = "000000") => ({
      font: font(true, color, 10), fill: fill(TOTBG),
      border: {
        top: { style: "medium", color: { rgb: GOLD } }, bottom: { style: "medium", color: { rgb: GOLD } },
        left: border().left, right: border().right
      },
      alignment: align("center"),
    });
    const dataStyle = (bg = "FFFFFF", bold = false, color = "333333", h = "left") =>
      ({ font: font(bold, color, 10), fill: fill(bg), border: border(), alignment: align(h) });
    const numStyle = (bg = "FFFFFF", bold = false, color = "1A5C1A") =>
    ({
      font: font(bold, color, 10), fill: fill(bg), border: border(), alignment: align("right"),
      numFmt: '₹#,##0.00'
    });

    // helper: write a 2D array of { v, s } cells into a worksheet
    const buildSheet = (rows2d, colWidths) => {
      const ws = {};
      let maxR = 0, maxC = 0;
      rows2d.forEach((row, r) => {
        row.forEach((cell, c) => {
          const addr = XLSXStyle.utils.encode_cell({ r, c });
          ws[addr] = { v: cell.v ?? "", t: typeof cell.v === "number" ? "n" : "s", s: cell.s };
          if (cell.numFmt) ws[addr].z = cell.numFmt;
          maxR = Math.max(maxR, r); maxC = Math.max(maxC, c);
        });
      });
      ws["!ref"] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
      ws["!cols"] = colWidths.map(w => ({ wch: w }));
      ws["!rows"] = [{ hpt: 24 }, { hpt: 20 }];  // title + header rows taller
      return ws;
    };

    const periodLabel = `${MONTHS[month - 1]} ${year}`;
    const gymName = report.gym?.name || "Gym";

    // ── INCOME SHEET ──────────────────────────────────────────────────────
    const incHdrs = ["Date", "Invoice", "Source", "Base Amount", "GST %", "GST Amt", "Plan Total", "Amt Paid", "Mode"];
    const incData = report.incomes || [];

    const incRows2d = [
      // Title row spanning all cols (only cell A1 filled; Excel merge done below)
      [{ v: `${gymName} — Income Report — ${periodLabel}`, s: titleStyle() },
      ...Array(incHdrs.length - 1).fill({ v: "", s: titleStyle() })],
      // Header row
      incHdrs.map(h => ({ v: h, s: hdrStyle(GREEN) })),
      // Data rows — alternating tint
      ...incData.map((i, idx) => {
        const bg = idx % 2 === 0 ? "FFFFFF" : LTGRN;
        return [
          { v: i.date, s: dataStyle(bg) },
          { v: i.invoice_number || "—", s: dataStyle(bg, false, "555555") },
          { v: i.source, s: dataStyle(bg, false, "333333", "left") },
          { v: Number(i.base_amount || 0), s: numStyle(bg), numFmt: '₹#,##0.00' },
          { v: Number(i.gst_rate || 0), s: dataStyle(bg, false, "CC5500", "center") },
          { v: Number(i.gst_amount || 0), s: numStyle(bg), numFmt: '₹#,##0.00' },
          { v: i.plan_total != null ? Number(i.plan_total) : "", s: numStyle(bg), numFmt: '₹#,##0.00' },
          { v: Number(i.amount || 0), s: numStyle(bg, true, "1A5C1A"), numFmt: '₹#,##0.00' },
          { v: (i.mode_of_payment || "cash").toUpperCase(), s: dataStyle(bg, false, "1A3A9A", "center") },
        ];
      }),
      // Total row
      [
        { v: "TOTAL", s: totalStyle() },
        { v: "", s: totalStyle() },
        { v: `${incData.length} transaction${incData.length !== 1 ? "s" : ""}`, s: totalStyle("555555") },
        { v: Number(report.total_base || 0), s: totalStyle("1A5C1A"), numFmt: '₹#,##0.00' },
        { v: "", s: totalStyle() },
        { v: Number(report.total_gst || 0), s: totalStyle("CC5500"), numFmt: '₹#,##0.00' },
        { v: "", s: totalStyle() },
        { v: Number(report.total_income_collected || 0), s: totalStyle("1A5C1A"), numFmt: '₹#,##0.00' },
        { v: "", s: totalStyle() },
      ],
    ];
    const wsIncome = buildSheet(incRows2d, [11, 13, 22, 13, 7, 12, 13, 12, 10]);
    // Merge title row across all columns
    wsIncome["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: incHdrs.length - 1 } }];
    wsIncome["!freeze"] = { xSplit: 0, ySplit: 2 };  // freeze title + header

    // ── EXPENSE SHEET ─────────────────────────────────────────────────────
    const expHdrs = ["Date", "Description", "Vendor", "Amount"];
    const expData = report.expenses || [];

    const expRows2d = [
      [{ v: `${gymName} — Expenses — ${periodLabel}`, s: titleStyle() },
      ...Array(expHdrs.length - 1).fill({ v: "", s: titleStyle() })],
      expHdrs.map(h => ({ v: h, s: hdrStyle("C0392B") })),
      ...expData.map((e, idx) => {
        const bg = idx % 2 === 0 ? "FFFFFF" : LTRED;
        return [
          { v: e.date, s: dataStyle(bg) },
          { v: e.description, s: dataStyle(bg, false, "333333", "left") },
          { v: e.vendor || "—", s: dataStyle(bg, false, "555555") },
          { v: Number(e.amount || 0), s: numStyle(bg, false, "CC0000"), numFmt: '₹#,##0.00' },
        ];
      }),
      [
        { v: "TOTAL", s: totalStyle() },
        { v: "", s: totalStyle() },
        { v: `${expData.length} transaction${expData.length !== 1 ? "s" : ""}`, s: totalStyle("555555") },
        { v: Number(report.total_expense || 0), s: totalStyle("CC0000"), numFmt: '₹#,##0.00' },
      ],
    ];
    const wsExpense = buildSheet(expRows2d, [11, 36, 24, 14]);
    wsExpense["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: expHdrs.length - 1 } }];
    wsExpense["!freeze"] = { xSplit: 0, ySplit: 2 };

    // ── SUMMARY SHEET ─────────────────────────────────────────────────────
    const net = Number(report.net || 0);
    const summaryRows2d = [
      [{ v: `${gymName} — Finance Summary — ${periodLabel}`, s: titleStyle() },
      { v: "", s: titleStyle() }],
      [{ v: "Description", s: hdrStyle(DARK) }, { v: "Amount", s: hdrStyle(DARK) }],
      [{ v: "Total Income (incl. GST)", s: dataStyle("D8F3DC", true, "2D6A4F") },
      { v: Number(report.total_income_collected || 0), s: numStyle("D8F3DC", true, "2D6A4F"), numFmt: '₹#,##0.00' }],
      [{ v: "GST Collected", s: dataStyle("E8F4FD", false, "1A3A9A") },
      { v: Number(report.total_gst || 0), s: numStyle("E8F4FD", false, "1A3A9A"), numFmt: '₹#,##0.00' }],
      [{ v: "Taxable Base Income", s: dataStyle("FFFFFF") },
      { v: Number(report.total_base || 0), s: numStyle("FFFFFF"), numFmt: '₹#,##0.00' }],
      [{ v: "Total Expenses", s: dataStyle("FFE8E8", false, "CC0000") },
      { v: Number(report.total_expense || 0), s: numStyle("FFE8E8", false, "CC0000"), numFmt: '₹#,##0.00' }],
      // Divider
      [{ v: "", s: dataStyle("EEEEEE") }, { v: "", s: dataStyle("EEEEEE") }],
      // Net P&L row — green if profit, red if loss
      [{
        v: "NET PROFIT / LOSS", s: {
          font: font(true, net >= 0 ? "FFFFFF" : "FFFFFF", 12),
          fill: fill(net >= 0 ? "2D6A4F" : "C0392B"), border: border(), alignment: align("left")
        }
      },
      {
        v: net, s: {
          font: font(true, net >= 0 ? "FFFFFF" : "FFFFFF", 12),
          fill: fill(net >= 0 ? "2D6A4F" : "C0392B"), border: border(), alignment: align("right"),
          numFmt: '₹#,##0.00'
        }, numFmt: '₹#,##0.00'
      }],
    ];
    const wsSummary = buildSheet(summaryRows2d, [32, 18]);
    wsSummary["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    wsSummary["!rows"] = [{ hpt: 26 }, { hpt: 20 }, ...Array(8).fill({ hpt: 22 })];

    // ── Build workbook ─────────────────────────────────────────────────────
    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, wsIncome, "Income");
    XLSXStyle.utils.book_append_sheet(wb, wsExpense, "Expenses");
    XLSXStyle.utils.book_append_sheet(wb, wsSummary, "Summary");
    XLSXStyle.writeFile(wb, `Finance_Report_${MONTHS[month - 1]}_${year}.xlsx`);
  };

  const fmt = v => `₹${Number(v || 0).toLocaleString("en-IN")}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal report-modal" onClick={e => e.stopPropagation()}>

        {/* ── Sticky controls bar ── */}
        <div className="report-controls no-print">
          <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700 }}>
              Monthly Finance Report
            </span>
            <select className="form-input" style={{ maxWidth: 100 }} value={month}
              onChange={e => setMonth(+e.target.value)}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select className="form-input" style={{ maxWidth: 90 }} value={year}
              onChange={e => setYear(+e.target.value)}>
              {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
              {loading ? "Loading…" : "Load"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {report && (
              <>
                <button className="btn btn-secondary btn-sm" onClick={handleDownload}>
                  ⬇ HTML
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleExcelDownload}>
                  ⬇ Excel
                </button>
              </>
            )}
            <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: 48, color: "var(--text3)", fontSize: 14 }}>
            Loading report…
          </div>
        )}

        {/* ── Printable / downloadable report body ── */}
        {report && (
          <div id="report-printable" className="rp">

            {/* Header band */}
            <div className="rp-header">
              <h1>{report.gym?.name || "Gym"} — Finance Report</h1>
              <div className="rp-gym-info">
                {[report.gym?.address, report.gym?.phone, report.gym?.gstin ? `GSTIN: ${report.gym.gstin}` : null]
                  .filter(Boolean).join("  ·  ")}
              </div>
              <div className="rp-period">{report.month_name} {report.year}</div>
            </div>

            <div className="rp-body">

              {/* ── Summary grid ── */}
              <div className="summary-grid">
                {[
                  { lbl: "Total Income (incl. GST) To Collect", val: fmt(report.total_income_to_collect), cls: "s-green" },
                  { lbl: "Total Base Income To Collect", val: fmt(report.total_base_income_to_collect), cls: "s-green" },
                  { lbl: "GST To Collect", val: fmt(report.total_gst_to_collect), cls: "s-green" },
                  { lbl: "Total Income (incl. GST)", val: fmt(report.total_income_collected), cls: "s-green" },
                  { lbl: "GST Collected", val: fmt(report.total_gst_collected), cls: "s-blue" },
                  { lbl: "Taxable Base Income", val: fmt(report.total_base), cls: "" },
                  { lbl: "Total Expenses", val: fmt(report.total_expense), cls: "s-red" },
                  {
                    lbl: "Net Profit / Loss", val: fmt(report.net),
                    cls: (report.net >= 0) ? "s-green" : "s-red"
                  },
                ].map(b => (
                  <div key={b.lbl} className="summary-box">
                    <div className="s-lbl">{b.lbl}</div>
                    <div className={`s-val ${b.cls}`}>{b.val}</div>
                  </div>
                ))}
              </div>

              {/* ── Income table ── */}
              <div className="rp-section-title">
                <span>Income Transactions</span>
                <span className="count">{report.incomes?.length || 0} records</span>
              </div>
              <div className="rp-table-wrap">
                <table className="rp-table income-table">
                  <colgroup>
                    <col className="col-date" />
                    <col className="col-inv" />
                    <col className="col-src" />
                    <col className="col-base" />
                    <col className="col-gp" />
                    <col className="col-gamt" />
                    <col className="col-plan" />
                    <col className="col-paid" />
                    <col className="col-mode" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice</th>
                      <th>Source</th>
                      <th className="r">Base Amt</th>
                      <th className="c">GST %</th>
                      <th className="r">GST Amt</th>
                      <th className="r">Plan Total</th>
                      <th className="r">Amt Paid</th>
                      <th className="c">Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.incomes?.map(i => (
                      <tr key={i.id}>
                        <td>{i.date}</td>
                        <td className="mono">{i.invoice_number || "—"}</td>
                        <td title={i.source}>{i.source}</td>
                        <td className="r s-green">
                          ₹{Number(i.base_amount || 0).toLocaleString("en-IN")}
                        </td>
                        {/* GST% + sub-label showing what amount it applies to */}
                        <td className="c">
                          <span>{i.gst_rate || 0}%</span>
                          {i.plan_total != null && (
                            <div className="gst-of-label">
                              of ₹{Number(i.plan_total).toLocaleString("en-IN")}
                            </div>
                          )}
                        </td>
                        <td className="r">
                          ₹{Number(i.gst_amount || 0).toLocaleString("en-IN")}
                        </td>
                        {/* Plan Total — full plan value (base + GST), highlighted */}
                        <td className="r plan-total-cell">
                          {i.plan_total != null
                            ? `₹${Number(i.plan_total).toLocaleString("en-IN")}`
                            : "—"}
                        </td>
                        {/* Paid Now — actual cash received this installment */}
                        <td className="r" style={{ fontWeight: 700 }}>
                          ₹{Number(i.amount).toLocaleString("en-IN")}
                        </td>
                        <td className="c" style={{ textTransform: "uppercase", fontSize: 10, fontWeight: 700, color: "var(--text2,#555)" }}>
                          {(i.mode_of_payment || "cash").toUpperCase()}
                        </td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan={3}>TOTAL INCOME</td>
                      <td className="r s-green">{fmt(report.total_base)}</td>
                      <td className="c">—</td>
                      <td className="r">{fmt(report.total_gst)}</td>
                      <td className="r">—</td>
                      <td className="r">{fmt(report.total_income)}</td>
                      <td className="c">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ── Expense table ── */}
              <div className="rp-section-title" style={{ marginTop: 24 }}>
                <span>Expense Transactions</span>
                <span className="count">{report.expenses?.length || 0} records</span>
              </div>
              <div className="rp-table-wrap">
                <table className="rp-table expense-table">
                  <colgroup>
                    <col className="col-date" /><col className="col-desc" />
                    <col className="col-vendor" />
                    <col className="col-amt" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Vendor</th>
                      <th className="r">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.expenses?.map(e => (
                      <tr key={e.id}>
                        <td>{e.date}</td>
                        <td title={e.description}>{e.description}</td>
                        <td title={e.vendor || "—"}>{e.vendor || "—"}</td>
                        <td className="r s-red">₹{Number(e.amount).toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan={3}>TOTAL EXPENSES</td>
                      <td className="r s-red">{fmt(report.total_expense)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ── GST Summary ── */}
              <div className="rp-section-title" style={{ marginTop: 24 }}>
                <span>GST Summary (for filing)</span>
              </div>
              <table className="gst-table">
                <tbody>
                  <tr>
                    <td>Taxable Value (Base Income)</td>
                    <td>{fmt(report.total_base)}</td>
                  </tr>
                  <tr>
                    <td>CGST (9%)</td>
                    <td>{fmt(report.total_gst / 2)}</td>
                  </tr>
                  <tr>
                    <td>SGST (9%)</td>
                    <td>{fmt(report.total_gst / 2)}</td>
                  </tr>
                  <tr className="gst-total">
                    <td>Total GST Liability</td>
                    <td>{fmt(report.total_gst)}</td>
                  </tr>
                </tbody>
              </table>

              {/* ── Profit / Loss summary ── */}
              <div className="rp-section-title" style={{ marginTop: 24 }}>
                <span>Profit &amp; Loss Summary</span>
              </div>
              <table className="gst-table">
                <tbody>
                  <tr>
                    <td>Total Income (incl. GST)</td>
                    <td className="s-green">{fmt(report.total_income)}</td>
                  </tr>
                  <tr>
                    <td>Total Expenses</td>
                    <td className="s-red">− {fmt(report.total_expense)}</td>
                  </tr>
                  <tr className="gst-total">
                    <td>Net Profit / Loss</td>
                    <td className={report.net >= 0 ? "s-green" : "s-red"}>
                      {fmt(report.net)}
                    </td>
                  </tr>
                </tbody>
              </table>

            </div>{/* /rp-body */}

            {/* Footer */}
            <div className="rp-footer">
              Generated on {new Date().toLocaleDateString("en-IN")}
              &nbsp;·&nbsp; {report.gym?.name}
              &nbsp;·&nbsp; GSTIN: {report.gym?.gstin || "N/A"}<br />
              This report is auto-generated by GymPro CRM. For internal use only.
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
