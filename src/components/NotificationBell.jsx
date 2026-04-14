import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

export default function NotificationBell() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === "ar";

  const [open, setOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const bellRef = useRef(null);

  // ⭐ collapse state for each group
  const [collapsed, setCollapsed] = useState({
    stock: false,
    expiry: false,
    customers: false,
    system: false,
  });

  const notifications = useLiveQuery(
    () => db.notifications.orderBy("createdAt").reverse().toArray(),
    []
  );

  const unread = notifications?.filter((n) => !n.read).length || 0;

  // GROUPING
  const grouped = {
    stock: [],
    expiry: [],
    customers: [],
    system: []
  };

  const mapType = {
    expired: "expiry",
    nearExpiry: "expiry",
    outOfStock: "stock",
    lowStock: "stock",

    highDebt: "customers",
    overdueCustomer: "customers",

    updateAvailable: "system",
    updateDatabase: "system"
  };

  notifications?.forEach((n) => {
    const group = mapType[n.type] || "system";
    grouped[group].push(n);
  });

  // ⭐ AUTO-COLLAPSE GROUPS WITH ZERO UNREAD
  useEffect(() => {
    if (!notifications) return;

    const newState = { ...collapsed };

    Object.entries(grouped).forEach(([group, items]) => {
      const unreadCount = items.filter(n => !n.read).length;

      if (unreadCount === 0) {
        newState[group] = true; // collapse
      }
    });

    setCollapsed(newState);
  }, [notifications]);

  // SOUND + SHAKE ON NEW NOTIFICATIONS
  const prevCount = useRef(0);
  const firstLoad = useRef(true);

  useEffect(() => {
    if (!notifications) return;

    if (firstLoad.current) {
      firstLoad.current = false;
      prevCount.current = notifications.length;
      return;
    }

    if (notifications.length > prevCount.current) {
      const audio = new Audio("/notify.mp3");
      audio.play().catch(() => {});

      setShake(true);
      setTimeout(() => setShake(false), 500);
    }

    prevCount.current = notifications.length;
  }, [notifications]);

  // CLICK OUTSIDE
  useEffect(() => {
    function handleClickOutside(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // ESC KEY
  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open]);

  async function openNotification(n) {
    await db.notifications.update(n.id, { read: true });
    navigate(n.link);
  }

  return (
    <div ref={bellRef} className="relative">
      {/* BELL BUTTON */}
      <button
        className={`p-2 text-slate-500 hover:bg-sky-50 rounded-full transition relative ${
          shake ? "animate-shake" : ""
        }`}
        onClick={() => setOpen(!open)}
      >
        <span className="material-symbols-outlined text-2xl">notifications</span>

        {unread > 0 && (
          <span
            className="
              absolute -top-1 -right-1 bg-red-600 text-white
              text-xs px-1.5 py-0.5 rounded-full
            "
          >
            {unread}
          </span>
        )}
      </button>

      {/* DROPDOWN */}
      {open && (
        <div
          className={`
            absolute top-[48px]
            ${isRTL ? "left-0" : "right-0"}
            w-80 bg-white rounded-xl shadow-lg border
            flex flex-col py-2 z-[9999]
            animate-dropdown
          `}
        >
          {/* EMPTY */}
          {notifications?.length === 0 && (
            <div className="text-center text-on-surface-variant py-4">
              {t("notifications.noNotifications")}
            </div>
          )}

          {/* GROUPS */}
          {Object.entries(grouped).map(([group, items]) =>
            items.length > 0 ? (
              <div key={group} className="border-b last:border-none">

                {/* ⭐ GROUP HEADER WITH COLLAPSE TOGGLE */}
                <div
                  className="px-4 py-2 text-xs font-bold text-primary cursor-pointer flex justify-between items-center"
                  onClick={() =>
                    setCollapsed(prev => ({ ...prev, [group]: !prev[group] }))
                  }
                >
                  {t(`notifications.groups.${group}`)}

                  <span className="material-symbols-outlined text-sm">
                    {collapsed[group] ? "expand_more" : "expand_less"}
                  </span>
                </div>

                {/* ⭐ COLLAPSIBLE ITEMS */}
                {!collapsed[group] &&
                  items.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => openNotification(n)}
                      className={`
                        px-4 py-3 cursor-pointer border-b last:border-none
                        ${n.read ? "bg-surface-container-low" : "bg-red-50"}
                        hover:bg-surface-container-high transition
                      `}
                    >
                      <div className="font-bold text-sm">{n.message}</div>
                      <div className="text-xs text-on-surface-variant">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
