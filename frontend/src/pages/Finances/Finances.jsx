import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import MonthlyReport from "../../components/Monthlyreport";
import toast from "react-hot-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

const INC_CATS = ["membership","personal_training","merchandise","locker","other"];
const EXP_CATS = ["salary","equipment","rent","supplies","marketing","maintenance","other"];

const CAT_LABELS = {
  membership:"Membership", personal_training:"Personal Training",
  merchandise:"Merchandise", locker:"Locker Rental",
  salary:"Staff Salary", equipment:"Equipment", rent:"Rent & Utilities",
  supplies:"Supplies", marketing:"Marketing", maintenance:"Maintenance",
  other:"Other",
};

function EntryModal({ type, onClose, onSave }) {
  const isIncome = type === "income";
  
  const [form, setForm] = useState({
    source:"", description:"",
    category: isIncome ? "membership" : "salary",
    amount:"",
    date: new Date().toISOString().split("T")[0],
    notes:"", vendor:""
  });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post(`/finances/${isIncome?"income":"expenditure"}/`, form);
      toast.success(`${isIncome?"Income":"Expense"} recorded!`);
      onSave();
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{maxWidth:460}} onClick={e=>e.stopPropagation()}>
        <div className="modal-title">Add {isIncome ? "Income" : "Expense"}</div>
        <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="form-group">
            <label className="form-label">{isIncome?"Source *":"Description *"}</label>
            <input className="form-input" required
              value={isIncome ? form.source : form.description}
              onChange={e=>set(isIncome?"source":"description", e.target.value)}
              placeholder={isIncome?"e.g. Membership fee":"e.g. Electricity bill"}/>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={form.category}
                onChange={e=>set("category",e.target.value)}>
                {(isIncome?INC_CATS:EXP_CATS).map(c=>(
                  <option key={c} value={c}>{CAT_LABELS[c]||c}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹) *</label>
              <input className="form-input" type="number" required
                value={form.amount} onChange={e=>set("amount",e.target.value)}
                placeholder="0"/>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date"
                value={form.date} onChange={e=>set("date",e.target.value)}/>
            </div>
            {!isIncome && (
              <div className="form-group">
                <label className="form-label">Vendor</label>
                <input className="form-input" value={form.vendor}
                  onChange={e=>set("vendor",e.target.value)} placeholder="Optional"/>
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" value={form.notes}
              onChange={e=>set("notes",e.target.value)} placeholder="Optional"/>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving?"Saving…":"Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun",
                "Jul","Aug","Sep","Oct","Nov","Dec"];

function FilterBar({ catFilter, setCatFilter, search, setSearch, cats, placeholder }) {
  return (
    <div style={{
      display:"flex", gap:10, alignItems:"center",
      padding:"12px 16px", borderBottom:"1px solid var(--border)",
      flexWrap:"wrap"
    }}>
      {/* Search */}
      <div style={{position:"relative",flex:1,minWidth:180}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",
            color:"var(--text3)",pointerEvents:"none"}}>
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input className="form-input" placeholder={placeholder}
          value={search} onChange={e=>setSearch(e.target.value)}
          style={{paddingLeft:32,fontSize:13}}/>
      </div>
      {/* Category filter */}
      <select className="form-input" style={{maxWidth:180,fontSize:13}}
        value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
        <option value="all">All Categories</option>
        {cats.map(c=>(
          <option key={c} value={c}>{CAT_LABELS[c]||c}</option>
        ))}
      </select>
      {catFilter!=="all" && (
        <button className="btn btn-sm btn-secondary"
          onClick={()=>setCatFilter("all")}>
          ✕ Clear
        </button>
      )}
    </div>
  );
}

export default function Finances() {
  const now = new Date();
  const [month,   setMonth]   = useState(now.getMonth()+1);
  const [year,    setYear]    = useState(now.getFullYear());
  const [summary, setSummary] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [expenses,setExpenses]= useState([]);
  const [tab,     setTab]     = useState("overview");
  const [modal,   setModal]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);

  // Income filters
  const [incSearch,  setIncSearch]  = useState("");
  const [incCat,     setIncCat]     = useState("all");
  // Expense filters
  const [expSearch,  setExpSearch]  = useState("");
  const [expCat,     setExpCat]     = useState("all");

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
      setIncomes(i.data.results||i.data);
      setExpenses(e.data.results||e.data);
    } finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const fmt = v => `₹${Number(v||0).toLocaleString("en-IN")}`;

  // Apply income filters
  const filteredInc = incomes.filter(i => {
    const matchCat    = incCat==="all" || i.category===incCat;
    const matchSearch = !incSearch ||
      i.source?.toLowerCase().includes(incSearch.toLowerCase()) ||
      i.notes?.toLowerCase().includes(incSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  // Apply expense filters
  const filteredExp = expenses.filter(e => {
    const matchCat    = expCat==="all" || e.category===expCat;
    const matchSearch = !expSearch ||
      e.description?.toLowerCase().includes(expSearch.toLowerCase()) ||
      e.vendor?.toLowerCase().includes(expSearch.toLowerCase()) ||
      e.notes?.toLowerCase().includes(expSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  // Filtered totals
  const incTotal = filteredInc.reduce((s,i)=>s+parseFloat(i.amount||0),0);
  const expTotal = filteredExp.reduce((s,e)=>s+parseFloat(e.amount||0),0);

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background:"var(--surface2)", border:"1px solid var(--border)",
        borderRadius:8, padding:"10px 14px", fontSize:12
      }}>
        <div style={{color:"var(--text3)",marginBottom:4}}>{label}</div>
        {payload.map(p=>(
          <div key={p.name} style={{color:p.color}}>
            {p.name}: ₹{Number(p.value).toLocaleString("en-IN")}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Finances</div>
          <div className="page-subtitle">Income, expenditure and savings analytics</div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <select className="form-input" style={{maxWidth:110}} value={month}
            onChange={e=>setMonth(+e.target.value)}>
            {MONTHS.map((m,i)=>(
              <option key={i} value={i+1}>{m}</option>
            ))}
          </select>
          <select className="form-input" style={{maxWidth:90}} value={year}
            onChange={e=>setYear(+e.target.value)}>
            {[2023,2024,2025,2026,2027].map(y=>(
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={()=>setModal("income")}>
            + Income
          </button>
          <button className="btn btn-sm"
            style={{background:"rgba(255,91,91,.12)",color:"var(--danger)",
              border:"1px solid rgba(255,91,91,.3)"}}
            onClick={()=>setModal("expense")}>
            + Expense
          </button>
          <button className="btn btn-secondary" onClick={()=>setShowReport(true)}>
            📋 Monthly Report
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid-4" style={{marginBottom:20}}>
        {[
          {label:"Monthly Income",  val:fmt(summary?.total_income),  color:"var(--accent)", icon:"↓"},
          {label:"Monthly Expense", val:fmt(summary?.total_expense), color:"var(--danger)", icon:"↑"},
          {label:"Net Savings",     val:fmt(summary?.savings),
            color:(summary?.savings||0)>=0?"var(--teal)":"var(--danger)", icon:"★"},
          {label:"Outstanding",     val:fmt(summary?.outstanding_balance), color:"var(--warn)", icon:"⚠"},
        ].map(c=>(
          <div key={c.label} className="stat-card animate-in">
            <div className="icon" style={{
              background:c.color+"18", color:c.color,
              fontSize:18, width:38, height:38
            }}>{c.icon}</div>
            <div className="label">{c.label}</div>
            <div className="value" style={{fontSize:22,color:c.color}}>{c.val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="staff-tabs">
        {["overview","income","expenses"].map(t=>(
          <button key={t}
            className={`staff-tab ${tab===t?"staff-tab--active":""}`}
            onClick={()=>setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Overview chart ── */}
      {tab==="overview" && (
        <div className="card" style={{padding:20}}>
          <div style={{
            fontFamily:"var(--font-display)", fontSize:14,
            fontWeight:700, marginBottom:16
          }}>
            12-Month Income vs Expense vs Savings
          </div>
          {loading ? (
            <div style={{textAlign:"center",padding:40,color:"var(--text3)"}}>Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summary?.monthly_trend||[]} barGap={3} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="month" tick={{fill:"#52525e",fontSize:11}}
                  axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:"#52525e",fontSize:11}}
                  axisLine={false} tickLine={false}
                  tickFormatter={v=>`₹${v/1000}k`}/>
                <Tooltip content={customTooltip}/>
                <Legend iconType="circle" iconSize={8}
                  wrapperStyle={{fontSize:12,color:"var(--text2)"}}/>
                <Bar dataKey="income"  fill="#a8ff57" name="Income"  radius={[3,3,0,0]}/>
                <Bar dataKey="expense" fill="#ff5b5b" name="Expense" radius={[3,3,0,0]}/>
                <Bar dataKey="savings" fill="#2dffc3" name="Savings" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Category breakdowns */}
          {summary && (
            <div className="grid-2" style={{marginTop:24,gap:20}}>
              {[
                { title:"Income by Category", data:summary.income_by_category,  color:"var(--accent)" },
                { title:"Expense by Category",data:summary.expense_by_category, color:"var(--danger)" },
              ].map(block=>(
                <div key={block.title}>
                  <div style={{fontFamily:"var(--font-display)",fontSize:13,
                    fontWeight:700,marginBottom:10,color:"var(--text2)"}}>
                    {block.title}
                  </div>
                  {block.data?.length===0
                    ? <div style={{fontSize:12,color:"var(--text3)"}}>No data this month</div>
                    : block.data?.map(d=>{
                        const total = block.data.reduce((s,x)=>s+parseFloat(x.total||0),0);
                        const pct   = total>0 ? (parseFloat(d.total)/total*100).toFixed(0) : 0;
                        return (
                          <div key={d.category} style={{marginBottom:8}}>
                            <div style={{display:"flex",justifyContent:"space-between",
                              fontSize:12,marginBottom:3}}>
                              <span style={{color:"var(--text2)"}}>
                                {CAT_LABELS[d.category]||d.category}
                              </span>
                              <span style={{color:block.color,fontFamily:"var(--font-mono)",fontWeight:600}}>
                                ₹{Number(d.total).toLocaleString("en-IN")} ({pct}%)
                              </span>
                            </div>
                            <div style={{height:5,background:"var(--surface2)",borderRadius:3}}>
                              <div style={{height:"100%",width:`${pct}%`,
                                background:block.color,borderRadius:3,transition:"width .4s"}}/>
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
      {tab==="income" && (
        <div className="card">
          <FilterBar
            catFilter={incCat} setCatFilter={setIncCat}
            search={incSearch} setSearch={setIncSearch}
            cats={INC_CATS}
            placeholder="Search source or notes…"
          />
          {/* Filtered total */}
          <div style={{
            display:"flex", justifyContent:"space-between",
            padding:"8px 16px", fontSize:12,
            borderBottom:"1px solid var(--border)",
            color:"var(--text3)"
          }}>
            <span>{filteredInc.length} records</span>
            <span>Total: <b style={{color:"var(--accent)"}}>
              ₹{incTotal.toLocaleString("en-IN")}
            </b></span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Source</th><th>Category</th><th>Amount</th><th>Date</th><th>Notes</th>
              </tr></thead>
              <tbody>
                {filteredInc.length===0 ? (
                  <tr><td colSpan={5} style={{textAlign:"center",padding:32,color:"var(--text3)"}}>
                    No records match
                  </td></tr>
                ) : filteredInc.slice(0,100).map(i=>(
                  <tr key={i.id}>
                    <td><b>{i.source}</b></td>
                    <td>
                      <span className="badge badge-green" style={{fontSize:10}}>
                        {CAT_LABELS[i.category]||i.category}
                      </span>
                    </td>
                    <td style={{fontFamily:"var(--font-mono)",color:"var(--accent)",fontWeight:600}}>
                      ₹{Number(i.amount).toLocaleString("en-IN")}
                    </td>
                    <td style={{color:"var(--text3)",fontSize:12}}>{i.date}</td>
                    <td style={{color:"var(--text3)",fontSize:12,maxWidth:220,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {i.notes||"—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Expenses tab ── */}
      {tab==="expenses" && (
        <div className="card">
          <FilterBar
            catFilter={expCat} setCatFilter={setExpCat}
            search={expSearch} setSearch={setExpSearch}
            cats={EXP_CATS}
            placeholder="Search description, vendor…"
          />
          <div style={{
            display:"flex", justifyContent:"space-between",
            padding:"8px 16px", fontSize:12,
            borderBottom:"1px solid var(--border)",
            color:"var(--text3)"
          }}>
            <span>{filteredExp.length} records</span>
            <span>Total: <b style={{color:"var(--danger)"}}>
              ₹{expTotal.toLocaleString("en-IN")}
            </b></span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Description</th><th>Category</th><th>Amount</th>
                <th>Date</th><th>Vendor</th><th>Notes</th>
              </tr></thead>
              <tbody>
                {filteredExp.length===0 ? (
                  <tr><td colSpan={6} style={{textAlign:"center",padding:32,color:"var(--text3)"}}>
                    No records match
                  </td></tr>
                ) : filteredExp.slice(0,100).map(e=>(
                  <tr key={e.id}>
                    <td><b>{e.description}</b></td>
                    <td>
                      <span className="badge badge-red" style={{fontSize:10}}>
                        {CAT_LABELS[e.category]||e.category}
                      </span>
                    </td>
                    <td style={{fontFamily:"var(--font-mono)",color:"var(--danger)",fontWeight:600}}>
                      ₹{Number(e.amount).toLocaleString("en-IN")}
                    </td>
                    <td style={{color:"var(--text3)",fontSize:12}}>{e.date}</td>
                    <td style={{color:"var(--text3)",fontSize:12}}>{e.vendor||"—"}</td>
                    <td style={{color:"var(--text3)",fontSize:12,maxWidth:180,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {e.notes||"—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal==="income"  && (
        <EntryModal type="income"  onClose={()=>setModal(null)} onSave={()=>{setModal(null);load();}}/>
      )}
      {modal==="expense" && (
        <EntryModal type="expense" onClose={()=>setModal(null)} onSave={()=>{setModal(null);load();}}/>
      )}
      {showReport && <MonthlyReport defaultMonth={month} defaultYear={year} onClose={()=>setShowReport(false)}/>}
    </div>
  );
}