import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
function AssignmentModal({ assignment, allMembers, trainers, plans, onClose, onSave, newMemberId, pendingMember }) {
  const isEdit = !!assignment?.id;

  // Only members whose plan allows a personal trainer
  const eligibleMembers = allMembers.filter(m => m.plan_allows_trainer);
  const trainerPlans = plans.filter(p => p.is_active !== false);

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
    if (pendingMember) {
      return {
        member: "",
        trainer: "",
        plan: pendingMember.plan || "",
        startingtime: "06:00", endingtime: "07:00",
        working_days: [0, 1, 2, 3, 4, 5, 6],
      };
    }
    return {
      member: newMemberId || "", trainer: "", plan: "",
      startingtime: "06:00", endingtime: "07:00",
      working_days: [0, 1, 2, 3, 4, 5, 6],
    };
  });

  const [saving, setSaving] = useState(false);
  const [ptAmountToCollect, setPtAmountToCollect] = useState("");
  const [modeOfPayment, setModeOfPayment] = useState("cash");
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Auto-populate plan when member is pre-selected from URL
  useEffect(() => {
    if (newMemberId && !isEdit) {
      const found = eligibleMembers.find(m => String(m.id) === String(newMemberId));
      if (found?.plan) set("plan", found.plan);
    }
  }, [newMemberId, eligibleMembers, isEdit]);

  // When member changes (create mode), auto-populate plan from their current plan
  const handleMemberChange = (memberId) => {
    set("member", memberId);
    if (!memberId) return;
    const found = eligibleMembers.find(m => String(m.id) === String(memberId));
    if (found?.plan) set("plan", found.plan);
  };

  // Amount breakdown
  const selectedTrainer   = trainers.find(t => String(t.id) === String(form.trainer));
  const selectedMemberObj = allMembers.find(m => String(m.id) === String(form.member));
  const memberPlanId      = pendingMember ? pendingMember.plan : selectedMemberObj?.plan;
  const memberPlan        = plans.find(p => String(p.id) === String(memberPlanId));
  const planWithGst       = parseFloat(memberPlan?.price_with_gst ?? memberPlan?.price ?? 0);
  const ptFee             = parseFloat(selectedTrainer?.personal_trainer_amt ?? 0);
  const ptFeeGst          = parseFloat((ptFee * 0.18).toFixed(2));
  const ptFeeWithGst      = ptFee + ptFeeGst;
  const grandTotal        = planWithGst + ptFeeWithGst;

  // Auto-fill PT amount when trainer is selected (GST-inclusive)
  useEffect(() => {
    if (ptFeeWithGst > 0) setPtAmountToCollect(ptFeeWithGst);
    else setPtAmountToCollect("");
  }, [form.trainer, ptFeeWithGst]);

  const toggleDay = (idx) => {
    set("working_days",
      form.working_days.includes(idx)
        ? form.working_days.filter(d => d !== idx)
        : [...form.working_days, idx]
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!pendingMember && !form.member) {
      toast.error("Member is required.");
      return;
    }
    if (!form.trainer) {
      toast.error("Trainer is required.");
      return;
    }
    if (form.working_days.length === 0) {
      toast.error("Select at least one working day.");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const payload = {
          member: Number(form.member),
          trainer: Number(form.trainer),
          plan: form.plan ? Number(form.plan) : null,
          startingtime: form.startingtime,
          endingtime: form.endingtime,
          working_days: daysToStr(form.working_days),
        };
        await api.patch(`/members/assign-trainer/${assignment.id}/`, payload);
        toast.success("Assignment updated!");
        onSave();
      } else if (pendingMember) {
        // Step 1: Create the member (deferred from enrollment) — no installment recorded yet
        const mRes = await api.post("/members/list/", {
          name: pendingMember.name,
          phone: pendingMember.phone,
          email: pendingMember.email || "",
          gender: pendingMember.gender || "",
          address: pendingMember.address || "",
          notes: pendingMember.notes || "",
          age: pendingMember.age || undefined,
          plan_id: pendingMember.plan || undefined,
          diet_id: pendingMember.diet || undefined,
          foodType: pendingMember.foodType || "veg",
          plan_type: pendingMember.plan_type,
          personal_trainer: true,
          amount_paid: pendingMember.amount_paid || 0,
          mode_of_payment: pendingMember.mode_of_payment || "cash",
          renewal_date: pendingMember.renewal_date || undefined,
          status: pendingMember.status || "active",
        });
        const createdMemberId = mRes.data.id;

        // Step 2: Assign trainer — send combined enrollment + PT fee as one transaction
        const collectAmt = parseFloat(ptAmountToCollect || 0);
        const enrollAmt  = parseFloat(pendingMember.amount_paid || 0);
        const combined   = enrollAmt + collectAmt;

        await api.post("/members/assign-trainer/", {
          member:          createdMemberId,
          trainer:         Number(form.trainer),
          plan:            form.plan ? Number(form.plan) : null,
          startingtime:    form.startingtime,
          endingtime:      form.endingtime,
          working_days:    daysToStr(form.working_days),
          amount_paid:     combined,
          mode_of_payment: modeOfPayment,
          notes:           pendingMember.notes || "",
        });

        toast.success(
          combined > 0
            ? `Member enrolled & trainer assigned! ₹${combined.toLocaleString("en-IN")} recorded.`
            : "Member enrolled & trainer assigned!"
        );

        sessionStorage.removeItem("pendingMember");
        onSave();
      } else {
        // Existing member flow
        await api.post("/members/assign-trainer/", {
          member: Number(form.member),
          trainer: Number(form.trainer),
          plan: form.plan ? Number(form.plan) : null,
          startingtime: form.startingtime,
          endingtime: form.endingtime,
          working_days: daysToStr(form.working_days),
        });

        const collectAmt = parseFloat(ptAmountToCollect || 0);
        if (collectAmt > 0) {
          try {
            await api.post(`/members/list/${form.member}/pay-balance/`, {
              amount_paid: collectAmt,
              mode_of_payment: modeOfPayment,
              notes: "PT fee collected at assignment",
            });
            toast.success(`Trainer assigned! ₹${collectAmt.toLocaleString("en-IN")} PT fee recorded.`);
          } catch {
            toast.success("Trainer assigned!");
            toast.error("PT fee collection failed — record it manually in Payments.");
          }
        } else {
          toast.success("Trainer assigned!");
        }
        onSave();
      }
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

        {pendingMember && (
          <div style={{
            background: "rgba(168,255,87,.08)", color: "var(--accent)",
            border: "1px solid rgba(168,255,87,.3)", borderRadius: 8, padding: "10px 14px",
            marginBottom: 14, fontSize: 13,
          }}>
            Completing enrollment for <strong>{pendingMember.name}</strong> — assign a trainer below to add them to the system.
          </div>
        )}

        {!pendingMember && !isEdit && eligibleMembers.length === 0 && (
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
              {!isEdit && !pendingMember && (
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>
                  (Standard / Premium plans only)
                </span>
              )}
            </label>
            {isEdit ? (
              <input className="form-input" value={assignment.member_name} disabled />
            ) : pendingMember ? (
              <div style={{
                background: "var(--card-bg)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "10px 14px", fontSize: 13,
              }}>
                <div style={{ fontWeight: 600, color: "var(--text1)" }}>{pendingMember.name}</div>
                <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>
                  {pendingMember.phone}
                  {memberPlan ? ` · ${memberPlan.name}` : ""}
                  {" · "}<span style={{ textTransform: "capitalize" }}>{pendingMember.plan_type}</span>
                </div>
              </div>
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
                <option key={p.id} value={p.id}>{p.name}</option>
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

          {/* Amount breakdown — shown when trainer is selected */}
          {form.trainer && planWithGst > 0 && (
            <div style={{
              background: "var(--card-bg)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "12px 14px", fontSize: 13,
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--text1)" }}>
                Amount Breakdown
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text2)", marginBottom: 4 }}>
                <span>Plan (incl. GST)</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>₹{planWithGst.toLocaleString("en-IN")}</span>
              </div>
              {ptFee > 0 && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text2)", marginBottom: 4 }}>
                    <span>Personal Trainer Fee (base)</span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>₹{ptFee.toLocaleString("en-IN")}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text2)", marginBottom: 4 }}>
                    <span>GST on PT Fee (18%)</span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>₹{ptFeeGst.toLocaleString("en-IN")}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text2)", marginBottom: 4 }}>
                    <span>Personal Trainer Fee (incl. GST)</span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>₹{ptFeeWithGst.toLocaleString("en-IN")}</span>
                  </div>
                </>
              )}
              <div style={{
                display: "flex", justifyContent: "space-between",
                fontWeight: 700, color: "var(--accent)",
                borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4,
              }}>
                <span>Total</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>₹{grandTotal.toLocaleString("en-IN")}</span>
              </div>
              {ptFee === 0 && (
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>
                  This trainer has no PT fee set. Add one in Staff settings.
                </div>
              )}

              {/* Collect PT fee immediately */}
              {!isEdit && ptFeeWithGst > 0 && (
                <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--text1)" }}>
                    Collect PT Fee Now
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: "var(--text3)", display: "block", marginBottom: 4 }}>
                        Amount (₹)
                      </label>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        max={ptFeeWithGst}
                        value={ptAmountToCollect}
                        onChange={e => setPtAmountToCollect(e.target.value)}
                        placeholder="0 to collect later"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: "var(--text3)", display: "block", marginBottom: 4 }}>
                        Mode
                      </label>
                      <select className="form-input" value={modeOfPayment} onChange={e => setModeOfPayment(e.target.value)}>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="upi">UPI</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                    Leave 0 to collect later via Payments.
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Update" : pendingMember ? "Enroll & Assign Trainer" : "Assign Trainer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────── */
export default function TrainerAssignments() {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams   = new URLSearchParams(location.search);
  const newMemberId = urlParams.get("newMember");
  const fromPage    = urlParams.get("from");
  const isPending   = urlParams.get("pending") === "1";

  const [assignments, setAssignments] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "new" | assignment obj
  const [filterMember, setFilterMember] = useState("");
  const [filterTrainer, setFilterTrainer] = useState("");
  const [confirmState, setConfirmState] = useState(null);
  const [pendingMember, setPendingMember] = useState(null);

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

  // Auto-open modal when redirected from enrollment
  useEffect(() => {
    if (newMemberId && allMembers.length > 0) {
      setModal("new");
    }
  }, [newMemberId, allMembers]);

  // Load pending member from sessionStorage when redirected with pending=1
  useEffect(() => {
    if (isPending) {
      const stored = sessionStorage.getItem("pendingMember");
      if (stored) {
        try {
          setPendingMember(JSON.parse(stored));
          setModal("new");
        } catch {
          sessionStorage.removeItem("pendingMember");
        }
      }
    }
  }, [isPending]);

  const handlePayTrainerFee = (assignment) => {
    setConfirmState({
      title: "Pay Trainer Fee",
      message: `Pay ₹${(assignment.trainer_pt_amt || 0).toLocaleString("en-IN")} to ${assignment.trainer_name} for ${assignment.member_name}? This will be recorded as an expense.`,
      confirmText: "Pay",
      danger: false,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await api.post(`/members/assign-trainer/${assignment.id}/pay-trainer-fee/`);
          toast.success(`₹${(assignment.trainer_pt_amt || 0).toLocaleString("en-IN")} paid to ${assignment.trainer_name}.`);
          load();
        } catch (err) {
          toast.error(err.response?.data?.detail || "Payment failed.");
        }
      },
      onCancel: () => setConfirmState(null),
    });
  };

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
          {fromPage && (
            <button className="btn btn-ghost" style={{ marginBottom: 6, fontSize: 13 }}
              onClick={() => navigate(`/${fromPage}`)}>
              ← Back
            </button>
          )}
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
                <th>Member PT Status</th>
                <th>Trainer Fee</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(a => {
                const ptAmt           = a.trainer_pt_amt || 0;
                const memberPaid      = a.member_amount_paid || 0;
                const memberCoveredPT = ptAmt > 0 && memberPaid >= ptAmt;
                return (
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

                  {/* Member PT payment status */}
                  <td>
                    {ptAmt > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span className={`badge ${memberCoveredPT ? "badge-green" : "badge-yellow"}`} style={{ fontSize: 11 }}>
                          {memberCoveredPT ? "PT Fee Covered" : "PT Fee Pending"}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          ₹{memberPaid.toLocaleString("en-IN")} / ₹{ptAmt.toLocaleString("en-IN")}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                    )}
                  </td>

                  {/* Pay trainer fee */}
                  <td>
                    {ptAmt > 0 ? (
                      a.trainer_fee_paid ? (
                        <span className="badge badge-green" style={{ fontSize: 11 }}>Paid to Trainer</span>
                      ) : (
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={!memberCoveredPT}
                          title={!memberCoveredPT ? "Member hasn't paid PT fee yet" : `Pay ₹${ptAmt.toLocaleString("en-IN")} to ${a.trainer_name}`}
                          onClick={() => handlePayTrainerFee(a)}
                        >
                          Pay ₹{ptAmt.toLocaleString("en-IN")}
                        </button>
                      )
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                    )}
                  </td>

                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => setModal(a)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(a.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
                );
              })}
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
          newMemberId={modal === "new" ? newMemberId : null}
          pendingMember={modal === "new" ? pendingMember : null}
          onClose={() => {
            setModal(null);
            // If user cancels a pending enrollment, keep sessionStorage so they can retry
          }}
          onSave={() => {
            setModal(null);
            setPendingMember(null);
            load();
            if (fromPage) navigate(`/${fromPage}`);
          }}
        />
      )}
    </div>
  );
}
