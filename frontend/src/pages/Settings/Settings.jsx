import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { useEffect } from "react";
import "./Settings.css";

export default function Settings() {
  const { user } = useAuth();
  const [pw, setPw] = useState({ old_password:"", new_password:"", confirm:"" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { document.getElementById("page-title").textContent = "Settings"; }, []);

  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.new_password !== pw.confirm) { toast.error("Passwords don't match"); return; }
    setSaving(true);
    try {
      await api.post("/auth/change-password/", { old_password:pw.old_password, new_password:pw.new_password });
      toast.success("Password changed!");
      setPw({ old_password:"", new_password:"", confirm:"" });
    } catch { toast.error("Wrong current password"); } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Account, security and preferences</div>
        </div>
      </div>

      <div className="settings-grid">
        {/* Profile card */}
        <div className="card" style={{padding:24}}>
          <div style={{fontFamily:"var(--font-display)",fontSize:16,fontWeight:700,marginBottom:18}}>My Profile</div>
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:"linear-gradient(135deg,var(--accent),var(--accent2))",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:"var(--font-display)",fontSize:24,fontWeight:800,color:"#08080a"}}>
              {user?.full_name?.[0]||user?.username?.[0]||"A"}
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:16}}>{user?.full_name||user?.username}</div>
              <div style={{fontSize:12,color:"var(--text3)"}}>{user?.email}</div>
              <span className="badge badge-green" style={{marginTop:4}}>{user?.role}</span>
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="card" style={{padding:24}}>
          <div style={{fontFamily:"var(--font-display)",fontSize:16,fontWeight:700,marginBottom:18}}>Change Password</div>
          <form onSubmit={changePassword} style={{display:"flex",flexDirection:"column",gap:14}}>
            <div className="form-group"><label className="form-label">Current Password</label>
              <input className="form-input" type="password" value={pw.old_password} onChange={e=>setPw(p=>({...p,old_password:e.target.value}))} required /></div>
            <div className="form-group"><label className="form-label">New Password</label>
              <input className="form-input" type="password" value={pw.new_password} onChange={e=>setPw(p=>({...p,new_password:e.target.value}))} required minLength={8} /></div>
            <div className="form-group"><label className="form-label">Confirm New Password</label>
              <input className="form-input" type="password" value={pw.confirm} onChange={e=>setPw(p=>({...p,confirm:e.target.value}))} required /></div>
            <button type="submit" className="btn btn-primary" style={{alignSelf:"flex-start"}} disabled={saving}>{saving?"Saving…":"Update Password"}</button>
          </form>
        </div>


        <div className="card" style={{ padding: 28, gridColumn: "1/-1", position: "relative", overflow: "hidden" }}>
  
  {/* Headline */}
  <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, marginBottom: 10 }}>
    GymPro CRM
  </div>

  {/* Tagline */}
  <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 20, maxWidth: 600 }}>
    The all-in-one solution to manage your gym, boost member engagement, and grow your fitness business effortlessly.
  </div>

  {/* Features Grid */}
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
    {[
      { label: "⚡ Fast & Scalable", value: "Built with Django + React" },
      { label: "🔐 Secure Access", value: "JWT Authentication" },
      { label: "📊 Smart Data", value: "PostgreSQL Powered" },
      { label: "📩 Instant Alerts", value: "Email + WhatsApp Integration" },
      { label: "🎯 Modern UI", value: "Lightning-fast React + Vite" },
      { label: "🚀 Version", value: "1.0.0 – Ready to Launch" },
    ].map(({ label, value }) => (
      <div key={label} style={{ background: "var(--surface2)", borderRadius: 10, padding: "14px 18px" }}>
        <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6, fontWeight: 600 }}>
          {label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)" }}>
          {value}
        </div>
      </div>
    ))}
  </div>

  {/* Call To Action */}
  <div style={{ marginTop: 22, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
    <div style={{ fontSize: 13, color: "var(--text2)" }}>
      Transform your gym management today.
    </div>

    
  </div>
</div>


<div className="card" style={{ padding: 28, gridColumn: "1/-1" }}>

  {/* 🔝 Advertisement Section */}
  <div style={{ marginBottom: 28 }}>
    <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
      Company Details
    </div>

    <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 18, maxWidth: 600 }}>
      
    </div>
  </div>

  {/* 🔽 Divider */}
  <div style={{ height: 1, background: "var(--border)", margin: "20px 0" }} />

  {/* 🔽 Company Details Section */}
  <div>
    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
      Bermuda Tech
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
      {[
        { label: "Company Name", value: "Bermuda Tech" },
       
        { label: "Location", value: "India" },
        { label: "Product", value: "GymPro CRM" },
        { label: "Support", value: "bermudatech03@gmail.com" },
        { label: "Website", value: "bermudatech.com" },
      ].map(({ label, value }) => (
        <div key={label} style={{ background: "var(--surface2)", borderRadius: 8, padding: "12px 16px" }}>
          <div style={{
            fontSize: 11,
            color: "var(--text3)",
            marginBottom: 4,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: .5
          }}>
            {label}
          </div>

          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text1)",
            fontFamily: "var(--font-mono)"
          }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  </div>

</div>
      </div>
    </div>
  );
}
