import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import "./Staff.css";
import ConfirmModal from "../../components/ConfirmModal";

// ─── Constants ──────────────────────────────────────────────────────────────

const SHIFTS = {
  morning: "Morning 6-2PM", evening: "Evening 2-10PM",
  full: "Full Day", off: "Day Off",
};
const ROLES = ["trainer", "receptionist", "cleaner", "manager", "other"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const PRESET_OPTIONS = [
  { value: "mon_sun", label: "Mon – Sun (All week)" },
  { value: "mon_fri", label: "Mon – Fri (Weekdays)" },
  { value: "mon_sat", label: "Mon – Sat" },
  { value: "sat_sun", label: "Sat – Sun (Weekends)" },
  { value: "custom", label: "Custom days" },
];

const STATUS_META = {
  present: { label: "Present", color: "#22c55e", bg: "rgba(34,197,94,.15)" },
  absent: { label: "Absent", color: "#ef4444", bg: "rgba(239,68,68,.15)" },
  late: { label: "Late", color: "#f97316", bg: "rgba(249,115,22,.15)" },
  overtime: { label: "Overtime", color: "#3b82f6", bg: "rgba(59,130,246,.15)" },
  half: { label: "Half Day", color: "#a855f7", bg: "rgba(168,85,247,.15)" },
  leave: { label: "Leave", color: "#6b7280", bg: "rgba(107,114,128,.15)" },
  auto_absent: { label: "Auto Absent", color: "#dc2626", bg: "rgba(220,38,38,.10)" },
  late_overtime: { label: "Late + OT", color: "#a855f7", bg: "rgba(168,85,247,.15)" },
};

const fmt_mins = (m) => {
  if (!m) return "—";
  const h = Math.floor(m / 60), mn = m % 60;
  return h > 0 ? `${h}h ${mn}m` : `${mn}m`;
};

// ─── Shift Management Modal ──────────────────────────────────────────────────

function ShiftModal({ shift, onClose, onSave }) {
  const blank = {
    name: "", working_days_preset: "mon_sun", working_days: "0,1,2,3,4,5,6",
    start_time: "06:00", end_time: "14:00",
    late_grace_minutes: 15, overtime_threshold_minutes: 30, notes: "",
  };
  const [form, setForm] = useState(shift || blank);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Sync working_days when preset changes
  const presetMap = {
    mon_sun: "0,1,2,3,4,5,6", mon_fri: "0,1,2,3,4",
    mon_sat: "0,1,2,3,4,5", sat_sun: "5,6",
  };
  const handlePreset = (val) => {
    set("working_days_preset", val);
    if (val !== "custom") set("working_days", presetMap[val]);
  };

  // Custom day toggle
  const toggleDay = (idx) => {
    const days = form.working_days
      ? form.working_days.split(",").map(Number).filter(n => !isNaN(n))
      : [];
    const next = days.includes(idx) ? days.filter(d => d !== idx) : [...days, idx].sort();
    set("working_days", next.join(","));
  };

  const selectedDays = form.working_days
    ? form.working_days.split(",").map(Number).filter(n => !isNaN(n))
    : [];

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (shift?.id) {
        await api.patch(`/staff/shifts/${shift.id}/`, form);
        toast.success("Shift updated!");
      } else {
        await api.post("/staff/shifts/", form);
        toast.success("Shift created!");
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.name?.[0] || "Something went wrong");
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">{shift?.id ? "Edit Shift" : "Create Shift Template"}</div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Shift Name *</label>
            <input className="form-input" value={form.name} required
              placeholder="e.g. Morning Weekday"
              onChange={e => set("name", e.target.value)} />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input className="form-input" type="time" value={form.start_time} required
                onChange={e => set("start_time", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">End Time *</label>
              <input className="form-input" type="time" value={form.end_time} required
                onChange={e => set("end_time", e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Working Days</label>
            <select className="form-input" value={form.working_days_preset}
              onChange={e => handlePreset(e.target.value)}>
              {PRESET_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {form.working_days_preset === "custom" && (
            <div className="form-group">
              <label className="form-label">Select Days</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                {DAYS_SHORT.map((d, i) => (
                  <button key={i} type="button"
                    onClick={() => toggleDay(i)}
                    style={{
                      padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                      border: "1px solid",
                      borderColor: selectedDays.includes(i) ? "var(--accent)" : "var(--border)",
                      background: selectedDays.includes(i) ? "rgba(168,255,87,.15)" : "transparent",
                      color: selectedDays.includes(i) ? "var(--accent)" : "var(--text3)",
                      cursor: "pointer",
                    }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Late Grace (mins)</label>
              <input className="form-input" type="number" min={0} value={form.late_grace_minutes}
                onChange={e => set("late_grace_minutes", +e.target.value)} />
              <span style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>
                Check-in within this window = on time
              </span>
            </div>
            <div className="form-group">
              <label className="form-label">OT Threshold (mins)</label>
              <input className="form-input" type="number" min={0} value={form.overtime_threshold_minutes}
                onChange={e => set("overtime_threshold_minutes", +e.target.value)} />
              <span style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>
                Check-out beyond this = overtime
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={2} value={form.notes}
              onChange={e => set("notes", e.target.value)} />
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save Shift"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Shifts Tab ──────────────────────────────────────────────────────────────

function ShiftsTab() {
  const [shifts, setShifts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [modal, setModal] = useState(null);   // null | "add" | shift object
  const [loading, setLoading] = useState(true);
  const [confirmState, setConfirmState] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, st] = await Promise.all([
        api.get("/staff/shifts/"),
        api.get("/staff/members/"),
      ]);
      setShifts(s.data.results || s.data);
      setStaff(st.data.results || st.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteShift = (id) => {
    setConfirmState({
      title: "Delete Shift Template",
      message: "Delete this shift template? Staff assigned to it will be unlinked.",
      confirmText: "Delete",
      danger: true,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await api.delete(`/staff/shifts/${id}/`);
          toast.success("Shift deleted.");
          load();
        } catch { toast.error("Failed to delete."); }
      },
      onCancel: () => setConfirmState(null),
    });
  };

  // Assign shift template to a staff member
  const assignShift = async (staffId, shiftId) => {
    try {
      await api.patch(`/staff/members/${staffId}/`, { shift_template: shiftId || null });
      toast.success("Shift assigned.");
      load();
    } catch { toast.error("Failed to assign."); }
  };

  return (
    <div>
      {confirmState && <ConfirmModal {...confirmState} />}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <button className="btn btn-primary" onClick={() => setModal("add")}>
          + New Shift Template
        </button>
      </div>

      {/* Shift templates */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12, marginBottom: 24 }}>
        {loading ? (
          <div style={{ color: "var(--text3)", padding: 24 }}>Loading…</div>
        ) : shifts.length === 0 ? (
          <div style={{ color: "var(--text3)", padding: 24 }}>
            No shift templates yet. Create one to assign to trainers.
          </div>
        ) : shifts.map(sh => {
          const assignedCount = staff.filter(s => s.shift_template === sh.id).length;
          return (
            <div key={sh.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text1)" }}>{sh.name}</div>
                  <div style={{ fontSize: 12, color: "var(--accent)", fontFamily: "var(--font-mono)", marginTop: 3 }}>
                    {sh.start_time?.slice(0, 5)} – {sh.end_time?.slice(0, 5)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => setModal(sh)}>Edit</button>
                  <button className="btn btn-sm" onClick={() => deleteShift(sh.id)}
                    style={{ background: "rgba(255,91,91,.1)", color: "var(--danger)", border: "1px solid rgba(255,91,91,.2)" }}>
                    Del
                  </button>
                </div>
              </div>
              {/* Working days chips */}
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 10 }}>
                {DAYS_SHORT.map((d, i) => {
                  const days = sh.working_days ? sh.working_days.split(",").map(Number) : [];
                  const active = days.includes(i);
                  return (
                    <span key={i} style={{
                      padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                      background: active ? "rgba(168,255,87,.15)" : "var(--surface2)",
                      color: active ? "var(--accent)" : "var(--text3)",
                      border: `1px solid ${active ? "rgba(168,255,87,.3)" : "var(--border)"}`,
                    }}>{d}</span>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 8 }}>
                Grace: {sh.late_grace_minutes}m late &nbsp;·&nbsp; OT after {sh.overtime_threshold_minutes}m
              </div>
              <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 4 }}>
                {assignedCount} staff assigned
              </div>
            </div>
          );
        })}
      </div>

      {/* Staff assignment table */}
      <div className="card">
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 14 }}>
          Assign Shifts to Staff
        </div>
        <div className="table-wrap shift-assign-wrap">
          <table>
            <thead><tr>
              <th>Staff</th><th>Role</th><th>Current Shift Template</th><th>Assign</th>
            </tr></thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id}>
                  <td><b>{s.name}</b></td>
                  <td><span className="badge badge-blue">{s.role}</span></td>
                  <td style={{ fontSize: 12, color: "var(--text2)" }}>
                    {shifts.find(sh => sh.id === s.shift_template)?.name || (
                      <span style={{ color: "var(--text3)" }}>None assigned</span>
                    )}
                  </td>
                  <td>
                    <select className="form-input" style={{ minWidth: 180, fontSize: 12 }}
                      value={s.shift_template || ""}
                      onChange={e => assignShift(s.id, e.target.value || null)}>
                      <option value="">— No shift —</option>
                      {shifts.map(sh => (
                        <option key={sh.id} value={sh.id}>{sh.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(modal === "add" || (modal && modal.id)) && (
        <ShiftModal
          shift={modal === "add" ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => {
            setModal(null);
            load();   // re-fetches both shifts AND staff so assign dropdown updates instantly
          }}
        />
      )}
    </div>
  );
}

// ─── Mark Day Modal ──────────────────────────────────────────────────────────

function MarkDayModal({ staffId, date, existing, onClose, onSave }) {
  // Strip seconds so <input type="time"> always gets "HH:MM"
  const toHHMM = (t) => (t ? String(t).slice(0, 5) : "");

  const [form, setForm] = useState({
    status: existing?.status || "present",
    check_in: toHHMM(existing?.check_in),
    check_out: toHHMM(existing?.check_out),
    notes: existing?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => {
    const next = { ...p, [k]: v };
    // Clear times when switching to a status that has no check-in
    if (k === "status" && ["absent", "auto_absent", "leave"].includes(v)) {
      next.check_in = "";
      next.check_out = "";
    }
    return next;
  });

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post(`/staff/members/${staffId}/mark-day/`, { date, ...form });
      toast.success("Attendance updated.");
      onSave();
    } catch { toast.error("Failed to save."); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">Mark Attendance — {date}</div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-input" value={form.status} onChange={e => set("status", e.target.value)}>
              {Object.entries(STATUS_META)
                .filter(([k]) => k !== "late_overtime")  // auto-derived, not manually set
                .map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
            </select>
          </div>
          {form.status !== "absent" && form.status !== "auto_absent" && (
            <>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Check In *</label>
                  <input className="form-input" type="time" value={form.check_in} required
                    onChange={e => set("check_in", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Check Out <span style={{ color: "var(--text3)", fontSize: 11 }}>(optional)</span></label>
                  <input className="form-input" type="time" value={form.check_out} required
                    onChange={e => set("check_out", e.target.value)} />
                </div>
              </div>
            </>
          )}
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Staff Calendar View ─────────────────────────────────────────────────────

function StaffCalendar({ staffId, staffName, onBack }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [markDay, setMarkDay] = useState(null);  // { date, existing }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/staff/members/${staffId}/calendar/?year=${year}&month=${month}`);
      setData(res.data);
    } finally { setLoading(false); }
  }, [staffId, year, month]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text3)" }}>Loading calendar…</div>;
  if (!data) return null;

  const { counts, shift, days } = data;

  // Pad calendar grid so first day aligns correctly (Mon=0)
  const firstWeekday = new Date(year, month - 1, 1).getDay();   // 0=Sun
  const padDays = (firstWeekday + 6) % 7;                  // convert to Mon-based

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>← Back</button>
        <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text1)" }}>
          {staffName} — Attendance Calendar
        </div>
        {shift?.name && (
          <span style={{
            fontSize: 12, fontWeight: 600, padding: "3px 12px", borderRadius: 20,
            background: "rgba(168,255,87,.12)", color: "var(--accent)",
            border: "1px solid rgba(168,255,87,.25)",
          }}>
            {shift.name} · {shift.start_time?.slice(0, 5)}–{shift.end_time?.slice(0, 5)}
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <select className="form-input" style={{ minWidth: 90 }} value={month}
            onChange={e => setMonth(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="form-input" style={{ minWidth: 80 }} value={year}
            onChange={e => setYear(+e.target.value)}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary counts */}
      {(() => {
        // Total worked minutes across all days this month
        const totalWorkedMins = days.reduce((sum, d) => sum + (d.worked_minutes || 0), 0);
        const totalLateCount = (counts.late || 0) + (counts.late_overtime || 0);
        const totalOTCount = (counts.overtime || 0) + (counts.late_overtime || 0);
        const totalLatemins = days.reduce((sum, d) => sum + (d.late_minutes || 0), 0);
        const totalOTmins = days.reduce((sum, d) => sum + (d.overtime_minutes || 0), 0);
        const wh = Math.floor(totalWorkedMins / 60);
        const wm = totalWorkedMins % 60;

        return (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {/* Static count boxes */}
            {[
              { key: "working_days", label: "Working Days", color: "var(--text2)", val: counts.working_days ?? 0 },
              { key: "present", label: "Present", color: "#22c55e", val: counts.present ?? 0 },
              { key: "absent", label: "Absent", color: "#ef4444", val: (counts.absent ?? 0) + (counts.auto_absent ?? 0) },
              { key: "auto_absent", label: "Auto Absent", color: "#dc2626", val: counts.auto_absent ?? 0 },
              { key: "late", label: "Late Days", color: "#f97316", val: totalLateCount },
              { key: "overtime", label: "OT Days", color: "#3b82f6", val: totalOTCount },
              { key: "half", label: "Half Day", color: "#a855f7", val: counts.half ?? 0 },
              { key: "leave", label: "Leave", color: "#6b7280", val: counts.leave ?? 0 },
            ].map(c => (
              <div key={c.key} style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "8px 14px", textAlign: "center", minWidth: 70,
              }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: c.color }}>{c.val}</div>
                <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px" }}>{c.label}</div>
              </div>
            ))}

            {/* Total worked hours — wider box, prominent */}
            <div style={{
              background: "var(--surface)", border: "2px solid rgba(168,255,87,.3)",
              borderRadius: 8, padding: "8px 18px", textAlign: "center", minWidth: 110,
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                {wh}h {wm}m
              </div>
              <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px" }}>
                Total Worked
              </div>
              {totalLatemins > 0 && (
                <div style={{ fontSize: 9, color: "#f97316", marginTop: 2 }}>
                  +{Math.floor(totalLatemins / 60) > 0 ? `${Math.floor(totalLatemins / 60)}h ` : ""}{totalLatemins % 60}m total late
                </div>
              )}
              {totalOTmins > 0 && (
                <div style={{ fontSize: 9, color: "#3b82f6", marginTop: 1 }}>
                  +{Math.floor(totalOTmins / 60) > 0 ? `${Math.floor(totalOTmins / 60)}h ` : ""}{totalOTmins % 60}m total OT
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Calendar grid */}
      <div className="card staff-calendar-card" style={{ padding: 16 }}>
        {/* Day headers */}
        <div className="staff-calendar-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4, marginBottom: 4 }}>
          {DAYS_SHORT.map(d => (
            <div key={d} style={{
              textAlign: "center", fontSize: 11, fontWeight: 700,
              color: d === "Sun" ? "var(--danger)" : "var(--text3)", padding: "4px 0",
              minWidth: 0, overflow: "hidden",
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Pad + day cells */}
        <div className="staff-calendar-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
          {Array.from({ length: padDays }).map((_, i) => <div key={`pad-${i}`} />)}

          {days.map(day => {
            const sm = day.status ? STATUS_META[day.status] : null;
            const isToday = day.date === new Date().toISOString().split("T")[0];

            return (
              <div key={day.date}
                className="staff-calendar-cell"
                onClick={() => !day.is_future && setMarkDay({ date: day.date, existing: day.attendance_id ? day : null })}
                style={{
                  borderRadius: 8, padding: "6px 4px", textAlign: "center",
                  background: day.is_future ? "transparent" :
                    !day.is_working_day ? "var(--surface2)" :
                      sm ? sm.bg : "var(--surface2)",
                  border: isToday ? "2px solid var(--accent)" :
                    day.is_working_day && !day.is_future ? "1px solid var(--border)" :
                      "1px solid transparent",
                  cursor: day.is_future ? "default" : "pointer",
                  opacity: day.is_future ? 0.35 : 1,
                  minHeight: 64,
                  minWidth: 0,
                  overflow: "hidden",
                  position: "relative",
                  transition: "filter .15s",
                }}
                title={day.is_future ? "" : `Click to mark attendance for ${day.date}`}
              >
                {/* Day number */}
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  color: isToday ? "var(--accent)" : "var(--text1)"
                }}>
                  {day.day_num}
                </div>

                {/* Status label — for late_overtime show two stacked coloured lines */}
                {sm && day.status !== "late_overtime" && (
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: sm.color,
                    textTransform: "uppercase", letterSpacing: ".4px", marginTop: 2
                  }}>
                    {sm.label}
                  </div>
                )}
                {day.status === "late_overtime" && (
                  <div style={{ marginTop: 2, lineHeight: 1.4 }}>
                    <div style={{
                      fontSize: 9, fontWeight: 700, color: "#f97316",
                      textTransform: "uppercase", letterSpacing: ".4px"
                    }}>Late</div>
                    <div style={{
                      fontSize: 9, fontWeight: 700, color: "#3b82f6",
                      textTransform: "uppercase", letterSpacing: ".4px"
                    }}>+ OT</div>
                  </div>
                )}

                {/* Non-working day marker */}
                {!day.is_working_day && !day.is_future && (
                  <div style={{ fontSize: 9, color: "var(--text3)", marginTop: 2 }}>OFF</div>
                )}

                {/* Times + working hrs + late/OT details */}
                {day.check_in && (
                  <div style={{ fontSize: 9, color: "var(--text2)", marginTop: 2, lineHeight: 1.4 }}>
                    {day.check_in.slice(0, 5)}{day.check_out ? ` – ${day.check_out.slice(0, 5)}` : ""}
                  </div>
                )}
                {day.worked_minutes > 0 && (
                  <div style={{ fontSize: 9, color: "var(--text2)", fontWeight: 600, marginTop: 1 }}>
                    {fmt_mins(day.worked_minutes)} worked
                  </div>
                )}
                {day.late_minutes > 0 && (
                  <div style={{
                    fontSize: 8, background: "rgba(249,115,22,.2)",
                    color: "#f97316", borderRadius: 4, padding: "1px 4px",
                    fontWeight: 700, marginTop: 2, display: "inline-block"
                  }}>
                    {fmt_mins(day.late_minutes)} late
                  </div>
                )}
                {day.overtime_minutes > 0 && (
                  <div style={{
                    fontSize: 8, background: "rgba(59,130,246,.2)",
                    color: "#3b82f6", borderRadius: 4, padding: "1px 4px",
                    fontWeight: 700, marginTop: 2, display: "inline-block"
                  }}>
                    {fmt_mins(day.overtime_minutes)} OT
                  </div>
                )}
                {day.worked_minutes > 0 && day.shift_duration > 0 && (
                  <div style={{ marginTop: 2 }}>
                    {day.worked_minutes < day.shift_duration - 30 ? (
                      <span style={{ fontSize: 8, color: "#ef4444", fontWeight: 700 }}>
                        ↓ {fmt_mins(day.shift_duration - day.worked_minutes)} short
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{
          display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14,
          paddingTop: 12, borderTop: "1px solid var(--border)"
        }}>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: v.bg, border: `1px solid ${v.color}` }} />
              <span style={{ fontSize: 10, color: "var(--text3)" }}>{v.label}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: "var(--surface2)" }} />
            <span style={{ fontSize: 10, color: "var(--text3)" }}>Day Off</span>
          </div>
        </div>
      </div>

      {markDay && (
        <MarkDayModal
          staffId={staffId}
          date={markDay.date}
          existing={markDay.existing}
          onClose={() => setMarkDay(null)}
          onSave={() => { setMarkDay(null); load(); }}
        />
      )}
    </div>
  );
}

// ─── Existing sub-components (trimmed to essentials) ────────────────────────

function StaffModal({ staff, onClose, onSave }) {
  const [form, setForm] = useState({
    name: staff?.name || "",
    phone: staff?.phone || "",
    email: staff?.email || "",
    role: staff?.role || "trainer",
    salary: staff?.salary || "",
    personal_trainer_amt: staff?.personal_trainer_amt || "",
    status: staff?.status || "active",
    notes: staff?.notes || "",
    shift_template: staff?.shift_template || "",
  });
  const [shifts, setShifts] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Load shift templates from StaffShift table when modal opens
  useEffect(() => {
    api.get("/staff/shifts/").then(res => {
      setShifts(res.data.results || res.data);
    }).catch(() => { });
  }, []);

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, shift_template: form.shift_template || null };
      if (staff?.id) {
        await api.patch(`/staff/members/${staff.id}/`, payload);
        toast.success("Staff updated!");
      } else {
        await api.post("/staff/members/", payload);
        toast.success("Staff added!");
      }
      onSave();
    } catch { toast.error("Something went wrong"); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{staff?.id ? "Edit Staff" : "Add Staff Member"}</div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={form.name}
                onChange={e => set("name", e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone *</label>
              <input className="form-input" value={form.phone}
                onChange={e => set("phone", e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email}
                onChange={e => set("email", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-input" value={form.role}
                onChange={e => set("role", e.target.value)}>
                {ROLES.map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Shift Template</label>
              <select className="form-input" value={form.shift_template || ""}
                onChange={e => set("shift_template", e.target.value || null)}>
                <option value="">— No shift assigned —</option>
                {shifts.map(sh => (
                  <option key={sh.id} value={sh.id}>
                    {sh.name} · {sh.start_time?.slice(0, 5)}–{sh.end_time?.slice(0, 5)}
                  </option>
                ))}
              </select>
              {shifts.length === 0 && (
                <span style={{ fontSize: 11, color: "var(--warn)", marginTop: 3, display: "block" }}>
                  No shifts created yet — add them in the Shifts tab first.
                </span>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Salary (₹)</label>
              <input className="form-input" type="number" value={form.salary}
                onChange={e => set("salary", e.target.value)} />
            </div>
            {form.role === "trainer" && (
              <div className="form-group">
                <label className="form-label">Personal Trainer Fee (₹)</label>
                <input className="form-input" type="number" value={form.personal_trainer_amt}
                  onChange={e => set("personal_trainer_amt", e.target.value)}
                  placeholder="Fee charged when assigned as personal trainer" />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status}
                onChange={e => set("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-input" value={form.notes}
              onChange={e => set("notes", e.target.value)} rows={2} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
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

  const toggle = (id, field, val) =>
    setRecords(p => ({ ...p, [id]: { ...(p[id] || { status: "present" }), [field]: val } }));

  const submit = async () => {
    setSaving(true);
    const recs = staffList.filter(s => s.status === "active").map(s => ({
      staff: s.id,
      date,
      status: records[s.id]?.status || "present",
      check_in: records[s.id]?.check_in || null,
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
      <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">Mark Attendance</div>
        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Date</label>
          <input className="form-input" type="date" value={date}
            onChange={e => setDate(e.target.value)} style={{ maxWidth: 180, marginTop: 4 }} />
        </div>
        <div className="table-wrap attendance-bulk-wrap">
          <table>
            <thead><tr>
              <th>Name</th><th>Role</th><th>Status</th><th>Check In</th><th>Check Out</th>
            </tr></thead>
            <tbody>
              {staffList.filter(s => s.status === "active").map(s => (
                <tr key={s.id}>
                  <td><b>{s.name}</b></td>
                  <td><span className="badge badge-blue">{s.role}</span></td>
                  <td>
                    <select className="form-input" style={{ minWidth: 110 }}
                      value={records[s.id]?.status || "present"}
                      onChange={e => toggle(s.id, "status", e.target.value)}>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="half">Half Day</option>
                      <option value="leave">Leave</option>
                    </select>
                  </td>
                  <td>
                    <input className="form-input" type="time" style={{ minWidth: 110 }}
                      value={records[s.id]?.check_in || ""}
                      onChange={e => toggle(s.id, "check_in", e.target.value)} />
                  </td>
                  <td>
                    <input className="form-input" type="time" style={{ minWidth: 110 }}
                      value={records[s.id]?.check_out || ""}
                      onChange={e => toggle(s.id, "check_out", e.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Mark Attendance"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentsTab({ staffList }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [confirmState, setConfirmState] = useState(null);

  const fmtMins = (m) => {
    if (!m || m <= 0) return "—";
    const h = Math.floor(m / 60), mn = m % 60;
    return h > 0 ? `${h}h ${mn > 0 ? mn + "m" : ""}`.trim() : `${mn}m`;
  };
  const fmtRs = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
  const attColor = (p) => p >= 90 ? "#22c55e" : p >= 75 ? "#f97316" : "#ef4444";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/staff/members/salary-summary/?year=${year}&month=${month}`);
      setRows(res.data.staff || []);
      setLoaded(true);
    } catch { toast.error("Failed to load salary data"); }
    finally { setLoading(false); }
  }, [month, year]);

  const generate = () => {
    setConfirmState({
      title: "Generate Salary Records",
      message: `Generate salary records for all active staff for ${month}/${year}?`,
      confirmText: "Generate",
      onConfirm: async () => {
        setConfirmState(null);
        setGenLoading(true);
        try {
          const res = await api.post("/staff/members/generate-payments/", { year, month });
          toast.success(`${res.data.created} salary records created`);
          load();
        } catch { toast.error("Failed to generate"); }
        finally { setGenLoading(false); }
      },
      onCancel: () => setConfirmState(null),
    });
  };

  const markPaid = async (row) => {
    try {
      if (row.payment_id) {
        await api.post(`/staff/payments/${row.payment_id}/mark_paid/`);
      } else {
        // Create payment record first, then mark paid
        const monthStr = `${year}-${String(month).padStart(2, "0")}-01`;
        const created = await api.post("/staff/payments/", {
          staff: row.staff_id, month: monthStr, amount: row.salary_payable, status: "pending",
        });
        await api.post(`/staff/payments/${created.data.id}/mark_paid/`);
      }
      toast.success(`${row.staff_name} — salary marked paid!`);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const markUnpaid = (row) => {
    setConfirmState({
      title: "Mark as Unpaid",
      message: "Mark as unpaid? This will also remove the Finance record.",
      confirmText: "Mark Unpaid",
      danger: true,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await api.post(`/staff/payments/${row.payment_id}/mark_unpaid/`);
          toast.success("Marked unpaid.");
          load();
        } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
      },
      onCancel: () => setConfirmState(null),
    });
  };

  // Summary totals
  const totalPayable = rows.reduce((s, r) => s + (r.salary_payable || 0), 0);
  const totalPaid = rows.filter(r => r.payment_status === "paid").reduce((s, r) => s + (r.payment_amount || 0), 0);
  const totalPending = rows.filter(r => r.payment_status !== "paid").reduce((s, r) => s + (r.salary_payable || 0), 0);

  return (
    <div>
      {confirmState && <ConfirmModal {...confirmState} />}
      {/* Controls */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", padding: "16px 20px",
        display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 16,
      }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Month</label>
          <select className="form-input" style={{ minWidth: 100 }} value={month}
            onChange={e => setMonth(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Year</label>
          <select className="form-input" style={{ minWidth: 90 }} value={year}
            onChange={e => setYear(+e.target.value)}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Load Salaries"}
        </button>
        <button className="btn btn-secondary" onClick={generate} disabled={genLoading}>
          {genLoading ? "Generating…" : "Generate Records"}
        </button>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--text3)", lineHeight: 1.6 }}>
          Salary = Base × Attendance%<br />
          Billable = Worked + OT − Late hrs
        </div>
      </div>

      {/* Summary cards */}
      {loaded && (
        <div className="grid-3" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="label">Total Payable</div>
            <div className="value" style={{ color: "var(--accent)" }}>{fmtRs(totalPayable)}</div>
            <div className="sub">{rows.length} staff</div>
          </div>
          <div className="stat-card">
            <div className="label">Paid Out</div>
            <div className="value" style={{ color: "#22c55e" }}>{fmtRs(totalPaid)}</div>
            <div className="sub">{rows.filter(r => r.payment_status === "paid").length} staff paid</div>
          </div>
          <div className="stat-card">
            <div className="label">Pending</div>
            <div className="value" style={{ color: "var(--warn)" }}>{fmtRs(totalPending)}</div>
            <div className="sub">{rows.filter(r => r.payment_status !== "paid").length} staff unpaid</div>
          </div>
        </div>
      )}

      {/* Table */}
      {!loaded ? (
        <div style={{
          textAlign: "center", padding: "60px 20px", color: "var(--text3)", fontSize: 14,
          background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)"
        }}>
          Select month & year, then click <b style={{ color: "var(--text2)" }}>Load Salaries</b>
        </div>
      ) : loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 20px", color: "var(--text3)", fontSize: 13,
          background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)"
        }}>
          No active staff found.
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap salary-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Shift</th>
                  <th style={{ textAlign: "center" }}>Att %</th>
                  <th style={{ textAlign: "center" }}>Days<br /><span style={{ fontWeight: 400 }}>P / A / L / OT</span></th>
                  <th style={{ textAlign: "right" }}>Sched Hrs</th>
                  <th style={{ textAlign: "right" }}>Worked Hrs</th>
                  <th style={{ textAlign: "right" }}>Late</th>
                  <th style={{ textAlign: "right" }}>OT</th>
                  <th style={{ textAlign: "right" }}>Billable Hrs</th>
                  <th style={{ textAlign: "right" }}>Base Sal</th>
                  <th style={{ textAlign: "right" }}>Payable</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const isPaid = r.payment_status === "paid";
                  const attPct = r.attendance_pct || 0;
                  const hoursPct = r.hours_pct || 0;
                  const attCol = attColor(attPct);
                  const hrCol = attColor(hoursPct);

                  return (
                    <tr key={r.staff_id} style={{ opacity: isPaid ? 0.8 : 1 }}>
                      {/* Name + Role */}
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{r.staff_name}</div>
                        <div>
                          <span className="badge badge-blue" style={{ fontSize: 10 }}>{r.staff_role}</span>
                        </div>
                      </td>

                      {/* Shift */}
                      <td style={{ fontSize: 11, color: "var(--text2)" }}>
                        {r.shift_name ? (
                          <>
                            <div style={{ fontWeight: 600, color: "var(--accent)" }}>{r.shift_name}</div>
                            <div style={{ color: "var(--text3)", fontSize: 10 }}>
                              {r.shift_start?.slice(0, 5)}–{r.shift_end?.slice(0, 5)}
                            </div>
                          </>
                        ) : <span style={{ color: "var(--text3)" }}>No shift</span>}
                      </td>

                      {/* Attendance % */}
                      <td style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 1 }}>
                          Days: <span style={{ fontWeight: 700, color: attCol }}>{attPct}%</span>
                        </div>
                        <div style={{
                          fontSize: 15, fontWeight: 800, color: hrCol,
                          fontFamily: "var(--font-mono)"
                        }}>{hoursPct}%</div>
                        <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 2 }}>hrs worked</div>
                        <div style={{
                          width: 52, height: 4, background: "var(--surface2)",
                          borderRadius: 2, margin: "2px auto 0"
                        }}>
                          <div style={{
                            width: `${Math.min(hoursPct, 100)}%`, height: "100%",
                            background: hrCol, borderRadius: 2
                          }} />
                        </div>
                      </td>

                      {/* P / A / Late / OT days */}
                      <td style={{ textAlign: "center", fontSize: 12, fontFamily: "var(--font-mono)" }}>
                        <span style={{ color: "#22c55e" }}>{r.days_present}</span>
                        <span style={{ color: "var(--text3)" }}>/</span>
                        <span style={{ color: "#ef4444" }}>{r.days_absent}</span>
                        <span style={{ color: "var(--text3)" }}>/</span>
                        <span style={{ color: "#f97316" }}>{r.days_late}</span>
                        <span style={{ color: "var(--text3)" }}>/</span>
                        <span style={{ color: "#3b82f6" }}>{r.days_ot}</span>
                      </td>

                      {/* Scheduled hrs */}
                      <td style={{
                        textAlign: "right", fontSize: 11,
                        fontFamily: "var(--font-mono)", color: "var(--text3)"
                      }}>
                        {fmtMins(r.total_scheduled_mins)}
                      </td>

                      {/* Worked hrs */}
                      <td style={{
                        textAlign: "right", fontSize: 12,
                        fontFamily: "var(--font-mono)", color: "var(--text1)", fontWeight: 600
                      }}>
                        {fmtMins(r.total_worked_mins)}
                      </td>

                      {/* Late */}
                      <td style={{ textAlign: "right" }}>
                        {r.total_late_mins > 0 ? (
                          <span style={{
                            fontSize: 11, fontWeight: 700, color: "#f97316",
                            background: "rgba(249,115,22,.12)", padding: "2px 6px", borderRadius: 4
                          }}>
                            −{fmtMins(r.total_late_mins)}
                          </span>
                        ) : <span style={{ color: "var(--text3)", fontSize: 11 }}>—</span>}
                      </td>

                      {/* OT */}
                      <td style={{ textAlign: "right" }}>
                        {r.total_ot_mins > 0 ? (
                          <span style={{
                            fontSize: 11, fontWeight: 700, color: "#3b82f6",
                            background: "rgba(59,130,246,.12)", padding: "2px 6px", borderRadius: 4
                          }}>
                            +{fmtMins(r.total_ot_mins)}
                          </span>
                        ) : <span style={{ color: "var(--text3)", fontSize: 11 }}>—</span>}
                      </td>

                      {/* Billable hrs */}
                      <td style={{
                        textAlign: "right", fontSize: 12,
                        fontFamily: "var(--font-mono)", color: "var(--accent)", fontWeight: 700
                      }}>
                        {fmtMins(r.billable_mins)}
                        {r.total_scheduled_mins > 0 && (
                          <div style={{ fontSize: 9, color: "var(--text3)", fontWeight: 400 }}>
                            of {fmtMins(r.total_scheduled_mins)}
                          </div>
                        )}
                      </td>

                      {/* Base salary */}
                      <td style={{
                        textAlign: "right", fontSize: 12,
                        fontFamily: "var(--font-mono)", color: "var(--text3)"
                      }}>
                        {fmtRs(r.base_salary)}
                      </td>

                      {/* Payable */}
                      <td style={{ textAlign: "right" }}>
                        <div style={{
                          fontSize: 14, fontWeight: 800,
                          fontFamily: "var(--font-mono)", color: hrCol
                        }}>
                          {fmtRs(r.salary_payable)}
                        </div>
                        {r.salary_payable !== r.base_salary && (
                          <div style={{ fontSize: 9, color: "var(--text3)" }}>
                            {hoursPct}% of {fmtRs(r.base_salary)}
                          </div>
                        )}
                      </td>

                      {/* Status badge */}
                      <td style={{ textAlign: "center" }}>
                        <span className={`badge ${isPaid ? "badge-green" :
                            r.payment_status === "partial" ? "badge-yellow" :
                              r.payment_status === "no_record" ? "badge-gray" : "badge-yellow"
                          }`}>
                          {isPaid ? "Paid" : r.payment_status === "no_record" ? "No Record" : "Pending"}
                        </span>
                        {r.paid_date && (
                          <div style={{ fontSize: 9, color: "var(--text3)", marginTop: 2 }}>{r.paid_date}</div>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: "center" }}>
                        {!isPaid ? (
                          <button className="btn btn-sm btn-primary"
                            onClick={() => markPaid(r)}>
                            ✓ Pay {fmtRs(r.salary_payable)}
                          </button>
                        ) : (
                          <button className="btn btn-sm"
                            style={{
                              background: "rgba(255,91,91,.12)", color: "var(--danger)",
                              border: "1px solid rgba(255,91,91,.25)"
                            }}
                            onClick={() => markUnpaid(r)}>
                            ↩ Undo
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Formula legend */}
          <div style={{
            padding: "10px 18px", borderTop: "1px solid var(--border)",
            fontSize: 11, color: "var(--text3)", display: "flex", gap: 20, flexWrap: "wrap"
          }}>
            <span>📊 <b>Att%</b> = Present days ÷ Working days</span>
            <span>⏱ <b>Billable</b> = Worked + OT − Late</span>
            <span>⏱ <b>Hrs%</b> = Billable hrs ÷ Scheduled hrs → used for salary</span>
            <span>💰 <b>Payable</b> = Base salary × Hrs%</span>
            <span style={{ color: "#22c55e" }}>● ≥90% full pay</span>
            <span style={{ color: "#f97316" }}>● 75–89% partial</span>
            <span style={{ color: "#ef4444" }}>● &lt;75% reduced</span>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Main Staff Page ─────────────────────────────────────────────────────────

export default function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [tab, setTab] = useState("staff");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  // Calendar drill-down: { id, name } or null
  const [calStaff, setCalStaff] = useState(null);

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
      setStaffList(s.data.results || s.data);
      setAttendance(a.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // If viewing a calendar, render it full-page instead of the tab content
  if (calStaff) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">Staff Management</div>
            <div className="page-subtitle">Attendance Calendar — {calStaff.name}</div>
          </div>
        </div>
        <StaffCalendar
          staffId={calStaff.id}
          staffName={calStaff.name}
          onBack={() => setCalStaff(null)}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Staff Management</div>
          <div className="page-subtitle">Attendance, shifts and salary tracking</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {tab === "attendance" && (
            <button className="btn btn-secondary" onClick={() => setModal("attendance")}>
              Mark Attendance
            </button>
          )}
          {tab === "staff" && (
            <button className="btn btn-primary" onClick={() => setModal("add")}>
              + Add Staff
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="staff-tabs">
        {["staff", "attendance", "shifts", "payments"].map(t => (
          <button key={t}
            className={`staff-tab ${tab === t ? "staff-tab--active" : ""}`}
            onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Staff list ── */}
      {tab === "staff" && (
        <>
        {/* Mobile cards */}
        <div className="mobile-card-list">
          {loading ? (
            <div className="mobile-card__empty">Loading…</div>
          ) : staffList.length === 0 ? (
            <div className="mobile-card__empty">No staff found</div>
          ) : staffList.map(s => (
            <div key={s.id} className="mobile-card">
              <div className="mobile-card__left">
                <span className="mobile-card__id">
                  {s.staff_id_display || `S${String(s.id).padStart(4, "0")}`}
                </span>
                <span className="mobile-card__title">{s.name}</span>
                <span style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span className="badge badge-blue" style={{ fontSize: 11 }}>{s.role}</span>
                  <span className={`badge ${s.status === "active" ? "badge-green" :
                      s.status === "on_leave" ? "badge-yellow" : "badge-gray"}`}
                    style={{ fontSize: 11 }}>{s.status}</span>
                </span>
                <span className="mobile-card__meta">
                  ₹{Number(s.salary).toLocaleString("en-IN")}
                  {s.shift_template_name ? ` · ${s.shift_template_name}` : ""}
                </span>
              </div>
              <div className="mobile-card__right">
                <button className="btn btn-sm btn-secondary"
                  onClick={() => { setSelected(s); setModal("edit"); }}>
                  Edit
                </button>
                <button className="btn btn-sm"
                  style={{
                    background: "rgba(168,255,87,.1)", color: "var(--accent)",
                    border: "1px solid rgba(168,255,87,.2)", whiteSpace: "nowrap"
                  }}
                  onClick={() => setCalStaff({ id: s.id, name: s.name })}>
                  📅 Calendar
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="card desktop-table-view">
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>ID</th><th>Name</th><th>Role</th><th>Shift</th>
                <th>Phone</th><th>Salary</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>Loading…</td></tr>
                ) : staffList.map(s => (
                  <tr key={s.id}>
                    <td>
                      <span className="staff-id">
                        {s.staff_id_display || `S${String(s.id).padStart(4, "0")}`}
                      </span>
                    </td>
                    <td><b>{s.name}</b></td>
                    <td><span className="badge badge-blue">{s.role}</span></td>
                    <td style={{ fontSize: 12, color: "var(--text2)" }}>
                      {s.shift_template_name ? (
                        <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                          {s.shift_template_name}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text3)", fontSize: 11 }}>No shift assigned</span>
                      )}
                    </td>
                    <td style={{ color: "var(--text3)" }}>{s.phone}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)" }}>
                      ₹{Number(s.salary).toLocaleString("en-IN")}
                      {s.role === "trainer" && s.personal_trainer_amt && (
                        <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
                          PT: ₹{Number(s.personal_trainer_amt).toLocaleString("en-IN")}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${s.status === "active" ? "badge-green" :
                          s.status === "on_leave" ? "badge-yellow" : "badge-gray"
                        }`}>{s.status}</span>
                    </td>
                    <td style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-sm btn-secondary"
                        onClick={() => { setSelected(s); setModal("edit"); }}>
                        Edit
                      </button>
                      <button className="btn btn-sm"
                        style={{
                          background: "rgba(168,255,87,.1)", color: "var(--accent)",
                          border: "1px solid rgba(168,255,87,.2)"
                        }}
                        onClick={() => setCalStaff({ id: s.id, name: s.name })}>
                        📅 Calendar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* ── Today's attendance ── */}
      {tab === "attendance" && (
        <>
        {/* Mobile cards */}
        <div className="mobile-card-list">
          {loading ? (
            <div className="mobile-card__empty">Loading…</div>
          ) : attendance.length === 0 ? (
            <div className="mobile-card__empty">No attendance marked today.</div>
          ) : attendance.map(a => {
            const meta = STATUS_META[a.status];
            const wkFmt = a.worked_minutes > 0 ? fmt_mins(a.worked_minutes) :
              (a.check_in && !a.check_out ? "In progress" : null);
            return (
              <div key={a.id} className="mobile-card">
                <div className="mobile-card__left">
                  <span className="mobile-card__title">{a.staff_name}</span>
                  <span style={{
                    padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: meta?.bg || "var(--surface2)",
                    color: meta?.color || "var(--text2)",
                    width: "fit-content",
                  }}>
                    {meta?.label || a.status}
                  </span>
                  <span className="mobile-card__meta">
                    In: {a.check_in || "—"} · Out: {a.check_out || "—"}
                  </span>
                  {wkFmt && (
                    <span className="mobile-card__meta" style={{ color: "var(--text2)" }}>
                      Worked: {wkFmt}
                      {a.late_minutes > 0 ? ` · Late +${a.late_minutes}m` : ""}
                      {a.overtime_minutes > 0 ? ` · OT +${a.overtime_minutes}m` : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="card desktop-table-view">
          <div style={{
            padding: "14px 18px", borderBottom: "1px solid var(--border)",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700 }}>
              Today's Attendance
            </span>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>
              Worked / Late / OT only show for staff with a Shift Template assigned
            </span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Name</th>
                <th>Shift</th>
                <th>Expected Hrs</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Worked</th>
                <th>vs Shift</th>
                <th>Late</th>
                <th>OT</th>
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>Loading…</td></tr>
                ) : attendance.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                    No attendance marked today.
                  </td></tr>
                ) : attendance.map(a => {
                  // Find shift template for this staff member from staffList
                  const staffMember = staffList.find(s => s.id === a.staff);
                  const shiftTmpl = staffMember?.shift_template_name || null;
                  const hasShift = !!staffMember?.shift_template;
                  const shiftMins = staffMember?.shift_duration_minutes || 0;

                  // vs-shift comparison
                  let vsShift = null;
                  if (hasShift && a.worked_minutes > 0 && shiftMins > 0) {
                    const diff = a.worked_minutes - shiftMins;
                    if (diff < -30) vsShift = { label: `↓ ${fmt_mins(-diff)} short`, color: "#ef4444" };
                    else if (diff > 30) vsShift = { label: `↑ ${fmt_mins(diff)} extra`, color: "#3b82f6" };
                    else vsShift = { label: "On time", color: "#22c55e" };
                  }

                  return (
                    <tr key={a.id}>
                      <td><b>{a.staff_name}</b></td>
                      <td style={{ fontSize: 11, color: "var(--text2)" }}>
                        {shiftTmpl || <span style={{ color: "var(--text3)" }}>No shift</span>}
                      </td>
                      <td style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text3)" }}>
                        {hasShift && shiftMins ? fmt_mins(shiftMins) : "—"}
                      </td>
                      <td>
                        <span style={{
                          padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: STATUS_META[a.status]?.bg || "var(--surface2)",
                          color: STATUS_META[a.status]?.color || "var(--text2)",
                        }}>
                          {STATUS_META[a.status]?.label || a.status}
                        </span>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--teal)" }}>
                        {a.check_in || "—"}
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text2)" }}>
                        {a.check_out || "—"}
                      </td>
                      <td style={{
                        fontSize: 12, color: a.worked_minutes > 0 ? "var(--text1)" : "var(--text3)",
                        fontFamily: "var(--font-mono)"
                      }}>
                        {a.worked_minutes > 0 ? fmt_mins(a.worked_minutes) : (a.check_in && !a.check_out ? "In progress" : "—")}
                      </td>
                      <td style={{ fontSize: 11, fontWeight: 700, color: vsShift?.color || "var(--text3)" }}>
                        {vsShift?.label || (hasShift ? "—" : <span style={{ color: "var(--text3)", fontSize: 10 }}>no shift</span>)}
                      </td>
                      <td style={{
                        fontSize: 12, fontWeight: 700,
                        color: a.late_minutes > 0 ? "#f97316" : "var(--text3)"
                      }}>
                        {a.late_minutes > 0 ? `+${a.late_minutes}m` : (hasShift ? "—" : <span style={{ fontSize: 10 }}>—</span>)}
                      </td>
                      <td style={{
                        fontSize: 12, fontWeight: 700,
                        color: a.overtime_minutes > 0 ? "#3b82f6" : "var(--text3)"
                      }}>
                        {a.overtime_minutes > 0 ? `+${a.overtime_minutes}m` : (hasShift ? "—" : <span style={{ fontSize: 10 }}>—</span>)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* ── Shifts tab ── */}
      {tab === "shifts" && <ShiftsTab />}

      {/* ── Payments tab ── */}
      {tab === "payments" && <PaymentsTab staffList={staffList} />}

      {/* Modals */}
      {modal === "add" && (
        <StaffModal onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />
      )}
      {modal === "edit" && selected && (
        <StaffModal staff={selected} onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />
      )}
      {modal === "attendance" && (
        <AttendanceModal staffList={staffList} onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }} />
      )}
    </div>
  );
}