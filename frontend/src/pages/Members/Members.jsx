import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import "./Members.css";

function statusBadge(s) {
  const m = { active:"badge-green", expired:"badge-red", cancelled:"badge-gray", paused:"badge-yellow" };
  return <span className={`badge ${m[s]||"badge-gray"}`}>{s}</span>;
}

/* ─── Enroll modal ─────────────────────────────────── */
function MemberModal({ member, plans, onClose, onSave }) {
  const isEdit = !!member?.id;
  const [form, setForm] = useState(member
    ? { ...member, plan: member.plan || "" }
    : { name:"", phone:"", email:"", gender:"", plan:"",
        renewal_date:"", notes:"", status:"active", amount_paid:"" }
  );
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p => ({...p,[k]:v}));

  // Auto-fill plan price into amount_paid when plan selected (enroll only)
  const handlePlanChange = (id) => {
    set("plan", id);
    if (!isEdit) {
      const found = plans.find(p => String(p.id) === String(id));
      if (found) set("amount_paid", found.price);
    }
  };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`/members/list/${member.id}/`, form);
        toast.success("Member updated!");
      } else {
        await api.post("/members/list/", {
          ...form,
          plan_id: form.plan || undefined,
        });
        toast.success("Member enrolled!");
      }
      onSave();
    } catch(err) {
      const d = err.response?.data;
      toast.error(
        typeof d === "object"
          ? Object.values(d).flat().join(" ")
          : "Something went wrong"
      );
    } finally { setSaving(false); }
  };

  const selectedPlan = plans.find(p => String(p.id) === String(form.plan));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-title">{isEdit ? "Edit Member" : "Enroll New Member"}</div>
        <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={form.name}
                onChange={e=>set("name",e.target.value)} required placeholder="Rajan Kumar"/>
            </div>
            <div className="form-group">
              <label className="form-label">Phone *</label>
              <input className="form-input" value={form.phone}
                onChange={e=>set("phone",e.target.value)} required placeholder="9876543210"/>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email||""}
                onChange={e=>set("email",e.target.value)} placeholder="rajan@email.com"/>
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-input" value={form.gender||""} onChange={e=>set("gender",e.target.value)}>
                <option value="">Select</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Membership Plan</label>
              <select className="form-input" value={form.plan||""} onChange={e=>handlePlanChange(e.target.value)}>
                <option value="">No Plan</option>
                {plans.map(p=>(
                  <option key={p.id} value={p.id}>{p.name} — ₹{p.price} ({p.duration_days}d)</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Renewal Date</label>
              <input className="form-input" type="date" value={form.renewal_date||""}
                onChange={e=>set("renewal_date",e.target.value)}/>
            </div>
              {!isEdit && (
                <>
                  <div className="form-group">
                    <label className="form-label">Amount Paid Now (₹)</label>
                    <input className="form-input" type="number" min="0" value={form.amount_paid||""}
                      onChange={e=>set("amount_paid",e.target.value)} placeholder="0"/>
                  </div>
                  {selectedPlan && (
                    <div className="form-group">
                      <label className="form-label">Balance Remaining (₹)</label>
                      <input className="form-input" disabled
                        value={Math.max(0, parseFloat(selectedPlan.price) - parseFloat(form.amount_paid||0)).toLocaleString("en-IN")}
                        style={{opacity:.7, fontFamily:"var(--font-mono)",
                          color: (parseFloat(selectedPlan.price) - parseFloat(form.amount_paid||0)) > 0
                            ? "var(--warn)" : "var(--accent)"
                        }}/>
                      <span style={{fontSize:11,color:"var(--text3)",marginTop:3,display:"block"}}>
                        Plan price ₹{selectedPlan.price} — auto-calculated
                      </span>
                    </div>
                  )}
                </>
              )}
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e=>set("status",e.target.value)}>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-input" value={form.notes||""}
              onChange={e=>set("notes",e.target.value)} rows={2}/>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Update Member" : "Enroll & Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Renew modal ──────────────────────────────────── */
function RenewModal({ member, plans, onClose, onSave }) {
  const [planId, setPlanId] = useState(member.plan || "");
  const [amount, setAmount] = useState(
    plans.find(p => String(p.id) === String(member.plan))?.price || ""
  );
  const [notes,  setNotes]  = useState("");
  const [saving, setSaving] = useState(false);

  const handlePlanChange = (id) => {
    setPlanId(id);
    const found = plans.find(p => String(p.id) === String(id));
    if (found) setAmount(found.price);
  };

  const planPrice = plans.find(p => String(p.id) === String(planId))?.price
    || plans.find(p => String(p.id) === String(member.plan))?.price || 0;
  const balance = Math.max(0, parseFloat(planPrice) - parseFloat(amount || 0));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post(`/members/list/${member.id}/renew/`, {
        plan_id: planId || undefined,
        amount_paid: amount,
        notes,
      });
      toast.success(balance > 0
        ? `Renewed! Balance ₹${balance} recorded.`
        : "Renewed! Full payment recorded in Finances.");
      onSave();
    } catch(err) {
      toast.error(err.response?.data?.detail || "Renewal failed");
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{maxWidth:460}} onClick={e=>e.stopPropagation()}>
        <div className="modal-title">Renew — {member.name}</div>
        <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:14,marginTop:4}}>
          <div className="form-group">
            <label className="form-label">Plan</label>
            <select className="form-input" value={planId} onChange={e=>handlePlanChange(e.target.value)}>
              <option value="">Keep current plan</option>
              {plans.map(p=><option key={p.id} value={p.id}>{p.name} — ₹{p.price}</option>)}
            </select>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Plan Price (₹)</label>
              <input className="form-input" value={planPrice} disabled
                style={{opacity:.6}}/>
            </div>
            <div className="form-group">
              <label className="form-label">Amount Collected (₹) *</label>
              <input className="form-input" type="number" min="0" value={amount}
                onChange={e=>setAmount(e.target.value)} required placeholder="1500"/>
            </div>
          </div>

          {/* Balance indicator */}
          {parseFloat(planPrice) > 0 && (
            <div style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              background: balance > 0 ? "rgba(255,184,48,.1)" : "rgba(168,255,87,.08)",
              border: `1px solid ${balance > 0 ? "rgba(255,184,48,.3)" : "rgba(168,255,87,.2)"}`,
              borderRadius:8, padding:"10px 14px", fontSize:13
            }}>
              <span style={{color:"var(--text2)"}}>
                {balance > 0 ? "⚠ Balance remaining" : "✓ Fully paid"}
              </span>
              <span style={{
                fontFamily:"var(--font-mono)", fontWeight:700,
                color: balance > 0 ? "var(--warn)" : "var(--accent)"
              }}>
                ₹{balance.toLocaleString("en-IN")}
              </span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" value={notes} onChange={e=>setNotes(e.target.value)}
              placeholder="Optional note…"/>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Processing…" : "Renew & Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Payment history + balance payment modal ──────── */
