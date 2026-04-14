import { useTranslation } from "react-i18next";
import { useEffect, useRef, useContext } from "react";
import { ThemeContext } from "../../App";

export default function SearchBar({
  query,
  setQuery,
  handleSearchLive,

  activeFilter,
  applyFilter,
  showFilterDropdown,
  exportPDF,
  setShowFilterDropdown,

  addButton,
  scanButton,
  returnButton,
  scanReturnButton
}) {

  const { t } = useTranslation();
  const dropdownRef = useRef(null);
  const { theme } = useContext(ThemeContext);

  // CLICK OUTSIDE TO CLOSE
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowFilterDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="py-1 px-4 bg-surface-container-low/80 
      flex flex-col md:flex-row md:items-center justify-between gap-4">

      <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4">

        {/* LEFT: SEARCH INPUT */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 
            material-symbols-outlined text-outline">
            search
          </span>

          <input
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest 
              border-none rounded-lg focus:ring-2 focus:ring-primary/20 
              transition-all font-body text-sm"
            placeholder={t("stock.searchPlaceholder")}
            value={query}
            onChange={(e) => {
              const value = e.target.value;
              setQuery(value);
              handleSearchLive(value);
            }}
          />
        </div>

        {/* MIDDLE: ACTION BUTTONS */}
        <div className="flex gap-2">
          {addButton}
          {scanButton}
          {returnButton}
          {scanReturnButton}
        </div>

        {/* RIGHT: FILTER + EXPORT */}
        <div className="flex items-center gap-2">

          {/* FILTER BUTTON */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="px-4 py-2.5 rounded-lg bg-surface-container-lowest 
                text-on-surface-variant font-semibold text-sm flex items-center gap-2 
                hover:bg-surface-container-high transition shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">
                filter_list
              </span>
              {t("stock.filter")}
            </button>

            {showFilterDropdown && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl border animate-fadeSlide z-[9999]"
                style={{
                  background: "var(--surface-container-high)",
                  borderColor: "var(--outline-variant)"
                }}
              >
                {[
                  ["all", t("stock.filters.all")],
                  ["inStock", t("stock.filters.inStock")],
                  ["lowStock", t("stock.filters.lowStock")],
                  ["outOfStock", t("stock.filters.outOfStock")],
                  ["expired", t("stock.stats.expiredItems")],
                  ["almostExpired", t("stock.stats.almostExpiredItems")],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      applyFilter(key);
                      setShowFilterDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 rounded-lg transition-colors"
                    style={{
                      background:
                        activeFilter === key
                          ? "var(--primary-container)"
                          : "var(--surface-container)",
                      color:
                        activeFilter === key
                          ? "var(--primary)"
                          : "var(--on-surface)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* EXPORT BUTTON */}
          <button
            onClick={exportPDF}
            className="px-4 py-2.5 rounded-lg bg-surface-container-lowest 
              text-on-surface-variant font-semibold text-sm flex items-center gap-2 
              hover:bg-surface-container-high transition shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">
              download
            </span>
            {t("stock.export")}
          </button>

        </div>
      </div>
    </div>
  );
}
