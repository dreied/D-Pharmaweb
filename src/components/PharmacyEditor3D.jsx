import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  CABINET_PALETTE,
  WALL_LABELS,
  fileToDataUrl,
  setWallPhoto,
  savePharmacyLayout,
  DEFAULT_LAYOUT,
} from "../types/pharmacyLayout";

// Generate unique IDs
const uid = () => Math.random().toString(36).slice(2, 10);

// Next cabinet label: A, B, C...
const nextLabel = (existing) => {
  const used = new Set(existing);
  for (let i = 0; i < 26; i++) {
    const c = String.fromCharCode(65 + i);
    if (!used.has(c)) return c;
  }
  return `C${existing.length + 1}`;
};

// Safe translation wrapper
const tr = (t) => (key, fallback) => (t ? t(key, fallback) : fallback);

export default function PharmacyEditor3D({ layout = DEFAULT_LAYOUT, onChange }) {
  const { t, i18n } = useTranslation();
  const T = tr(t);
  const isRTL = i18n.dir() === "rtl";

  // ---------------------------------------------
  // STATE
  // ---------------------------------------------
  const [activeWall, setActiveWall] = useState("front");
  const [tool, setTool] = useState("select");
  const [selectedCabinetId, setSelectedCabinetId] = useState(null);
  const [draftRect, setDraftRect] = useState(null);
  const dragStart = useRef(null);
  const [zoom, setZoom] = useState(1);
  const stageRef = useRef(null);

  const shelfDragRef = useRef({
    active: false,
    cabId: null,
    shelfIndex: null,
    startY: 0,
    startShelves: null,
  });

  const cabDragRef = useRef({
    active: false,
    cabId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  });

  const wall = layout?.walls?.find((w) => w.id === activeWall) || null;
  const wallCabinets = layout?.cabinets?.filter((c) => c.wall === activeWall) || [];
  const selected = layout?.cabinets?.find((c) => c.id === selectedCabinetId) || null;

  // ---------------------------------------------
  // COMMIT
  // ---------------------------------------------
  const commit = (newLayout) => {
    const stamped = {
      ...newLayout,
      id: "default",
      updatedAt: new Date().toISOString(),
    };
    onChange(stamped);
    savePharmacyLayout(stamped);
  };

  // ---------------------------------------------
  // COORDINATE MAPPING
  // ---------------------------------------------
  const getCoords = (e) => {
    const r = stageRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  };

  // ---------------------------------------------
  // PHOTO UPLOAD
  // ---------------------------------------------
  const handlePhotoUpload = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const dataUrl = await fileToDataUrl(file);
    const newLayout = setWallPhoto(layout, activeWall, dataUrl);
    commit(newLayout);
  };

  const removePhoto = () => {
    const newLayout = setWallPhoto(layout, activeWall, null);
    commit(newLayout);
  };

  // ---------------------------------------------
  // MUTATION HELPERS
  // ---------------------------------------------
  const updateCabinet = (id, patchOrFn) => {
    const newLayout = {
      ...layout,
      cabinets: layout.cabinets.map((c) =>
        c.id === id
          ? {
              ...c,
              ...(typeof patchOrFn === "function" ? patchOrFn(c) : patchOrFn),
            }
          : c
      ),
    };
    commit(newLayout);
  };

  const deleteCabinet = (id) => {
    const newLayout = {
      ...layout,
      cabinets: layout.cabinets.filter((c) => c.id !== id),
    };
    commit(newLayout);
    setSelectedCabinetId(null);
  };

  const updateShelf = (cabId, shelfId, patch) => {
    const cab = layout.cabinets.find((c) => c.id === cabId);
    if (!cab) return;
    updateCabinet(cabId, {
      shelves: cab.shelves.map((s) => (s.id === shelfId ? { ...s, ...patch } : s)),
    });
  };

  const renumberShelves = (cabId, shelves) => {
    // Sequential numbering for ALL items (doors + shelves)
    let counter = 1;
    shelves = shelves.map((s) => ({ ...s, label: `قسم ${counter++}` }));

    const n = shelves.length;
    shelves = shelves.map((s, i) => ({
      ...s,
      yTop: i / n,
      yBottom: (i + 1) / n,
    }));

    updateCabinet(cabId, { shelves });
  };

  const addShelf = (cabId) => {
    const cab = layout.cabinets.find((c) => c.id === cabId);
    if (!cab) return;

    const newShelf = {
      id: uid(),
      type: "normal",
      label: "",
      yTop: 0,
      yBottom: 0,
      color: cab.color,
      rows: [
        { id: uid(), label: "1" },
        { id: uid(), label: "2" },
        { id: uid(), label: "3" },
      ],
    };

    const shelves = [...cab.shelves, newShelf];
    renumberShelves(cabId, shelves);
  };

  const addDoorSection = (cabId, position) => {
    const cab = layout.cabinets.find((c) => c.id === cabId);
    if (!cab) return;

    const hasTop = cab.shelves.some((s) => s.type === "door-top");
    const hasBottom = cab.shelves.some((s) => s.type === "door-bottom");

    if (position === "top" && hasTop) return;
    if (position === "bottom" && hasBottom) return;

    const doorShelf = {
      id: uid(),
      type: position === "top" ? "door-top" : "door-bottom",
      label: "",
      yTop: 0,
      yBottom: 0.15,
      color: "#111827",
      rows: [{ id: uid(), label: "1" }],
    };

    let shelves = [...cab.shelves];
    shelves = position === "top" ? [doorShelf, ...shelves] : [...shelves, doorShelf];

    renumberShelves(cabId, shelves);
  };
  // ---------------------------------------------
  // ZOOM
  // ---------------------------------------------
  const handleWheel = (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom((z) => {
      const next = z - e.deltaY * 0.0015;
      return Math.min(2.5, Math.max(0.5, next));
    });
  };

  const btn = (active) => ({
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
    border: "1px solid " + (active ? "#3b82f6" : "#d1d5db"),
    background: active ? "var(--primary, #3b82f6)" : "var(--surface, #ffffff)",
    color: active ? "var(--on-primary, #ffffff)" : "var(--on-surface, #374151)",
  });

  // Inspector should show the actual label (no recompute)
  function getDisplayShelfLabelForInspector(_cabinet, shelf, _index) {
    return shelf.label;
  }
