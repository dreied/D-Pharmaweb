// src/components/layout/PharmacyLayoutModal.jsx
import { useEffect, useState, useContext, useRef } from "react";
import { useTranslation } from "react-i18next";
import { loadPharmacyLayout } from "../../db/layoutStorage";
import { db } from "../../db/index";
import { ThemeContext } from "../../App";
import PharmacyLayoutSVG from "./PharmacyLayoutSVG";

export default function PharmacyLayoutModal({ open, onClose, highlight }) {
  const { t, i18n } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const isRTL = i18n.dir() === "rtl";

  const [layout, setLayout] = useState(null);
  const [products, setProducts] = useState([]);
  const [zoom, setZoom] = useState(1);

  const containerRef = useRef(null);

  // -----------------------------
  // LOAD LAYOUT + PRODUCTS
  // -----------------------------
  useEffect(() => {
    if (!open) return;

    (async () => {
      const [l, prods] = await Promise.all([
        loadPharmacyLayout(),
        db.stockProducts
          .filter((p) => !!p.cabinet && !!p.shelf && !!p.shelfRow)
          .toArray(),
      ]);

      setLayout(l);
      setProducts(prods);

      // Auto-fit zoom AFTER layout loads
      setTimeout(() => {
        if (!containerRef.current || !l) return;

        const container = containerRef.current;
        const layoutWidth = l.roomWidth || 2000;
        const layoutHeight = l.roomHeight || 1400;

        const zoomX = container.clientWidth / layoutWidth;
        const zoomY = container.clientHeight / layoutHeight;

        const fitZoom = Math.min(zoomX, zoomY) * 0.95; // padding

        setZoom(Math.max(0.3, Math.min(fitZoom, 1)));
      }, 60);
    })();
  }, [open]);

  if (!open) return null;

  if (!layout) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}
      >
        <div
          className="rounded-2xl p-6 shadow-2xl max-w-4xl w-full h-[80vh] flex items-center justify-center"
          style={{ background: "var(--surface)", color: "var(--on-surface)" }}
        >
          {t("loading")}
        </div>
      </div>
    );
  }

  // -----------------------------
  // RESOLVE HIGHLIGHT
  // -----------------------------
  function resolveHighlight(highlight, layout) {
    if (!highlight || !layout || !layout.cabinets) return null;

    const { cabinet, shelf, row, medicineName } = highlight;
    const cab = layout.cabinets.find((c) => c.label === cabinet);
    if (!cab) return null;

    const shelfIndex = Number(shelf);
    const shelfCount = cab.shelves.length;

    // Normal shelf
    if (shelfIndex >= 1 && shelfIndex <= shelfCount) {
      const shelfObj = cab.shelves[shelfIndex - 1];
      return {
        cabinetId: cab.id,
        shelfId: shelfObj.id,
        row,
        medicineName,
      };
    }

    // Door section (virtual shelf)
    if (cab.hasDoors && shelfIndex === shelfCount + 1) {
      return {
        cabinetId: cab.id,
        shelfId: "DOOR",
        row,
        medicineName,
        isDoor: true,
      };
    }

    return null;
  }

  const resolved = resolveHighlight(highlight, layout);

  // Build location text (A‑2‑2)
  const locationText =
    highlight && highlight.cabinet && highlight.shelf && highlight.row
      ? `${highlight.cabinet}-${highlight.shelf}-${highlight.row}`
      : null;

  // Zoom controls
  const zoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.3));
  const resetZoom = () => setZoom(1);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}
    >
      <div
        className="rounded-2xl p-4 shadow-2xl w-full max-h-[95vh] flex flex-col"
        style={{
          background: "var(--surface)",
          color: "var(--on-surface)",
          maxWidth: "95vw",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between mb-3 pb-2"
          style={{ borderBottom: "1px solid var(--outline-variant)" }}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 22 }}>🏥</span>
            <h2 className="text-lg font-bold">{t("layout.title")}</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              className="px-2 py-1 rounded-lg text-sm font-bold"
              style={{
                background: "var(--surface-container-high)",
                color: "var(--on-surface)",
              }}
            >
              −
            </button>

            <span className="text-xs font-semibold min-w-[40px] text-center">
              {Math.round(zoom * 100)}%
            </span>

            <button
              onClick={zoomIn}
              className="px-2 py-1 rounded-lg text-sm font-bold"
              style={{
                background: "var(--surface-container-high)",
                color: "var(--on-surface)",
              }}
            >
              +
            </button>

            <button
              onClick={resetZoom}
              className="px-2 py-1 rounded-lg text-xs font-semibold"
              style={{
                background: "var(--surface-container-high)",
                color: "var(--on-surface)",
              }}
            >
              {t("layout.resetZoom")}
            </button>

            <button
              onClick={onClose}
              className="px-3 py-1 rounded-lg text-sm font-semibold"
              style={{
                background: "var(--primary-container)",
                color: "var(--on-primary-container)",
              }}
            >
              {t("layout.cancel")}
            </button>
          </div>
        </div>

        {/* Highlight info bar */}
        {resolved && (
          <div
            className="mb-2 px-3 py-1.5 rounded-lg flex items-center gap-3 text-sm"
            style={{
              background: "rgba(229,57,53,0.1)",
              border: "1px solid rgba(229,57,53,0.3)",
              color: "var(--on-surface)",
            }}
          >
            <span>📍</span>

            <span className="font-bold">
              {highlight?.medicineName || ""}
            </span>

            {locationText && (
              <span className="font-mono text-xs bg-primary-container px-2 py-0.5 rounded text-primary font-bold">
                {locationText}
              </span>
            )}
          </div>
        )}

        {/* SVG Map container */}
        <div
          ref={containerRef}
          className="flex-1 rounded-xl border overflow-auto"
          style={{
            borderColor: "var(--outline-variant)",
            background: "var(--surface-container-low)",
            direction: "ltr",
          }}
        >
          <div
            style={{
              minWidth: Math.max(900, 900 * zoom),
              minHeight: Math.max(600, 600 * zoom),
              width: `${zoom * 100}%`,
              height: `${zoom * 100}%`,
              padding: 16,
              transformOrigin: "top left",
            }}
          >
            <PharmacyLayoutSVG
              layout={layout}
              highlight={resolved}
              products={products}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
