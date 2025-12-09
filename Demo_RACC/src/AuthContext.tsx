import React, { createContext, useContext, useEffect, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "";

type AuthContextType = {
  user: string | null;
  loading: boolean;
  accessToken: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchWithAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  accessToken: null,
  login: async () => false,
  logout: async () => {},
  fetchWithAuth: async () => new Response(null),
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const REFRESH_KEY = "pae_refresh_token";

  // On mount try to refresh using refresh token in localStorage
  useEffect(() => {
    (async () => {
      const stored = localStorage.getItem(REFRESH_KEY);
      if (!stored) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: stored }),
        });
        if (!res.ok) {
          localStorage.removeItem(REFRESH_KEY);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setAccessToken(data.access_token);
        localStorage.setItem(REFRESH_KEY, data.refresh_token);
        // fetch /me
        const meRes = await fetch(`${API_URL}/me`, {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        if (meRes.ok) {
          const me = await meRes.json();
          setUser(me.username ?? null);
        }
      } catch (e) {
        localStorage.removeItem(REFRESH_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setAccessToken(data.access_token);
    localStorage.setItem(REFRESH_KEY, data.refresh_token);
    const meRes = await fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (meRes.ok) {
      const me = await meRes.json();
      setUser(me.username ?? null);
    }
    return true;
  };

  const logout = async () => {
    const refresh_token = localStorage.getItem(REFRESH_KEY);
    await fetch(`${API_URL}/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    });
    localStorage.removeItem(REFRESH_KEY);
    setAccessToken(null);
    setUser(null);
  };

  // Wrapper for authenticated fetch with automatic refresh on 401
  const fetchWithAuth = async (input: RequestInfo, init: RequestInit = {}) => {
    const headers = new Headers(init.headers || {});
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    const res = await fetch(input, { ...init, headers });
    if (res.status === 401) {
      // try refresh
      const stored = localStorage.getItem(REFRESH_KEY);
      if (!stored) return res;
      const refreshRes = await fetch(`${API_URL}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: stored }),
      });
      if (!refreshRes.ok) {
        localStorage.removeItem(REFRESH_KEY);
        setAccessToken(null);
        setUser(null);
        return res;
      }
      const refreshData = await refreshRes.json();
      setAccessToken(refreshData.access_token);
      localStorage.setItem(REFRESH_KEY, refreshData.refresh_token);
      headers.set("Authorization", `Bearer ${refreshData.access_token}`);
      return fetch(input, { ...init, headers });
    }
    return res;
  };

  return (
    <AuthContext.Provider value={{ user, loading, accessToken, login, logout, fetchWithAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);