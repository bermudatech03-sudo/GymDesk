import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import Layout from "./components/Layout";
import Login      from "./pages/Login/Login";
import Dashboard  from "./pages/Dashboard/Dashboard";
import Members    from "./pages/Members/Members";
import Staff      from "./pages/Staff/Staff";
import Equipment  from "./pages/Equipment/Equipment";
import Finances   from "./pages/Finances/Finances";
import Notifications from "./pages/Notifications/Notifications";
import Settings   from "./pages/Settings/Settings";
import Plans      from "./pages/Plans/plans";

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Protected><Layout /></Protected>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"     element={<Dashboard />} />
            <Route path="members/*"     element={<Members />} />
            <Route path="staff/*"       element={<Staff />} />
            <Route path="equipment/*"   element={<Equipment />} />
            <Route path="finances/*"    element={<Finances />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings"      element={<Settings />} />
            <Route path="plans"         element={<Plans />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
