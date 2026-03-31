import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/ConfirmModal";

const CONDITIONS = { excellent:"badge-green", good:"badge-teal", fair:"badge-yellow", poor:"badge-red", out_of_service:"badge-gray" };
const CATEGORIES = ["cardio","strength","flexibility","free_weights","accessories","other"];

function EqModal({ eq, onClose, onSave }) {
  const [form, setForm] = useState(eq || { name:"",category:"strength",brand:"",quantity:1,condition:"good",purchase_date:"",purchase_price:"",next_service:"",location:"",notes:"",is_active:true });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (eq?.id) { await api.patch(`/equipment/list/${eq.id}/`, form); toast.success("Equipment updated!"); }
      else         { await api.post("/equipment/list/", form);           toast.success("Equipment added!"); }
      onSave();
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-title">{eq?.id ? "Edit Equipment" : "Add Equipment"}</div>
        <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Name *</label>
              <input className="form-input" value={form.name} onChange={e=>set("name",e.target.value)} required /></div>
            <div className="form-group"><label className="form-label">Category</label>
              <select className="form-input" value={form.category} onChange={e=>set("category",e.target.value)}>
                {CATEGORIES.map(c=><option key={c} value={c}>{c.replace("_"," ")}</option>)}
              </select></div>
            <div className="form-group"><label className="form-label">Brand</label>
              <input className="form-input" value={form.brand} onChange={e=>set("brand",e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Quantity</label>
              <input className="form-input" type="number" min={1} value={form.quantity} onChange={e=>set("quantity",e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Condition</label>
              <select className="form-input" value={form.condition} onChange={e=>set("condition",e.target.value)}>
                {Object.keys(CONDITIONS).map(c=><option key={c} value={c}>{c.replace("_"," ")}</option>)}
              </select></div>
            <div className="form-group"><label className="form-label">Location</label>
              <input className="form-input" value={form.location} onChange={e=>set("location",e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Purchase Date</label>
              <input className="form-input" type="date" value={form.purchase_date||""} onChange={e=>set("purchase_date",e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Purchase Price (₹)</label>
              <input className="form-input" type="number" value={form.purchase_price||""} onChange={e=>set("purchase_price",e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Next Service Date</label>
              <input className="form-input" type="date" value={form.next_service||""} onChange={e=>set("next_service",e.target.value)} /></div>
          </div>
          <div className="form-group"><label className="form-label">Notes</label>
            <textarea className="form-input" value={form.notes} onChange={e=>set("notes",e.target.value)} rows={2} /></div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving?"Saving…":"Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Equipment() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [stats, setStats] = useState({});
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => { document.getElementById("page-title").textContent = "Equipment"; }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search };
      if (filter !== "all") params.category = filter;
      const [eRes, sRes] = await Promise.all([
        api.get("/equipment/list/", { params }),
        api.get("/equipment/list/stats/"),
      ]);
      setList(eRes.data.results||eRes.data);
      setStats(sRes.data);
    } finally { setLoading(false); }
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  const deactivate = (eq) => {
    setConfirmState({
      title: "Remove Equipment",
      message: `Remove ${eq.name}?`,
      confirmText: "Remove",
      danger: true,
      onConfirm: async () => {
        setConfirmState(null);
        await api.patch(`/equipment/list/${eq.id}/`, { is_active: false });
        toast.success("Equipment removed");
        load();
      },
      onCancel: () => setConfirmState(null),
    });
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      {confirmState && <ConfirmModal {...confirmState} />}
      <div className="page-header">
        <div>
          <div className="page-title">Equipment</div>
          <div className="page-subtitle">Track all gym equipment, condition and maintenance</div>
        </div>
        <button className="btn btn-primary" onClick={()=>setModal("add")}>+ Add Equipment</button>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{marginBottom:20}}>
        <div className="stat-card animate-in">
          <div className="icon" style={{background:"rgba(168,255,87,.12)",color:"var(--accent)"}}>◆</div>
          <div className="label">Total Equipment</div>
          <div className="value">{stats.total||0}</div>
        </div>
        <div className="stat-card animate-in">
          <div className="icon" style={{background:"rgba(255,91,91,.12)",color:"var(--danger)"}}>⚠</div>
          <div className="label">Out of Service</div>
          <div className="value">{stats.out_of_service||0}</div>
        </div>
        <div className="stat-card animate-in">
          <div className="icon" style={{background:"rgba(255,184,48,.12)",color:"var(--warn)"}}>🔧</div>
          <div className="label">Due Maintenance</div>
          <div className="value">{stats.due_maintenance||0}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <div className="search-bar" style={{flex:1,minWidth:200}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="form-input" placeholder="Search equipment…" value={search}
            onChange={e=>setSearch(e.target.value)} style={{paddingLeft:38}} />
        </div>
        <select className="form-input" style={{maxWidth:180}} value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{c.replace("_"," ")}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Name</th><th>Category</th><th>Brand</th><th>Qty</th>
              <th>Condition</th><th>Next Service</th><th>Location</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} style={{textAlign:"center",padding:32,color:"var(--text3)"}}>Loading…</td></tr>
              : list.filter(e=>e.is_active).length===0 ? <tr><td colSpan={8} style={{textAlign:"center",padding:32,color:"var(--text3)"}}>No equipment found</td></tr>
              : list.filter(e=>e.is_active).map(e => (
                <tr key={e.id}>
                  <td><b>{e.name}</b></td>
                  <td><span className="badge badge-blue">{e.category?.replace("_"," ")}</span></td>
                  <td style={{color:"var(--text3)"}}>{e.brand||"—"}</td>
                  <td>{e.quantity}</td>
                  <td><span className={`badge ${CONDITIONS[e.condition]||"badge-gray"}`}>{e.condition?.replace("_"," ")}</span></td>
                  <td>
                    {e.next_service
                      ? <span style={{color: e.next_service<=today ? "var(--danger)":"var(--text2)",fontSize:12}}>{e.next_service}</span>
                      : <span style={{color:"var(--text3)"}}>—</span>}
                  </td>
                  <td style={{color:"var(--text3)",fontSize:12}}>{e.location||"—"}</td>
                  <td>
                    <div style={{display:"flex",gap:6}}>
                      <button className="btn btn-sm btn-secondary" onClick={()=>{setSelected(e);setModal("edit");}}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={()=>deactivate(e)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal==="add"  && <EqModal onClose={()=>setModal(null)} onSave={()=>{setModal(null);load();}} />}
      {modal==="edit" && selected && <EqModal eq={selected} onClose={()=>setModal(null)} onSave={()=>{setModal(null);load();}} />}
    </div>
  );
}
