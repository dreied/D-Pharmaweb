// src/components/layout/PharmacyLayoutEditor.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { loadPharmacyLayout, savePharmacyLayout } from "../../db/layoutStorage";
import PharmacyLayoutEditorSVG from "./PharmacyLayoutEditorSVG";
const MAX_HISTORY = 50;
const FACING_OPTIONS = ["front", "back", "left", "right"];
export default function PharmacyLayoutEditor({ open, onClose }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const [layout, setLayout] = useState(null);
  const [selectedCabinetId, setSelectedCabinetId] = useState(null);
  const [selectedShelfId, setSelectedShelfId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const preDragSnapshot = useRef(null);
  const deepClone = (obj) => JSON.parse(JSON.stringify(obj));
  const resetState = useCallback((l) => {
    setLayout(deepClone(l));
    setSelectedCabinetId(null);
    setSelectedShelfId(null);
    setHistory([]);
    setRedoStack([]);
    setZoom(1);
  }, []);
  useEffect(() => {
    if (!open) return;
    (async () => {
      const l = await loadPharmacyLayout();
      resetState(l);
    })();
  }, [open, resetState]);
  const pushHistory = useCallback((prevLayout) => {
    setHistory((h) => {
      const next = [...h, deepClone(prevLayout)];
      return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
    });
    setRedoStack([]);
  }, []);
  const updateLayout = useCallback(
    (updater) => {
      setLayout((prev) => {
        if (!prev) return prev;
        const prevSnapshot = deepClone(prev);
        const next = typeof updater === "function" ? updater(deepClone(prev)) : updater;
        pushHistory(prevSnapshot);
        return next;
      });
    },
    [pushHistory]
  );
  const handleDragUpdate = useCallback((updater) => {
    setLayout((prev) => {
      if (!prev) return prev;
      if (!preDragSnapshot.current) preDragSnapshot.current = deepClone(prev);
      return typeof updater === "function" ? updater(deepClone(prev)) : updater;
    });
  }, []);
  const handleDragCommit = useCallback(() => {
    if (preDragSnapshot.current) {
      pushHistory(preDragSnapshot.current);
      preDragSnapshot.current = null;
    }
  }, [pushHistory]);
  const handleSave = async () => {
    if (!layout) return;
    await savePharmacyLayout(layout);
    onClose();
  };
  const handleUndo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const prevLayout = h[h.length - 1];
      setRedoStack((r) => [deepClone(layout), ...r]);
      setLayout(deepClone(prevLayout));
      return h.slice(0, -1);
    });
  }, [layout]);
  const handleRedo = useCallback(() => {
    setRedoStack((r) => {
      if (!r.length) return r;
      const nextLayout = r[0];
      setHistory((h) => [...h, deepClone(layout)]);
      setLayout(deepClone(nextLayout));
      return r.slice(1);
    });
  }, [layout]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (!e.ctrlKey) return;
      if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        e.shiftKey ? handleRedo() : handleUndo();
      } else if (e.key === "y" || e.key === "Y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, handleUndo, handleRedo]);
  if (!open) return null;
  const selectedCabinet = layout?.cabinets.find((c) => c.id === selectedCabinetId) || null;
  const selectedShelf = selectedCabinet?.shelves.find((s) => s.id === selectedShelfId) || null;
  const addCabinet = () => {
    if (!layout) return;
    updateLayout((prev) => {
      const nextIndex = (prev.cabinets.length || 0) + 1;
      const id = `cab${Date.now()}`;
      const offsetX = 80 + ((nextIndex - 1) % 5) * 170;
      const offsetY = 60 + Math.floor((nextIndex - 1) / 5) * 350;
      return {
        ...prev,
        cabinets: [
          ...prev.cabinets,
          {
            id,
            x: offsetX, y: offsetY,
            width: 140, height: 300,
            label: `${t("layout.cabinet")} ${nextIndex}`,
            color: "#e0e0e0",
            type: "",
            rotation: 0,
            facing: "front",
            hasDoors: false,
            doorRows: 2,
             doorColor: "#f0f0f0",   // 👈 NEW
            shelves: [{ id: "s1", rows: 3, color: "" }],
          },
        ],
      };
    });
  };
  const removeCabinet = () => {
    if (!selectedCabinetId || !layout) return;
    updateLayout((prev) => ({
      ...prev,
      cabinets: prev.cabinets.filter((c) => c.id !== selectedCabinetId),
    }));
    setSelectedCabinetId(null);
    setSelectedShelfId(null);
  };
  const addShelf = () => {
    if (!selectedCabinet || !layout) return;
    updateLayout((prev) => {
      const updated = deepClone(prev);
      const cab = updated.cabinets.find((c) => c.id === selectedCabinet.id);
      if (!cab) return prev;
      const nextIndex = (cab.shelves.length || 0) + 1;
      cab.shelves.push({ id: `s${nextIndex}`, rows: 5, color: "" });
      return updated;
    });
  };
  const removeShelf = () => {
    if (!selectedCabinet || !selectedShelf || !layout) return;
    updateLayout((prev) => {
      const updated = deepClone(prev);
      const cab = updated.cabinets.find((c) => c.id === selectedCabinet.id);
      if (!cab) return prev;
      cab.shelves = cab.shelves.filter((s) => s.id !== selectedShelf.id);
      return updated;
    });
    setSelectedShelfId(null);
  };
  const changeRows = (delta) => {
    if (!selectedShelf || !selectedCabinet || !layout) return;
    updateLayout((prev) => {
      const updated = deepClone(prev);
      const cab = updated.cabinets.find((c) => c.id === selectedCabinet.id);
      if (!cab) return prev;
      const shelf = cab.shelves.find((s) => s.id === selectedShelf.id);
      if (!shelf) return prev;
      shelf.rows = Math.max(1, shelf.rows + delta);
      return updated;
    });
  };
  const updateCabinetField = (field, value) => {
    if (!selectedCabinet || !layout) return;
    updateLayout((prev) => {
      const updated = deepClone(prev);
      const cab = updated.cabinets.find((c) => c.id === selectedCabinet.id);
      if (!cab) return prev;
      cab[field] = value;
      return updated;
    });
  };
  const updateShelfColor = (color) => {
    if (!selectedShelf || !selectedCabinet || !layout) return;
    updateLayout((prev) => {
      const updated = deepClone(prev);
      const cab = updated.cabinets.find((c) => c.id === selectedCabinet.id);
      if (!cab) return prev;
      const shelf = cab.shelves.find((s) => s.id === selectedShelf.id);
      if (!shelf) return prev;
      shelf.color = color;
      return updated;
    });
  };
  const presetTypes = [
    "",
    t("layout.type.medicines"),
    t("layout.type.cosmetics"),
    t("layout.type.baby"),
    t("layout.type.supplements"),
    t("layout.type.skin"),
  ];
  const zoomIn = () => setZoom((z) => Math.min(z + 0.2, 3));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.3));
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}
    >
      <div
        className="rounded-2xl p-4 shadow-2xl w-full h-[92vh] flex flex-col"
        style={{
          background: "var(--surface)",
          color: "var(--on-surface)",
          maxWidth: "97vw",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between mb-3 pb-2"
          style={{ borderBottom: "1px solid var(--outline-variant)" }}
        >
          <h2 className="text-lg font-bold">{t("layout.edit")}</h2>
          <div className="flex items-center gap-2">
            {/* Zoom */}
            <button onClick={zoomOut} className="px-2 py-1 rounded-lg text-sm font-bold"
              style={{ background: "var(--surface-container-high)", color: "var(--on-surface)" }}>−</button>
            <span className="text-xs font-semibold min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={zoomIn} className="px-2 py-1 rounded-lg text-sm font-bold"
              style={{ background: "var(--surface-container-high)", color: "var(--on-surface)" }}>+</button>
            <button onClick={onClose} className="px-3 py-1 rounded-lg text-sm font-semibold"
              style={{ background: "var(--surface-container-high)", color: "var(--on-surface)" }}>
              {t("layout.cancel")}
            </button>
            <button onClick={handleSave} className="px-3 py-1 rounded-lg text-sm font-semibold"
              style={{ background: "var(--primary)", color: "var(--on-primary)" }}>
              {t("layout.save")}
            </button>
          </div>
        </div>
        {/* Body */}
        <div className="flex gap-3 flex-1 min-h-0">
          {/* SVG Canvas — scrollable */}
          <div
            className="flex-1 rounded-xl border overflow-auto"
            style={{
              borderColor: "var(--outline-variant)",
              background: "var(--surface-container-low)",
            }}
          >
            <div style={{
              width: `${zoom * 100}%`,
              height: `${zoom * 100}%`,
              minWidth: Math.max(800, 800 * zoom),
              minHeight: Math.max(600, 600 * zoom),
            }}>
              {layout ? (
                <PharmacyLayoutEditorSVG
                  layout={layout}
                  onLayoutDragUpdate={handleDragUpdate}
                  onLayoutChange={handleDragCommit}
                  selectedCabinetId={selectedCabinetId}
                  setSelectedCabinetId={setSelectedCabinetId}
                  selectedShelfId={selectedShelfId}
                  setSelectedShelfId={setSelectedShelfId}
                  zoom={zoom}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm opacity-70">
                  {t("loading")}
                </div>
              )}
            </div>
          </div>
          {/* Controls panel */}
          <div
            className="w-72 rounded-xl p-3 space-y-3 overflow-y-auto flex-shrink-0"
            style={{
              background: "var(--surface-container)",
              border: "1px solid var(--outline-variant)",
              direction: isRTL ? "rtl" : "ltr",
            }}
          >
            {/* Undo / Redo */}
            <div className="flex items-center gap-2 mb-2">
              <button onClick={handleUndo} disabled={!history.length}
                className="flex-1 px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-40"
                style={{ background: "var(--surface-container-high)", color: "var(--on-surface)" }}>
                {t("layout.undo")}
              </button>
              <button onClick={handleRedo} disabled={!redoStack.length}
                className="flex-1 px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-40"
                style={{ background: "var(--surface-container-high)", color: "var(--on-surface)" }}>
                {t("layout.redo")}
              </button>
            </div>
            <h3 className="text-sm font-bold mb-1">{t("layout.cabinet")}</h3>
            <button onClick={addCabinet}
              className="w-full px-3 py-1.5 rounded-lg text-sm font-semibold mb-1"
              style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}>
              + {t("layout.cabinet")}
            </button>
            <button onClick={removeCabinet} disabled={!selectedCabinetId}
              className="w-full px-3 py-1 rounded-lg text-sm font-semibold disabled:opacity-40 mb-2"
              style={{ background: "var(--error-container)", color: "var(--on-error-container)" }}>
              − {t("layout.cabinet")}
            </button>
            {selectedCabinet && (
              <>
                <p className="text-xs opacity-80">{t("layout.cabinet")}: {selectedCabinet.label}</p>
                {/* Label */}
                <input
                  type="text"
                  value={selectedCabinet.label}
                  onChange={(e) => updateCabinetField("label", e.target.value)}
                  className="w-full px-2 py-1 rounded-md text-sm mt-1"
                  style={{ border: "1px solid var(--outline-variant)", background: "var(--surface)", color: "var(--on-surface)" }}
                />
                {/* Color */}
                <div className="mt-2">
                  <label className="text-xs font-bold block mb-1">{t("layout.color")}</label>
                  <input type="color" value={selectedCabinet.color || "#e0e0e0"}
                    onChange={(e) => updateCabinetField("color", e.target.value)}
                    className="w-full h-8 rounded-md" style={{ border: "1px solid var(--outline-variant)" }} />
                </div>
                {/* Facing direction */}
                {/*<div className="mt-2">
                  <label className="text-xs font-bold block mb-1">{t("layout.facing")}</label>
                  <div className="grid grid-cols-2 gap-1">
                    {FACING_OPTIONS.map((f) => (
                      <button
                        key={f}
                        onClick={() => updateCabinetField("facing", f)}
                        className="px-2 py-1 rounded-md text-xs font-semibold transition-all"
                        style={{
                          background: (selectedCabinet.facing || "front") === f
                            ? "var(--primary)" : "var(--surface-container-high)",
                          color: (selectedCabinet.facing || "front") === f
                            ? "var(--on-primary)" : "var(--on-surface)",
                        }}
                      >
                        {t(`layout.facing.${f}`)}
                      </button>
                    ))}
                  </div>
                </div>*/}

                {/* Rotation */}
              { /* <div className="mt-2">
                  <label className="text-xs font-bold block mb-1">
                    {t("layout.rotation")} ({Math.round(selectedCabinet.rotation || 0)}°)
                  </label>
                  <input type="range" min="0" max="360" step="15"
                    value={selectedCabinet.rotation || 0}
                    onChange={(e) => updateCabinetField("rotation", Number(e.target.value))}
                    className="w-full" />
                </div>*/}
                {/* Type */}
               {/* <div className="mt-2">
                  <label className="text-xs font-bold block mb-1">{t("layout.type")}</label>
                  <select
                    value={selectedCabinet.type || ""}
                    onChange={(e) => updateCabinetField("type", e.target.value)}
                    className="w-full px-2 py-1 rounded-md text-xs"
                    style={{ border: "1px solid var(--outline-variant)", background: "var(--surface)", color: "var(--on-surface)" }}
                  >
                    {presetTypes.map((opt, idx) => (
                      <option key={idx} value={opt}>{opt || t("layout.type.none")}</option>
                    ))}
                  </select>
                </div> */}
                {/* Door section toggle */}
                <div className="mt-3 p-2 rounded-lg" style={{ background: "var(--surface-container-high)" }}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold">{t("layout.doors")}</label>
                    <input
                      type="checkbox"
                      checked={selectedCabinet.hasDoors || false}
                      onChange={(e) => updateCabinetField("hasDoors", e.target.checked)}
                      className="w-4 h-4"
                    />
                  </div>
                  {selectedCabinet.hasDoors && (
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs">{t("layout.doorRows")}: {selectedCabinet.doorRows || 2}</span>
                      <div className="flex gap-1">

                        <button onClick={() => updateCabinetField("doorRows", Math.max(1, (selectedCabinet.doorRows || 2) + 1))}
                          className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}>+</button>
                        <button onClick={() => updateCabinetField("doorRows", Math.max(1, (selectedCabinet.doorRows || 2) - 1))}
                          className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{ background: "var(--surface-container)", color: "var(--on-surface)" }}>−</button>
                      </div>
                    </div>
                  )}
                  {selectedCabinet.hasDoors && (
  <div className="mt-2">
    <label className="text-xs font-bold block mb-1">
      {t("layout.doorColor")}
    </label>
    <input
      type="color"
      value={selectedCabinet.doorColor || "#f0f0f0"}
      onChange={(e) => updateCabinetField("doorColor", e.target.value)}
      className="w-full h-7 rounded-md"
      style={{ border: "1px solid var(--outline-variant)" }}
    />
  </div>
)}

                </div>
                {/* Shelves section */}
                <h4 className="text-xs font-bold mt-4 mb-1">{t("layout.shelf")}</h4>
                <button onClick={addShelf}
                  className="w-full px-3 py-1 rounded-lg text-xs font-semibold mb-1"
                  style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}>
                  + {t("layout.shelf")}
                </button>
                <button onClick={removeShelf} disabled={!selectedShelf}
                  className="w-full px-3 py-1 rounded-lg text-xs font-semibold mb-2 disabled:opacity-40"
                  style={{ background: "var(--error-container)", color: "var(--on-error-container)" }}>
                  − {t("layout.shelf")}
                </button>
                {selectedShelf && (
                  <>
                    <p className="text-xs opacity-80 mb-1">{t("layout.shelf")}: {selectedShelf.id}</p>
                    {/* Shelf color */}
                    <div className="mb-2">
                      <label className="text-xs font-bold block mb-1">{t("layout.shelfColor")}</label>
                      <input type="color" value={selectedShelf.color || "#e3f2fd"}
                        onChange={(e) => updateShelfColor(e.target.value)}
                        className="w-full h-7 rounded-md"
                        style={{ border: "1px solid var(--outline-variant)" }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">{t("layout.row")}: {selectedShelf.rows}</span>
                      <div className="flex gap-1">
                        <button onClick={() => changeRows(1)}
                          className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}>+</button>
                        <button onClick={() => changeRows(-1)}
                          className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{ background: "var(--surface-container-high)", color: "var(--on-surface)" }}>−</button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}