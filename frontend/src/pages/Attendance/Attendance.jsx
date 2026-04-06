import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import "./Attendance.css";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun",
                "Jul","Aug","Sep","Oct","Nov","Dec"];

const STATUS_META = {
  present:    { label:"Present",      cls:"badge-green"  },
  absent:     { label:"Absent",       cls:"badge-red"    },
  late:       { label:"Late",         cls:"badge-orange" },
  overtime:   { label:"Overtime",     cls:"badge-blue"   },
  half:       { label:"Half Day",     cls:"badge-yellow" },
  leave:      { label:"Leave",        cls:"badge-gray"   },
  auto_absent:  { label:"Auto Absent",     cls:"badge-red"    },
  late_overtime:{ label:"Late + OT",       cls:"badge-purple" },
};

const fmt_mins = (m) => {
  if (!m || m <= 0) return null;
  const h = Math.floor(m / 60), mn = m % 60;
  return h > 0 ? `${h}h ${mn}m` : `${mn}m`;
};

// Format "09:17:00" → "09:17"
const fmt_time = (t) => t ? t.slice(0, 5) : "—";

export default function Attendance() {
  const now  = new Date();
  const [tab,     setTab]     = useState("today");
  const [date,    setDate]    = useState(now.toISOString().split("T")[0]);
  const [month,   setMonth]   = useState(now.getMonth() + 1);
  const [year,    setYear]    = useState(now.getFullYear());
  const [mData,   setMData]   = useState([]);
  const [sData,   setSData]   = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.getElementById("page-title").textContent = "Attendance";
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "today") {
        const [m, s] = await Promise.all([
          api.get(`/members/attendance-log/?date=${date}&ordering=-check_in`),
          api.get(`/staff/attendance/?date=${date}&ordering=-id`),
        ]);
        setMData(m.data.results || m.data);
        setSData(s.data.results || s.data);
      } else {
        const [m, s] = await Promise.all([
          api.get(`/members/attendance-log/?date__year=${year}&date__month=${month}&ordering=-date`),
          api.get(`/staff/attendance/?date__year=${year}&date__month=${month}&ordering=-date`),
        ]);
        setMData(m.data.results || m.data);
        setSData(s.data.results || s.data);
      }
    } finally { setLoading(false); }
  }, [tab, date, month, year]);

  useEffect(() => { load(); }, [load]);

  // ── Stat computations ────────────────────────────────────────────────────
  const sPresent    = sData.filter(a => a.status === "present").length;
  const sLate       = sData.filter(a => a.status === "late" || a.status === "late_overtime").length;
  const sOvertime   = sData.filter(a => a.status === "overtime" || a.status === "late_overtime").length;
  const sAbsent     = sData.filter(a => a.status === "absent" || a.status === "auto_absent").length;
  const sAutoAbsent = sData.filter(a => a.status === "auto_absent").length;

  const mPresent    = mData.filter(a => a.check_in).length;
  const mAbsent     = mData.filter(a => !a.check_in).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Attendance Log</div>
          <div className="page-subtitle">
            Member and staff attendance records.&nbsp;
            <a href="/kiosk" target="_blank" rel="noopener"
              style={{ color:"var(--accent)", fontWeight:700, textDecoration:"none" }}>
              ↗ Open Kiosk
            </a>
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="attendance-controls" style={{
        display:"flex", gap:12, alignItems:"flex-end", flexWrap:"wrap",
        background:"var(--surface)", border:"1px solid var(--border)",
        borderRadius:"var(--radius)", padding:"14px 18px", marginBottom:16,
      }}>
        <div className="staff-tabs" style={{ margin:0, borderBottom:"none", gap:4 }}>
          {["today","monthly"].map(t => (
            <button key={t}
              className={`staff-tab ${tab === t ? "staff-tab--active" : ""}`}
              style={{ padding:"6px 14px", fontSize:13 }}
              onClick={() => setTab(t)}>
              {t === "today" ? "By Date" : "Monthly Report"}
            </button>
          ))}
        </div>

        {tab === "today" ? (
          <div className="form-group" style={{ margin:0 }}>
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={date}
              onChange={e => setDate(e.target.value)} style={{ maxWidth:180 }} />
          </div>
        ) : (
          <>
            <div className="form-group" style={{ margin:0 }}>
              <label className="form-label">Month</label>
              <select className="form-input" style={{ minWidth:100 }} value={month}
                onChange={e => setMonth(+e.target.value)}>
                {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin:0 }}>
              <label className="form-label">Year</label>
              <select className="form-input" style={{ minWidth:90 }} value={year}
                onChange={e => setYear(+e.target.value)}>
                {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </>
        )}

        <button className="btn btn-secondary" onClick={load}>Refresh</button>
        <a href="/kiosk" target="_blank" rel="noopener"
          className="btn btn-primary" style={{ marginLeft:"auto", textDecoration:"none" }}>
          ↗ Open Kiosk
        </a>
      </div>

      {/* ── Stat cards ── */}
      <div className="attendance-stat-grid" style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fill, minmax(140px, 1fr))",
        gap:10, marginBottom:16,
      }}>
        {/* Staff cards */}
        {[
          { label:"Staff Present",    val:sPresent,  color:"var(--teal)",    sub:null },
          { label:"Staff Late",       val:sLate,     color:"#f97316",        sub:sLate > 0 ? "checked in late" : null },
          { label:"Staff Overtime",   val:sOvertime, color:"#3b82f6",        sub:sOvertime > 0 ? "worked extra" : null },
          {
            label:"Staff Absent",
            val:sAbsent,
            color:"var(--danger)",
            sub: sAutoAbsent > 0 ? `${sAutoAbsent} auto-marked` : null,
          },
          /* Member cards */
          { label:"Members Present",  val:mPresent,  color:"var(--accent)",  sub:null },
          { label:"Members Absent",   val:mAbsent,   color:"#ef4444",        sub:null },
          { label:"Total Records",    val:mData.length + sData.length, color:"var(--info)", sub:null },
        ].map(c => (
          <div key={c.label} className="stat-card" style={{ minWidth:0 }}>
            <div className="label">{c.label}</div>
            <div className="value" style={{ color:c.color, fontSize:26 }}>{c.val}</div>
            {c.sub && (
              <div className="sub" style={{ color:c.color, opacity:.8 }}>{c.sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* ── Tables ── */}
      <div className="attendance-grid">

        {/* Member attendance */}
        <div className="card">
          <div className="attendance-table-header">
            <span>Member Attendance</span>
            <div style={{ display:"flex", gap:6 }}>
              <span className="badge badge-green">{mPresent} present</span>
              <span className="badge badge-red">{mAbsent} absent</span>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>ID</th>
                <th>Member</th>
                <th>Date</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign:"center", padding:24, color:"var(--text3)" }}>Loading…</td></tr>
                ) : mData.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign:"center", padding:24, color:"var(--text3)" }}>No records</td></tr>
                ) : mData.map(a => (
                  <tr key={a.id}>
                    <td>
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:12,
                        color:"var(--accent)", fontWeight:600 }}>
                        {a.member_display_id}
                      </span>
                    </td>
                    <td><b>{a.member_name}</b></td>
                    <td style={{ fontSize:12, color:"var(--text3)" }}>{a.date}</td>
                    <td>
                      <span className={`badge ${a.check_in ? "badge-green" : "badge-red"}`}>
                        {a.check_in ? "Present" : "Absent"}
                      </span>
                    </td>
                    <td style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--teal)" }}>
                      {fmt_time(a.check_in)}
                    </td>
                    <td style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--text2)" }}>
                      {a.check_out ? fmt_time(a.check_out) : <span style={{ color:"var(--text3)" }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Staff attendance */}
        <div className="card">
          <div className="attendance-table-header">
            <span>Staff Attendance</span>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <span className="badge badge-green">{sPresent} present</span>
              <span className="badge badge-red">{sAbsent} absent</span>
              {sLate     > 0 && <span className="badge badge-orange">{sLate} late</span>}
              {sOvertime > 0 && <span className="badge badge-blue">{sOvertime} OT</span>}
              {sAbsent   > 0 && <span className="badge badge-red">{sAbsent} absent</span>}
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Staff</th>
                <th>Date</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Worked</th>
                <th>Late</th>
                <th>OT</th>
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign:"center", padding:24, color:"var(--text3)" }}>Loading…</td></tr>
                ) : sData.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign:"center", padding:24, color:"var(--text3)" }}>No records</td></tr>
                ) : sData.map(a => {
                  const lateFmt = fmt_mins(a.late_minutes);
                  const otFmt   = fmt_mins(a.overtime_minutes);
                  const wkFmt   = fmt_mins(a.worked_minutes);
                  const sm      = STATUS_META[a.status] || { label: a.status, cls:"badge-gray" };

                  return (
                    <tr key={a.id}>
                      <td><b>{a.staff_name}</b></td>
                      <td style={{ fontSize:12, color:"var(--text3)" }}>{a.date}</td>
                      <td>
                        <span className={`badge ${sm.cls}`}>{sm.label}</span>
                      </td>
                      <td style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--teal)" }}>
                        {fmt_time(a.check_in)}
                      </td>
                      <td style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--text2)" }}>
                        {a.check_out
                          ? fmt_time(a.check_out)
                          : <span style={{ color:"var(--text3)" }}>—</span>}
                      </td>
                      {/* Worked hours */}
                      <td style={{ fontFamily:"var(--font-mono)", fontSize:12,
                        color: wkFmt ? "var(--text1)" : "var(--text3)" }}>
                        {wkFmt || (a.check_in && !a.check_out
                          ? <span style={{ color:"var(--teal)", fontSize:11 }}>In progress</span>
                          : "—")}
                      </td>
                      {/* Late */}
                      <td>
                        {lateFmt ? (
                          <span style={{
                            fontSize:11, fontWeight:700, color:"#f97316",
                            background:"rgba(249,115,22,.12)",
                            padding:"2px 7px", borderRadius:5,
                          }}>
                            +{lateFmt}
                          </span>
                        ) : (
                          <span style={{ color:"var(--text3)", fontSize:12 }}>—</span>
                        )}
                      </td>
                      {/* Overtime */}
                      <td>
                        {otFmt ? (
                          <span style={{
                            fontSize:11, fontWeight:700, color:"#3b82f6",
                            background:"rgba(59,130,246,.12)",
                            padding:"2px 7px", borderRadius:5,
                          }}>
                            +{otFmt}
                          </span>
                        ) : (
                          <span style={{ color:"var(--text3)", fontSize:12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}