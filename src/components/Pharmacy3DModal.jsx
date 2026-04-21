// src/components/Pharmacy3DModal.jsx
import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { loadPharmacyLayout } from "../db/layoutStorage";
import SingleWallViewer from "./SingleWallViewer";

export default function Pharmacy3DModal({ open, onClose, highlight }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";

  const [layout, setLayout] = useState(null);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef(null);

  // Load layout when modal opens
  useEffect(() => {
    if (!open) return;
    loadPharmacyLayout().then((l) => setLayout(l));
  }, [open]);

  if (!open) return null;

  // CTRL + wheel zoom
  const handleWheel = (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom((z) => {
      const next = z - e.deltaY * 0.0015;
      return Math.min(2.5, Math.max(0.5, next));
    });
  };

  const headerTitle = highlight?.medicineName
    ? `${t("pharmacy.modal.locationOf", "Location of")} ${highlight.medicineName}`
    : t("pharmacy.modal.medicineLocation", "Medicine Location");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        direction: isRTL ? "rtl" : "ltr",
      }}
    >
      {/* Modal Box */}
      <div
        style={{
          width: "85vw",
          height: "85vh",
          background: "var(--surface)",
          color: "var(--on-surface)",
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--outline-variant)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--surface-container)",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600 }}>{headerTitle}</div>

          <button
            onClick={onClose}
            aria-label={t("pharmacy.modal.close", "Close")}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid var(--outline-variant)",
              background: "var(--surface)",
              color: "var(--on-surface)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {t("pharmacy.modal.close", "Close")}
          </button>
        </div>

        {/* Zoom Controls */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "8px 16px",
            borderBottom: "1px solid var(--outline-variant)",
            background: "var(--surface-container-low)",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            style={zoomBtn()}
          >
            −
          </button>

          <div style={{ fontSize: 13 }}>{Math.round(zoom * 100)}%</div>

          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
            style={zoomBtn()}
          >
            +
          </button>

          <button onClick={() => setZoom(1)} style={zoomBtn()}>
            {t("pharmacy.modal.reset", "Reset")}
          </button>
        </div>

        {/* Viewer */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          style={{
            flex: 1,
            overflow: "auto",
            position: "relative",
            background: "var(--surface-container-high)",
          }}
        >
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              width: "100%",
              height: "100%",
            }}
          >
            {layout ? (
              <SingleWallViewer
                layout={layout}
                highlight={highlight}
                wall={highlight?.wall}
              />
            ) : (
              <div
                style={{
                  padding: 32,
                  textAlign: "center",
                  color: "var(--on-surface)",
                }}
              >
                {t("pharmacy.modal.loading", "Loading…")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function zoomBtn() {
  return {
    padding: "4px 10px",
    borderRadius: 6,
    border: "1px solid var(--outline-variant)",
    background: "var(--surface)",
    color: "var(--on-surface)",
    cursor: "pointer",
    fontSize: 13,
  };
}
