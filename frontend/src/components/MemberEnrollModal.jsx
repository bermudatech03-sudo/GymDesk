/**
 * Drop-in replacement for MemberModal inside Members.jsx
 * Shows live GST breakdown during enrollment.
 * Returns bill data via onSave(bill).
 */
import { useState } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";

export default function MemberModal({ member, plans, onClose, onSave }) {
  const isEdit = !!member?.id;
  const [form, setForm] = useState(member
    ? { ...member, plan: member.plan || "" }
    : { name:"", phone:"", email:"", gender:"",
        plan:"", renewal_date:"", notes:"",
        status:"active", amount_paid:"" }
  );
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p => ({...p,[k]:v}));

  // Selected plan object
  const selectedPlan = plans.find(p => String(p.id) === String(form.plan));

  // Live GST calculation
  const gstRate    = 18; // matches backend GST_RATE
  const planPrice  = selectedPlan ? parseFloat(selectedPlan.price) : 0;
  const gstAmount  = planPrice * gstRate / 100;
  const totalOwed  = planPrice + gstAmount;
  const amtPaid    = parseFloat(form.amount_paid) || 0;
  const balance    = Math.max(0, totalOwed - amtPaid);

  const handlePlanChange = (id) => {
    set("plan", id);
    if (!isEdit) {
      const p = plans.find(p => String(p.id) === String(id));
      // Auto-fill total (including GST) as suggested amount
      if (p) {
        const total = parseFloat(p.price) * (1 + gstRate/100);
        set("amount_paid", total.toFixed(2));
      }
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`/members/list/${member.id}/`, form);
        toast.success("Member updated!");
        onSave(null);
      } else {
        const res = await api.post("/members/list/", {
          ...form,
          plan_id: form.plan || undefined,
        });
        toast.success("Member enrolled! Bill generated.");
        onSave(res.data.bill);
      }
    } catch(err) {
      const d = err.response?.data;
      toast.error(
        typeof d === "object"
          ? Object.values(d).flat().join(" ")
          : "Something went wrong"
      );
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-title">
          {isEdit ? "Edit Member" : "Enroll New Member"}
        </div>
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
              <select className="form-input" value={form.gender||""}
                onChange={e=>set("gender",e.target.value)}>
                <option value="">Select</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Membership Plan</label>
              <select className="form-input" value={form.plan||""}
                onChange={e=>handlePlanChange(e.target.value)}>
                <option value="">No Plan</option>
                {plans.map(p=>(
                  <option key={p.id} value={p.id}>
                    {p.name} — ₹{p.price} ({p.duration_days}d)
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Renewal Date</label>
              <input className="form-input" type="date"
                value={form.renewal_date||""}
                onChange={e=>set("renewal_date",e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status}
                onChange={e=>set("status",e.target.value)}>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>

          {/* ── GST Breakdown (enroll only) ── */}
          {!isEdit && selectedPlan && (
            <div style={{
              background:"var(--surface2)",
              border:"1px solid var(--border)",
              borderRadius:"var(--radius-sm)",
              padding:"14px 16px",
              display:"flex",flexDirection:"column",gap:8
            }}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",
                textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>
                Fee Breakdown
              </div>
              {[
                { label:"Plan Price (Base)",          val:`₹${planPrice.toLocaleString("en-IN")}`, color:"var(--text2)" },
                { label:`GST @ ${gstRate}% (CGST 9% + SGST 9%)`,
                  val:`₹${gstAmount.toFixed(2)}`,     color:"var(--warn)" },
                { label:"Total Amount Payable",        val:`₹${totalOwed.toFixed(2)}`, color:"var(--accent)", bold:true },
              ].map(r=>(
                <div key={r.label} style={{
                  display:"flex",justifyContent:"space-between",
                  fontSize:13, borderBottom:"1px solid var(--border)",
                  paddingBottom:6
                }}>
                  <span style={{color:"var(--text3)"}}>{r.label}</span>
                  <span style={{color:r.color,fontWeight:r.bold?700:500,
                    fontFamily:"var(--font-mono)"}}>
                    {r.val}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── Payment section (enroll only) ── */}
          {!isEdit && (
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Amount Paid Now (₹)</label>
                <input className="form-input" type="number" min="0"
                  step="0.01"
                  value={form.amount_paid||""}
                  onChange={e=>set("amount_paid",e.target.value)}
                  placeholder="0"
                  style={{fontFamily:"var(--font-mono)"}}/>
                <span style={{fontSize:11,color:"var(--text3)",marginTop:3,display:"block"}}>
                  Full amount: ₹{selectedPlan ? totalOwed.toFixed(2) : "0"}
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Balance Remaining (₹)</label>
                <input className="form-input" disabled
                  value={selectedPlan ? balance.toFixed(2) : "0.00"}
                  style={{
                    fontFamily:"var(--font-mono)",
                    color: balance > 0 ? "var(--warn)" : "var(--accent)",
                    opacity: 0.85
                  }}/>
                <span style={{fontSize:11,marginTop:3,display:"block",
                  color: balance > 0 ? "var(--warn)" : "var(--accent)"}}>
                  {balance > 0 ? "⚠ Partial — balance to collect later" : "✓ Fully paid"}
                </span>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-input" value={form.notes||""}
              onChange={e=>set("notes",e.target.value)} rows={2}/>
          </div>

          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…"
                : isEdit ? "Update Member"
                : "Enroll & Generate Bill"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}