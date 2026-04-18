// src/components/pos/LocationInfo.jsx
import { useTranslation } from "react-i18next";

export function LocationInfo({ locationText, onShowInMap }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  // ⭐ Icon-based location renderer
  function renderLocation(location, isRTL) {
    if (!location) return "-";

    const parts = location.split(",").map((p) => p.trim());
    const cabinet = parts[0]?.replace("Cabinet", "").trim();
    const shelf = parts[1]?.replace("Shelf", "").trim();
    const row = parts[2]?.replace("Row", "").trim();

    const items = [
      {
        icon: "inventory_2",
        color: "text-blue-600",
        label: isRTL ? `الخزانة ${cabinet}` : `Cabinet ${cabinet}`,
      },
      {
        icon: "shelves",
        color: "text-green-600",
        label: isRTL ? `القسم ${shelf}` : `Shelf ${shelf}`,
      },
      {
        icon: "view_list",
        color: "text-purple-600",
        label: isRTL ? `الصف ${row}` : `Row ${row}`,
      },
    ];

    return (
      <div className="flex flex-col gap-1">
        {items.map((it, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs font-bold">
            <span className={`material-symbols-outlined ${it.color}`}>
              {it.icon}
            </span>
            <span>{it.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2.5 px-3 bg-primary/5 rounded-lg border border-primary/10">
      {/* ⭐ Location info */}
      <div className="flex flex-col">{renderLocation(locationText, isRTL)}</div>

      {/* ⭐ Inline Show on Map button */}
      {onShowInMap && (
        <button
          onClick={onShowInMap}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors border border-primary/10"
        >
          <span className="material-symbols-outlined text-[16px]">map</span>
          <span className="text-[11px] font-bold uppercase tracking-wider">
            {t("pos.showOnMap")}
          </span>
        </button>
      )}
    </div>
  );
}
