import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { format } from "date-fns";
import "./Members.css";

function statusBadge(status) {
  const map = { active:"badge-green", expired:"badge-red", cancelled:"badge-gray", paused:"badge-yellow" };
  return <span className={`badge ${map[status]||"badge-gray"}`}>{status}</span>;
}

function MemberModal({ member, plans, onClose, onSave }) {
  const [form, setForm] = useState(member || {
    name:"", phone:"", email:"", gender:"", plan:"", renewal_date:"", notes:"", status:"active"
  });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p => ({...p,[k]:v}));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (member?.id) { await api.patch(`/members/list/${member.id}/`, form); toast.success("Member updated!"); }
      else             { await api.post("/members/list/", form); toast.success("Member enrolled!"); }
      onSave();
    } catch(err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-title">{member?.id ? "Edit Member" : "Enroll New Member"}</div>
        <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Full Name *</label>
              <input className="form-input" value={form.name} onChange={e=>set("name",e.target.value)} required placeholder="Rajan Kumar" /></div>
            <div className="form-group"><label className="form-label">Phone *</label>
              <input className="form-input" value={form.phone} onChange={e=>set("phone",e.target.value)} required placeholder="9876543210" /></div>
            <div className="form-group"><label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="rajan@email.com" /></div>
            <div className="form-group"><label className="form-label">Gender</label>
              <select className="form-input" value={form.gender} onChange={e=>set("gender",e.target.value)}>
                <option value="">Select</option><option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
              </select></div>
            <div className="form-group"><label className="form-label">Membership Plan</label>
              <select className="form-input" value={form.plan||""} onChange={e=>set("plan",e.target.value)}>
                <option value="">No Plan</option>
                {plans.map(p=><option key={p.id} value={p.id}>{p.name} — ₹{p.price} ({p.duration_days}d)</option>)}
              </select></div>
            <div className="form-group"><label className="form-label">Renewal Date</label>
              <input className="form-input" type="date" value={form.renewal_date||""} onChange={e=>set("renewal_date",e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e=>set("status",e.target.value)}>
                <option value="active">Active</option><option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option><option value="paused">Paused</option>
              </select></div>
          </div>
          <div className="form-group"><label className="form-label">Notes</label>
            <textarea className="form-input" value={form.notes} onChange={e=>set("notes",e.target.value)} rows={2} /></div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving?"Saving…":"Save Member"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RenewModal({ member, plans, onClose, onSave }) {
  const [planId, setPlanId] = useState(member.plan || "");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post(`/members/list/${member.id}/renew/`, { plan_id: planId||undefined, amount_paid: amount });
      toast.success("Membership renewed!");
      onSave();
    } catch { toast.error("Renewal failed"); } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{maxWidth:420}} onClick={e=>e.stopPropagation()}>
        <div className="modal-title">Renew — {member.name}</div>
        <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="form-group"><label className="form-label">Plan</label>
            <select className="form-input" value={planId} onChange={e=>setPlanId(e.target.value)}>
              <option value="">Keep current plan</option>
              {plans.map(p=><option key={p.id} value={p.id}>{p.name} — ₹{p.price}</option>)}
            </select></div>
          <div className="form-group"><label className="form-label">Amount Collected (₹) *</label>
            <input className="form-input" type="number" value={amount} onChange={e=>setAmount(e.target.value)} required placeholder="1500" /></div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving?"Processing…":"Renew Membership"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Members() {
  const [members, setMembers]   = useState([]);
  const [plans,   setPlans]     = useState([]);
  const [search,  setSearch]    = useState("");
  const [filter,  setFilter]    = useState("all");
  const [loading, setLoading]   = useState(true);
  const [modal,   setModal]     = useState(null); // "add"|"edit"|"renew"
  const [selected,setSelected]  = useState(null);
  const [page,    setPage]      = useState(1);
  const [count,   setCount]     = useState(0);

  useEffect(() => { document.getElementById("page-title").textContent = "Members"; }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search, page };
      if (filter !== "all") params.status = filter;
      const [mRes, pRes] = await Promise.all([
        api.get("/members/list/", { params }),
        api.get("/members/plans/"),
      ]);
      setMembers(mRes.data.results || mRes.data);
      setCount(mRes.data.count || 0);
      setPlans(pRes.data.results || pRes.data);
    } finally { setLoading(false); }
  }, [search, filter, page]);

  useEffect(() => { load(); }, [load]);

  const closeModal = () => { setModal(null); setSelected(null); };
  const afterSave  = () => { closeModal(); load(); };

  const cancelMember = async (m) => {
    if (!confirm(`Cancel membership for ${m.name}?`)) return;
    await api.post(`/members/list/${m.id}/cancel/`, { reason:"Admin cancelled" });
    toast.success("Member cancelled");
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Members</div>
          <div className="page-subtitle">Manage gym memberships, renewals and enrollments</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal("add")}>+ Enroll Member</button>
      </div>

      {/* Filters */}
      <div className="members-filters">
        <div className="search-bar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="form-input" placeholder="Search name, phone…" value={search}
            onChange={e=>{setSearch(e.target.value);setPage(1);}} style={{paddingLeft:38}} />
        </div>
        <div className="filter-pills">
          {["all","active","expired","cancelled","paused"].map(f => (
            <button key={f} className={`filter-pill ${filter===f?"filter-pill--active":""}`}
              onClick={()=>{setFilter(f);setPage(1);}}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Member</th><th>Phone</th><th>Plan</th>
              <th>Join Date</th><th>Renewal</th><th>Days Left</th>
              <th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{textAlign:"center",padding:40,color:"var(--text3)"}}>Loading…</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={8} style={{textAlign:"center",padding:40,color:"var(--text3)"}}>No members found</td></tr>
              ) : members.map(m => (
                <tr key={m.id}>
                  <td>
                    <div style={{fontWeight:600}}>{m.name}</div>
                    <div style={{fontSize:11,color:"var(--text3)"}}>{m.email}</div>
                  </td>
                  <td style={{color:"var(--text2)"}}>{m.phone}</td>
                  <td><span style={{fontSize:12}}>{m.plan_name || <span style={{color:"var(--text3)"}}>No Plan</span>}</span></td>
                  <td style={{color:"var(--text3)",fontSize:12}}>{m.join_date}</td>
                  <td style={{color: m.days_until_expiry <=3 ? "var(--danger)" : m.days_until_expiry<=7 ? "var(--warn)":"var(--text2)", fontSize:12}}>
                    {m.renewal_date || "—"}
                  </td>
                  <td>
                    {m.days_until_expiry != null
                      ? <span className={`badge ${m.days_until_expiry<=3?"badge-red":m.days_until_expiry<=7?"badge-yellow":"badge-blue"}`}>
                          {m.days_until_expiry}d
                        </span>
                      : "—"}
                  </td>
                  <td>{statusBadge(m.status)}</td>
                  <td>
                    <div style={{display:"flex",gap:6}}>
                      <button className="btn btn-sm btn-secondary" onClick={()=>{setSelected(m);setModal("edit");}}>Edit</button>
                      <button className="btn btn-sm" style={{background:"rgba(45,255,195,.12)",color:"var(--teal)"}}
                        onClick={()=>{setSelected(m);setModal("renew");}}>Renew</button>
                      {m.status!=="cancelled" &&
                        <button className="btn btn-sm btn-danger" onClick={()=>cancelMember(m)}>Cancel</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="members-pagination">
          <span style={{fontSize:12,color:"var(--text3)"}}>
            {count} total members
          </span>
          <div style={{display:"flex",gap:6}}>
            <button className="btn btn-sm btn-secondary" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
            <button className="btn btn-sm btn-secondary" disabled={members.length<20} onClick={()=>setPage(p=>p+1)}>Next →</button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal==="add"  && <MemberModal plans={plans} onClose={closeModal} onSave={afterSave} />}
      {modal==="edit" && selected && <MemberModal member={selected} plans={plans} onClose={closeModal} onSave={afterSave} />}
      {modal==="renew"&& selected && <RenewModal  member={selected} plans={plans} onClose={closeModal} onSave={afterSave} />}
    </div>
  );
}
