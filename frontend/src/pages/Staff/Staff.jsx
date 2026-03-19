import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import "./Staff.css";

const SHIFTS = { morning:"Morning 6-2PM", evening:"Evening 2-10PM", full:"Full Day", off:"Day Off" };
const ROLES  = ["trainer","receptionist","cleaner","manager","other"];

function StaffModal({ staff, onClose, onSave }) {
  const [form, setForm] = useState(staff || { name:"",phone:"",email:"",role:"trainer",shift:"morning",salary:"",status:"active",notes:"" });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (staff?.id) { await api.patch(`/staff/members/${staff.id}/`, form); toast.success("Staff updated!"); }
      else            { await api.post("/staff/members/", form);            toast.success("Staff added!"); }
      onSave();
    } catch { toast.error("Something went wrong"); } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-title">{staff?.id ? "Edit Staff" : "Add Staff Member"}</div>
        <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Full Name *</label>
              <input className="form-input" value={form.name} onChange={e=>set("name",e.target.value)} required /></div>
            <div className="form-group"><label className="form-label">Phone *</label>
              <input className="form-input" value={form.phone} onChange={e=>set("phone",e.target.value)} required /></div>
            <div className="form-group"><label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e=>set("email",e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Role</label>
              <select className="form-input" value={form.role} onChange={e=>set("role",e.target.value)}>
                {ROLES.map(r=><option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
              </select></div>
            <div className="form-group"><label className="form-label">Shift</label>
              <select className="form-input" value={form.shift} onChange={e=>set("shift",e.target.value)}>
                {Object.entries(SHIFTS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select></div>
            <div className="form-group"><label className="form-label">Monthly Salary (₹)</label>
              <input className="form-input" type="number" value={form.salary} onChange={e=>set("salary",e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e=>set("status",e.target.value)}>
                <option value="active">Active</option><option value="inactive">Inactive</option><option value="on_leave">On Leave</option>
              </select></div>
          </div>
          <div className="form-group"><label className="form-label">Notes</label>
            <textarea className="form-input" value={form.notes} onChange={e=>set("notes",e.target.value)} rows={2} /></div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving?"Saving…":"Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AttendanceModal({ staffList, onClose, onSave }) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [records, setRecords] = useState({});
  const [saving, setSaving] = useState(false);

  const toggle = (id, field, val) => setRecords(p => ({...p, [id]: {...(p[id]||{status:"present"}), [field]: val}}));

  const submit = async () => {
    setSaving(true);
    const recs = staffList.map(s => ({
      staff: s.id, date,
      status: records[s.id]?.status || "present",
      check_in:  records[s.id]?.check_in  || null,
      check_out: records[s.id]?.check_out || null,
    }));
    try {
      await api.post("/staff/attendance/bulk_mark/", { records: recs });
      toast.success("Attendance marked!");
      onSave();
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{maxWidth:680}} onClick={e=>e.stopPropagation()}>
        <div className="modal-title">Mark Attendance</div>
        <div className="form-group" style={{marginBottom:16}}>
          <label className="form-label">Date</label>
          <input className="form-input" type="date" value={date} onChange={e=>setDate(e.target.value)} style={{maxWidth:180}} />
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Shift</th><th>Status</th><th>Check In</th><th>Check Out</th></tr></thead>
            <tbody>
              {staffList.filter(s=>s.status==="active").map(s => (
                <tr key={s.id}>
                  <td><b>{s.name}</b></td>
                  <td><span className="badge badge-blue">{SHIFTS[s.shift]||s.shift}</span></td>
                  <td>
                    <select className="form-input" style={{minWidth:110}} value={records[s.id]?.status||"present"}
                      onChange={e=>toggle(s.id,"status",e.target.value)}>
                      <option value="present">Present</option><option value="absent">Absent</option>
                      <option value="half">Half Day</option><option value="leave">Leave</option>
                    </select>
                  </td>
                  <td><input className="form-input" type="time" value={records[s.id]?.check_in||""}
                    onChange={e=>toggle(s.id,"check_in",e.target.value)} style={{minWidth:100}} /></td>
                  <td><input className="form-input" type="time" value={records[s.id]?.check_out||""}
                    onChange={e=>toggle(s.id,"check_out",e.target.value)} style={{minWidth:100}} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving?"Saving…":"Mark Attendance"}</button>
        </div>
      </div>
    </div>
  );
}

export default function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tab, setTab] = useState("staff");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.getElementById("page-title").textContent = "Staff"; }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, p] = await Promise.all([
        api.get("/staff/members/"),
        api.get("/staff/attendance/today/"),
        api.get("/staff/payments/?status=pending"),
      ]);
      setStaffList(s.data.results||s.data);
      setAttendance(a.data);
      setPayments(p.data.results||p.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markPaid = async (p) => {
    await api.post(`/staff/payments/${p.id}/mark_paid/`);
    toast.success(`Payment marked as paid`);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Staff Management</div>
          <div className="page-subtitle">Attendance, shifts and salary tracking</div>
        </div>
        <div style={{display:"flex",gap:10}}>
          {tab==="attendance" && <button className="btn btn-secondary" onClick={()=>setModal("attendance")}>Mark Attendance</button>}
          {tab==="staff"      && <button className="btn btn-primary"   onClick={()=>setModal("add")}>+ Add Staff</button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="staff-tabs">
        {["staff","attendance","payments"].map(t => (
          <button key={t} className={`staff-tab ${tab===t?"staff-tab--active":""}`} onClick={()=>setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
            {t==="payments" && payments.length>0 && <span className="badge badge-yellow" style={{marginLeft:6}}>{payments.length}</span>}
          </button>
        ))}
      </div>

      {/* Staff list */}
      {tab==="staff" && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Role</th><th>Shift</th><th>Phone</th><th>Salary</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={7} style={{textAlign:"center",padding:32,color:"var(--text3)"}}>Loading…</td></tr>
                : staffList.map(s => (
                  <tr key={s.id}>
                    <td><b>{s.name}</b></td>
                    <td><span className="badge badge-blue">{s.role}</span></td>
                    <td style={{fontSize:12,color:"var(--text2)"}}>{SHIFTS[s.shift]||s.shift}</td>
                    <td style={{color:"var(--text3)"}}>{s.phone}</td>
                    <td style={{fontFamily:"var(--font-mono)",fontSize:12}}>₹{Number(s.salary).toLocaleString("en-IN")}</td>
                    <td><span className={`badge ${s.status==="active"?"badge-green":s.status==="on_leave"?"badge-yellow":"badge-gray"}`}>{s.status}</span></td>
                    <td>
                      <button className="btn btn-sm btn-secondary" onClick={()=>{setSelected(s);setModal("edit");}}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Today's attendance */}
      {tab==="attendance" && (
        <div className="card">
          <div className="dash-table-header" style={{padding:"14px 18px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontFamily:"var(--font-display)",fontSize:14,fontWeight:700}}>Today's Attendance</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Shift</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={5} style={{textAlign:"center",padding:32,color:"var(--text3)"}}>Loading…</td></tr>
                : attendance.length===0 ? <tr><td colSpan={5} style={{textAlign:"center",padding:32,color:"var(--text3)"}}>No attendance marked yet today</td></tr>
                : attendance.map(a => (
                  <tr key={a.id}>
                    <td><b>{a.staff_name}</b></td>
                    <td><span className={`badge ${a.status==="present"?"badge-green":a.status==="absent"?"badge-red":"badge-yellow"}`}>{a.status}</span></td>
                    <td style={{color:"var(--text2)",fontSize:12}}>{a.check_in||"—"}</td>
                    <td style={{color:"var(--text2)",fontSize:12}}>{a.check_out||"—"}</td>
                    <td style={{fontSize:12}}>{a.shift}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending payments */}
      {tab==="payments" && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Staff</th><th>Month</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={5} style={{textAlign:"center",padding:32,color:"var(--text3)"}}>Loading…</td></tr>
                : payments.length===0 ? <tr><td colSpan={5} style={{textAlign:"center",padding:32,color:"var(--text3)"}}>No pending payments</td></tr>
                : payments.map(p => (
                  <tr key={p.id}>
                    <td><b>{p.staff_name}</b></td>
                    <td style={{color:"var(--text2)"}}>{p.month}</td>
                    <td style={{fontFamily:"var(--font-mono)"}}>₹{Number(p.amount).toLocaleString("en-IN")}</td>
                    <td><span className="badge badge-yellow">{p.status}</span></td>
                    <td><button className="btn btn-sm btn-primary" onClick={()=>markPaid(p)}>Mark Paid</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal==="add"        && <StaffModal onClose={()=>setModal(null)} onSave={()=>{setModal(null);load();}} />}
      {modal==="edit"       && selected && <StaffModal staff={selected} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load();}} />}
      {modal==="attendance" && <AttendanceModal staffList={staffList} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load();}} />}
    </div>
  );
}
