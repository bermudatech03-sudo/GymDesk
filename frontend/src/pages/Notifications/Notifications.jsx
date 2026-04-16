import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";

export default function Notifications() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [phoneFilter, setPhoneFilter] = useState("");
  const [triggerFilter, setTriggerFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => { document.getElementById("page-title").textContent = "Notifications"; }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ordering: "-created_at", page };
      if (phoneFilter) params.phone = phoneFilter;
      if (triggerFilter) params.trigger_type = triggerFilter;
      if (dateFilter) params.date = dateFilter;
      const res = await api.get("/notifications/", { params });
      setList(res.data.results || res.data);
      setCount(res.data.count || 0);
    } finally { setLoading(false); }
  }, [page, phoneFilter, triggerFilter, dateFilter]);

  useEffect(() => { load(); }, [load]);

  const sendReminders = async () => {
    setSending(true);
    try {
      const res = await api.post("/notifications/send_renewal_reminders/", {});
      toast.success(res.data.message);
      load();
    } catch { toast.error("Failed to send reminders"); } finally { setSending(false); }
  };

  const sendExpiry = async () => {
    setSending(true);
    try {
      const res = await api.post("/notifications/send_expiry_notices/");
      toast.success(`Expiry notices sent to ${res.data.processed} members`);
      load();
    } catch { toast.error("Failed"); } finally { setSending(false); }
  };

  const statusColor = { sent:"badge-green", failed:"badge-red", pending:"badge-yellow" };
  const channelColor = { email:"badge-blue", whatsapp:"badge-green", sms:"badge-teal", in_app:"badge-gray" };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Notifications</div>
          <div className="page-subtitle">Automated alerts via WhatsApp, Email and SMS</div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="card" style={{padding:20,marginBottom:20}}>
        <div style={{fontFamily:"var(--font-display)",fontSize:14,fontWeight:700,marginBottom:14}}>Send Bulk Notifications</div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          <button className="btn btn-primary" onClick={sendReminders} disabled={sending}>
            {sending?"Sending…":"📲 Send 3-Day Renewal Reminders"}
          </button>
          <button className="btn btn-danger" onClick={sendExpiry} disabled={sending}>
            ⚠ Process Expired Memberships
          </button>
        </div>
        <div style={{marginTop:12,fontSize:12,color:"var(--text3)"}}>
          Configure email and WhatsApp in <code style={{background:"var(--surface2)",padding:"1px 6px",borderRadius:4,color:"var(--accent)"}}>backend/.env</code> to enable real delivery.
        </div>
      </div>

      {/* Log */}
      <div className="card">
        <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <span style={{fontFamily:"var(--font-display)",fontSize:14,fontWeight:700}}>Notification Log</span>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <input
              type="tel"
              className="form-input"
              placeholder="Phone"
              value={phoneFilter}
              onChange={e=>{ setPhoneFilter(e.target.value); setPage(1); }}
              style={{width:140,fontSize:12}} />
            <select
              className="form-input"
              value={triggerFilter}
              onChange={e=>{ setTriggerFilter(e.target.value); setPage(1); }}
              style={{maxWidth:200,fontSize:12}}>
              <option value="">All triggers</option>
              <option value="renewal_remind">Renewal Reminder</option>
              <option value="renewal_confirm">Renewal Confirmed</option>
              <option value="enrollment">New Enrollment</option>
              <option value="expiry">Membership Expired</option>
              <option value="manual">Manual</option>
              <option value="enquiry_welcome">Enquiry Welcome</option>
              <option value="enquiry_followup">Enquiry Follow-up</option>
              <option value="absent">Member Absent</option>
              <option value="staff_absent">Staff Absent</option>
              <option value="new_plan">New Plan Announcement</option>
              <option value="diet_reminder">Diet Reminder</option>
            </select>
            <input
              type="date"
              className="form-input"
              value={dateFilter}
              onChange={e=>{ setDateFilter(e.target.value); setPage(1); }}
              style={{maxWidth:160,fontSize:12}} />
            {(phoneFilter||triggerFilter||dateFilter) && (
              <button className="btn btn-sm btn-secondary"
                onClick={()=>{ setPhoneFilter(""); setTriggerFilter(""); setDateFilter(""); setPage(1); }}>
                Clear
              </button>
            )}
            <button className="btn btn-sm btn-secondary" onClick={load}>Refresh</button>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="mobile-card-list" style={{ padding: 12 }}>
          {loading ? (
            <div className="mobile-card__empty">Loading…</div>
          ) : list.length === 0 ? (
            <div className="mobile-card__empty">No notifications yet</div>
          ) : list.map(n => (
            <div key={n.id} className="mobile-card">
              <div className="mobile-card__left">
                <span className="mobile-card__title">{n.recipient_name}</span>
                <span className="mobile-card__meta">{n.recipient_phone}</span>
                <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span className={`badge ${channelColor[n.channel]||"badge-gray"}`} style={{ fontSize: 11 }}>
                    {n.channel}
                  </span>
                  <span className={`badge ${statusColor[n.status]||"badge-gray"}`} style={{ fontSize: 11 }}>
                    {n.status}
                  </span>
                  <span className="mobile-card__meta">{n.trigger_type.replace("_"," ")}</span>
                </span>
                {n.sent_at && (
                  <span className="mobile-card__meta">
                    {new Date(n.sent_at).toLocaleString("en-IN")}
                  </span>
                )}
                <span className="mobile-card__meta" style={{ maxWidth: "100%", whiteSpace: "normal" }}>
                  {n.message}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="table-wrap desktop-table-view">
          <table>
            <thead><tr>
              <th>Recipient</th><th>Trigger</th><th>Channel</th>
              <th>Status</th><th>Sent At</th><th>Message</th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} style={{textAlign:"center",padding:32,color:"var(--text3)"}}>Loading…</td></tr>
              : list.length===0 ? <tr><td colSpan={6} style={{textAlign:"center",padding:32,color:"var(--text3)"}}>No notifications yet</td></tr>
              : list.map(n=>(
                <tr key={n.id}>
                  <td>
                    <div style={{fontWeight:600}}>{n.recipient_name}</div>
                    <div style={{fontSize:11,color:"var(--text3)"}}>{n.recipient_phone}</div>
                  </td>
                  <td><span style={{fontSize:12,color:"var(--text2)"}}>{n.trigger_type.replace("_"," ")}</span></td>
                  <td><span className={`badge ${channelColor[n.channel]||"badge-gray"}`}>{n.channel}</span></td>
                  <td><span className={`badge ${statusColor[n.status]||"badge-gray"}`}>{n.status}</span></td>
                  <td style={{color:"var(--text3)",fontSize:11}}>{n.sent_at ? new Date(n.sent_at).toLocaleString("en-IN") : "—"}</td>
                  <td style={{maxWidth:300,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:12,color:"var(--text2)"}}>
                    {n.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="members-pagination" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 18px",borderTop:"1px solid var(--border)"}}>
          <span style={{fontSize:12,color:"var(--text3)"}}>{count} total</span>
          <div style={{display:"flex",gap:6}}>
            <button className="btn btn-sm btn-secondary" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
            <button className="btn btn-sm btn-secondary" disabled={list.length<20} onClick={()=>setPage(p=>p+1)}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
