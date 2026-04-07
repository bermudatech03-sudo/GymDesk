import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import toast from "react-hot-toast";
import "./Members.css";
import MemberBill from "../../components/MemberBill";
import ConfirmModal from "../../components/ConfirmModal";


function statusBadge(s) {
  const m = { active: "badge-green", expired: "badge-red", cancelled: "badge-gray", paused: "badge-yellow" };
  return <span className={`badge ${m[s] || "badge-gray"}`}>{s}</span>;
}

/* ─── Enroll modal ─────────────────────────────────── */
function MemberModal({ member, plans, dietPlans, onClose, onSave }) {
  const isEdit = !!member?.id;
  const [form, setForm] = useState(member
    ? { ...member, plan: member.plan || "", diet: member.diet || "", plan_type: member.plan_type || "basic" }
    : {
      name: "", phone: "", email: "", gender: "", plan: "", plan_type: "basic", diet: "",
      renewal_date: "", notes: "", status: "active", amount_paid: "", foodType: "veg", personal_trainer: false,
      mode_of_payment: "cash"
    }
  );
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handlePlanChange = (id) => {
    set("plan", id);
    const found = plans.find(p => String(p.id) === String(id));
    if (found) {
      if (!isEdit) set("amount_paid", found.price_with_gst ?? found.price);
      if (found.duration_days) {
        const renewal = new Date();
        renewal.setDate(renewal.getDate() + Number(found.duration_days));
        set("renewal_date", renewal.toISOString().split("T")[0]);
      }
    } else {
      set("renewal_date", "");
    }
    // reset plan_type and extras when plan changes
    set("plan_type", "basic");
    set("personal_trainer", false);
    set("diet", "");
  };

  const handlePlanTypeChange = (planType) => {
    set("plan_type", planType);
    set("personal_trainer", true);
    if (planType !== "premium") set("diet", "");
    // recalc amount_paid to base price when changing type
    if (!isEdit) {
      const found = plans.find(p => String(p.id) === String(form.plan));
      if (found) set("amount_paid", found.price_with_gst ?? found.price);
    }
  };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`/members/list/${member.id}/`, {
          ...form,
          diet: form.diet || null,
          foodType: form.foodType || "veg"
        });
        toast.success("Member updated!");
        onSave(null);
      } else {
        // Standard / Premium → hold enrollment until trainer is assigned
        if (form.plan_type === "standard" || form.plan_type === "premium") {
          sessionStorage.setItem("pendingMember", JSON.stringify({
            name: form.name,
            phone: form.phone,
            email: form.email || "",
            gender: form.gender || "",
            address: form.address || "",
            notes: form.notes || "",
            age: form.age || undefined,
            plan: form.plan || undefined,
            plan_id: form.plan || undefined,
            diet: form.diet || undefined,
            diet_id: form.diet || undefined,
            foodType: form.foodType || "veg",
            plan_type: form.plan_type,
            personal_trainer: true,
            amount_paid: form.amount_paid || 0,
            mode_of_payment: form.mode_of_payment || "cash",
            renewal_date: form.renewal_date || undefined,
            status: form.status || "active",
          }));
          toast.success("Details saved — assign a trainer to complete enrollment.");
          onSave({ isPending: true, planType: form.plan_type });
          return;
        }

        const res = await api.post("/members/list/", {
          ...form,
          plan_id: form.plan || undefined,
          diet_id: form.diet || undefined,
          foodType: form.foodType || "veg"
        });
        toast.success("Member enrolled!");
        let billData = res.data.bill ?? null;
        if (billData && res.data.id) {
          try {
            const hRes = await api.get("/members/payments/", { params: { member: res.data.id } });
            const raw = hRes.data;
            const list = Array.isArray(raw) ? raw : Array.isArray(raw?.results) ? raw.results : [];
            list.sort((a, b) => new Date(a.paid_date) - new Date(b.paid_date));
            const listWithInsts = list.map(p => ({
              ...p,
              cycle_installments: p.installment_payments || [],
            }));
            billData = { ...billData, installments: listWithInsts };
          } catch (_) { /* non-fatal */ }
        }
        onSave({ bill: billData, newMemberId: res.data.id, planType: form.plan_type });
      }
    } catch (err) {
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
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{isEdit ? "Edit Member" : "Enroll New Member"}</div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={form.name}
                onChange={e => set("name", e.target.value)} required placeholder="Rajan Kumar" />
            </div>
            <div className="form-group">
              <label className="form-label">Age</label>
              <input className="form-input" type="number" min="1" max="120" value={form.age || ""}
                onChange={e => set("age", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone *</label>
              <input className="form-input" value={form.phone}
                onChange={e => set("phone", e.target.value)} required placeholder="9876543210" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email || ""}
                onChange={e => set("email", e.target.value)} placeholder="rajan@email.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-input" value={form.gender || ""} onChange={e => set("gender", e.target.value)}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Membership Plan</label>
              <select className="form-input" value={form.plan || ""} onChange={e => handlePlanChange(e.target.value)}>
                <option value="">No Plan</option>
                {plans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₹{(p.price_with_gst ?? p.price).toLocaleString("en-IN")} incl. GST ({p.duration_days}d)
                  </option>
                ))}
              </select>
            </div>
            {form.plan && (
              <div className="form-group">
                <label className="form-label">Plan Type</label>
                <select className="form-input" value={form.plan_type} onChange={e => handlePlanTypeChange(e.target.value)}>
                  <option value="basic">Basic</option>
                  <option value="standard">Standard — includes Personal Trainer</option>
                  <option value="premium">Premium — includes Personal Trainer + Diet Plan</option>
                </select>
              </div>
            )}
            {/* {(form.plan_type === "standard" || form.plan_type === "premium") && (
              <div className="form-group">
                <label className="form-label">Personal Trainer</label>
                <select className="form-input" value={String(form.personal_trainer)} onChange={e => {
                  const isTrainer = e.target.value === "true";
                  set("personal_trainer", isTrainer);
                  if (!isEdit) {
                    const found = plans.find(p => String(p.id) === String(form.plan));
                    if (found) {
                      let basePrice = parseFloat(found.price);
                      if (isTrainer) {
                        if (form.plan_type === "standard") basePrice += 500;
                        else if (form.plan_type === "premium") basePrice += 1000;
                      }
                      const gstRate = found.gst_rate ?? 18;
                      const total = Math.round(basePrice * (1 + gstRate / 100) * 100) / 100;
                      set("amount_paid", total);
                    }
                  }
                }}>
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
            )} */}
            {form.plan_type === "premium" && (
              <div className="form-group">
                <label className="form-label">Diet Plan</label>
                <select className="form-input" value={form.diet || ""} onChange={e => set("diet", e.target.value)}>
                  <option value="">No Diet Plan</option>
                  {dietPlans.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Renewal Date</label>
              <input className="form-input" type="date" value={form.renewal_date || ""}
                onChange={e => set("renewal_date", e.target.value)} />
            </div>
            {!isEdit && (
              <>
                <div className="form-group">
                  <label className="form-label">Amount Paid Now (₹)</label>
                  <input className="form-input" type="number" min="0" value={form.amount_paid || ""}
                    onChange={e => set("amount_paid", e.target.value)} placeholder="0" />
                </div>
                {selectedPlan && (() => {
                  const planTotal = parseFloat(selectedPlan.price_with_gst ?? selectedPlan.price);
                  const remaining = Math.max(0, planTotal - parseFloat(form.amount_paid || 0));
                  return (
                    <div className="form-group">
                      <label className="form-label">Balance Remaining (₹)</label>
                      <input className="form-input" disabled
                        value={remaining.toLocaleString("en-IN")}
                        style={{
                          opacity: .7, fontFamily: "var(--font-mono)",
                          color: remaining > 0 ? "var(--warn)" : "var(--accent)"
                        }} />
                      <span style={{ fontSize: 11, color: "var(--text3)", marginTop: 3, display: "block" }}>
                        Total incl. GST ₹{planTotal.toLocaleString("en-IN")} — auto-calculated
                      </span>
                    </div>
                  );
                })()}
              </>
            )}
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            {!isEdit && (
              <div className="form-group">
                <label className="form-label">Mode of Payment</label>
                <select className="form-input" value={form.mode_of_payment || "cash"} onChange={e => set("mode_of_payment", e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="other">Other</option>
                </select>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Food Type</label>
            <select className="form-input" value={form.foodType || ""} onChange={e => set("foodType", e.target.value)}>
              <option value="veg">Vegetarian</option>
              <option value="nonveg">Non-Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-input" value={form.notes || ""}
              onChange={e => set("notes", e.target.value)} rows={2} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
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
  const [amount, setAmount] = useState(() => {
    const p = plans.find(p => String(p.id) === String(member.plan));
    return p ? (p.price_with_gst ?? p.price) : "";
  });
  const [notes, setNotes] = useState("");
  const [modeOfPayment, setModeOfPayment] = useState("cash");
  const [saving, setSaving] = useState(false);

  const handlePlanChange = (id) => {
    setPlanId(id);
    const found = plans.find(p => String(p.id) === String(id));
    if (found) setAmount(found.price_with_gst ?? found.price);
  };

  const activePlan =
    plans.find(p => String(p.id) === String(planId)) ||
    plans.find(p => String(p.id) === String(member.plan));
  const planTotal = parseFloat(activePlan?.price_with_gst ?? activePlan?.price ?? 0);
  const balance = Math.max(0, planTotal - parseFloat(amount || 0));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await api.post(`/members/list/${member.id}/renew/`, {
        plan_id: planId || undefined,
        amount_paid: amount,
        notes,
        mode_of_payment: modeOfPayment,
      });
      toast.success(balance > 0
        ? `Renewed! Balance ₹${balance} recorded.`
        : "Renewed! Full payment recorded in Finances.");
      let billData = res.data.bill ?? null;
      if (billData) {
        try {
          const hRes = await api.get("/members/payments/", { params: { member: member.id } });
          const raw = hRes.data;
          const list = Array.isArray(raw) ? raw : Array.isArray(raw?.results) ? raw.results : [];
          list.sort((a, b) => new Date(a.paid_date) - new Date(b.paid_date));
          const listWithInsts = list.map(p => ({
            ...p,
            cycle_installments: p.installment_payments || [],
          }));
          billData = { ...billData, installments: listWithInsts };
        } catch (_) { /* non-fatal */ }
      }
      onSave(billData);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Renewal failed");
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">Renew — {member.name}</div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
          <div className="form-group">
            <label className="form-label">Plan</label>
            <select className="form-input" value={planId} onChange={e => handlePlanChange(e.target.value)}>
              <option value="">Keep current plan</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — ₹{(p.price_with_gst ?? p.price).toLocaleString("en-IN")} incl. GST
                </option>
              ))}
            </select>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Total incl. GST (₹)</label>
              <input className="form-input" value={planTotal} disabled style={{ opacity: .6 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount Collected (₹) *</label>
              <input className="form-input" type="number" min="0" value={amount}
                onChange={e => setAmount(e.target.value)} required placeholder="1500" />
            </div>
          </div>
          {planTotal > 0 && (
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: balance > 0 ? "rgba(255,184,48,.1)" : "rgba(168,255,87,.08)",
              border: `1px solid ${balance > 0 ? "rgba(255,184,48,.3)" : "rgba(168,255,87,.2)"}`,
              borderRadius: 8, padding: "10px 14px", fontSize: 13
            }}>
              <span style={{ color: "var(--text2)" }}>
                {balance > 0 ? "⚠ Balance remaining" : "✓ Fully paid"}
              </span>
              <span style={{
                fontFamily: "var(--font-mono)", fontWeight: 700,
                color: balance > 0 ? "var(--warn)" : "var(--accent)"
              }}>
                ₹{balance.toLocaleString("en-IN")}
              </span>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Optional note…" />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <label className="form-label">Mode Of Payment </label>
            <select className="form-input" value={modeOfPayment} onChange={e => setModeOfPayment(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
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
function PaymentHistoryModal({ member, onClose, onRefresh, onBill, gymInfo = {} }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [balAmt, setBalAmt] = useState("");
  const [balMode, setBalMode] = useState("cash");
  const [paying, setPaying] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get("/members/payments/", { params: { member: member.id } })
      .then(res => {
        const data = res.data;
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : [];
        list.sort((a, b) => new Date(b.paid_date) - new Date(a.paid_date));
        setPayments(list);
      })
      .catch(err => {
        console.error("Payments fetch error:", err);
        setError("Failed to load payments. Please try again.");
        setPayments([]);
      })
      .finally(() => setLoading(false));
  }, [member.id]);

  useEffect(() => { load(); }, [load]);

  const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);
  const totalDue = payments.reduce((s, p) => s + parseFloat(p.total_with_gst || 0), 0);
  const totalBal = payments.reduce((s, p) => s + parseFloat(p.balance || 0), 0);

  const hasOutstanding = payments.some(p => ["partial", "pending"].includes(p.status));
  const latestBal = payments.find(p => ["partial", "pending"].includes(p.status));

  const payBalance = async () => {
    if (!balAmt || parseFloat(balAmt) <= 0) {
      toast.error("Enter a valid amount"); return;
    }
    setPaying(true);
    try {
      const res = await api.post(`/members/list/${member.id}/pay-balance/`, { amount_paid: balAmt, mode_of_payment: balMode });
      toast.success("Balance payment recorded in Finances!");
      setBalAmt("");
      const updated = await api.get("/members/payments/", { params: { member: member.id } });
      const updatedList = (() => {
        const d = updated.data;
        const list = Array.isArray(d) ? d : Array.isArray(d?.results) ? d.results : [];
        list.sort((a, b) => new Date(b.paid_date) - new Date(a.paid_date));
        return list;
      })();
      setPayments(updatedList);
      onRefresh();
      if (res.data.bill) {
        const listWithInsts = [...updatedList]
          .sort((a, b) => new Date(a.paid_date) - new Date(b.paid_date))
          .map(p => ({ ...p, cycle_installments: p.installment_payments || [] }));
        onBill({ ...res.data.bill, installments: listWithInsts });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally { setPaying(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div className="modal-title" style={{ marginBottom: 0 }}>Payments — {member.name}</div>
          <div style={{ display: "flex", gap: 8 }}>
            {payments.length > 0 && (
              <button className="btn btn-sm btn-primary" onClick={() => {
                const sortedAsc = [...payments]
                  .sort((a, b) => new Date(a.paid_date) - new Date(b.paid_date))
                  .map(p => ({ ...p, cycle_installments: p.installment_payments || [] }));
                onBill({
                  isStatement: true,
                  member_name: member.name,
                  member_id: member.member_id_display || `M${String(member.id).padStart(4, "0")}`,
                  phone: member.phone || "",
                  email: member.email || "",
                  date: new Date().toISOString().slice(0, 10),
                  invoice_number: "",
                  plan_price: 0, gst_rate: 0, gst_amount: 0,
                  total_with_gst: 0, amount_paid: 0, balance: 0,
                  ...gymInfo,
                  installments: sortedAsc,
                });
              }}>📋 Full Statement</button>
            )}
            <button className="btn btn-sm btn-secondary" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Summary row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Total Billed", val: `₹${totalDue.toLocaleString("en-IN")}`, color: "var(--text1)" },
            { label: "Total Paid", val: `₹${totalPaid.toLocaleString("en-IN")}`, color: "var(--accent)" },
            { label: "Balance Due", val: `₹${totalBal.toLocaleString("en-IN")}`, color: totalBal > 0 ? "var(--warn)" : "var(--teal)" },
          ].map(c => (
            <div key={c.label} style={{ background: "var(--surface2)", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: .5 }}>
                {c.label}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: c.color }}>
                {c.val}
              </div>
            </div>
          ))}
        </div>

        {/* Balance payment input */}
        {hasOutstanding && latestBal && (
          <div style={{
            background: "rgba(255,184,48,.08)", border: "1px solid rgba(255,184,48,.25)",
            borderRadius: 10, padding: "14px 16px", marginBottom: 16,
            display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap"
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--warn)", marginBottom: 4 }}>
                ⚠ Outstanding balance: ₹{parseFloat(latestBal.balance).toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>
                Valid: {latestBal.valid_from} → {latestBal.valid_to}
              </div>
            </div>
            <input className="form-input" type="number" min="1" max={latestBal.balance}
              value={balAmt} onChange={e => setBalAmt(e.target.value)}
              placeholder={`Max ₹${latestBal.balance}`} style={{ maxWidth: 140 }} />
            <select className="form-input" value={balMode} onChange={e => setBalMode(e.target.value)} style={{ maxWidth: 110 }}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="other">Other</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={payBalance} disabled={paying}>
              {paying ? "…" : "Record Payment"}
            </button>
          </div>
        )}

        {/* Payments — expanded cycle cards */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>Loading…</div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: 32, color: "var(--danger)" }}>
            {error}<br />
            <button className="btn btn-sm btn-secondary" style={{ marginTop: 12 }} onClick={load}>Retry</button>
          </div>
        ) : payments.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
            No payments recorded yet for this member.
          </div>
        ) : (
          <div className="table-wrap">
            {payments.map(p => {
              const insts = p.installment_payments || [];
              return (
                <div key={p.id} style={{
                  marginBottom: 12, border: "1px solid var(--border)",
                  borderRadius: 8, overflow: "hidden"
                }}>
                  {/* Cycle header */}
                  <div style={{
                    background: "var(--surface2)", padding: "8px 14px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: 6
                  }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{
                        fontSize: 10, fontWeight: 800, letterSpacing: .8, padding: "2px 8px",
                        borderRadius: 100,
                        background: (p.invoice_number || "").includes("-R") ? "rgba(77,240,255,.12)" : "rgba(168,255,87,.12)",
                        color: (p.invoice_number || "").includes("-R") ? "var(--teal)" : "var(--accent)",
                        border: (p.invoice_number || "").includes("-R") ? "1px solid rgba(77,240,255,.3)" : "1px solid rgba(168,255,87,.3)"
                      }}>
                        {(p.invoice_number || "").includes("-R") ? "RENEWAL" : "ENROLLMENT"}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text3)" }}>
                        {p.invoice_number || "—"}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text2)" }}>{p.plan_name || "—"}</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 12 }}>
                      <span style={{ color: "var(--text3)" }}>{p.valid_from} → {p.valid_to}</span>
                      <span className={`badge ${p.status === "paid" ? "badge-green" :
                        p.status === "partial" ? "badge-yellow" : "badge-red"
                        }`}>{p.status}</span>
                    </div>
                  </div>

                  {/* GST info row */}
                  <div style={{
                    background: "var(--surface)", padding: "5px 14px",
                    borderBottom: "1px solid var(--border)", fontSize: 11, color: "var(--text3)"
                  }}>
                    Billed: <strong style={{ color: "var(--text1)" }}>
                      ₹{Number(p.total_with_gst || 0).toLocaleString("en-IN")}
                    </strong>
                    &ensp;|&ensp; Base: <strong>₹{Number(p.plan_price || 0).toLocaleString("en-IN")}</strong>
                    &ensp;+&ensp; GST {p.gst_rate || 0}%: <strong style={{ color: "var(--warn)" }}>
                      ₹{Number(p.gst_amount || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  {/* Installment rows */}
                  {insts.length > 0 && (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "var(--surface)" }}>
                          {["Date", "Type", "Amount Paid", "Balance After"].map((h, i) => (
                            <th key={h} style={{
                              padding: "5px 10px", fontWeight: 700, color: "var(--text3)", fontSize: 11,
                              textAlign: i >= 2 ? "right" : "left",
                              borderBottom: "1px solid var(--border)"
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {insts.map((inst, ri) => {
                          const typeLabel =
                            inst.installment_type === "enrollment" ? "Enrollment" :
                              inst.installment_type === "renewal" ? "Renewal" : "Balance Payment";
                          return (
                            <tr key={inst.id} style={{ borderTop: ri > 0 ? "1px solid var(--border)" : "none" }}>
                              <td style={{ padding: "6px 10px", color: "var(--text2)" }}>{inst.paid_date}</td>
                              <td style={{ padding: "6px 10px", color: "var(--info)", fontWeight: 600, fontSize: 11 }}>
                                {typeLabel}
                              </td>
                              <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--accent)", fontWeight: 700 }}>
                                ₹{Number(inst.amount).toLocaleString("en-IN")}
                              </td>
                              <td style={{
                                padding: "6px 10px", textAlign: "right", fontFamily: "var(--font-mono)",
                                color: parseFloat(inst.balance_after) > 0 ? "var(--warn)" : "var(--teal)"
                              }}>
                                ₹{Number(inst.balance_after).toLocaleString("en-IN")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  {/* Cycle subtotal */}
                  <div style={{
                    background: "var(--surface2)", padding: "6px 14px",
                    borderTop: "1px solid var(--border)", fontSize: 12,
                    display: "flex", justifyContent: "space-between"
                  }}>
                    <span style={{ color: "var(--text3)" }}>
                      Total Paid: <strong style={{ color: "var(--accent)" }}>
                        ₹{Number(p.amount_paid).toLocaleString("en-IN")}
                      </strong>
                    </span>
                    <strong style={{ color: parseFloat(p.balance) > 0 ? "var(--warn)" : "var(--teal)" }}>
                      Balance: ₹{Number(p.balance).toLocaleString("en-IN")}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── View Member Detail Modal (mobile) ───────────── */
function ViewMemberModal({ member: m, onClose, onEdit, onRenew, onPayments, onCancel, onDelete }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ marginBottom: 16 }}>Member Details</div>

        {/* ID + Status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)",
            fontWeight: 700, background: "var(--accent-dim)", padding: "3px 10px", borderRadius: 6
          }}>
            {m.member_id_display || `M${String(m.id).padStart(4, "0")}`}
          </span>
          <span className={`badge ${{ active: "badge-green", expired: "badge-red", cancelled: "badge-gray", paused: "badge-yellow" }[m.status] || "badge-gray"}`}>
            {m.status}
          </span>
        </div>

        {/* Core info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", marginBottom: 16 }}>
          {[
            { label: "Name", val: m.name },
            { label: "Phone", val: m.phone || "—" },
            { label: "Email", val: m.email || "—" },
            { label: "Gender", val: m.gender || "—" },
            { label: "Plan", val: m.plan_name || "No Plan" },
            { label: "Plan Type", val: m.plan_type || "—" },
            { label: "Renewal", val: m.renewal_date || "—" },
            { label: "Days Left", val: m.days_until_expiry != null ? `${m.days_until_expiry}d` : "—" },
            { label: "Total Paid", val: `₹${Number(m.total_paid || 0).toLocaleString("en-IN")}` },
            { label: "Balance Due", val: (m.balance_due || 0) > 0 ? `₹${Number(m.balance_due).toLocaleString("en-IN")}` : "None" },
          ].map(({ label, val }) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 13, color: "var(--text1)", fontWeight: 500 }}>{val}</div>
            </div>
          ))}
          {m.diet_name && (
            <div style={{ gridColumn: "span 2" }}>
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 2 }}>Diet Plan</div>
              <div style={{ fontSize: 13, color: "var(--teal)" }}>🥗 {m.diet_name}</div>
            </div>
          )}
          {m.notes && (
            <div style={{ gridColumn: "span 2" }}>
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 2 }}>Notes</div>
              <div style={{ fontSize: 12, color: "var(--text2)" }}>{m.notes}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-sm btn-secondary" onClick={onEdit}>Edit</button>
          <button className="btn btn-sm" style={{ background: "rgba(45,255,195,.12)", color: "var(--teal)" }} onClick={onRenew}>Renew</button>
          <button className="btn btn-sm" style={{ background: "rgba(77,166,255,.12)", color: "var(--info)" }} onClick={onPayments}>
            Payments{(m.balance_due || 0) > 0 ? " ⚠" : ""}
          </button>
          {m.status !== "cancelled" && (
            <button className="btn btn-sm btn-danger" onClick={onCancel}>Cancel</button>
          )}
          <button className="btn btn-sm" style={{ background: "rgba(255,91,91,.15)", color: "var(--danger)", border: "1px solid rgba(255,91,91,.3)" }} onClick={onDelete}>
            🗑 Delete
          </button>
        </div>

        <button className="btn btn-secondary" style={{ width: "100%", marginTop: 14 }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

/* ─── Main page ────────────────────────────────────── */
export default function Members() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [dietPlans, setDietPlans] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [bill, setBill] = useState(null);
  const [gymInfo, setGymInfo] = useState({});       // status filter
  const [planFilter, setPlanFilter] = useState("");           // plan id filter
  const [balanceFilter, setBalanceFilter] = useState("");           // has_balance | no_balance | ""
  const [expiringDays, setExpiringDays] = useState("");           // number string | ""
  const [confirmState, setConfirmState] = useState(null);
  const [viewMember, setViewMember] = useState(null);


  useEffect(() => {
    document.getElementById("page-title").textContent = "Members";
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search, page };
      if (filter !== "all") params.status = filter;
      if (planFilter) params.plan = planFilter;
      if (balanceFilter) params.balance_filter = balanceFilter;
      if (expiringDays) params.expiring_days = expiringDays;

      const [mRes, pRes, dRes] = await Promise.all([
        api.get("/members/list/", { params }),
        api.get("/members/plans/?active_only=true"),
        api.get("/members/diet-plans/"),
      ]);
      setMembers(mRes.data.results || mRes.data);
      setCount(mRes.data.count || 0);
      setPlans(pRes.data.results || pRes.data);
      setDietPlans(Array.isArray(dRes.data) ? dRes.data : (dRes.data.results ?? []));
    } finally { setLoading(false); }
  }, [search, filter, planFilter, balanceFilter, expiringDays, page]);

  useEffect(() => { load(); }, [load]);

  const resetFilters = () => {
    setFilter("all");
    setPlanFilter("");
    setBalanceFilter("");
    setExpiringDays("");
    setSearch("");
    setPage(1);
  };

  const hasActiveFilters = filter !== "all" || planFilter || balanceFilter || expiringDays || search;

  const closeModal = () => { setModal(null); setSelected(null); };
  const afterSave = (data) => {
    const isNewEnroll = data && typeof data === "object" && "newMemberId" in data;
    const isPending   = data && typeof data === "object" && data.isPending === true;

    closeModal();

    // Standard/Premium pending: navigate to trainer assignment without refreshing
    if (isPending) {
      navigate(`/trainer-assignments?pending=1&from=members`);
      return;
    }

    load();

    const billData    = isNewEnroll ? data.bill : data;
    const newMemberId = isNewEnroll ? data.newMemberId : null;
    const planType    = isNewEnroll ? data.planType : null;

    if (newMemberId && (planType === "standard" || planType === "premium")) {
      navigate(`/trainer-assignments?newMember=${newMemberId}&from=members`);
      return;
    }

    if (billData) {
      setBill(billData);
      setGymInfo({
        gym_name: billData.gym_name || "",
        gym_address: billData.gym_address || "",
        gym_phone: billData.gym_phone || "",
        gym_email: billData.gym_email || "",
        gym_gstin: billData.gym_gstin || "",
      });
    }
  };

  const cancelMember = (m) => {
    setConfirmState({
      title: "Cancel Membership",
      message: `Cancel membership for ${m.name}?`,
      confirmText: "Cancel Membership",
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await api.post(`/members/list/${m.id}/cancel/`, { reason: "Admin cancelled" });
          toast.success("Member cancelled");
          load();
        } catch (err) {
          toast.error(err.response?.data?.detail || "Failed to cancel member");
        }
      },
      onCancel: () => setConfirmState(null),
    });
  };

  const deleteMember = (m) => {
    setConfirmState({
      title: "Delete Member",
      message: `Permanently delete ${m.name}? This cannot be undone and removes all payment history.`,
      confirmText: "Delete Permanently",
      danger: true,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await api.delete(`/members/list/${m.id}/`);
          toast.success("Member deleted permanently");
          load();
        } catch (err) {
          toast.error(err.response?.data?.detail || "Failed to delete member");
        }
      },
      onCancel: () => setConfirmState(null),
    });
  };

  return (
    <div>
      {confirmState && <ConfirmModal {...confirmState} />}
      <div className="page-header">
        <div>
          <div className="page-title">Members</div>
          <div className="page-subtitle">Enrollments, renewals, payments and balance tracking</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal("add")}>
          + Enroll Member
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="members-filters">
        {/* Search */}
        <div className="search-bar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input className="form-input" placeholder="Search name, phone…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: 38 }} />
        </div>

        {/* Status pills */}
        <div className="filter-pills">
          {["all", "active", "expired", "cancelled", "paused"].map(f => (
            <button key={f}
              className={`filter-pill ${filter === f ? "filter-pill--active" : ""}`}
              onClick={() => { setFilter(f); setPage(1); }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Secondary filter row */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", width: "100%", marginTop: 6 }}>

          {/* Plan filter */}
          <select
            className="form-input"
            style={{ maxWidth: 200, fontSize: 12 }}
            value={planFilter}
            onChange={e => { setPlanFilter(e.target.value); setPage(1); }}>
            <option value="">All Plans</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Balance filter */}
          <select
            className="form-input"
            style={{ maxWidth: 180, fontSize: 12 }}
            value={balanceFilter}
            onChange={e => { setBalanceFilter(e.target.value); setPage(1); }}>
            <option value="">All Balances</option>
            <option value="has_balance">⚠ Has Balance Due</option>
            <option value="no_balance">✓ Fully Paid</option>
          </select>

          {/* Expiring within N days */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text3)", whiteSpace: "nowrap" }}>Expiring in</span>
            <input
              className="form-input"
              type="number" min="1" max="365"
              placeholder="days"
              value={expiringDays}
              onChange={e => { setExpiringDays(e.target.value); setPage(1); }}
              style={{ width: 72, fontSize: 12 }}
            />
            <span style={{ fontSize: 12, color: "var(--text3)" }}>days</span>
            {expiringDays && (
              <button
                style={{ fontSize: 11, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}
                onClick={() => { setExpiringDays(""); setPage(1); }}>✕</button>
            )}
          </div>

          {/* Clear all filters */}
          {hasActiveFilters && (
            <button
              className="btn btn-sm btn-secondary"
              style={{ fontSize: 11, marginLeft: "auto" }}
              onClick={resetFilters}>
              ✕ Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile card list (visible only on small screens) ── */}
      <div className="members-mobile-list">
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>Loading…</div>
        ) : members.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>No members found</div>
        ) : members.map(m => (
          <div key={m.id} className="member-mobile-card">
            <div className="member-mobile-card__left">
              <span className="member-mobile-card__id">
                {m.member_id_display || `M${String(m.id).padStart(4, "0")}`}
              </span>
              <span className="member-mobile-card__name">{m.name}</span>
              <span className={`badge ${{ active: "badge-green", expired: "badge-red", cancelled: "badge-gray", paused: "badge-yellow" }[m.status] || "badge-gray"}`} style={{ fontSize: 11 }}>
                {m.status}
              </span>
            </div>
            <button
              className="btn btn-sm"
              style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid rgba(168,255,87,.3)", whiteSpace: "nowrap" }}
              onClick={() => setViewMember(m)}>
              View Member
            </button>
          </div>
        ))}
        <div className="members-pagination">
          <span style={{ fontSize: 12, color: "var(--text3)" }}>{count} total</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <button className="btn btn-sm btn-secondary" disabled={members.length < 20} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      </div>

      {/* ── Desktop table (hidden on small screens) ── */}
      <div className="members-desktop-table">
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>ID</th><th>Member</th><th>Phone</th><th>Plan</th>
                <th>Renewal</th><th>Days Left</th>
                <th>Paid</th><th>Balance</th>
                <th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>Loading…</td></tr>
                ) : members.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>No members found</td></tr>
                ) : members.map(m => (
                  <tr key={m.id}>
                    <td>
                      <span style={{
                        fontFamily: "var(--font-mono)", fontSize: 12,
                        color: "var(--accent)", fontWeight: 700,
                        background: "var(--accent-dim)", padding: "2px 8px", borderRadius: 6
                      }}>
                        {m.member_id_display || `M${String(m.id).padStart(4, "0")}`}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)" }}>{m.email}</div>
                    </td>
                    <td style={{ color: "var(--text2)" }}>{m.phone}</td>
                    <td style={{ fontSize: 12 }}>
                      <div>{m.plan_name || <span style={{ color: "var(--text3)" }}>No Plan</span>}</div>
                      {m.diet_name && (
                        <div style={{ fontSize: 11, color: "var(--teal)", marginTop: 2 }}>
                          🥗 {m.diet_name}
                        </div>
                      )}
                    </td>
                    <td style={{
                      fontSize: 12,
                      color: (m.days_until_expiry ?? 99) <= 0 ? "var(--danger)"
                        : (m.days_until_expiry ?? 99) <= 3 ? "var(--danger)"
                          : (m.days_until_expiry ?? 99) <= 7 ? "var(--warn)" : "var(--text2)"
                    }}>
                      {m.renewal_date || "—"}
                    </td>
                    <td>
                      {m.days_until_expiry != null ? (() => {
                        const d = m.days_until_expiry;
                        if (d < 0) return <span className="badge badge-red">{d}d</span>;
                        if (d === 0) return <span className="badge badge-red">Today</span>;
                        if (d <= 3) return <span className="badge badge-red">{d}d</span>;
                        if (d <= 7) return <span className="badge badge-yellow">{d}d</span>;
                        return <span className="badge badge-blue">{d}d</span>;
                      })() : "—"}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)" }}>
                      ₹{Number(m.total_paid || 0).toLocaleString("en-IN")}
                    </td>
                    <td>
                      {(m.balance_due || 0) > 0
                        ? <span className="badge badge-yellow">
                          ₹{Number(m.balance_due).toLocaleString("en-IN")}
                        </span>
                        : <span style={{ fontSize: 12, color: "var(--text3)" }}>—</span>
                      }
                    </td>
                    <td>{statusBadge(m.status)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        <button className="btn btn-sm btn-secondary"
                          onClick={() => { setSelected(m); setModal("edit"); }}>Edit</button>
                        <button className="btn btn-sm"
                          style={{ background: "rgba(45,255,195,.12)", color: "var(--teal)" }}
                          onClick={() => { setSelected(m); setModal("renew"); }}>Renew</button>
                        <button className="btn btn-sm"
                          style={{ background: "rgba(77,166,255,.12)", color: "var(--info)" }}
                          onClick={() => { setSelected(m); setModal("payments"); }}>
                          Payments{(m.balance_due || 0) > 0 ? " ⚠" : ""}
                        </button>
                        {m.status !== "cancelled" &&
                          <button className="btn btn-sm btn-danger"
                            onClick={() => cancelMember(m)}>Cancel</button>}
                        <button className="btn btn-sm"
                          style={{
                            background: "rgba(255,91,91,.15)", color: "var(--danger)",
                            border: "1px solid rgba(255,91,91,.3)"
                          }}
                          onClick={() => deleteMember(m)}>
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
            <span style={{ fontSize: 12, color: "var(--text3)" }}>{count} total members</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <button className="btn btn-sm btn-secondary" disabled={members.length < 20} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        </div>
      </div>{/* end members-desktop-table */}

      {modal === "add" && <MemberModal plans={plans} dietPlans={dietPlans} onClose={closeModal} onSave={afterSave} />}
      {modal === "edit" && selected && <MemberModal member={selected} plans={plans} dietPlans={dietPlans} onClose={closeModal} onSave={afterSave} />}
      {modal === "renew" && selected && <RenewModal member={selected} plans={plans} onClose={closeModal} onSave={afterSave} />}
      {modal === "payments" && selected && (
        <PaymentHistoryModal
          member={selected}
          onClose={closeModal}
          onRefresh={load}
          onBill={(billData) => {
            setBill(billData);
            if (billData.gym_name) setGymInfo({
              gym_name: billData.gym_name,
              gym_address: billData.gym_address,
              gym_phone: billData.gym_phone,
              gym_email: billData.gym_email,
              gym_gstin: billData.gym_gstin,
            });
          }}
          gymInfo={gymInfo}
        />
      )}
      {bill && <MemberBill bill={bill} onClose={() => setBill(null)} />}
      {viewMember && (
        <ViewMemberModal
          member={viewMember}
          onClose={() => setViewMember(null)}
          onEdit={() => { setSelected(viewMember); setModal("edit"); setViewMember(null); }}
          onRenew={() => { setSelected(viewMember); setModal("renew"); setViewMember(null); }}
          onPayments={() => { setSelected(viewMember); setModal("payments"); setViewMember(null); }}
          onCancel={() => { cancelMember(viewMember); setViewMember(null); }}
          onDelete={() => { deleteMember(viewMember); setViewMember(null); }}
        />
      )}
    </div>
  );
}