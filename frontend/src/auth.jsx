import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("shine_token");
    if (!token) { setReady(true); return; }
    api.me().then((r) => setUser(r.data.username)).catch(() => {
      localStorage.removeItem("shine_token");
    }).finally(() => setReady(true));
  }, []);

  const login = async (username, password) => {
    const r = await api.login(username, password);
    localStorage.setItem("shine_token", r.data.access_token);
    setUser(r.data.username);
    return r.data.username;
  };

  const logout = () => {
    localStorage.removeItem("shine_token");
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, login, logout, ready }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
