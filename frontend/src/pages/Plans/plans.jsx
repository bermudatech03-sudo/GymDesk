import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import "./Plans.css";

function PlanModal({ plan, onClose, onSave }) {
  const [form, setForm] = useState(
    plan
      ? { ...plan }
      : { name: "", duration_days: 30, price: "", description: "", is_active: true, plans: "basic", personal_trainer: false }
  );
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (plan?.id) {
        await api.patch(`/members/plans/${plan.id}/`, form);
        toast.success("Plan updated!");
      } else {
        await api.post("/members/plans/", form);
        toast.success("Plan created!");
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handlePlanTypeChange = (e) => {
    const value = e.target.value;
    set("plans", value);
    if (value !== "standard" && value !== "premium") {
      set("personal_trainer", false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          {plan?.id ? "Edit Plan" : "Add Membership Plan"}
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div className="form-group">
            <label className="form-label">Plan Name *</label>
            <input
              className="form-input"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              required
              placeholder="e.g. Monthly, Quarterly, Annual"
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Duration (days) *</label>
              <input
                className="form-input"
                type="number"
                min={1}
                value={form.duration_days}
                onChange={e => set("duration_days", e.target.value)}
                required
                placeholder="30"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Price (₹) *</label>
              <input
                className="form-input"
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={e => set("price", e.target.value)}
                required
                placeholder="1500"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              value={form.description}
              onChange={e => set("description", e.target.value)}
              rows={3}
              placeholder="What's included in this plan…"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-input"
              value={form.is_active ? "true" : "false"}
              onChange={e => set("is_active", e.target.value === "true")}
            >
              <option value="true">Active — visible in enrollment</option>
              <option value="false">Inactive — hidden from enrollment</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Plan Type</label>
            <select
              className="form-input"
              value={form.plans}
              onChange={handlePlanTypeChange}
            >
              <option value="basic">Basic Plan</option>
              <option value="standard">Standard Plan</option>
              <option value="premium">Premium Plan</option>
            </select>
          </div>

          {(form.plans === "standard" || form.plans === "premium") && (
            <div className="form-group">
              <label className="form-label">Personal Trainer</label>
              <select
                className="form-input"
                value={form.personal_trainer ? "true" : "false"}
                onChange={e => set("personal_trainer", e.target.value === "true")}
              >
                <option value="false">Not Required</option>
                <option value="true">Required</option>
              </select>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : plan?.id ? "Update Plan" : "Create Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

  export default function Plans() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
      document.getElementById("page-title").textContent = "Membership Plans";
    }, []);

    const load = useCallback(async () => {
      setLoading(true);
      try {
        const res = await api.get("/members/plans/");
        setPlans(res.data.results || res.data);
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => { load(); }, [load]);

    const deletePlan = async (plan) => {
      if (!confirm(`Delete "${plan.name}"? Members using this plan will lose their plan reference.`)) return;
      try {
        await api.delete(`/members/plans/${plan.id}/`);
        toast.success("Plan deleted");
        load();
      } catch {
        toast.error("Cannot delete — members may be linked to this plan");
      }
    };

    const toggleActive = async (plan) => {
      await api.patch(`/members/plans/${plan.id}/`, { is_active: !plan.is_active });
      toast.success(plan.is_active ? "Plan deactivated — hidden from enrollment" : "Plan activated");
      load();
    };

    const openAdd = () => { setSelected(null); setModal(true); };
    const openEdit = (p) => { setSelected(p); setModal(true); };
    const closeModal = () => { setModal(false); setSelected(null); };
    const afterSave = () => { closeModal(); load(); };

    return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">Membership Plans</div>
            <div className="page-subtitle">
              Plans you create here will appear in the enrollment dropdown when adding members
            </div>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            + Add New Plan
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text3)", fontSize: 14 }}>
            Loading plans…
          </div>
        ) : plans.length === 0 ? (
          <div className="plans-empty">
            <div className="plans-empty__icon">◉</div>
            <div className="plans-empty__title">No plans yet</div>
            <div className="plans-empty__sub">
              Create your first membership plan. Once added, plans appear in the
              member enrollment form automatically.
            </div>
            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={openAdd}>
              + Create First Plan
            </button>
          </div>
        ) : (
          <div className="plans-grid">
            {plans.map(p => (
              <div
                key={p.id}
                className={`plan-card ${!p.is_active ? "plan-card--inactive" : ""}`}
              >
                {/* Top row: status badge + actions */}
                <div className="plan-card__header">
                  <span className={`badge ${p.is_active ? "badge-green" : "badge-gray"}`}>
                    {p.is_active ? "Active" : "Inactive"}
                  </span>
                  <div className="plan-card__actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(p)}>
                      Edit
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{
                        background: p.is_active
                          ? "rgba(255,184,48,.12)"
                          : "rgba(168,255,87,.12)",
                        color: p.is_active ? "var(--warn)" : "var(--accent)",
                      }}
                      onClick={() => toggleActive(p)}
                    >
                      {p.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => deletePlan(p)}>
                      Delete
                    </button>
                  </div>
                  <div className="plan-card__actions">
                    <span className="plan-card__id">Plan Type: {p.plans}</span>
                    {(p.plans === "standard" || p.plans === "premium") && (
                      <span className="plan-card__id" style={{ marginLeft: 8 }}>
                        Trainer: {p.personal_trainer ? "Required" : "Not Required"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="plan-card__name">{p.name}</div>

                <div className="plan-card__price">
                  ₹{Number(p.price).toLocaleString("en-IN")}
                  <span className="plan-card__price-label">/ plan</span>
                </div>

                <div className="plan-card__duration">
                  <span style={{ color: "var(--accent)" }}>◷</span>
                  {p.duration_days} days
                  <span className="plan-card__duration-note">
                    &nbsp;(
                    {p.duration_days >= 365
                      ? `${Math.round(p.duration_days / 365)} year`
                      : p.duration_days >= 30
                        ? `~${Math.round(p.duration_days / 30)} month${Math.round(p.duration_days / 30) > 1 ? "s" : ""}`
                        : `${p.duration_days} day${p.duration_days > 1 ? "s" : ""}`}
                    )
                  </span>
                </div>

                <div className="plan-card__per-day">
                  ₹{(p.price / p.duration_days).toFixed(0)} per day
                </div>

                {p.description && (
                  <div className="plan-card__desc">{p.description}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {modal && (
          <PlanModal plan={selected} onClose={closeModal} onSave={afterSave} />
        )}
      </div>
    );
  }