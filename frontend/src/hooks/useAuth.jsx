import { createContext, useContext, useState, useCallback } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const stored = localStorage.getItem("user");
  const [user, setUser] = useState(stored ? JSON.parse(stored) : null);

  const login = useCallback(async (username, password) => {
    const { data } = await api.post("/auth/login/", { username, password });
    localStorage.setItem("access",  data.access);
    localStorage.setItem("refresh", data.refresh);
    localStorage.setItem("user",    JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setUser(null);
  }, []);

  return <AuthCtx.Provider value={{ user, login, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
