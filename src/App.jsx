import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, createContext } from "react";
import { useNotificationScanner } from "./hooks/useNotificationScanner";

import Stock from "./pages/stock.jsx";
import POS from "./pages/pos.jsx";
import CashBoxHistory from "./pages/CashBoxHistory";
import Settings from "./pages/Settings.jsx";
import EditProductPage from "./pages/EditProductPage.jsx";
import DebtBook from "./pages/DebtBook.jsx";
import SalesHistory from "./pages/SalesHistory";
import UniversalViewer from "./pages/UniversalViewer";
import Security from "./pages/Security.jsx";
import SuppliersPage from "./pages/SuppliersPage";
import SupplierDetailsPage from "./pages/SupplierDetailsPage.jsx";
import HomeCashBoxHistory from "./pages/HomeCashBoxHistory";
import Profile from "./pages/Profile";
import SupplierReturnHistory from "./pages/SupplierReturnHistory";
import ChangePassword from "./pages/ChangePassword.jsx";

import LoginScreen from "./components/auth/LoginScreen";
import ActivationPage from "./pages/ActivationPage";

import { db } from "./db/index";
import { useAuth } from "./context/AuthContext";
import { useLicense } from "./context/LicenseContext";

import {
  loadFolderHandle,
  saveFolderHandle,
  readDeviceId,
  pickDeviceFolder
} from "./utils/deviceFolder";

import { setDeviceId } from "./utils/license";
import { loadUniversalIfEmpty } from "./db/loadUniversal.js";

import "./theme.css";

// ⭐ Update popup
import UpdatePrompt from "./components/UpdatePrompt";

export const ThemeContext = createContext();

export default function App() {
  const { currentUser, loading } = useAuth();
  const { state, trialInfo } = useLicense();
  useNotificationScanner(2);

  const [theme, setTheme] = useState("blue");

  // ⭐ NEW: First‑time import loading state
  const [initialImportLoading, setInitialImportLoading] = useState(true);

  /* ============================================================
     🔥 GLOBAL DEVICE ID LOADING — REQUIRED FOR LICENSE SYSTEM
  ============================================================ */
  useEffect(() => {
    (async () => {
      let handle = await loadFolderHandle();

      if (!handle) {
        const auto = await pickDeviceFolder();
        if (auto) {
          handle = auto;
          await saveFolderHandle(auto);
        }
      }

      if (handle) {
        try {
          const id = await readDeviceId(handle);
          console.log("GLOBAL DEVICE ID LOADED:", id);
          setDeviceId(id);
        } catch (e) {
          console.error("Failed to load device ID:", e);
        }
      }
    })();
  }, []);

  /* ============================================================
     ⭐ NEW: FIRST‑TIME UNIVERSAL IMPORT
  ============================================================ */
  useEffect(() => {
    (async () => {
      try {
        await loadUniversalIfEmpty();
      } finally {
        setInitialImportLoading(false);
      }
    })();
  }, []);

  /* ============================================================
     THEME LOADING
  ============================================================ */
  useEffect(() => {
    async function loadTheme() {
      const saved = await db.appSettings.get("theme");
      const current = saved?.value || "blue";
      setTheme(current);

      const root = document.documentElement;
      root.classList.toggle("theme-emerald", current === "emerald");
    }
    loadTheme();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("theme-emerald", theme === "emerald");
  }, [theme]);

  /* ============================================================
     AUTH + LICENSE CHECKS
  ============================================================ */
  if (loading) {
    return <div className="p-10 text-on-surface">Loading…</div>;
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  const isLocked =
    state.status === "no_device_id" ||
    state.status === "expired" ||
    (state.status === "trial" && trialInfo.daysLeft <= 0);

  if (isLocked) {
    return <ActivationPage />;
  }

  /* ============================================================
     ⭐ NEW: FIRST‑TIME IMPORT SPINNER
  ============================================================ */
  if (initialImportLoading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "20px",
          color: "var(--on-surface)"
        }}
      >
        <div className="loader"></div>
        <div style={{ fontSize: "18px", opacity: 0.8 }}>
          Loading pharmacy database…
        </div>
      </div>
    );
  }

  /* ============================================================
     ROUTES
  ============================================================ */
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <BrowserRouter basename="/d-pharma-web">

        <Routes>
          <Route path="/" element={<POS />} />
          <Route path="/dashboard" element={<Stock />} />
          <Route path="/debt" element={<DebtBook />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/edit-product/:id" element={<EditProductPage />} />
          <Route path="/cashbox-history" element={<CashBoxHistory />} />
          <Route path="/sales-history" element={<SalesHistory />} />
          <Route path="/universal" element={<UniversalViewer />} />
          <Route path="/security" element={<Security />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/suppliers/:id" element={<SupplierDetailsPage />} />
          <Route path="/home-cashbox-history" element={<HomeCashBoxHistory />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/return-history" element={<SupplierReturnHistory />} />
          <Route path="/change-password" element={<ChangePassword />} />

          <Route path="/login" element={<LoginScreen />} />
          <Route path="/logout" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>

      {/* ⭐ Update popup */}
      <UpdatePrompt />
    </ThemeContext.Provider>
  );
}
