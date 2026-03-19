import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const INC_CAT = ["membership","personal_training","merchandise","locker","other"];
const EXP_CAT = ["salary","equipment","rent","supplies","marketing","maintenance","other"];

function EntryModal({ type, onClose, onSave }) {
  const isIncome = type==="income";
  const [form, setForm] = useState({ source:"",category: isIncome?"membership":"salary",amount:"",date:new Date().toISOString().split("T")[0],description:"",notes:"" });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post(`/finances/${isIncome?"income":"expenditure"}/`, form);
      toast.success(`${isIncome?"Income":"Expense"} recorded!`);
      onSave();
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{maxWidth:460}} onClick={e=>e.stopPropagation()}>
        <div className="modal-title">Add {isIncome ? "Income" : "Expense"}</div>
        <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="form-group"><label className="form-label">{isIncome?"Source *":"Description *"}</label>
            <input className="form-input" value={form.source||form.description} onChange={e=>set(isIncome?"source":"description",e.target.value)} required /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Category</label>
              <select className="form-input" value={form.category} onChange={e=>set("category",e.target.value)}>
                {(isIncome?INC_CAT:EXP_CAT).map(c=><option key={c} value={c}>{c.replace("_"," ")}</option>)}
              </select></div>
            <div className="form-group"><label className="form-label">Amount (₹) *</label>
              <input className="form-input" type="number" value={form.amount} onChange={e=>set("amount",e.target.value)} required /></div>
            <div className="form-group"><label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e=>set("date",e.target.value)} /></div>
          </div>
          <div className="form-group"><label className="form-label">Notes</label>
            <input className="form-input" value={form.notes} onChange={e=>set("notes",e.target.value)} /></div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving?"Saving…":"Record"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Finances() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth()+1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [summary, setSummary] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.getElementById("page-title").textContent = "Finances"; }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, i, e] = await Promise.all([
        api.get(`/finances/summary/?year=${year}&month=${month}`),
        api.get(`/finances/income/?ordering=-date`),
        api.get(`/finances/expenditure/?ordering=-date`),
      ]);
      setSummary(s.data);
      setIncomes(i.data.results||i.data);
      setExpenses(e.data.results||e.data);
    } finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const fmt = v => `₹${Number(v||0).toLocaleString("en-IN")}`;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Finances</div>
          <div className="page-subtitle">Income, expenditure and savings analytics</div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <select className="form-input" style={{maxWidth:120}} value={month} onChange={e=>setMonth(+e.target.value)}>
            {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m,i)=>
              <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select className="form-input" style={{maxWidth:90}} value={year} onChange={e=>setYear(+e.target.value)}>
            {[2023,2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary" onClick={()=>setModal("income")}>+ Income</button>
          <button className="btn btn-danger"  onClick={()=>setModal("expense")}>+ Expense</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid-3" style={{marginBottom:20}}>
        <div className="stat-card animate-in">
          <div className="icon" style={{background:"rgba(168,255,87,.12)",color:"var(--accent)"}}>↓</div>
          <div className="label">Total Income</div>
          <div className="value">{fmt(summary?.total_income)}</div>
        </div>
        <div className="stat-card animate-in">
          <div className="icon" style={{background:"rgba(255,91,91,.12)",color:"var(--danger)"}}>↑</div>
          <div className="label">Total Expense</div>
          <div className="value">{fmt(summary?.total_expense)}</div>
        </div>
        <div className="stat-card animate-in">
          <div className="icon" style={{background:"rgba(45,255,195,.12)",color:"var(--teal)"}}>★</div>
          <div className="label">Net Savings</div>
          <div className="value" style={{color:(summary?.savings||0)>=0?"var(--accent)":"var(--danger)"}}>
            {fmt(summary?.savings)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="staff-tabs">
        {["overview","income","expenses"].map(t=>(
          <button key={t} className={`staff-tab ${tab===t?"staff-tab--active":""}`} onClick={()=>setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab==="overview" && (
        <div className="card" style={{padding:20}}>
          <div style={{fontFamily:"var(--font-display)",fontSize:14,fontWeight:700,marginBottom:16}}>12-Month Trend</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={summary?.monthly_trend||[]} barGap={4} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{fill:"#52525e",fontSize:11}} axisLine={false} tickLine={false} />
              <YAxis tick={{fill:"#52525e",fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v/1000}k`} />
              <Tooltip formatter={(v,n)=>[`₹${Number(v).toLocaleString("en-IN")}`,n]}
                contentStyle={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,fontSize:12}} />
              <Bar dataKey="income"  fill="#a8ff57" name="Income"  radius={[4,4,0,0]} />
              <Bar dataKey="expense" fill="#ff5b5b" name="Expense" radius={[4,4,0,0]} />
              <Bar dataKey="savings" fill="#2dffc3" name="Savings" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab==="income" && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Source</th><th>Category</th><th>Amount</th><th>Date</th><th>Notes</th></tr></thead>
              <tbody>
                {incomes.slice(0,50).map(i=>(
                  <tr key={i.id}>
                    <td><b>{i.source}</b></td>
                    <td><span className="badge badge-green">{i.category}</span></td>
                    <td style={{fontFamily:"var(--font-mono)",color:"var(--accent)"}}>₹{Number(i.amount).toLocaleString("en-IN")}</td>
                    <td style={{color:"var(--text3)",fontSize:12}}>{i.date}</td>
                    <td style={{color:"var(--text3)",fontSize:12}}>{i.notes||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==="expenses" && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Description</th><th>Category</th><th>Amount</th><th>Date</th><th>Vendor</th></tr></thead>
              <tbody>
                {expenses.slice(0,50).map(e=>(
                  <tr key={e.id}>
                    <td><b>{e.description}</b></td>
                    <td><span className="badge badge-red">{e.category}</span></td>
                    <td style={{fontFamily:"var(--font-mono)",color:"var(--danger)"}}>₹{Number(e.amount).toLocaleString("en-IN")}</td>
                    <td style={{color:"var(--text3)",fontSize:12}}>{e.date}</td>
                    <td style={{color:"var(--text3)",fontSize:12}}>{e.vendor||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal==="income"  && <EntryModal type="income"  onClose={()=>setModal(null)} onSave={()=>{setModal(null);load();}} />}
      {modal==="expense" && <EntryModal type="expense" onClose={()=>setModal(null)} onSave={()=>{setModal(null);load();}} />}
    </div>
  );
}
