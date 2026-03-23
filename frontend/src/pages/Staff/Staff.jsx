import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import "./Staff.css";

const SHIFTS = {
  morning:"Morning 6-2PM", evening:"Evening 2-10PM",
  full:"Full Day", off:"Day Off"
};
const ROLES = ["trainer","receptionist","cleaner","manager","other"];

function StaffModal({ staff, onClose, onSave }) {
  const [form, setForm] = useState(staff || {
  
    name:"", phone:"", email:"", role:"trainer",
    shift:"morning", salary:"", status:"active", notes:""
  });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (staff?.id) {
        await api.patch(`/staff/members/${staff.id}/`, form);
        toast.success("Staff updated!");
      } else {
        await api.post("/staff/members/", form);
        toast.success("Staff added!");
      }
      onSave();
    } catch { toast.error("Something went wrong"); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-title">{staff?.id ? "Edit Staff" : "Add Staff Member"}</div>
        <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="grid-2">
            
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={form.name}
                onChange={e=>set("name",e.target.value)} required/>
            </div>
            <div className="form-group">
              <label className="form-label">Phone *</label>
              <input className="form-input" value={form.phone}
                onChange={e=>set("phone",e.target.value)} required/>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email}
                onChange={e=>set("email",e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-input" value={form.role}
                onChange={e=>set("role",e.target.value)}>
                {ROLES.map(r=>(
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase()+r.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Shift</label>
              <select className="form-input" value={form.shift}
                onChange={e=>set("shift",e.target.value)}>
                {Object.entries(SHIFTS).map(([k,v])=>(
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Salary (₹)</label>
              <input className="form-input" type="number" value={form.salary}
                onChange={e=>set("salary",e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status}
                onChange={e=>set("status",e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-input" value={form.notes}
              onChange={e=>set("notes",e.target.value)} rows={2}/>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AttendanceModal({ staffList, onClose, onSave }) {
  const today = new Date().toISOString().split("T")[0];
  const [date,    setDate]    = useState(today);
  const [records, setRecords] = useState({});
  const [saving,  setSaving]  = useState(false);

  const toggle = (id, field, val) =>
    setRecords(p => ({...p, [id]: {...(p[id]||{status:"present"}), [field]: val}}));

  const submit = async () => {
    setSaving(true);
    const recs = staffList.filter(s=>s.status==="active").map(s => ({
      staff:     s.id,
      date,
      status:    records[s.id]?.status    || "present",
      check_in:  records[s.id]?.check_in  || null,
      check_out: records[s.id]?.check_out || null,
    }));
    try {
      await api.post("/staff/attendance/bulk_mark/", { records: recs });
      toast.success("Attendance marked!");
      onSave();
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{maxWidth:700}} onClick={e=>e.stopPropagation()}>
        <div className="modal-title">Mark Attendance</div>
        <div style={{marginBottom:16}}>
          <label className="form-label">Date</label>
          <input className="form-input" type="date" value={date}
            onChange={e=>setDate(e.target.value)} style={{maxWidth:180,marginTop:4}}/>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>ID</th><th>Name</th><th>Role</th><th>Status</th>
              <th>Check In</th><th>Check Out</th>
            </tr></thead>
            <tbody>
              {staffList.filter(s=>s.status==="active").map(s=>(
                <tr key={s.id}>
                  <td>
                    <span style={{fontFamily:"var(--font-mono)",fontSize:12,
                      color:"var(--teal)",fontWeight:700,
                      background:"rgba(45,255,195,.1)",padding:"2px 8px",
                      borderRadius:6}}>
                      {s.staff_id_display||`S${String(s.id).padStart(4,"0")}`}
                    </span>
                  </td>
                  <td>
                    <span className="staff-id">
                      {s.staff_id_display || `S${String(s.id).padStart(4,"0")}`}
                    </span>
                  </td>
                  <td><b>{s.name}</b></td>
                  <td><span className="badge badge-blue">{s.role}</span></td>
                  <td>
                    <select className="form-input" style={{minWidth:110}}
                      value={records[s.id]?.status||"present"}
                      onChange={e=>toggle(s.id,"status",e.target.value)}>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="half">Half Day</option>
                      <option value="leave">Leave</option>
                    </select>
                  </td>
                  <td>
                    <input className="form-input" type="time" style={{minWidth:110}}
                      value={records[s.id]?.check_in||""}
                      onChange={e=>toggle(s.id,"check_in",e.target.value)}/>
                  </td>
                  <td>
                    <input className="form-input" type="time" style={{minWidth:110}}
                      value={records[s.id]?.check_out||""}
                      onChange={e=>toggle(s.id,"check_out",e.target.value)}/>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Mark Attendance"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Payments Tab ─────────────────────────────────── */
function PaymentsTab({ staffList }) {
  const now = new Date();
  const [month,    setMonth]    = useState(now.getMonth()+1);
  const [year,     setYear]     = useState(now.getFullYear());
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [loaded,   setLoaded]   = useState(false);
  const [genLoading, setGenLoading] = useState(false);

  // Load payments for the selected month+year
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Format as YYYY-MM-01 to match month field
      const monthStr = `${year}-${String(month).padStart(2,"0")}-01`;
      const res = await api.get(`/staff/payments/?month=${monthStr}&ordering=staff__name`);
      setPayments(res.data.results || res.data);
      setLoaded(true);
    } finally { setLoading(false); }
  }, [month, year]);

  const generate = async () => {
    if (!confirm(`Generate salary records for all active staff for ${month}/${year}?`)) return;
    setGenLoading(true);
    try {
      const res = await api.post("/staff/members/generate-payments/", { year, month });
      toast.success(`${res.data.created} salary records created`);
      load();
    } catch { toast.error("Failed to generate"); }
    finally { setGenLoading(false); }
  };

  const markPaid = async (p) => {
    try {
      await api.post(`/staff/payments/${p.id}/mark_paid/`);
      toast.success(`₹${Number(p.amount).toLocaleString("en-IN")} recorded in Finances!`);
      load();
    } catch(err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const markUnpaid = async (p) => {
    if (!confirm("Mark as unpaid? This will also remove the Finance record.")) return;
    try {
      await api.post(`/staff/payments/${p.id}/mark_unpaid/`);
      toast.success("Marked unpaid. Finance expense removed.");
      load();
    } catch(err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const pending = payments.filter(p=>p.status==="pending");
  const paid    = payments.filter(p=>p.status==="paid");
  const totalPending = pending.reduce((s,p)=>s+parseFloat(p.amount||0),0);
  const totalPaid    = paid.reduce((s,p)=>s+parseFloat(p.amount||0),0);

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun",
                  "Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div>
      {/* ── Controls ── */}
      <div style={{
        background:"var(--surface)", border:"1px solid var(--border)",
        borderRadius:"var(--radius)", padding:"16px 20px",
        display:"flex", alignItems:"flex-end", gap:12,
        flexWrap:"wrap", marginBottom:16
      }}>
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
        <button className="btn btn-primary" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Load Records"}
        </button>
        <button className="btn btn-secondary" onClick={generate} disabled={genLoading}>
          {genLoading ? "Generating…" : "Generate Salaries"}
        </button>
        <div style={{marginLeft:"auto",fontSize:12,color:"var(--text3)",lineHeight:1.5}}>
          Generate creates pending salary records<br/>for all active staff for selected month.
        </div>
      </div>

      {/* ── Summary cards ── */}
      {loaded && (
        <div className="grid-3" style={{marginBottom:16}}>
          <div className="stat-card">
            <div className="label">Total Staff</div>
            <div className="value">{payments.length}</div>
          </div>
          <div className="stat-card">
            <div className="label">Pending Salary</div>
            <div className="value" style={{color:"var(--warn)"}}>
              ₹{totalPending.toLocaleString("en-IN")}
            </div>
            <div className="sub">{pending.length} staff unpaid</div>
          </div>
          <div className="stat-card">
            <div className="label">Paid Out</div>
            <div className="value" style={{color:"var(--accent)"}}>
              ₹{totalPaid.toLocaleString("en-IN")}
            </div>
            <div className="sub">{paid.length} staff paid</div>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      {!loaded ? (
        <div style={{
          textAlign:"center", padding:"60px 20px",
          color:"var(--text3)", fontSize:14,
          background:"var(--surface)", borderRadius:"var(--radius)",
          border:"1px solid var(--border)"
        }}>
          Select month & year above, then click <b style={{color:"var(--text2)"}}>Load Records</b>
        </div>
      ) : loading ? (
        <div style={{textAlign:"center",padding:40,color:"var(--text3)"}}>Loading…</div>
      ) : payments.length === 0 ? (
        <div style={{
          textAlign:"center", padding:"48px 20px",
          color:"var(--text3)", fontSize:13,
          background:"var(--surface)", borderRadius:"var(--radius)",
          border:"1px solid var(--border)"
        }}>
          No salary records for {MONTHS[month-1]} {year}.<br/>
          <span style={{color:"var(--text2)"}}>Click "Generate Salaries" to create them.</span>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Staff Name</th>
                  <th>Role</th>
                  <th>Shift</th>
                  <th>Amount</th>
                  <th>Paid Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {/* Pending first, then paid */}
                {[...pending, ...paid].map(p=>(
                  <tr key={p.id} style={{
                    opacity: p.status==="paid" ? 0.75 : 1
                  }}>
                    <td><b>{p.staff_name}</b></td>
                    <td>
                      <span className="badge badge-blue" style={{fontSize:10}}>
                        {p.staff_role||"—"}
                      </span>
                    </td>
                    <td style={{fontSize:12,color:"var(--text3)"}}>
                      {p.staff_shift ? SHIFTS[p.staff_shift]||p.staff_shift : "—"}
                    </td>
                    <td style={{
                      fontFamily:"var(--font-mono)", fontWeight:600,
                      color: p.status==="paid" ? "var(--accent)" : "var(--warn)"
                    }}>
                      ₹{Number(p.amount).toLocaleString("en-IN")}
                    </td>
                    <td style={{fontSize:12,color:"var(--text3)"}}>
                      {p.paid_date || "—"}
                    </td>
                    <td>
                      <span className={`badge ${p.status==="paid"?"badge-green":"badge-yellow"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      {p.status !== "paid" ? (
                        <button className="btn btn-sm btn-primary" onClick={()=>markPaid(p)}>
                          ✓ Mark Paid
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm"
                          style={{
                            background:"rgba(255,91,91,.12)",
                            color:"var(--danger)",
                            border:"1px solid rgba(255,91,91,.25)"
                          }}
                          onClick={()=>markUnpaid(p)}
                        >
                          ↩ Undo
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Staff page ──────────────────────────────── */
export default function Staff() {
  const [staffList,  setStaffList]  = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [tab,        setTab]        = useState("staff");
  const [modal,      setModal]      = useState(null);
  const [selected,   setSelected]   = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    document.getElementById("page-title").textContent = "Staff";
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([
        api.get("/staff/members/"),
        api.get("/staff/attendance/today/"),
      ]);
      setStaffList(s.data.results||s.data);
      setAttendance(a.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Staff Management</div>
          <div className="page-subtitle">Attendance, shifts and salary tracking</div>
        </div>
        <div style={{display:"flex",gap:10}}>
          {tab==="attendance" && (
            <button className="btn btn-secondary" onClick={()=>setModal("attendance")}>
              Mark Attendance
            </button>
          )}
          {tab==="staff" && (
            <button className="btn btn-primary" onClick={()=>setModal("add")}>
              + Add Staff
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="staff-tabs">
        {["staff","attendance","payments"].map(t=>(
          <button key={t}
            className={`staff-tab ${tab===t?"staff-tab--active":""}`}
            onClick={()=>setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Staff list ── */}
      {tab==="staff" && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>ID</th><th>Name</th><th>Role</th><th>Shift</th>
                <th>Phone</th><th>Salary</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{textAlign:"center",padding:32,color:"var(--text3)"}}>Loading…</td></tr>
                ) : staffList.map(s=>(
                  <tr key={s.id}>
                    <td>
                      <span className="staff-id">
                        {s.staff_id_display || `S${String(s.id).padStart(4,"0")}`}
                      </span>
                    </td>
                    <td><b>{s.name}</b></td>
                    <td><span className="badge badge-blue">{s.role}</span></td>
                    <td style={{fontSize:12,color:"var(--text2)"}}>{SHIFTS[s.shift]||s.shift}</td>
                    <td style={{color:"var(--text3)"}}>{s.phone}</td>
                    <td style={{fontFamily:"var(--font-mono)",fontSize:12,color:"var(--accent)"}}>
                      ₹{Number(s.salary).toLocaleString("en-IN")}
                    </td>
                    <td>
                      <span className={`badge ${
                        s.status==="active"   ? "badge-green" :
                        s.status==="on_leave" ? "badge-yellow" : "badge-gray"
                      }`}>{s.status}</span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-secondary"
                        onClick={()=>{setSelected(s);setModal("edit");}}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Attendance ── */}
      {tab==="attendance" && (
        <div className="card">
          <div style={{
            padding:"14px 18px", borderBottom:"1px solid var(--border)",
            fontFamily:"var(--font-display)", fontSize:14, fontWeight:700
          }}>
            Today's Attendance
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>ID</th><th>Name</th><th>Status</th><th>Check In</th><th>Check Out</th>
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{textAlign:"center",padding:32,color:"var(--text3)"}}>Loading…</td></tr>
                ) : attendance.length===0 ? (
                  <tr><td colSpan={4} style={{textAlign:"center",padding:32,color:"var(--text3)"}}>
                    No attendance marked today. Click "Mark Attendance".
                  </td></tr>
                ) : attendance.map(a=>(
                  <tr key={a.id}>
                    <td><b>{a.staff_name}</b></td>
                    <td>
                      <span className={`badge ${
                        a.status==="present" ? "badge-green" :
                        a.status==="absent"  ? "badge-red" : "badge-yellow"
                      }`}>{a.status}</span>
                    </td>
                    <td style={{color:"var(--text2)",fontSize:12}}>{a.check_in||"—"}</td>
                    <td style={{color:"var(--text2)",fontSize:12}}>{a.check_out||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Payments tab ── */}
      {tab==="payments" && <PaymentsTab staffList={staffList}/>}

      {/* Modals */}
      {modal==="add" && (
        <StaffModal
          onClose={()=>setModal(null)}
          onSave={()=>{setModal(null);load();}}
        />
      )}
      {modal==="edit" && selected && (
        <StaffModal
          staff={selected}
          onClose={()=>setModal(null)}
          onSave={()=>{setModal(null);load();}}
        />
      )}
      {modal==="attendance" && (
        <AttendanceModal
          staffList={staffList}
          onClose={()=>setModal(null)}
          onSave={()=>{setModal(null);load();}}
        />
      )}
    </div>
  );
}