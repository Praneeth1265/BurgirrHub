import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { gatewayClient, setAccessToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { id, name, email, role, branchId }
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  // On mount, try to restore a session via the httpOnly refreshToken
  // cookie the Auth Service set on a previous login -- this is what makes
  // "stay signed in across page reloads" work without ever putting a
  // token in localStorage (where it'd be reachable by XSS).
  useEffect(() => {
    (async () => {
      try {
        const { data } = await gatewayClient.post("/auth/refresh");
        setAccessToken(data.accessToken);
        const me = await gatewayClient.get("/auth/me");
        setUser(me.data.user);
      } catch {
        // No valid refresh cookie yet (first visit, expired, logged out
        // elsewhere) -- not an error, just means "not signed in."
        clearSession();
      } finally {
        setLoading(false);
      }
    })();
  }, [clearSession]);

  const loginWithGoogle = useCallback(async (idToken) => {
    const { data } = await gatewayClient.post("/auth/google", { idToken });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await gatewayClient.post("/auth/logout");
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    loginWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
