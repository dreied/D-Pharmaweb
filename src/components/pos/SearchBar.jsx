import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";

export function SearchBar({ onSearch, onBarcodeScan, onSelect, searchResults }) {
  const { t, i18n } = useTranslation();

  const [value, setValue] = useState("");

  // Dropdown positioning
  const searchRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  // Update dropdown position
  useEffect(() => {
    if (searchRef.current) {
      const rect = searchRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 999999
      });
    }
  }, [value, searchResults]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setValue("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Live search
  const handleChange = (e) => {
    const v = e.target.value;
    setValue(v);
    onSearch(v);
  };

  // Enter key → barcode or search
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && value.trim()) {
      const v = value.trim();

      if (/^\d+$/.test(v)) {
        onBarcodeScan(v);
      } else {
        onSearch(v);
      }

      setValue("");
    }
  };

  // Remove duplicates by ID
  const uniqueResults = Array.from(
    new Map(searchResults.map((item) => [item.id, item])).values()
  );

  return (
    <div className="relative">

      {/* Search Input */}
      <div ref={searchRef} className="flex-1 max-w-2xl relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline">
          <span className="material-symbols-outlined">search</span>
        </div>

        <input
          className="w-full pl-12 pr-12 py-4 bg-surface-container-lowest/80 border-none rounded-xl
                     focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant
                     font-medium shadow-sm transition-all"
          placeholder={t("pos.searchPlaceholder")}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />

        {/* Scan button → browser prompt */}
        <button
          type="button"
          onClick={() => {
            const barcode = prompt(
              i18n.language === "ar" ? "أدخل الباركود:" : "Enter barcode:"
            );
            if (barcode) onBarcodeScan(barcode.trim());
          }}
          className="absolute inset-y-0 right-0 pr-4 flex items-center text-primary hover:text-primary-dim transition-colors"
        >
          <span className="material-symbols-outlined">barcode_scanner</span>
        </button>
      </div>

      {/* DROPDOWN (Portal) */}
      {uniqueResults.length > 0 && value.length > 0 &&
        createPortal(
          <div
            style={dropdownStyle}
            className="
              bg-surface-container-low
              shadow-2xl rounded-xl border border-outline-variant
              max-h-80 overflow-y-auto text-on-surface
            "
          >
            {uniqueResults.map((p) => (
              <button
  key={p.id}
  onMouseDown={(e) => {
    e.preventDefault();   // prevents input blur
    onSelect(p);          // fires BEFORE dropdown closes
    setValue("");
  }}
  className="w-full text-left px-4 py-3 hover:bg-surface-container transition flex justify-between"
>

                <span className="font-medium">
                  {i18n.language === "ar" ? p.nameAr : p.nameEn}
                </span>

                <span className="text-sm text-outline-variant">{p.form}</span>
              </button>
            ))}
          </div>,
          document.body
        )
      }
    </div>
  );
}