function PaymentHistoryModal({ member, onClose, onRefresh }) {
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [balAmt,   setBalAmt]   = useState("");
  const [paying,   setPaying]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/members/payments/?member=${member.id}&ordering=-paid_date`)
      .then(res => setPayments(res.data.results || res.data))
      .finally(() => setLoading(false));
  }, [member.id]);

  useEffect(() => { load(); }, [load]);

  const totalPaid = payments.reduce((s,p) => s + parseFloat(p.amount_paid||0), 0);
  const totalDue  = payments.reduce((s,p) => s + parseFloat(p.plan_price||0),  0);
  const totalBal  = payments.reduce((s,p) => s + parseFloat(p.balance||0),    0);

  const hasOutstanding = payments.some(p => ["partial","pending"].includes(p.status));
  const latestBal = payments.find(p => ["partial","pending"].includes(p.status));

  const payBalance = async () => {
    if (!balAmt || parseFloat(balAmt) <= 0) {
      toast.error("Enter a valid amount"); return;
    }
    setPaying(true);
    try {
      await api.post(`/members/list/${member.id}/pay-balance/`, { amount_paid: balAmt });
      toast.success("Balance payment recorded in Finances!");
      setBalAmt("");
      load();
      onRefresh();
    } catch(err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally { setPaying(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{maxWidth:680}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div className="modal-title" style={{marginBottom:0}}>
            Payments — {member.name}
          </div>
          <button className="btn btn-sm btn-secondary" onClick={onClose}>✕</button>
        </div>

        {/* Summary row */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
          {[
            { label:"Total Billed", val:`₹${totalDue.toLocaleString("en-IN")}`,   color:"var(--text1)" },
            { label:"Total Paid",   val:`₹${totalPaid.toLocaleString("en-IN")}`,  color:"var(--accent)" },
            { label:"Balance Due",  val:`₹${totalBal.toLocaleString("en-IN")}`,   color: totalBal>0?"var(--warn)":"var(--teal)" },
          ].map(c => (
            <div key={c.label} style={{background:"var(--surface2)",borderRadius:8,padding:"12px 14px"}}>
              <div style={{fontSize:11,color:"var(--text3)",marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:.5}}>
                {c.label}
              </div>
              <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:c.color}}>
                {c.val}
              </div>
            </div>
          ))}
        </div>

        {/* Balance payment input */}
        {hasOutstanding && latestBal && (
          <div style={{
            background:"rgba(255,184,48,.08)",border:"1px solid rgba(255,184,48,.25)",
            borderRadius:10,padding:"14px 16px",marginBottom:16,
            display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"
          }}>
            <div style={{flex:1,minWidth:200}}>
              <div style={{fontSize:12,fontWeight:700,color:"var(--warn)",marginBottom:4}}>
                ⚠ Outstanding balance: ₹{parseFloat(latestBal.balance).toLocaleString("en-IN")}
              </div>
              <div style={{fontSize:11,color:"var(--text3)"}}>
                Valid: {latestBal.valid_from} → {latestBal.valid_to}
              </div>
            </div>
            <input
              className="form-input"
              type="number" min="1" max={latestBal.balance}
              value={balAmt}
              onChange={e=>setBalAmt(e.target.value)}
              placeholder={`Max ₹${latestBal.balance}`}
              style={{maxWidth:140}}
            />
            <button className="btn btn-primary btn-sm" onClick={payBalance} disabled={paying}>
              {paying ? "…" : "Record Payment"}
            </button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div style={{textAlign:"center",padding:32,color:"var(--text3)"}}>Loading…</div>
        ) : payments.length === 0 ? (
          <div style={{textAlign:"center",padding:32,color:"var(--text3)"}}>No payments yet</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Date</th><th>Plan</th><th>Billed</th>
                <th>Paid</th><th>Balance</th><th>Status</th>
              </tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td style={{fontSize:12,color:"var(--text2)"}}>{p.paid_date}</td>
                    <td style={{fontSize:12}}>{p.plan_name||"—"}</td>
                    <td style={{fontFamily:"var(--font-mono)",fontSize:12}}>
                      ₹{Number(p.plan_price).toLocaleString("en-IN")}
                    </td>
                    <td style={{fontFamily:"var(--font-mono)",color:"var(--accent)",fontWeight:600}}>
                      ₹{Number(p.amount_paid).toLocaleString("en-IN")}
                    </td>
                    <td style={{
                      fontFamily:"var(--font-mono)",fontSize:12,
                      color: parseFloat(p.balance)>0 ? "var(--warn)" : "var(--text3)"
                    }}>
                      ₹{Number(p.balance).toLocaleString("en-IN")}
                    </td>
                    <td>
                      <span className={`badge ${
                        p.status==="paid"    ? "badge-green" :
                        p.status==="partial" ? "badge-yellow" : "badge-red"
                      }`}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main page ────────────────────────────────────── */
export default function Members() {
  const [members,  setMembers]  = useState([]);
  const [plans,    setPlans]    = useState([]);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all");
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);
  const [selected, setSelected] = useState(null);
  const [page,     setPage]     = useState(1);
  const [count,    setCount]    = useState(0);

  useEffect(() => {
    document.getElementById("page-title").textContent = "Members";
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search, page };
      if (filter !== "all") params.status = filter;
      const [mRes, pRes] = await Promise.all([
        api.get("/members/list/", { params }),
        api.get("/members/plans/?active_only=true"),
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


  const deleteMember = async (m) => {
  if (!confirm(`PERMANENTLY DELETE ${m.name}? This cannot be undone and removes all payment history.`)) return;
  await api.delete(`/members/list/${m.id}/`);
  toast.success("Member deleted permanently");
  load();
};

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Members</div>
          <div className="page-subtitle">Enrollments, renewals, payments and balance tracking</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal("add")}>
          + Enroll Member
        </button>
      </div>

      {/* Filters */}
      <div className="members-filters">
        <div className="search-bar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input className="form-input" placeholder="Search name, phone…" value={search}
            onChange={e=>{setSearch(e.target.value);setPage(1);}} style={{paddingLeft:38}}/>
        </div>
        <div className="filter-pills">
          {["all","active","expired","cancelled","paused"].map(f=>(
            <button key={f}
              className={`filter-pill ${filter===f?"filter-pill--active":""}`}
              onClick={()=>{setFilter(f);setPage(1);}}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Member</th><th>Phone</th><th>Plan</th>
              <th>Renewal</th><th>Days Left</th>
              <th>Paid</th><th>Balance</th>
              <th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{textAlign:"center",padding:40,color:"var(--text3)"}}>Loading…</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={9} style={{textAlign:"center",padding:40,color:"var(--text3)"}}>No members found</td></tr>
              ) : members.map(m => (
                <tr key={m.id}>
                  <td>
                    <div style={{fontWeight:600}}>{m.name}</div>
                    <div style={{fontSize:11,color:"var(--text3)"}}>{m.email}</div>
                  </td>
                  <td style={{color:"var(--text2)"}}>{m.phone}</td>
                  <td style={{fontSize:12}}>
                    {m.plan_name || <span style={{color:"var(--text3)"}}>No Plan</span>}
                  </td>
                  <td style={{
                    fontSize:12,
                    color: (m.days_until_expiry??99)<=3 ? "var(--danger)"
                         : (m.days_until_expiry??99)<=7 ? "var(--warn)" : "var(--text2)"
                  }}>
                    {m.renewal_date || "—"}
                  </td>
                  <td>
                    {m.days_until_expiry != null
                      ? <span className={`badge ${m.days_until_expiry<=3?"badge-red":m.days_until_expiry<=7?"badge-yellow":"badge-blue"}`}>
                          {m.days_until_expiry}d
                        </span>
                      : "—"}
                  </td>
                  <td style={{fontFamily:"var(--font-mono)",fontSize:12,color:"var(--accent)"}}>
                    ₹{Number(m.total_paid||0).toLocaleString("en-IN")}
                  </td>
                  <td>
                    {(m.balance_due||0) > 0
                      ? <span className="badge badge-yellow">
                          ₹{Number(m.balance_due).toLocaleString("en-IN")}
                        </span>
                      : <span style={{fontSize:12,color:"var(--text3)"}}>—</span>
                    }
                  </td>
                  <td>{statusBadge(m.status)}</td>
                  <td>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      <button className="btn btn-sm btn-secondary"
                        onClick={()=>{setSelected(m);setModal("edit");}}>Edit</button>
                      <button className="btn btn-sm"
                        style={{background:"rgba(45,255,195,.12)",color:"var(--teal)"}}
                        onClick={()=>{setSelected(m);setModal("renew");}}>Renew</button>
                      <button className="btn btn-sm"
                        style={{background:"rgba(77,166,255,.12)",color:"var(--info)"}}
                        onClick={()=>{setSelected(m);setModal("payments");}}>
                        Payments{(m.balance_due||0)>0 ? " ⚠" : ""}
                      </button>
                      {m.status!=="cancelled" &&
                        <button className="btn btn-sm btn-danger"
                          onClick={()=>cancelMember(m)}>Cancel</button>}
                      <button className="btn btn-sm"
                        style={{background:"rgba(255,91,91,.15)",color:"var(--danger)",
                          border:"1px solid rgba(255,91,91,.3)"}}
                        onClick={()=>deleteMember(m)}>
                        🗑 Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="members-pagination">
          <span style={{fontSize:12,color:"var(--text3)"}}>{count} total members</span>
          <div style={{display:"flex",gap:6}}>
            <button className="btn btn-sm btn-secondary" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
            <button className="btn btn-sm btn-secondary" disabled={members.length<20} onClick={()=>setPage(p=>p+1)}>Next →</button>
          </div>
        </div>
      </div>

      {modal==="add"      && <MemberModal plans={plans} onClose={closeModal} onSave={afterSave}/>}
      {modal==="edit"     && selected && <MemberModal member={selected} plans={plans} onClose={closeModal} onSave={afterSave}/>}
      {modal==="renew"    && selected && <RenewModal  member={selected} plans={plans} onClose={closeModal} onSave={afterSave}/>}
      {modal==="payments" && selected && <PaymentHistoryModal member={selected} onClose={closeModal} onRefresh={load}/>}
    </div>
  );
}