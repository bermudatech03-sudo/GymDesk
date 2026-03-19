import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import "./Attendance.css";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun",
                "Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Attendance() {
  const now  = new Date();
  const [tab,    setTab]    = useState("today");
  const [date,   setDate]   = useState(now.toISOString().split("T")[0]);
  const [month,  setMonth]  = useState(now.getMonth()+1);
  const [year,   setYear]   = useState(now.getFullYear());
  const [mData,  setMData]  = useState([]);   // member attendance
  const [sData,  setSData]  = useState([]);   // staff attendance
  const [loading,setLoading]= useState(false);

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
        setMData(m.data.results||m.data);
        setSData(s.data.results||s.data);
      } else {
        // Monthly report
        const [m, s] = await Promise.all([
          api.get(`/members/attendance-log/?date__year=${year}&date__month=${month}&ordering=-date`),
          api.get(`/staff/attendance/?date__year=${year}&date__month=${month}&ordering=-date`),
        ]);
        setMData(m.data.results||m.data);
        setSData(s.data.results||s.data);
      }
    } finally { setLoading(false); }
  }, [tab, date, month, year]);

  useEffect(() => { load(); }, [load]);

  const mPresent = sData.filter(a=>a.status==="present").length;
  const mAbsent  = sData.filter(a=>a.status==="absent").length;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Attendance Log</div>
          <div className="page-subtitle">
            View member and staff attendance records.&nbsp;
            <a href="/kiosk" target="_blank" rel="noopener"
              style={{color:"var(--accent)",fontWeight:700,textDecoration:"none"}}>
              ↗ Open Kiosk
            </a>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{
        display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap",
        background:"var(--surface)",border:"1px solid var(--border)",
        borderRadius:"var(--radius)",padding:"14px 18px",marginBottom:16
      }}>
        {/* Date / monthly toggle */}
        <div className="staff-tabs" style={{margin:0,borderBottom:"none",gap:4}}>
          {["today","monthly"].map(t=>(
            <button key={t}
              className={`staff-tab ${tab===t?"staff-tab--active":""}`}
              style={{padding:"6px 14px",fontSize:13}}
              onClick={()=>setTab(t)}>
              {t==="today"?"By Date":"Monthly Report"}
            </button>
          ))}
        </div>

        {tab==="today" ? (
          <div className="form-group" style={{margin:0}}>
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={date}
              onChange={e=>setDate(e.target.value)} style={{maxWidth:180}}/>
          </div>
        ) : (
          <>
            <div className="form-group" style={{margin:0}}>
              <label className="form-label">Month</label>
              <select className="form-input" style={{minWidth:100}} value={month}
                onChange={e=>setMonth(+e.target.value)}>
                {MONTHS.map((m,i)=>(
                  <option key={i} value={i+1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{margin:0}}>
              <label className="form-label">Year</label>
              <select className="form-input" style={{minWidth:90}} value={year}
                onChange={e=>setYear(+e.target.value)}>
                {[2024,2025,2026,2027].map(y=>(
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <button className="btn btn-secondary" onClick={load}>Refresh</button>

        {/* Kiosk link */}
        <a href="/kiosk" target="_blank" rel="noopener"
          className="btn btn-primary" style={{marginLeft:"auto",textDecoration:"none"}}>
          ↗ Open Kiosk
        </a>
      </div>

      {/* Stats row */}
      <div className="grid-4" style={{marginBottom:16}}>
        {[
          {label:"Member Check-ins", val:mData.length,   color:"var(--accent)"},
          {label:"Staff Present",    val:mPresent,        color:"var(--teal)"},
          {label:"Staff Absent",     val:mAbsent,         color:"var(--danger)"},
          {label:"Total Records",    val:mData.length+sData.length, color:"var(--info)"},
        ].map(c=>(
          <div key={c.label} className="stat-card">
            <div className="label">{c.label}</div>
            <div className="value" style={{color:c.color,fontSize:28}}>{c.val}</div>
          </div>
        ))}
      </div>

      <div className="attendance-grid">
        {/* Member attendance */}
        <div className="card">
          <div className="attendance-table-header">
            <span>Member Attendance</span>
            <span className="badge badge-green">{mData.length} records</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>ID</th><th>Member</th><th>Date</th>
                <th>Check In</th><th>Check Out</th>
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{textAlign:"center",padding:24,color:"var(--text3)"}}>Loading…</td></tr>
                ) : mData.length===0 ? (
                  <tr><td colSpan={5} style={{textAlign:"center",padding:24,color:"var(--text3)"}}>No records</td></tr>
                ) : mData.map(a=>(
                  <tr key={a.id}>
                    <td>
                      <span style={{fontFamily:"var(--font-mono)",fontSize:12,
                        color:"var(--accent)",fontWeight:600}}>
                        {a.member_display_id}
                      </span>
                    </td>
                    <td><b>{a.member_name}</b></td>
                    <td style={{fontSize:12,color:"var(--text3)"}}>{a.date}</td>
                    <td style={{fontFamily:"var(--font-mono)",fontSize:12,color:"var(--teal)"}}>
                      {a.check_in||"—"}
                    </td>
                    <td style={{fontFamily:"var(--font-mono)",fontSize:12,color:"var(--text2)"}}>
                      {a.check_out||<span style={{color:"var(--text3)"}}>—</span>}
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
            <span className="badge badge-teal">{sData.length} records</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Staff</th><th>Date</th><th>Status</th>
                <th>Check In</th><th>Check Out</th>
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{textAlign:"center",padding:24,color:"var(--text3)"}}>Loading…</td></tr>
                ) : sData.length===0 ? (
                  <tr><td colSpan={5} style={{textAlign:"center",padding:24,color:"var(--text3)"}}>No records</td></tr>
                ) : sData.map(a=>(
                  <tr key={a.id}>
                    <td><b>{a.staff_name}</b></td>
                    <td style={{fontSize:12,color:"var(--text3)"}}>{a.date}</td>
                    <td>
                      <span className={`badge ${
                        a.status==="present" ? "badge-green" :
                        a.status==="absent"  ? "badge-red"   : "badge-yellow"
                      }`}>{a.status}</span>
                    </td>
                    <td style={{fontFamily:"var(--font-mono)",fontSize:12,color:"var(--teal)"}}>
                      {a.check_in||"—"}
                    </td>
                    <td style={{fontFamily:"var(--font-mono)",fontSize:12,color:"var(--text2)"}}>
                      {a.check_out||<span style={{color:"var(--text3)"}}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}