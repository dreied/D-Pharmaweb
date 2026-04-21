// src/components/PharmacyView3DPage.jsx
import { useTranslation } from "react-i18next";
import { useEffect, useState, useRef } from "react";
import { loadPharmacyLayout, savePharmacyLayout } from "../db/layoutStorage";
import { DEFAULT_LAYOUT } from "../types/pharmacyLayout";
import { useNavigate } from "react-router-dom";
import PharmacyEditor3D from "./PharmacyEditor3D";
import PharmacyCubemapViewer3D from "./PharmacyCubemapViewer3D";

export default function PharmacyView3DPage() {
  const [layout, setLayout] = useState(null);
  const [mode, setMode] = useState("edit");
  const [highlight, setHighlight] = useState(null);
  const [savingState, setSavingState] = useState("idle");

  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const navigate = useNavigate();

  const layoutRef = useRef(null);

  useEffect(() => {
    loadPharmacyLayout()
      .then((l) => {
        const final = l || DEFAULT_LAYOUT;
        setLayout(final);
        layoutRef.current = final;
      })
      .catch(() => {
        setLayout(DEFAULT_LAYOUT);
        layoutRef.current = DEFAULT_LAYOUT;
      });
  }, []);

  const handleChange = (next) => {
    const stamped = {
      ...next,
      id: "default",
      updatedAt: new Date().toISOString(),
    };
    setLayout(stamped);
    layoutRef.current = stamped;
    savePharmacyLayout(stamped);
  };

  const handleSave = async () => {
    const current = layoutRef.current;
    if (!current) return;
    setSavingState("saving");
    try {
      await savePharmacyLayout(current);
      setSavingState("saved");
      setTimeout(() => setSavingState("idle"), 1500);
    } catch (err) {
      console.error(err);
      setSavingState("idle");
    }
  };

  const handleBack = async () => {
    try {
      if (layoutRef.current) await savePharmacyLayout(layoutRef.current);
    } catch (err) {
      console.error("Save on back failed:", err);
    }
    navigate(-1);
  };

  if (!layout) {
    return (
      <div style={{ padding: 32, color: "var(--on-surface-variant)" }}>
        {t("pharmacy3dPage.loading")}
      </div>
    );
  }

  const saveLabel =
    savingState === "saving"
      ? t("pharmacy3dPage.saving")
      : savingState === "saved"
      ? t("pharmacy3dPage.saved")
      : t("pharmacy3dPage.save");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--surface-container)",
        direction: isRTL ? "rtl" : "ltr",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--outline-variant)",
          color: "var(--on-surface)",
          padding: "10px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* BACK + TITLE */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={handleBack}
            aria-label={t("pharmacy3dPage.back")}
            title={t("pharmacy3dPage.back")}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 22,
              padding: 6,
            }}
          >
            {isRTL ? "→" : "←"}
          </button>

          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            {t("pharmacy3dPage.title")}
          </h1>
        </div>

        {/* SAVE + TABS */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            onClick={handleSave}
            disabled={savingState === "saving"}
            title={saveLabel}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid var(--primary)",
              background:
                savingState === "saved" ? "#10b981" : "var(--primary)",
              color: "#fff",
            }}
          >
            {saveLabel}
          </button>

          {/*<button
            onClick={() => setMode("view")}
            style={tabStyle(mode === "view")}
          >
            {t("pharmacy3dPage.view3d")}
          </button>*/}

          <button
            onClick={() => setMode("edit")}
            style={tabStyle(mode === "edit")}
          >
            {t("pharmacy3dPage.editor")}
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main style={{ padding: 16 }}>
        {mode === "edit" ? (
          <PharmacyEditor3D layout={layout} onChange={handleChange} />
        ) : (
          <div
            style={{
              display: "flex",
              width: "100%",
              justifyContent: "center",
            }}
          >
            <PharmacyCubemapViewer3D
              layout={layout}
              highlight={highlight}
              onSave={handleSave}
              savingState={savingState}
              /* ❌ Removed onCabinetClick — no clicking to highlight */
              style={{
                width: "100%",
                height: "calc(100vh - 140px)",
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid var(--outline-variant)",
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function tabStyle(active) {
  return {
    padding: "6px 14px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    border:
      "1px solid " + (active ? "var(--primary)" : "var(--outline-variant)"),
    background: active ? "var(--primary)" : "var(--surface)",
    color: active ? "var(--on-primary)" : "var(--on-surface)",
  };
}