// ---------------------------------------------
// POINTER HANDLERS
// ---------------------------------------------
const onPointerDown = (e) => {
  if (!stageRef.current) return;

  if (tool === "draw" && wall?.dataUrl) {
    const p = getCoords(e);
    dragStart.current = p;
    setDraftRect({ x: p.x, y: p.y, w: 0, h: 0 });
    e.target.setPointerCapture(e.pointerId);
    return;
  }
};

const onPointerMove = (e) => {
  if (!stageRef.current) return;

  // DRAWING
  if (dragStart.current && draftRect && tool === "draw") {
    const p = getCoords(e);
    setDraftRect({
      x: Math.min(dragStart.current.x, p.x),
      y: Math.min(dragStart.current.y, p.y),
      w: Math.abs(p.x - dragStart.current.x),
      h: Math.abs(p.y - dragStart.current.y),
    });
    return;
  }

  // SHELF DRAG
  if (shelfDragRef.current.active) {
    const { cabId, shelfIndex, startY, startShelves } = shelfDragRef.current;
    const r = stageRef.current.getBoundingClientRect();
    const currentY = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    const delta = currentY - startY;

    const cab = layout.cabinets.find((c) => c.id === cabId);
    if (!cab) return;

    const shelves = startShelves.map((s) => ({ ...s }));
    const upper = shelves[shelfIndex];
    const lower = shelves[shelfIndex + 1];
    if (!upper || !lower) return;

    let newBoundary = upper.yBottom + delta;
    const minBoundary = upper.yTop + 0.05;
    const maxBoundary = lower.yBottom - 0.05;
    newBoundary = Math.max(minBoundary, Math.min(maxBoundary, newBoundary));

    upper.yBottom = newBoundary;
    lower.yTop = newBoundary;

    const total = shelves.reduce((sum, s) => sum + (s.yBottom - s.yTop), 0);
    if (total > 0) {
      let acc = 0;
      shelves.forEach((s, i) => {
        const h = (s.yBottom - s.yTop) / total;
        s.yTop = acc;
        s.yBottom = acc + h;
        acc += h;
        if (i === shelves.length - 1) s.yBottom = 1;
      });
    }

    const newLayout = {
      ...layout,
      cabinets: layout.cabinets.map((c) =>
        c.id === cabId ? { ...c, shelves } : c
      ),
    };
    commit(newLayout);
    return;
  }

  // CABINET DRAG
  if (cabDragRef.current.active) {
    const { cabId, offsetX, offsetY } = cabDragRef.current;
    const r = stageRef.current.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width - offsetX));
    const ny = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height - offsetY));

    const cab = layout.cabinets.find((c) => c.id === cabId);
    if (!cab) return;

    const newCab = { ...cab, x: nx, y: ny };
    const newLayout = {
      ...layout,
      cabinets: layout.cabinets.map((c) => (c.id === cabId ? newCab : c)),
    };
    commit(newLayout);
  }
};

