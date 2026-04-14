import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useLicense } from "../context/LicenseContext";
import { useState } from "react";
import { closePharmacyCashbox } from "../services/pharmacyBoxService";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";

export default function SideNavBar() {
  const { t } = useTranslation();
  const { currentUser, logout } = useAuth();
  const { trialInfo, state } = useLicense();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Load pharmacy name + logo from appSettings
  const pharmacyNameSetting = useLiveQuery(
    () => db.appSettings.get("pharmacy_name"),
    []
  );

  const pharmacyLogoSetting = useLiveQuery(
    () => db.appSettings.get("pharmacy_logo"),
    []
  );

  const pharmacyName = pharmacyNameSetting?.value || "My Pharmacy";
  const logo = pharmacyLogoSetting?.value || "/default-logo.png";

  // Safe trial banner logic
  const showBanner =
    state?.status === "trial" ||
    (state?.status === "activated" && (trialInfo?.daysLeft ?? 0) > 0);

  return (
    <>
      {/* LOGOUT MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
          <div className="bg-surface-container-high p-6 rounded-2xl shadow-xl w-96 space-y-4">
            <h2 className="text-xl font-bold text-primary">{t("logout")}</h2>
            <p className="text-sm text-on-surface-variant">
              {t("cashbox.closeBoxConfirm")}
            </p>

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 rounded-full bg-surface-container-low hover:bg-surface-container-high"
              >
                {t("cashbox.cancel")}
              </button>

              <button
                onClick={async () => {
                  setShowLogoutModal(false);
                  await closePharmacyCashbox("signout");
                  logout();
                }}
                className="px-4 py-2 rounded-full bg-primary text-on-primary font-bold"
              >
                {t("cashbox.closeBox")}
              </button>

              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  logout();
                }}
                className="px-4 py-2 rounded-full bg-surface-container-low hover:bg-surface-container-high font-bold"
              >
                {t("nav.logout")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-low/60 
        backdrop-blur-xl z-40 hidden md:flex flex-col p-4 gap-2 border-r border-outline-variant/20 pointer-events-none">

        {/* Logo + Pharmacy Name */}
        <div className="mt-20 mb-8 px-2 flex flex-col items-center gap-3 pointer-events-auto">
          <img
            src={logo}
            className="w-20 h-20 object-contain rounded-xl"
            alt="Pharmacy Logo"
          />

          <div className="text-lg font-black tracking-tighter text-primary-dim font-headline text-center">
            {pharmacyName}
          </div>
        </div>


        {/* NAVIGATION */}
        <nav className="flex-1 flex flex-col gap-1 pointer-events-auto">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 font-headline text-sm rounded-lg transition-all
              ${isActive ? "bg-surface-container-low text-primary font-bold shadow-sm"
                         : "text-on-surface-variant hover:text-primary"}`
            }
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span>{t("nav.dashboard")}</span>
          </NavLink>

          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 font-headline text-sm rounded-lg transition-all
              ${isActive ? "bg-surface-container-low text-primary font-bold shadow-sm"
                         : "text-on-surface-variant hover:text-primary"}`
            }
          >
            <span className="material-symbols-outlined">point_of_sale</span>
            <span>{t("nav.pos")}</span>
          </NavLink>

          <NavLink
            to="/debt"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 font-headline text-sm rounded-lg transition-all
              ${isActive ? "bg-surface-container-low text-primary font-bold shadow-sm"
                         : "text-on-surface-variant hover:text-primary"}`
            }
          >
            <span className="material-symbols-outlined">group_add</span>
            <span>{t("nav.debtBook")}</span>
          </NavLink>

          <NavLink
            to="/suppliers"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 font-headline text-sm rounded-lg transition-all
              ${isActive ? "bg-surface-container-low text-primary font-bold shadow-sm"
                         : "text-on-surface-variant hover:text-primary"}`
            }
          >
            <span className="material-symbols-outlined">local_shipping</span>
            <span>{t("nav.suppliers")}</span>
          </NavLink>

          {/* HISTORY COLLAPSE */}
          <div className="flex flex-col">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="flex items-center justify-between px-4 py-3 rounded-lg font-headline text-sm
                text-on-surface-variant hover:text-primary transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined">receipt_long</span>
                <span>{t("nav.history")}</span>
              </div>

              <span
                className="material-symbols-outlined text-lg transition-transform"
                style={{ transform: historyOpen ? "rotate(90deg)" : "rotate(0deg)" }}
              >
                chevron_right
              </span>
            </button>

            {historyOpen && (
              <div className="flex flex-col ml-10 mt-1">

                <NavLink
                  to="/sales-history"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
                    ${isActive ? "bg-surface-container-low text-primary font-bold shadow-sm"
                               : "text-on-surface-variant hover:text-primary"}`
                  }
                >
                  <span className="material-symbols-outlined text-sm">sell</span>
                  <span>{t("nav.salesHistory")}</span>
                </NavLink>

                <NavLink
                  to="/return-history"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
                    ${isActive ? "bg-surface-container-low text-primary font-bold shadow-sm"
                               : "text-on-surface-variant hover:text-primary"}`
                  }
                >
                  <span className="material-symbols-outlined text-sm">undo</span>
                  <span>{t("nav.returnHistory")}</span>
                </NavLink>

              </div>
            )}
          </div>
        </nav>

        {/* BOTTOM SECTION */}
        <div className="mt-auto flex flex-col gap-1 border-t border-outline-variant/20 pt-4 pointer-events-auto">

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 font-headline text-sm rounded-lg transition-all
              ${isActive ? "bg-surface-container-low text-primary font-bold shadow-sm"
                         : "text-on-surface-variant hover:text-primary"}`
            }
          >
            <span className="material-symbols-outlined">settings</span>
            <span>{t("nav.settings")}</span>
          </NavLink>

          {currentUser?.role === "admin" && (
            <NavLink
              to="/security"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 font-headline text-sm rounded-lg transition-all
                ${isActive ? "bg-surface-container-low text-primary font-bold shadow-sm"
                           : "text-on-surface-variant hover:text-primary"}`
              }
            >
              <span className="material-symbols-outlined">shield_person</span>
              <span>{t("nav.security")}</span>
            </NavLink>
          )}

          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-3 px-4 py-3 font-headline text-sm rounded-lg transition-all text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>{t("nav.logout")}</span>
          </button>

        </div>
{/* Trial Banner */}
        {showBanner && (
          <div
            className="mx-2 mb-4 rounded-xl px-4 py-3 text-center font-headline text-sm shadow-sm"
            style={{
              background: "var(--primary-container)",
              color: "var(--on-primary-container)",
            }}
          >
            {state?.status === "activated"
  ? t("license.activated")
  : t("license.trial_days_left", { days: trialInfo?.daysLeft ?? 0 })}

          </div>
        )}

      </aside>
    </>
  );
}
