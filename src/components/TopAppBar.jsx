import { useTranslation } from "react-i18next";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { formatPrice } from "../currency";
import { useAppSettings } from "../useAppSettings";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { closePharmacyCashbox } from "../services/pharmacyBoxService";
import NotificationBell from "./NotificationBell";

export default function TopAppBar({
  title,
  showSearch = false,
  searchValue = "",
  onSearchChange = () => {}
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
const { logout } = useAuth();
const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [currencySymbol, setCurrencySymbol] = useState("SYP");
  const [useNewCurrency, setUseNewCurrency] = useState(false);
  useAppSettings(setCurrencySymbol, setUseNewCurrency);

  const box = useLiveQuery(() => db.pharmacyBox.get(1), []);
  const { formatted, symbol } = formatPrice(
    box?.amount || 0,
    useNewCurrency,
    currencySymbol
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
const user = useLiveQuery(() => db.users.get(1), []);

  // CLICK OUTSIDE TO CLOSE
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // ESC KEY TO CLOSE
  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [menuOpen]);

  return (
    <header
  className="
    fixed top-0 w-full h-16 px-6 flex items-center
    bg-white/80 dark:bg-slate-900/80 backdrop-blur-md
    border-b border-slate-200/50 shadow-sm shadow-sky-900/5
    z-50
    md:ps-0
  "
>


      <div
        className="
          w-full flex items-center justify-between
          ltr:flex-row rtl:flex-row-reverse
          gap-6
        "
      >

        {/* ICONS */}
        <div className="flex items-center gap-3 relative">
{/* NOTIFICATION BELL */}
          <NotificationBell />


          <button
            className="p-2 text-slate-500 hover:bg-sky-50 rounded-full transition"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="material-symbols-outlined">account_circle</span>
          </button>

 {/* DROPDOWN */}
{menuOpen && (
  <div
    ref={menuRef}
    className="
      absolute top-[48px]
      ltr:right-0 rtl:left-0
      w-56 bg-white rounded-xl shadow-lg border
      flex flex-col py-2 z-[9999]
      animate-dropdown
    "
  >

    {/* PROFILE */}
    <button
      className="px-4 py-3 text-sm text-on-surface hover:bg-surface-container-low flex items-center gap-3"
      onClick={() => {
        setMenuOpen(false);
        navigate('/profile');
      }}
    >
      <img
  src={user?.avatar || "/default-avatar.png"}
  alt="avatar"
  className="w-6 h-6 rounded-full object-cover"
/>

      {t("profile.title")}
    </button>

    {/* LOGOUT */}
    <button
      className="px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
      onClick={() => {
        setMenuOpen(false);
        setShowLogoutModal(true);
      }}
    >
      <span className="material-symbols-outlined text-red-600">logout</span>
      {t("logout")}
    </button>

  </div>
)}



        </div>

        {/* SEARCH BAR */}
        {showSearch && (
          <div className="relative hidden md:flex items-center w-[420px]">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="
                bg-surface-container-highest border-none rounded-full
                px-4 py-2 text-sm w-full
                focus:ring-2 focus:ring-primary/20 transition-all
              "
              placeholder={t('suppliers.searchPlaceholder')}
            />
            <span className="material-symbols-outlined absolute end-3 text-slate-400">
              search
            </span>
          </div>
        )}

        {/* CASHBOX */}
        <div
          onClick={() => navigate('/cashbox-history')}
          className="
            px-4 py-2 rounded-2xl shadow-sm cursor-pointer
            bg-surface-container-high dark:bg-slate-800
            text-primary font-bold text-lg
            flex items-center gap-2 hover:bg-surface-container-highest transition
          "
        >
          <span className="material-symbols-outlined text-primary">savings</span>
          {t('pos.cashBox')}: {formatted} {symbol}
        </div>

      </div>
      {showLogoutModal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
    <div className="bg-surface-container-high p-6 rounded-2xl shadow-xl w-96 space-y-4">
      <h2 className="text-xl font-bold text-primary">
        {t("logout")}
      </h2>

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
  className="px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
  onClick={() => {
    setMenuOpen(false);
    setShowLogoutModal(false);
    logout(); // <-- ONLY THIS
  }}
>
  <span className="material-symbols-outlined text-red-600">logout</span>
  {t("logout")}
</button>

      </div>
    </div>
  </div>
)}

    </header>
  );
}