const onPointerUp = () => {
  // FINISH DRAW
  if (draftRect && dragStart.current && tool === "draw") {
    if (draftRect.w > 0.02 && draftRect.h > 0.02) {
      const label = nextLabel(layout.cabinets.map((c) => c.label));
      const newCab = {
        id: uid(),
        label,
        wall: activeWall,
        x: draftRect.x,
        y: draftRect.y,
        width: draftRect.w,
        height: draftRect.h,
        color: CABINET_PALETTE[layout.cabinets.length % CABINET_PALETTE.length],
        shelves: [
          {
            id: uid(),
            type: "normal",
            label: "قسم 1",
            yTop: 0,
            yBottom: 0.5,
            color: CABINET_PALETTE[(layout.cabinets.length + 1) % CABINET_PALETTE.length],
            rows: [{ id: uid(), label: "1" }, { id: uid(), label: "2" }, { id: uid(), label: "3" }],
          },
          {
            id: uid(),
            type: "normal",
            label: "قسم 2",
            yTop: 0.5,
            yBottom: 1,
            color: CABINET_PALETTE[(layout.cabinets.length + 2) % CABINET_PALETTE.length],
            rows: [{ id: uid(), label: "1" }, { id: uid(), label: "2" }, { id: uid(), label: "3" }],
          },
        ],
      };

      const newLayout = {
        ...layout,
        cabinets: [...layout.cabinets, newCab],
      };
      commit(newLayout);
      setSelectedCabinetId(newCab.id);
      setTool("select");
    }
    setDraftRect(null);
    dragStart.current = null;
  }

  if (shelfDragRef.current.active) {
    shelfDragRef.current = {
      active: false,
      cabId: null,
      shelfIndex: null,
      startY: 0,
      startShelves: null,
    };
  }

  if (cabDragRef.current.active) {
    cabDragRef.current = {
      active: false,
      cabId: null,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
    };
  }
};

  // ---------------------------------------------
  // RENDER
  // ---------------------------------------------
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.6fr) 320px",
        gap: 16,
        height: "100%",
        padding: 8,
        boxSizing: "border-box",
        direction: isRTL ? "rtl" : "ltr",
      }}
    >
      {/* LEFT SIDE */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minWidth: 0,
        }}
      >
        {/* WALL TABS + TOOLS + ZOOM */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {/* WALL TABS */}
          <div
            style={{
              display: "flex",
              gap: 4,
              padding: 4,
              background: "var(--surface-container, #f3f4f6)",
              borderRadius: 8,
            }}
          >
            {layout?.walls?.map((w) => (
              <button
                key={w.id}
                onClick={() => {
                  setActiveWall(w.id);
                  setSelectedCabinetId(null);
                }}
                style={{
                  padding: "6px 14px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  border: "none",
                  background:
                    activeWall === w.id
                      ? "var(--surface, #ffffff)"
                      : "transparent",
                  color:
                    activeWall === w.id
                      ? "var(--on-surface, #111827)"
                      : "#6b7280",
                  boxShadow:
                    activeWall === w.id
                      ? "0 1px 3px rgba(0,0,0,0.1)"
                      : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {T(`pharmacyEditor3D.wall.${w.id}`, WALL_LABELS[w.id] || w.label)}
                {w.dataUrl && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: "#10b981",
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* TOOL BUTTONS + ZOOM */}
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => setTool("select")}
              style={btn(tool === "select")}
            >
              {T("pharmacyEditor3D.select", "تحديد")}
            </button>

            <button
              onClick={() => setTool("draw")}
              disabled={!wall?.dataUrl}
              style={{
                ...btn(tool === "draw"),
                opacity: wall?.dataUrl ? 1 : 0.5,
              }}
            >
              {T("pharmacyEditor3D.drawCabinet", "رسم خزانة")}
            </button>

            <div
              style={{
                display: "flex",
                gap: 4,
                alignItems: "center",
                marginInlineStart: 8,
              }}
            >
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                style={btn(false)}
              >
                -
              </button>

              <span
                style={{
                  fontSize: 12,
                  color: "var(--on-surface, #374151)",
                  minWidth: 40,
                  textAlign: "center",
                }}
              >
                {Math.round(zoom * 100)}%
              </span>

              <button
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
                style={btn(false)}
              >
                +
              </button>

              <button onClick={() => setZoom(1)} style={btn(false)}>
                {T("pharmacyEditor3D.reset", "إعادة الضبط")}
              </button>
            </div>
          </div>
        </div>

        {/* SCROLLABLE + ZOOMABLE STAGE */}
        <div
          onWheel={handleWheel}
          style={{
            position: "relative",
            width: "100%",
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            borderRadius: 12,
            border: "1px solid #d1d5db",
            background: "var(--surface-container-high, #e5e7eb)",
          }}
        >
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              padding: 12,
              boxSizing: "border-box",
              minWidth: "100%",
            }}
          >
            <div
              ref={stageRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "16/9",
                borderRadius: 12,
                overflow: "hidden",
                background: "#e5e7eb",
                border: "1px solid #d1d5db",
                userSelect: "none",
                cursor: tool === "draw" && wall?.dataUrl ? "crosshair" : "default",
              }}
            >
              {/* WALL PHOTO / PROMPT */}
              {wall?.dataUrl ? (
                <img
                  src={wall.dataUrl}
                  alt={wall.label}
                  draggable={false}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    pointerEvents: "none",
                  }}
                />
              ) : (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    color: "#6b7280",
                    textAlign: "center",
                    padding: 16,
                  }}
                >
                  <p>
                    {T("pharmacyEditor3D.noPhoto", "لا توجد صورة للجدار")}{" "}
                    {wall?.label}
                  </p>
                  <PhotoUploadButton
                    onFile={handlePhotoUpload}
                    label={T("pharmacyEditor3D.uploadPhoto", "رفع صورة للجدار")}
                  />
                </div>
              )}
              {/* CABINETS */}
              {wallCabinets?.map((cab) => (
                <div
                  key={cab.id}
                  onPointerDown={(e) => {
                    if (tool !== "select") return;
                    e.stopPropagation();
                    const p = getCoords(e);
                    cabDragRef.current = {
                      active: true,
                      cabId: cab.id,
                      startX: cab.x,
                      startY: cab.y,
                      offsetX: p.x - cab.x,
                      offsetY: p.y - cab.y,
                    };
                    setSelectedCabinetId(cab.id);
                    e.target.setPointerCapture(e.pointerId);
                  }}
                  style={{
                    position: "absolute",
                    left: `${cab.x * 100}%`,
                    top: `${cab.y * 100}%`,
                    width: `${cab.width * 100}%`,
                    height: `${cab.height * 100}%`,
                    border: `2px solid ${cab.color}`,
                    background: cab.color,
                    cursor: tool === "select" ? "grab" : "default",
                    boxShadow:
                      selectedCabinetId === cab.id
                        ? `0 0 0 3px ${cab.color}`
                        : "0 4px 10px rgba(0,0,0,0.15)",
                  }}
                >
                  {/* CABINET LABEL (A,B,C...) */}
                  <div
                    style={{
                      position: "absolute",
                      top: -22,
                      left: 0,
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#fff",
                      background: cab.color,
                    }}
                  >
                    {cab.label}
                  </div>

                  {/* SHELVES */}
                  {cab.shelves?.map((s, index) => {
                    const top = (s.yTop ?? 0) * 100;
                    const h = ((s.yBottom ?? 0) - (s.yTop ?? 0)) * 100;

                    return (
                      <div
                        key={s.id}
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          top: `${top}%`,
                          height: `${h}%`,
                          background: s.color,
                          borderTop: `1px solid rgba(0,0,0,0.25)`,
                        }}
                      >
                        {/* SHELF LABEL */}
                        <div
                          style={{
                            position: "absolute",
                            top: 4,
                            left: 4,
                            padding: "2px 6px",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#fff",
                            background: "rgba(0,0,0,0.35)",
                            borderRadius: 4,
                          }}
                        >
                          {s.label}
                        </div>

                        {/* ROWS */}
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
                          {s.rows?.map((r, i) => (
                            <div
                              key={r.id}
                              style={{
                                flex: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                fontWeight: 600,
                                color: "rgba(255,255,255,0.95)",
                                borderTop:
                                  i > 0
                                    ? "1px solid rgba(255,255,255,0.25)"
                                    : "none",
                              }}
                            >
                              {r.label}
                            </div>
                          ))}
                        </div>

                        {/* SHELF DRAG HANDLE */}
                        {index < (cab.shelves?.length ?? 0) - 1 && (
                          <div
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              if (!stageRef.current) return;

                              const r = stageRef.current.getBoundingClientRect();
                              const y = (e.clientY - r.top) / r.height;

                              shelfDragRef.current = {
                                active: true,
                                cabId: cab.id,
                                shelfIndex: index,
                                startY: y,
                                startShelves: cab.shelves?.map((sh) => ({ ...sh })) ?? [],
                              };

                              e.target.setPointerCapture(e.pointerId);
                            }}
                            style={{
                              position: "absolute",
                              left: 0,
                              right: 0,
                              bottom: -3,
                              height: 6,
                              cursor: "row-resize",
                              background: "transparent",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(255,255,255,0.25)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* DRAFT RECT */}
              {draftRect && (
                <div
                  style={{
                    position: "absolute",
                    pointerEvents: "none",
                    left: `${draftRect.x * 100}%`,
                    top: `${draftRect.y * 100}%`,
                    width: `${draftRect.w * 100}%`,
                    height: `${draftRect.h * 100}%`,
                    border: "2px dashed #3b82f6",
                    background: "rgba(59,130,246,0.2)",
                  }}
                />
              )}
            </div>

            {wall?.dataUrl && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                  marginTop: 8,
                }}
              >
                <PhotoUploadButton
                  onFile={handlePhotoUpload}
                  label={T("pharmacyEditor3D.replacePhoto", "استبدال الصورة")}
                />
                <button onClick={removePhoto} style={btn(false)}>
                  {T("pharmacyEditor3D.removePhoto", "حذف الصورة")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: INSPECTOR */}
      <div
        style={{
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          background: "var(--surface, #ffffff)",
          padding: 16,
          overflowY: "auto",
          maxHeight: "calc(100vh - 140px)",
          boxSizing: "border-box",
        }}
      >
        <h3
          style={{
            fontWeight: 600,
            marginBottom: 12,
            color: "var(--on-surface, #111827)",
          }}
        >
          {T("pharmacyEditor3D.inspector", "المحرر")}
        </h3>
        {!selected ? (
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            <p>
              {T("pharmacyEditor3D.selectCabinetHint", "اختر خزانة لعرض تفاصيلها")}
            </p>
            <p style={{ fontSize: 12, marginTop: 8 }}>
              {T("pharmacyEditor3D.drawHint", "استخدم أداة الرسم لإضافة خزانة جديدة")}
            </p>
            <div
              style={{
                borderTop: "1px solid #e5e7eb",
                marginTop: 12,
                paddingTop: 12,
              }}
            >
              <p
                style={{
                  fontWeight: 500,
                  color: "#111827",
                  marginBottom: 6,
                }}
              >
                {T("pharmacyEditor3D.cabinetsOn", "الخزائن على")}{" "}
                {T(`pharmacyEditor3D.wall.${wall?.id}`)}
              </p>
              {wallCabinets?.length === 0 && (
                <p style={{ fontSize: 12 }}>
                  {T("pharmacyEditor3D.none", "لا يوجد")}
                </p>
              )}
              {wallCabinets?.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCabinetId(c.id)}
                  style={{
                    width: "100%",
                    textAlign: "start",
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      background: c.color,
                    }}
                  />
                  {T("pharmacyEditor3D.cabinet", "الخزانة")} {c.label}:{" "}
                  {T("pharmacyEditor3D.sections", "أقسام")} {c.shelves?.length}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              fontSize: 13,
            }}
          >
            {/* CABINET LABEL */}
            <div>
              <label style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
                {T("pharmacyEditor3D.label", "الاسم")}
              </label>
              <input
                value={selected?.label || ""}
                onChange={(e) =>
                  selected && updateCabinet(selected.id, { label: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                }}
              />
            </div>

            {/* CABINET COLOR */}
            <div>
              <label style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
                {T("pharmacyEditor3D.color", "اللون")}
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {CABINET_PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => updateCabinet(selected.id, { color: c })}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      cursor: "pointer",
                      background: c,
                      border:
                        selected?.color === c
                          ? "2px solid #111827"
                          : "2px solid transparent",
                      transform: selected?.color === c ? "scale(1.1)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* DOOR SECTIONS */}
            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>
              <label style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
                {T("pharmacyEditor3D.doorSections", "أبواب الخزانة")}
              </label>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button
                  onClick={() => addDoorSection(selected.id, "top")}
                  style={{
                    padding: "4px 10px",
                    fontSize: 12,
                    borderRadius: 6,
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {T("pharmacyEditor3D.addTopDoor", "إضافة باب علوي")}
                </button>
                <button
                  onClick={() => addDoorSection(selected.id, "bottom")}
                  style={{
                    padding: "4px 10px",
                    fontSize: 12,
                    borderRadius: 6,
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {T("pharmacyEditor3D.addBottomDoor", "إضافة باب سفلي")}
                </button>
              </div>
            </div>

            {/* SHELVES */}
            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <label style={{ fontSize: 11, color: "#6b7280" }}>
                  {T("pharmacyEditor3D.shelves", "الأقسام")}
                </label>
                <button
                  onClick={() => addShelf(selected.id)}
                  style={{
                    padding: "4px 10px",
                    fontSize: 12,
                    borderRadius: 6,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "#3b82f6",
                  }}
                >
                  + {T("pharmacyEditor3D.addShelf", "إضافة قسم")}
                </button>
              </div>

              {selected?.shelves?.map((s, index) => (
                <div
                  key={s.id}
                  style={{
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    padding: 10,
                    marginBottom: 8,
                    background: "#f9fafb",
                  }}
                >
                  {/* SHELF LABEL + DELETE */}
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      value={getDisplayShelfLabelForInspector(selected, s, index)}
                      onChange={(e) =>
                        updateShelf(selected.id, s.id, { label: e.target.value })
                      }
                      style={{
                        flex: 1,
                        padding: "4px 6px",
                        fontSize: 12,
                        borderRadius: 4,
                        border: "1px solid #d1d5db",
                      }}
                    />
                    <button
                      onClick={() => removeShelf(selected.id, s.id)}
                      style={{
                        padding: "4px 8px",
                        fontSize: 12,
                        borderRadius: 4,
                        border: "1px solid #fecaca",
                        background: "#fff",
                        color: "#dc2626",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  </div>

                  {/* SHELF COLOR PICKER */}
                  <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>
                      {T("pharmacyEditor3D.color", "اللون")}:
                    </span>
                    {CABINET_PALETTE.map((c) => (
                      <button
                        key={c}
                        onClick={() => updateShelf(selected.id, s.id, { color: c })}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 4,
                          background: c,
                          cursor: "pointer",
                          border:
                            s.color === c
                              ? "2px solid #111827"
                              : "2px solid transparent",
                        }}
                      />
                    ))}
                  </div>

                  {/* ROW COUNT */}
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                      marginTop: 6,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: "#6b7280" }}>
                      {T("pharmacyEditor3D.rows", "عدد الصفوف")}:
                    </span>
                                      <input
                      type="number"
                      min={1}
                      max={20}
                      value={s.rows?.length || 1}
                      onChange={(e) =>
                        setRowCount(selected.id, s.id, e.target.value)
                      }
                      style={{
                        width: 60,
                        padding: "4px 6px",
                        fontSize: 12,
                        borderRadius: 4,
                        border: "1px solid #d1d5db",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* DELETE CABINET */}
            <button
              onClick={() => deleteCabinet(selected.id)}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "none",
                background: "#dc2626",
                color: "#fff",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {T("pharmacyEditor3D.deleteCabinet", "حذف الخزانة")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------
   PHOTO UPLOAD BUTTON
--------------------------------------------- */
function PhotoUploadButton({ onFile, label }) {
  const ref = useRef(null);

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files && e.target.files[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />

      <button
        onClick={() => ref.current && ref.current.click()}
        style={{
          padding: "6px 12px",
          borderRadius: 6,
          border: "1px solid #3b82f6",
          background: "#3b82f6",
          color: "#fff",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    </>
  );
}
