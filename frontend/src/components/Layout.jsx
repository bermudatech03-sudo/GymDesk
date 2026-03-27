import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useState } from "react";
import "./Layout.css";

const NAV = [
  { to:"/dashboard",     icon:"⬡",  label:"Dashboard" },
  { to:"/members",       icon:"◈",  label:"Members" },
  { to:"/plans",         icon:"◉",  label:"Membership Plans" },
  { to:"/diets",                icon:"◯",  label:"Diets" },
  { to:"/trainer-assignments", icon:"⊛",  label:"Trainer Assign" },
  { to:"/staff",               icon:"◆",  label:"Staff" },
  { to:"/attendance",    icon:"✓",  label:"Attendance" },
  { to:"/equipment",     icon:"◇",  label:"Equipment" },
  { to:"/finances",      icon:"◎",  label:"Finances" },
  { to:"/notifications", icon:"⚇",  label:"Notifications" },
  { to:"/settings",      icon:"⚙",  label:"Settings" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className={`layout ${collapsed ? "layout--collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar__logo">
          <div className="sidebar__logo-mark">G</div>
          {!collapsed && (
            <div className="sidebar__logo-text">
              <span className="sidebar__logo-name">GymPro</span>
              <span className="sidebar__logo-sub">CRM</span>
            </div>
          )}
          <button className="sidebar__collapse" onClick={() => setCollapsed(p=>!p)}>
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        <nav className="sidebar__nav">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? "sidebar__link--active" : ""}`}>
              <span className="sidebar__link-icon">{n.icon}</span>
              {!collapsed && <span className="sidebar__link-label">{n.label}</span>}
            </NavLink>
          ))}

          {/* Kiosk quick-launch */}
          <a href="/kiosk" target="_blank" rel="noopener"
            className="sidebar__link sidebar__link--kiosk"
            title="Open Kiosk">
            <span className="sidebar__link-icon">⊙</span>
            {!collapsed && <span className="sidebar__link-label">Kiosk ↗</span>}
          </a>
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__avatar">
              {user?.full_name?.[0] || user?.username?.[0] || "A"}
            </div>
            {!collapsed && (
              <div className="sidebar__user-info">
                <span className="sidebar__user-name">{user?.full_name||user?.username}</span>
                <span className="sidebar__user-role">{user?.role}</span>
              </div>
            )}
          </div>
          <button className="sidebar__logout" onClick={handleLogout} title="Logout">⏏</button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar__left">
            <div className="topbar__title" id="page-title">Dashboard</div>
          </div>
          <div className="topbar__right">
            <div className="topbar__badge badge badge-green"><span>●</span> Live</div>
            <div className="topbar__date">
              {new Date().toLocaleDateString("en-IN",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
            </div>
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}