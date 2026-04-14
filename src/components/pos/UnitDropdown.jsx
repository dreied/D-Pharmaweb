// src/components/pos/UnitDropdown.jsx
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import medicineBox from "../../assets/icons/medicine_box.png";
import blisterCapsules from "../../assets/icons/blister_capsules.png";

export function UnitDropdown({ value, onChange, t }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const items = [
    {
      id: "envelope",
      label: t("pos.envelope"),
      icon: <img src={blisterCapsules} className="w-6 h-6" alt="" />
    },
    {
      id: "box",
      label: t("pos.box"),
      icon: <img src={medicineBox} className="w-6 h-6" alt="" />
    }
  ];

  const selected = items.find((i) => i.id === value);

  // Open menu + calculate position
  const openMenu = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
    setOpen(true);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!btnRef.current || !menuRef.current) return;

      const clickedButton = btnRef.current.contains(e.target);
      const clickedMenu = menuRef.current.contains(e.target);

      if (!clickedButton && !clickedMenu) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      {/* BUTTON */}
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation();
          openMenu();
        }}
        className="px-3 py-1 w-36 rounded-md border border-outline bg-surface-container-lowest text-sm flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          {selected.icon}
          {selected.label}
        </div>
        <span className="material-symbols-outlined text-sm">expand_more</span>
      </button>

      {/* MENU (PORTAL) */}
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[99999] bg-white shadow-lg rounded-md border border-outline p-1"
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width
            }}
            onMouseDown={(e) => e.stopPropagation()} // ⭐ prevents closing before click
          >
            {items.map((item) => (
              <button
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(item.id);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-surface-container-low text-left"
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
