import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/ConfirmModal";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function daysFromStr(str) {
  if (!str) return [0, 1, 2, 3, 4, 5, 6];
  return str.split(",").map(Number).filter(n => !isNaN(n));
}
function daysToStr(arr) {
  return arr.slice().sort((a, b) => a - b).join(",");
}

/* ─── Assignment Modal ─────────────────────────────── */
function AssignmentModal({ assignment, allMembers, trainers, plans, onClose, onSave }) {
  const isEdit = !!assignment?.id;

  // Only members whose plan allows a personal trainer
  const eligibleMembers = allMembers.filter(m => m.plan_allows_trainer);
  // Only standard/premium plans with personal_trainer flag
  const trainerPlans = plans.filter(p => ["standard", "premium"].includes(p.plans));

  const [form, setForm] = useState(() => {
    if (isEdit) {
      return {
        member: assignment.member,
        trainer: assignment.trainer,
        plan: assignment.plan ?? "",
        startingtime: assignment.startingtime?.slice(0, 5) ?? "06:00",
        endingtime: assignment.endingtime?.slice(0, 5) ?? "07:00",
        working_days: daysFromStr(assignment.working_days),
      };
    }
    return {
      member: "", trainer: "", plan: "",
      startingtime: "06:00", endingtime: "07:00",
      working_days: [0, 1, 2, 3, 4, 5, 6],
    };
  });

  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // When member changes (create mode), auto-populate plan from their current plan
  const handleMemberChange = (memberId) => {
    set("member", memberId);
    if (!memberId) return;
    const found = eligibleMembers.find(m => String(m.id) === String(memberId));
    if (found?.plan) set("plan", found.plan);
  };

  const toggleDay = (idx) => {
    set("working_days",
      form.working_days.includes(idx)
        ? form.working_days.filter(d => d !== idx)
        : [...form.working_days, idx]
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.member || !form.trainer) {
      toast.error("Member and Trainer are required.");
      return;
    }
    if (form.working_days.length === 0) {
      toast.error("Select at least one working day.");
      return;
    }
    setSaving(true);
    const payload = {
      member: Number(form.member),
      trainer: Number(form.trainer),
      plan: form.plan ? Number(form.plan) : null,
      startingtime: form.startingtime,
      endingtime: form.endingtime,
      working_days: daysToStr(form.working_days),
    };
    try {
      if (isEdit) {
        await api.patch(`/members/assign-trainer/${assignment.id}/`, payload);
        toast.success("Assignment updated!");
      } else {
        await api.post("/members/assign-trainer/", payload);
        toast.success("Trainer assigned!");
      }
      onSave();
    } catch (err) {
      const d = err.response?.data;
      toast.error(
        d?.detail ?? (typeof d === "object" ? Object.values(d).flat().join(" ") : "Something went wrong")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">{isEdit ? "Edit Assignment" : "Assign Trainer"}</div>

        {!isEdit && eligibleMembers.length === 0 && (
          <div style={{
            background: "var(--badge-yellow-bg, #fef3c7)", color: "#92400e",
            border: "1px solid #fcd34d", borderRadius: 8, padding: "10px 14px",
            marginBottom: 14, fontSize: 13,
          }}>
            No eligible members found. Members need a <strong>Standard</strong> or <strong>Premium</strong> plan
            with <strong>Personal Trainer</strong> enabled.
          </div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Member */}
          <div className="form-group">
            <label className="form-label">
              Member *
              {!isEdit && (
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>
                  (Standard / Premium plans only)
                </span>
              )}
            </label>
            {isEdit ? (
              <input className="form-input" value={assignment.member_name} disabled />
            ) : (
              <select className="form-input" value={form.member} onChange={e => handleMemberChange(e.target.value)} required>
                <option value="">— Select eligible member —</option>
                {eligibleMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.member_id_display} — {m.name} ({m.plan_name})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Trainer */}
          <div className="form-group">
            <label className="form-label">Trainer *</label>
            <select className="form-input" value={form.trainer} onChange={e => set("trainer", e.target.value)} required>
              <option value="">— Select trainer —</option>
              {trainers.map(t => (
                <option key={t.id} value={t.id}>
                  S{String(t.id).padStart(4, "0")} — {t.name}
                </option>
              ))}
            </select>
            {trainers.length === 0 && (
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                No active trainers found. Add a staff member with role "Trainer".
              </span>
            )}
          </div>

          {/* Plan */}
          <div className="form-group">
            <label className="form-label">
              Plan
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>
                (Standard / Premium with Personal Trainer)
              </span>
            </label>
            <select className="form-input" value={form.plan} onChange={e => set("plan", e.target.value)}>
              <option value="">— No specific plan —</option>
              {trainerPlans.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.plans})</option>
              ))}
            </select>
          </div>

          {/* Time slot */}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input className="form-input" type="time" value={form.startingtime}
                onChange={e => set("startingtime", e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">End Time *</label>
              <input className="form-input" type="time" value={form.endingtime}
                onChange={e => set("endingtime", e.target.value)} required />
            </div>
          </div>

          {/* Working days */}
          <div className="form-group">
            <label className="form-label">Working Days *</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
              {DAYS.map((day, idx) => (
                <label key={idx} style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13,
                  background: form.working_days.includes(idx) ? "var(--accent)" : "var(--card-bg)",
                  color: form.working_days.includes(idx) ? "#fff" : "var(--text-muted)",
                  border: "1px solid var(--border)",
                  userSelect: "none", transition: "background 0.15s",
                }}>
                  <input type="checkbox" style={{ display: "none" }}
                    checked={form.working_days.includes(idx)}
                    onChange={() => toggleDay(idx)} />
                  {day}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Update" : "Assign Trainer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────── */
export default function TrainerAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "new" | assignment obj
  const [filterMember, setFilterMember] = useState("");
  const [filterTrainer, setFilterTrainer] = useState("");
  const [confirmState, setConfirmState] = useState(null);

  // Eligible members for the filter dropdown (all plans including non-eligible for admin visibility)
  const eligibleMembers = allMembers.filter(m => m.plan_allows_trainer);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterMember) params.member = filterMember;
      if (filterTrainer) params.trainer = filterTrainer;
      const res = await api.get("/members/assign-trainer/", { params });
      const raw = res.data;
      setAssignments(Array.isArray(raw) ? raw : raw?.results ?? []);
    } catch {
      toast.error("Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  }, [filterMember, filterTrainer]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([
      api.get("/members/list/", { params: { status: "active" } }),
      api.get("/staff/members/", { params: { role: "trainer", status: "active" } }),
      api.get("/members/plans/"),
    ]).then(([mRes, tRes, pRes]) => {
      const get = r => Array.isArray(r.data) ? r.data : r.data?.results ?? [];
      setAllMembers(get(mRes));
      setTrainers(get(tRes));
      setPlans(get(pRes));
    }).catch(() => toast.error("Failed to load reference data."));
  }, []);

  const handleDelete = (id) => {
    setConfirmState({
      title: "Delete Assignment",
      message: "Delete this trainer assignment?",
      confirmText: "Delete",
      danger: true,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await api.delete(`/members/assign-trainer/${id}/`);
          toast.success("Assignment deleted.");
          load();
        } catch {
          toast.error("Delete failed.");
        }
      },
      onCancel: () => setConfirmState(null),
    });
  };

  return (
    <div className="page">
      {confirmState && <ConfirmModal {...confirmState} />}
      <div className="page-header">
        <div>
          <h1 className="page-title">Trainer Assignments</h1>
          <p className="page-sub">Personal trainer scheduling for Standard &amp; Premium members</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal("new")}>
          + Assign Trainer
        </button>
      </div>

      {/* Eligible member count info */}
      <div style={{
        display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center",
      }}>
        <span style={{
          fontSize: 13, color: "var(--text-muted)",
          background: "var(--card-bg)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "4px 12px",
        }}>
          {eligibleMembers.length} eligible member{eligibleMembers.length !== 1 ? "s" : ""}
          <span style={{ marginLeft: 4, color: "var(--text-muted)", fontSize: 11 }}>
            (Standard / Premium + Personal Trainer plan)
          </span>
        </span>
        <span style={{
          fontSize: 13, color: "var(--text-muted)",
          background: "var(--card-bg)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "4px 12px",
        }}>
          {trainers.length} active trainer{trainers.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <select className="form-input" style={{ width: 230 }}
          value={filterMember} onChange={e => setFilterMember(e.target.value)}>
          <option value="">All Members</option>
          {eligibleMembers.map(m => (
            <option key={m.id} value={m.id}>{m.member_id_display} — {m.name}</option>
          ))}
        </select>
        <select className="form-input" style={{ width: 230 }}
          value={filterTrainer} onChange={e => setFilterTrainer(e.target.value)}>
          <option value="">All Trainers</option>
          {trainers.map(t => (
            <option key={t.id} value={t.id}>S{String(t.id).padStart(4, "0")} — {t.name}</option>
          ))}
        </select>
        {(filterMember || filterTrainer) && (
          <button className="btn btn-ghost" onClick={() => { setFilterMember(""); setFilterTrainer(""); }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : assignments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">◈</div>
          <div className="empty-state-title">No assignments found</div>
          <div className="empty-state-sub">
            {eligibleMembers.length === 0
              ? "No members have a Standard/Premium plan with Personal Trainer enabled."
              : "Click \"Assign Trainer\" to create one."}
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Plan</th>
                <th>Trainer</th>
                <th>Time Slot</th>
                <th>Days</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(a => (
                <tr key={a.id}>
                  <td>
                    <div>
                      <span className="badge badge-blue" style={{ marginRight: 6, fontSize: 11 }}>
                        {a.member_display_id}
                      </span>
                      {a.member_name}
                    </div>
                  </td>
                  <td>
                    {a.plan_name
                      ? <span className="badge badge-green">{a.plan_name}</span>
                      : <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>}
                  </td>
                  <td>
                    <div>
                      <span className="badge badge-gray" style={{ marginRight: 6, fontSize: 11 }}>
                        {a.trainer_display_id}
                      </span>
                      {a.trainer_name}
                    </div>
                  </td>
                  <td style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                    {a.startingtime?.slice(0, 5)} – {a.endingtime?.slice(0, 5)}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {(a.working_day_names ?? []).map(d => (
                        <span key={d} className="badge badge-yellow"
                          style={{ padding: "1px 6px", fontSize: 11 }}>{d}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => setModal(a)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(a.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <AssignmentModal
          assignment={modal === "new" ? null : modal}
          allMembers={allMembers}
          trainers={trainers}
          plans={plans}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
