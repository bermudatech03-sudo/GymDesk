import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import MonthlyReport from "../../components/Monthlyreport";
import toast from "react-hot-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

const INC_CATS = ["membership", "personal_training", "merchandise", "locker", "other"];
const EXP_CATS = ["salary", "equipment", "rent", "supplies", "marketing", "maintenance", "other"];

const CAT_LABELS = {
  membership: "Membership", personal_training: "Personal Training",
  merchandise: "Merchandise", locker: "Locker Rental",
  salary: "Staff Salary", equipment: "Equipment", rent: "Rent & Utilities",
  supplies: "Supplies", marketing: "Marketing", maintenance: "Maintenance",
  other: "Other",
};

function EntryModal({ type, onClose, onSave }) {
  const isIncome = type === "income";

  const [form, setForm] = useState({
    source: "", description: "",
    category: isIncome ? "membership" : "salary",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "", vendor: ""
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post(`/finances/${isIncome ? "income" : "expenditure"}/`, form);
      toast.success(`${isIncome ? "Income" : "Expense"} recorded!`);
      onSave();
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">Add {isIncome ? "Income" : "Expense"}</div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="form-group">
            <label className="form-label">{isIncome ? "Source *" : "Description *"}</label>
            <input className="form-input" required
              value={isIncome ? form.source : form.description}
              onChange={e => set(isIncome ? "source" : "description", e.target.value)}
              placeholder={isIncome ? "e.g. Membership fee" : "e.g. Electricity bill"} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={form.category}
                onChange={e => set("category", e.target.value)}>
                {(isIncome ? INC_CATS : EXP_CATS).map(c => (
                  <option key={c} value={c}>{CAT_LABELS[c] || c}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹) *</label>
              <input className="form-input" type="number" required
                value={form.amount} onChange={e => set("amount", e.target.value)}
                placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date"
                value={form.date} onChange={e => set("date", e.target.value)} />
            </div>
            {!isIncome && (
              <div className="form-group">
                <label className="form-label">Vendor</label>
                <input className="form-input" value={form.vendor}
                  onChange={e => set("vendor", e.target.value)} placeholder="Optional" />
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" value={form.notes}
              onChange={e => set("notes", e.target.value)} placeholder="Optional" />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function FilterBar({ catFilter, setCatFilter, search, setSearch, cats, placeholder }) {
  return (
    <div style={{
      display: "flex", gap: 10, alignItems: "center",
      padding: "12px 16px", borderBottom: "1px solid var(--border)",
      flexWrap: "wrap"
    }}>
      <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            color: "var(--text3)", pointerEvents: "none"
          }}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input className="form-input" placeholder={placeholder}
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 32, fontSize: 13 }} />
      </div>
      <select className="form-input" style={{ maxWidth: 180, fontSize: 13 }}
        value={catFilter} onChange={e => setCatFilter(e.target.value)}>
        <option value="all">All Categories</option>
        {cats.map(c => (
          <option key={c} value={c}>{CAT_LABELS[c] || c}</option>
        ))}
      </select>
      {catFilter !== "all" && (
        <button className="btn btn-sm btn-secondary"
          onClick={() => setCatFilter("all")}>
          ✕ Clear
        </button>
      )}
    </div>
  );
}

const PRIORITY_COLOR = { low: "var(--teal)", medium: "var(--warn)", high: "var(--danger)" };
const STATUS_COLOR = { pending: "var(--warn)", purchased: "var(--accent)", cancelled: "var(--text3)" };

function AffordModal({ result, onClose }) {
  const canBuy = result.can_buy;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 360, textAlign: "center" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{canBuy ? "✅" : "❌"}</div>
        <div className="modal-title" style={{ color: canBuy ? "var(--accent)" : "var(--danger)" }}>
          {canBuy ? "You can afford this!" : "Not enough budget"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "16px 0", fontSize: 13 }}>
          <div style={{
            display: "flex", justifyContent: "space-between", padding: "8px 12px",
            background: "var(--surface2)", borderRadius: 8
          }}>
            <span style={{ color: "var(--text3)" }}>Item Price</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
              {result.item_price ? `₹${Number(result.item_price).toLocaleString("en-IN")}` : "—"}
            </span>
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", padding: "8px 12px",
            background: "var(--surface2)", borderRadius: 8
          }}>
            <span style={{ color: "var(--text3)" }}>Money Left ({MONTHS[result.month - 1]} {result.year})</span>
            <span style={{
              fontFamily: "var(--font-mono)", fontWeight: 700,
              color: result.money_left >= 0 ? "var(--teal)" : "var(--danger)"
            }}>
              ₹{Number(result.money_left).toLocaleString("en-IN")}
            </span>
          </div>
          {!canBuy && result.item_price && (
            <div style={{
              display: "flex", justifyContent: "space-between", padding: "8px 12px",
              background: "rgba(255,91,91,.08)", borderRadius: 8
            }}>
              <span style={{ color: "var(--text3)" }}>Shortfall</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--danger)" }}>
                ₹{Number(result.item_price - result.money_left).toLocaleString("en-IN")}
              </span>
            </div>
          )}
        </div>
        <button className="btn btn-secondary" style={{ width: "100%" }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function ToBuyModal({ item, onClose, onSave }) {
  const [form, setForm] = useState({
    item_name: item?.item_name || "",
    quantity: item?.quantity || 1,
    price: item?.price || "",
    BuyingDate: item?.BuyingDate || "",
    Priority: item?.Priority || "medium",
    status: item?.status || "pending",
    notes: item?.notes || "",
    item_url: item?.item_url || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (item) {
        await api.put("/finances/to-buy/", { ...form, id: item.id });
        toast.success("Item updated!");
      } else {
        await api.post("/finances/to-buy/", form);
        toast.success("Item added!");
      }
      onSave();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">{item ? "Edit Item" : "Add To-Buy Item"}</div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Item Name *</label>
            <input className="form-input" required value={form.item_name}
              onChange={e => set("item_name", e.target.value)} placeholder="e.g. Dumbbells" />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input className="form-input" type="number" min="1" value={form.quantity}
                onChange={e => set("quantity", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Price (₹)</label>
              <input className="form-input" type="number" value={form.price}
                onChange={e => set("price", e.target.value)} placeholder="Optional" />
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-input" value={form.Priority}
                onChange={e => set("Priority", e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status}
                onChange={e => set("status", e.target.value)}>
                <option value="pending">Pending</option>
                <option value="purchased">Purchased</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Target Date</label>
              <input className="form-input" type="date" value={form.BuyingDate}
                onChange={e => set("BuyingDate", e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Item URL</label>
            <input className="form-input" type="url" value={form.item_url}
              onChange={e => set("item_url", e.target.value)} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" value={form.notes}
              onChange={e => set("notes", e.target.value)} placeholder="Optional" />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : item ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Finances() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [summary, setSummary] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);

  const [toBuyItems, setToBuyItems] = useState([]);
  const [toBuyModal, setToBuyModal] = useState(null);
  const [toBuyLoading, setToBuyLoading] = useState(false);
  const [affordResult, setAffordResult] = useState(null);
  const [affordChecking, setAffordChecking] = useState(null);

  const [incSearch, setIncSearch] = useState("");
  const [incCat, setIncCat] = useState("all");
  const [expSearch, setExpSearch] = useState("");
  const [expCat, setExpCat] = useState("all");

  useEffect(() => {
    document.getElementById("page-title").textContent = "Finances";
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, i, e] = await Promise.all([
        api.get(`/finances/summary/?year=${year}&month=${month}`),
        api.get(`/finances/income/?ordering=-date&page_size=200`),
        api.get(`/finances/expenditure/?ordering=-date&page_size=200`),
      ]);
      setSummary(s.data);
      setIncomes(i.data.results || i.data);
      console.log(s.data);
      setExpenses(e.data.results || e.data);
    } finally { setLoading(false); }
  }, [month, year]);

  const loadToBuy = useCallback(async () => {
    setToBuyLoading(true);
    try {
      const res = await api.get("/finances/to-buy/");
      setToBuyItems(res.data);
    } catch { toast.error("Failed to load to-buy list"); }
    finally { setToBuyLoading(false); }
  }, []);

  const deleteToBuy = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await api.delete(`/finances/to-buy/?id=${id}`);
      toast.success("Deleted");
      loadToBuy();
    } catch { toast.error("Failed to delete"); }
  };

  const checkAfford = async (item) => {
    if (!item.price) { toast.error("This item has no price set"); return; }
    setAffordChecking(item.id);
    try {
      const res = await api.get(`/finances/to-buy/can-afford/?id=${item.id}&year=${year}&month=${month}`);
      setAffordResult(res.data);
    } catch { toast.error("Failed to check affordability"); }
    finally { setAffordChecking(null); }
  };

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === "to-buy") loadToBuy(); }, [tab, loadToBuy]);

  const fmt = v => `₹${Number(v || 0).toLocaleString("en-IN")}`;

  const filteredInc = incomes.filter(i => {
    const matchCat = incCat === "all" || i.category === incCat;
    const matchSearch = !incSearch ||
      i.source?.toLowerCase().includes(incSearch.toLowerCase()) ||
      i.notes?.toLowerCase().includes(incSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  const filteredExp = expenses.filter(e => {
    const matchCat = expCat === "all" || e.category === expCat;
    const matchSearch = !expSearch ||
      e.description?.toLowerCase().includes(expSearch.toLowerCase()) ||
      e.vendor?.toLowerCase().includes(expSearch.toLowerCase()) ||
      e.notes?.toLowerCase().includes(expSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  const incTotal = filteredInc.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const expTotal = filteredExp.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: "var(--surface2)", border: "1px solid var(--border)",
        borderRadius: 8, padding: "10px 14px", fontSize: 12
      }}>
        <div style={{ color: "var(--text3)", marginBottom: 4 }}>{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.color }}>
            {p.name}: ₹{Number(p.value).toLocaleString("en-IN")}
          </div>
        ))}
      </div>
    );
  };

  // ── Mini stat card used inside groups ──
  const MiniCard = ({ label, val, color }) => (
    <div className="finance-mini-card" style={{
      flex: "1 1 120px",
      background: "var(--surface2)",
      borderRadius: 10,
      padding: "12px 14px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      gap: 4,
      minWidth: 120,
    }}>
      <div className="finance-mini-label" style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", lineHeight: 1.3 }}>
        {label}
      </div>
      <div className="finance-mini-val" style={{ fontSize: 17, fontFamily: "var(--font-mono)", fontWeight: 700, color: color || "var(--text1)" }}>
        {val}
      </div>
    </div>
  );

  // ── Side stat card used in vertical right column ──
  const SideCard = ({ label, val, color, icon }) => (
    <div className="stat-card animate-in" style={{ flex: 1, minHeight: 0 }}>
      <div className="icon" style={{
        background: color + "18", color: color,
        fontSize: 18, width: 38, height: 38
      }}>{icon}</div>
      <div className="label">{label}</div>
      <div className="value" style={{ fontSize: 22, color: color }}>{val}</div>
    </div>
  );

  return (
    <div>
      {/* Desktop-only styles for finance mini cards */}
      <style>{`
        @media (min-width: 769px) {
          .finance-mini-card {
            align-items: center;
            text-align: center;
            padding: 18px 16px !important;
          }
          .finance-mini-label {
            font-size: 12px !important;
          }
          .finance-mini-val {
            font-size: 22px !important;
          }
        }
      `}</style>
      <div className="page-header">
        <div>
          <div className="page-title">Finances</div>
          <div className="page-subtitle">Income, expenditure and savings analytics</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select className="form-input" style={{ maxWidth: 110 }} value={month}
            onChange={e => setMonth(+e.target.value)}>
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select className="form-input" style={{ maxWidth: 90 }} value={year}
            onChange={e => setYear(+e.target.value)}>
            {[2023, 2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={() => setModal("income")}>
            + Income
          </button>
          <button className="btn btn-sm"
            style={{
              background: "rgba(255,91,91,.12)", color: "var(--danger)",
              border: "1px solid rgba(255,91,91,.3)"
            }}
            onClick={() => setModal("expense")}>
            + Expense
          </button>
          <button className="btn btn-secondary" onClick={() => setShowReport(true)}>
            📋 Monthly Report
          </button>
        </div>
      </div>

      {/* ── Summary Layout ── */}
      <div style={{
        display: "flex",
        gap: 16,
        marginBottom: 20,
        alignItems: "stretch",
        flexWrap: "wrap",
      }}>

        {/* LEFT: two grouped panels stacked, stretch to fill full height */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          flex: "2 1 340px",
          minWidth: 0,
        }}>

          {/* Group 1: To Be Collected */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "14px 16px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "var(--accent)",
              textTransform: "uppercase", letterSpacing: "0.6px",
              marginBottom: 10, display: "flex", alignItems: "center", gap: 6
            }}>
              <span style={{
                display: "inline-block", width: 7, height: 7,
                borderRadius: "50%", background: "var(--accent)"
              }} />
              To Be Collected
            </div>
            <div style={{ display: "flex", gap: 10, flex: 1, flexWrap: "wrap" }}>
              <MiniCard label="Total (with GST)" val={fmt(summary?.total_income_to_collect)} color="var(--accent)" />
              <MiniCard label="Without GST" val={fmt(summary?.total_base_income_to_collect)} color="var(--accent)" />
              <MiniCard label="GST Amount" val={fmt(summary?.total_gst_to_collect)} color="var(--accent)" />
            </div>
          </div>

          {/* Group 2: Collected */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "14px 16px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "var(--teal)",
              textTransform: "uppercase", letterSpacing: "0.6px",
              marginBottom: 10, display: "flex", alignItems: "center", gap: 6
            }}>
              <span style={{
                display: "inline-block", width: 7, height: 7,
                borderRadius: "50%", background: "var(--teal)"
              }} />
              Collected
            </div>
            <div style={{ display: "flex", gap: 10, flex: 1, flexWrap: "wrap" }}>
              <MiniCard label="Total (with GST)" val={fmt(summary?.total_income)} color="var(--teal)" />
              <MiniCard label="Without GST" val={fmt(summary?.total_base_income)} color="var(--teal)" />
              {/* Placeholder to keep 3-col alignment with group above */}
              <div style={{ flex: 1, minWidth: 120 }} />
            </div>
          </div>

        </div>

        {/* RIGHT: 4 vertical stat cards — equal height distribution */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          flex: "1 1 180px",
          minWidth: 160,
        }}>
          <SideCard label="Yearly Income" val={fmt(summary?.yearly_income)} color="var(--accent)" icon="↓" />
          <SideCard
            label="Net Savings"
            val={fmt(summary?.net_savings)}
            color={(summary?.net_savings || 0) >= 0 ? "var(--teal)" : "var(--danger)"}
            icon="★"
          />
          <SideCard label="Monthly Expense" val={fmt(summary?.total_expense)} color="var(--danger)" icon="↑" />
          <SideCard label="Outstanding" val={fmt(summary?.outstanding_balance)} color="var(--warn)" icon="⚠" />
        </div>

      </div>

      {/* Tabs */}
      <div className="staff-tabs">
        {["overview", "income", "expenses", "to-buy"].map(t => (
          <button key={t}
            className={`staff-tab ${tab === t ? "staff-tab--active" : ""}`}
            onClick={() => setTab(t)}>
            {t === "to-buy" ? "To Buy" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Overview chart ── */}
      {tab === "overview" && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{
            fontFamily: "var(--font-display)", fontSize: 14,
            fontWeight: 700, marginBottom: 16
          }}>
            12-Month Income vs Expense vs Savings
          </div>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summary?.monthly_trend || []} barGap={3} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: "#52525e", fontSize: 11 }}
                  axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#52525e", fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip content={customTooltip} />
                <Legend iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize: 12, color: "var(--text2)" }} />
                <Bar dataKey="income" fill="#a8ff57" name="Income" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expense" fill="#ff5b5b" name="Expense" radius={[3, 3, 0, 0]} />
                <Bar dataKey="savings" fill="#2dffc3" name="Savings" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {summary && (
            <div className="grid-2" style={{ marginTop: 24, gap: 20 }}>
              {[
                { title: "Income by Category", data: summary.income_by_category, color: "var(--accent)" },
                { title: "Expense by Category", data: summary.expense_by_category, color: "var(--danger)" },
              ].map(block => (
                <div key={block.title}>
                  <div style={{
                    fontFamily: "var(--font-display)", fontSize: 13,
                    fontWeight: 700, marginBottom: 10, color: "var(--text2)"
                  }}>
                    {block.title}
                  </div>
                  {block.data?.length === 0
                    ? <div style={{ fontSize: 12, color: "var(--text3)" }}>No data this month</div>
                    : block.data?.map(d => {
                      const total = block.data.reduce((s, x) => s + parseFloat(x.total || 0), 0);
                      const pct = total > 0 ? (parseFloat(d.total) / total * 100).toFixed(0) : 0;
                      return (
                        <div key={d.category} style={{ marginBottom: 8 }}>
                          <div style={{
                            display: "flex", justifyContent: "space-between",
                            fontSize: 12, marginBottom: 3
                          }}>
                            <span style={{ color: "var(--text2)" }}>
                              {CAT_LABELS[d.category] || d.category}
                            </span>
                            <span style={{ color: block.color, fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                              ₹{Number(d.total).toLocaleString("en-IN")} ({pct}%)
                            </span>
                          </div>
                          <div style={{ height: 5, background: "var(--surface2)", borderRadius: 3 }}>
                            <div style={{
                              height: "100%", width: `${pct}%`,
                              background: block.color, borderRadius: 3, transition: "width .4s"
                            }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Income tab ── */}
      {tab === "income" && (
        <div className="card">
          <FilterBar
            catFilter={incCat} setCatFilter={setIncCat}
            search={incSearch} setSearch={setIncSearch}
            cats={INC_CATS}
            placeholder="Search source or notes…"
          />
          <div style={{
            display: "flex", justifyContent: "space-between",
            padding: "8px 16px", fontSize: 12,
            borderBottom: "1px solid var(--border)",
            color: "var(--text3)"
          }}>
            <span>{filteredInc.length} records</span>
            <span>Total: <b style={{ color: "var(--accent)" }}>
              ₹{incTotal.toLocaleString("en-IN")}
            </b></span>
          </div>
          <div className="table-wrap finance-table-wrap">
            <table>
              <thead><tr>
                <th>Source</th><th>Category</th><th>Amount</th><th>Date</th><th>Notes</th>
              </tr></thead>
              <tbody>
                {filteredInc.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                    No records match
                  </td></tr>
                ) : filteredInc.slice(0, 100).map(i => (
                  <tr key={i.id}>
                    <td><b>{i.source}</b></td>
                    <td>
                      <span className="badge badge-green" style={{ fontSize: 10 }}>
                        {CAT_LABELS[i.category] || i.category}
                      </span>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontWeight: 600 }}>
                      ₹{Number(i.amount).toLocaleString("en-IN")}
                    </td>
                    <td style={{ color: "var(--text3)", fontSize: 12 }}>{i.date}</td>
                    <td style={{
                      color: "var(--text3)", fontSize: 12, maxWidth: 220,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                    }}>
                      {i.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Expenses tab ── */}
      {tab === "expenses" && (
        <div className="card">
          <FilterBar
            catFilter={expCat} setCatFilter={setExpCat}
            search={expSearch} setSearch={setExpSearch}
            cats={EXP_CATS}
            placeholder="Search description, vendor…"
          />
          <div style={{
            display: "flex", justifyContent: "space-between",
            padding: "8px 16px", fontSize: 12,
            borderBottom: "1px solid var(--border)",
            color: "var(--text3)"
          }}>
            <span>{filteredExp.length} records</span>
            <span>Total: <b style={{ color: "var(--danger)" }}>
              ₹{expTotal.toLocaleString("en-IN")}
            </b></span>
          </div>
          <div className="table-wrap finance-table-wrap">
            <table>
              <thead><tr>
                <th>Description</th><th>Category</th><th>Amount</th>
                <th>Date</th><th>Vendor</th><th>Notes</th>
              </tr></thead>
              <tbody>
                {filteredExp.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                    No records match
                  </td></tr>
                ) : filteredExp.slice(0, 100).map(e => (
                  <tr key={e.id}>
                    <td><b>{e.description}</b></td>
                    <td>
                      <span className="badge badge-red" style={{ fontSize: 10 }}>
                        {CAT_LABELS[e.category] || e.category}
                      </span>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", color: "var(--danger)", fontWeight: 600 }}>
                      ₹{Number(e.amount).toLocaleString("en-IN")}
                    </td>
                    <td style={{ color: "var(--text3)", fontSize: 12 }}>{e.date}</td>
                    <td style={{ color: "var(--text3)", fontSize: 12 }}>{e.vendor || "—"}</td>
                    <td style={{
                      color: "var(--text3)", fontSize: 12, maxWidth: 180,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                    }}>
                      {e.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── To Buy tab ── */}
      {tab === "to-buy" && (
        <div className="card">
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 16px", borderBottom: "1px solid var(--border)"
          }}>
            <span style={{ fontSize: 13, color: "var(--text3)" }}>
              {toBuyItems.length} item{toBuyItems.length !== 1 ? "s" : ""}
            </span>
            <button className="btn btn-primary" style={{ fontSize: 12 }}
              onClick={() => setToBuyModal("add")}>
              + Add Item
            </button>
          </div>
          {toBuyLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>Loading…</div>
          ) : (
            <div className="table-wrap finance-table-wrap tobuy-table-wrap">
              <table>
                <thead><tr>
                  <th>Item</th><th>Qty</th><th>Price</th>
                  <th>Priority</th><th>Status</th><th>Target Date</th><th>Notes</th><th>Link</th><th>Budget</th><th></th>
                </tr></thead>
                <tbody>
                  {toBuyItems.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                      No items yet
                    </td></tr>
                  ) : toBuyItems.map(item => (
                    <tr key={item.id}>
                      <td><b>{item.item_name}</b></td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{item.quantity}</td>
                      <td style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
                        {item.price ? `₹${Number(item.price).toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                          background: PRIORITY_COLOR[item.Priority] + "22",
                          color: PRIORITY_COLOR[item.Priority],
                          textTransform: "capitalize"
                        }}>{item.Priority}</span>
                      </td>
                      <td>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                          background: STATUS_COLOR[item.status] + "22",
                          color: STATUS_COLOR[item.status],
                          textTransform: "capitalize"
                        }}>{item.status}</span>
                      </td>
                      <td style={{ color: "var(--text3)", fontSize: 12 }}>{item.BuyingDate || "—"}</td>
                      <td style={{
                        color: "var(--text3)", fontSize: 12, maxWidth: 180,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                      }}>
                        {item.notes || "—"}
                      </td>
                      <td>
                        {item.item_url
                          ? <a href={item.item_url} target="_blank" rel="noreferrer"
                            style={{ fontSize: 11, color: "var(--accent)" }}>View</a>
                          : "—"}
                      </td>
                      <td>
                        <button className="btn btn-sm" style={{
                          fontSize: 11,
                          background: item.price ? "rgba(168,255,87,.1)" : "var(--surface2)",
                          color: item.price ? "var(--accent)" : "var(--text3)",
                          border: `1px solid ${item.price ? "rgba(168,255,87,.3)" : "var(--border)"}`,
                          cursor: item.price ? "pointer" : "not-allowed",
                          minWidth: 70,
                        }}
                          disabled={affordChecking === item.id}
                          onClick={() => checkAfford(item)}>
                          {affordChecking === item.id ? "…" : "Can Afford?"}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-sm btn-secondary" style={{ fontSize: 11 }}
                            onClick={() => setToBuyModal(item)}>Edit</button>
                          <button className="btn btn-sm" style={{
                            fontSize: 11, background: "rgba(255,91,91,.12)",
                            color: "var(--danger)", border: "1px solid rgba(255,91,91,.3)"
                          }}
                            onClick={() => deleteToBuy(item.id)}>Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modal === "income" && (
        <EntryModal type="income" onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />
      )}
      {modal === "expense" && (
        <EntryModal type="expense" onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />
      )}
      {showReport && <MonthlyReport defaultMonth={month} defaultYear={year} onClose={() => setShowReport(false)} />}
      {toBuyModal && (
        <ToBuyModal
          item={toBuyModal === "add" ? null : toBuyModal}
          onClose={() => setToBuyModal(null)}
          onSave={() => { setToBuyModal(null); loadToBuy(); load(); }}
        />
      )}
      {affordResult && (
        <AffordModal result={affordResult} onClose={() => setAffordResult(null)} />
      )}
    </div>
  );
}