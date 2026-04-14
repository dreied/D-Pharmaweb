// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { db } from "../db";
import { verifyPassword } from "../utils/security/passwordHash";
import { ensureDefaultAdmin } from "../utils/seedAdmin";

const AuthContext = createContext(null);
const STORAGE_KEY = "current_user";

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await ensureDefaultAdmin();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(username, password) {
    const user = await db.users.where("username").equals(username).first();
    if (!user) return { ok: false, reason: "user_not_found" };

    const valid = await verifyPassword(password, user.passwordHash, user.salt);
    if (!valid) return { ok: false, reason: "invalid_password" };

    const safeUser = { id: user.id, username: user.username, role: user.role };
    setCurrentUser(safeUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeUser));
    return { ok: true };
  }

  function logout() {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  const value = {
    currentUser,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
