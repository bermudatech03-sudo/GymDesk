import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import toast from "react-hot-toast";
import "./Login.css";

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm] = useState({ username:"", password:"" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.username, form.password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch {
      toast.error("Invalid credentials. Try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-glow" />

      <div className="login-card animate-in">
        <div className="login-logo">
          <div className="login-logo-mark">G</div>
          <div>
            <div className="login-logo-name">GymPro CRM</div>
            <div className="login-logo-sub">Management System</div>
          </div>
        </div>

        <h1 className="login-title">Welcome back</h1>
        <p className="login-sub">Sign in to your admin panel</p>

        <form className="login-form" onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              type="text"
              placeholder="admin"
              value={form.username}
              onChange={e => setForm(p => ({...p, username:e.target.value}))}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(p => ({...p, password:e.target.value}))}
              required
            />
          </div>
          <button className="btn btn-primary btn-lg" style={{width:"100%", justifyContent:"center"}} disabled={loading}>
            {loading ? <span className="spin">⟳</span> : "Sign In →"}
          </button>
        </form>

        <div className="login-hint">
          Demo credentials: <code>admin</code> / <code>admin123</code>
        </div>
      </div>
    </div>
  );
}
