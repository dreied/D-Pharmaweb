// src/components/auth/LoginScreen.jsx
import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";

export default function LoginScreen() {
  const { t } = useTranslation();
  const { login } = useAuth();

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const res = await login(username.trim(), password);
    setBusy(false);

    if (!res.ok) {
      if (res.reason === "user_not_found") {
        setError(t("security.login.userNotFound"));
      } else if (res.reason === "invalid_password") {
        setError(t("security.login.invalidPassword"));
      } else {
        setError(t("security.login.genericError"));
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container-high">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-surface rounded-3xl shadow-lg p-6 space-y-4"
      >
        <h1 className="text-2xl font-bold text-on-surface mb-2">
          {t("security.login.title")}
        </h1>

        <p className="text-sm text-on-surface-variant mb-4">
          {t("security.login.subtitle")}
        </p>

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">
            {t("security.login.username")}
          </label>
          <input
            className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">
            {t("security.login.password")}
          </label>
          <input
            type="password"
            className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div className="text-sm text-red-500">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full px-4 py-2 rounded-xl bg-primary text-on-primary font-bold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy && (
            <span className="material-symbols-outlined animate-spin text-sm">
              progress_activity
            </span>
          )}
          {t("security.login.button")}
        </button>

        <p className="text-xs text-on-surface-variant mt-2">
          {t("security.login.defaultHint")}
        </p>
      </form>
    </div>
  );
}
