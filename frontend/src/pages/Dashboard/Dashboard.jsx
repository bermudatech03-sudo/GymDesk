import { useEffect, useState } from "react";
import api from "../../api/axios";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import "./Dashboard.css";

const COLORS = ["#a8ff57", "#2dffc3", "#4da6ff", "#ffb830", "#ff5b5b", "#b48fff"];

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="stat-card animate-in">
      <div className="icon" style={{ background: color + "18", color }}>{icon}</div>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [memberStats, setMemberStats] = useState(null);
  const [staffStats, setStaffStats] = useState(null);
  const [eqStats, setEqStats] = useState(null);
  const [finance, setFinance] = useState(null);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.getElementById("page-title").textContent = "Dashboard";
    Promise.all([
      api.get("/members/list/stats/"),
      api.get("/staff/members/stats/"),
      api.get("/equipment/list/stats/"),
      api.get("/finances/summary/"),
      api.get("/members/list/expiring_soon/?days=7"),
    ]).then(([m, s, e, f, ex]) => {
      setMemberStats(m.data);
      setStaffStats(s.data);
      setEqStats(e.data);
      setFinance(f.data);
      setExpiring(ex.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dash-loading">Loading dashboard…</div>;

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip__label">{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.color }}>
            {p.name}: ₹{Number(p.value).toLocaleString("en-IN")}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="dashboard">
      {/* ── Stats row ── */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatCard icon="◈" label="Total Members" value={memberStats?.total ?? 0} sub={`${memberStats?.new_this_month ?? 0} new this month`} color="#a8ff57" />
        <StatCard icon="✓" label="Active Members" value={memberStats?.active ?? 0} sub={`${memberStats?.expiring_7 ?? 0} expiring in 7 days`} color="#2dffc3" />
        <StatCard icon="◉" label="Staff Active" value={staffStats?.active ?? 0} sub={`${staffStats?.on_leave ?? 0} on leave`} color="#4da6ff" />
        <StatCard icon="◆" label="Equipment Items" value={eqStats?.total ?? 0} sub={`${eqStats?.due_maintenance ?? 0} need service`} color="#ffb830" />
      </div>

      {/* ── Finance stats ── */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <StatCard icon="₹" label="Monthly Income" value={`₹${Number(finance?.total_income ?? 0).toLocaleString("en-IN")}`} color="#a8ff57" />
        <StatCard icon="↑" label="Monthly Expense" value={`₹${Number(finance?.total_expense ?? 0).toLocaleString("en-IN")}`} color="#ff5b5b" />
        <StatCard icon="★" label="Net Savings" value={`₹${Number(finance?.net_savings ?? 0).toLocaleString("en-IN")}`} color="#2dffc3" />
      </div>

      {/* ── Charts row ── */}
      <div className="dash-charts">
        {/* Income vs Expense trend */}
        <div className="card dash-chart-card">
          <div className="dash-chart-title">Income vs Expense (12 months)</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={finance?.monthly_trend ?? []} barGap={4} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "#52525e", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#52525e", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v / 1000}k`} />
              <Tooltip content={customTooltip} />
              <Bar dataKey="income" fill="#a8ff57" name="Income" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#ff5b5b" name="Expense" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Members status pie */}
        <div className="card dash-chart-card">
          <div className="dash-chart-title">Member Status</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={[
                  { name: "Active", value: memberStats?.active ?? 0 },
                  { name: "Expired", value: memberStats?.expired ?? 0 },
                  { name: "Cancelled", value: memberStats?.cancelled ?? 0 },
                ]}
                cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                paddingAngle={3} dataKey="value"
              >
                {["#a8ff57", "#ff5b5b", "#52525e"].map((c, i) => <Cell key={i} fill={c} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px", color: "#9090a0" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Savings trend line */}
        <div className="card dash-chart-card">
          <div className="dash-chart-title">Savings Trend</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={finance?.monthly_trend ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "#52525e", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#52525e", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v / 1000}k`} />
              <Tooltip content={customTooltip} />
              <Line dataKey="savings" stroke="#2dffc3" strokeWidth={2.5} dot={false} name="Savings" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Expiring soon table ── */}
      {expiring.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="dash-table-header">
            <span className="dash-chart-title">⚠ Memberships Expiring in 7 Days</span>
            <span className="badge badge-yellow">{expiring.length} members</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Member</th><th>Phone</th><th>Plan</th><th>Expires</th><th>Days Left</th>
              </tr></thead>
              <tbody>
                {expiring.map(m => (
                  <tr key={m.id}>
                    <td><b>{m.name}</b></td>
                    <td style={{ color: "var(--text3)" }}>{m.phone}</td>
                    <td>{m.plan_name || "—"}</td>
                    <td style={{ color: "var(--warn)" }}>{m.renewal_date}</td>
                    <td>
                      <span className={`badge ${m.days_until_expiry <= 2 ? "badge-red" : "badge-yellow"}`}>
                        {m.days_until_expiry}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
