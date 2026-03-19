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

        {/* App info */}
        <div className="card" style={{padding:24,gridColumn:"1/-1"}}>
          <div style={{fontFamily:"var(--font-display)",fontSize:16,fontWeight:700,marginBottom:18}}>About GymPro CRM</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
            {[
              {label:"Version",value:"1.0.0"},
              {label:"Backend",value:"Django 4.2 + DRF"},
              {label:"Frontend",value:"React 18 + Vite"},
              {label:"Database",value:"PostgreSQL"},
              {label:"Auth",value:"JWT (SimpleJWT)"},
              {label:"Notifications",value:"Email + WhatsApp (Twilio)"},
            ].map(({label,value})=>(
              <div key={label} style={{background:"var(--surface2)",borderRadius:8,padding:"12px 16px"}}>
                <div style={{fontSize:11,color:"var(--text3)",marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:.5}}>{label}</div>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text1)",fontFamily:"var(--font-mono)"}}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
