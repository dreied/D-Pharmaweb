// src/components/layout/PharmacyLayoutEditorSVG.jsx
import { useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

const SHELF_COLORS = [
  "#e3f2fd", "#e8f5e9", "#fff8e1", "#fce4ec", "#f3e5f5",
  "#e0f7fa", "#fff3e0", "#e8eaf6", "#f1f8e9", "#fbe9e7",
];

export default function PharmacyLayoutEditorSVG({
  layout,
  onLayoutChange,
  onLayoutDragUpdate,
  selectedCabinetId,
  setSelectedCabinetId,
  selectedShelfId,
  setSelectedShelfId,
  zoom = 1,
}) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const svgRef = useRef(null);

  const [drag, setDrag] = useState(null);
  const [resize, setResize] = useState(null);

  const getCursorPoint = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursor = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: cursor.x, y: cursor.y };
  }, []);

  const startDrag = (cab, e) => {
    e.stopPropagation();
    const cursor = getCursorPoint(e);
    setDrag({ id: cab.id, offsetX: cursor.x - cab.x, offsetY: cursor.y - cab.y });
    setSelectedCabinetId(cab.id);
    setSelectedShelfId(null);
  };

  const startResize = (cab, e) => {
    e.stopPropagation();
    const cursor = getCursorPoint(e);
    setResize({
      id: cab.id,
      startX: cursor.x,
      startY: cursor.y,
      startWidth: cab.width,
      startHeight: cab.height,
    });
    setSelectedCabinetId(cab.id);
    setSelectedShelfId(null);
  };

  const onMove = (e) => {
    if (!drag && !resize) return;
    const cursor = getCursorPoint(e);

    const updater = (prev) => {
      if (!prev) return prev;
      const updated = JSON.parse(JSON.stringify(prev));
      const cab = updated.cabinets.find((c) => c.id === (drag?.id || resize?.id));
      if (!cab) return prev;

      if (drag) {
        cab.x = Math.round(cursor.x - drag.offsetX);
        cab.y = Math.round(cursor.y - drag.offsetY);
      }

      if (resize) {
        cab.width = Math.max(60, Math.round(resize.startWidth + (cursor.x - resize.startX)));
        cab.height = Math.max(80, Math.round(resize.startHeight + (cursor.y - resize.startY)));
      }

      return updated;
    };

    onLayoutDragUpdate(updater);
  };

  const endAction = () => {
    if (drag || resize) onLayoutChange();
    setDrag(null);
    setResize(null);
  };

  const handleShelfClick = (cabId, shelfId, e) => {
    e.stopPropagation();
    setSelectedCabinetId(cabId);
    setSelectedShelfId(shelfId);
  };

  // Dynamic viewBox
  let vbW = 1200,
    vbH = 800;

  if (layout?.cabinets?.length) {
    let maxX = 0,
      maxY = 0;
    for (const c of layout.cabinets) {
      maxX = Math.max(maxX, c.x + c.width + 80);
      maxY = Math.max(maxY, c.y + c.height + 80);
    }
    vbW = Math.max(1200, maxX);
    vbH = Math.max(800, maxY);
  }

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={`0 0 ${vbW} ${vbH}`}
      style={{ background: "var(--surface-container-low)", minHeight: 500 }}
      onMouseMove={onMove}
      onMouseUp={endAction}
      onMouseLeave={endAction}
      onMouseDown={(e) => {
        if (e.target === svgRef.current) {
          setSelectedCabinetId(null);
          setSelectedShelfId(null);
        }
      }}
    >
      {/* Grid */}
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--outline-variant)" strokeWidth="0.3" />
        </pattern>
        <filter id="editor-shadow" x="-5%" y="-5%" width="115%" height="115%">
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.12" />
        </filter>
      </defs>

      <rect width={vbW} height={vbH} fill="url(#grid)" />

      {layout.cabinets.map((cab) => {
        const isSelectedCab = cab.id === selectedCabinetId;
        const rotation = cab.rotation || 0;

        const centerX = cab.x + cab.width / 2;
        const centerY = cab.y + cab.height / 2;

        const facing = cab.facing || "front";

        // 3D facing logic
        const baseDepth = 10;
        let depthX = baseDepth;
        let depthY = -baseDepth;

        switch (facing) {
          case "front":
            depthX = baseDepth;
            depthY = -baseDepth;
            break;
          case "back":
            depthX = -baseDepth;
            depthY = baseDepth;
            break;
          case "left":
            depthX = -baseDepth;
            depthY = -baseDepth;
            break;
          case "right":
            depthX = baseDepth;
            depthY = baseDepth;
            break;
        }

        const hasDoors = cab.hasDoors || false;
        const doorRows = cab.doorRows || 2;
        const doorHeight = hasDoors ? cab.height * 0.25 : 0;
        const mainHeight = cab.height - doorHeight;

        const shelfCount = cab.shelves?.length || 1;
        const shelfHeight = mainHeight / shelfCount;

        const doorColor = cab.doorColor || "rgba(120,120,120,0.1)";

        return (
          <g
            key={cab.id}
            transform={`rotate(${rotation}, ${centerX}, ${centerY})`}
            onMouseDown={(e) => startDrag(cab, e)}
            style={{ cursor: drag?.id === cab.id ? "grabbing" : "grab" }}
          >
            {/* 3D top */}
            <polygon
              points={`
                ${cab.x},${cab.y}
                ${cab.x + depthX},${cab.y + depthY}
                ${cab.x + cab.width + depthX},${cab.y + depthY}
                ${cab.x + cab.width},${cab.y}
              `}
              fill={cab.color || "#e8e8e8"}
              stroke="var(--outline-variant)"
              strokeWidth="0.6"
              opacity="0.45"
            />

            {/* 3D right */}
            <polygon
              points={`
                ${cab.x + cab.width},${cab.y}
                ${cab.x + cab.width + depthX},${cab.y + depthY}
                ${cab.x + cab.width + depthX},${cab.y + cab.height + depthY}
                ${cab.x + cab.width},${cab.y + cab.height}
              `}
              fill={cab.color || "#d0d0d0"}
              stroke="var(--outline-variant)"
              strokeWidth="0.6"
              opacity="0.5"
            />

            {/* Cabinet body */}
            <rect
              x={cab.x}
              y={cab.y}
              width={cab.width}
              height={cab.height}
              rx={4}
              ry={4}
              fill={cab.color || "#e0e0e0"}
              stroke={isSelectedCab ? "var(--primary)" : "#999"}
              strokeWidth={isSelectedCab ? 3 : 1.2}
              filter="url(#editor-shadow)"
            />

            {/* Selection highlight */}
            {isSelectedCab && (
              <rect
                x={cab.x - 4}
                y={cab.y - 4}
                width={cab.width + 8}
                height={cab.height + 8}
                rx={6}
                fill="none"
                stroke="var(--primary)"
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            )}

            {/* Cabinet label (FIXED: removed depth reference) */}
            <text
              x={cab.x + cab.width / 2}
              y={cab.y - baseDepth - 6}
              textAnchor="middle"
              fontSize="13"
              fontWeight="800"
              fill="var(--on-surface)"
            >
              {cab.label}
            </text>

            {/* Facing indicator */}
            <text
              x={cab.x + cab.width / 2}
              y={cab.y + cab.height + 16}
              textAnchor="middle"
              fontSize="9"
              fill="var(--on-surface-variant)"
              opacity="0.7"
            >
              {facing !== "front" ? `⤴ ${t(`layout.facing.${facing}`)}` : ""}
              {cab.type ? ` • ${cab.type}` : ""}
            </text>

            {/* Shelves */}
            {cab.shelves?.map((shelf, idx) => {
              const shelfY = cab.y + idx * shelfHeight;
              const isSelectedShelf = isSelectedCab && shelf.id === selectedShelfId;
              const shelfColor = shelf.color || SHELF_COLORS[idx % SHELF_COLORS.length];

              return (
                <g key={shelf.id}>
                  {/* Shelf background */}
                  <rect
                    x={cab.x + 1}
                    y={shelfY + 1}
                    width={cab.width - 2}
                    height={shelfHeight - 1}
                    fill={shelfColor}
                    opacity="0.3"
                    rx={2}
                    onMouseDown={(e) => handleShelfClick(cab.id, shelf.id, e)}
                    style={{ cursor: "pointer" }}
                  />

                  {/* Selected shelf highlight */}
                  {isSelectedShelf && (
                    <rect
                      x={cab.x}
                      y={shelfY}
                      width={cab.width}
                      height={shelfHeight}
                      fill="rgba(25,118,210,0.08)"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      onMouseDown={(e) => handleShelfClick(cab.id, shelf.id, e)}
                      style={{ cursor: "pointer" }}
                    />
                  )}

                  {/* Shelf label */}
                  <text
                    x={cab.x - 4}
                    y={shelfY + shelfHeight / 2}
                    textAnchor="end"
                    dominantBaseline="central"
                    fontSize="9"
                    fontWeight="800"
                    fill="var(--on-surface)"
                  >
                    {t("layout.shelf")} {idx + 1}
                  </text>

                  {/* Row lines */}
                  {Array.from({ length: shelf.rows }).map((_, i) => {
                    const rowY = shelfY + (i * shelfHeight) / shelf.rows;
                    return i > 0 ? (
                      <line
                        key={i}
                        x1={cab.x + 2}
                        y1={rowY}
                        x2={cab.x + cab.width - 2}
                        y2={rowY}
                        stroke="#bbb"
                        strokeWidth="0.5"
                        strokeDasharray="3 2"
                      />
                    ) : null;
                  })}
                </g>
              );
            })}

            {/* Door section treated as last shelf */}
            {hasDoors && (
              <g>
                <rect
                  x={cab.x + 2}
                  y={cab.y + mainHeight}
                  width={cab.width - 4}
                  height={doorHeight - 2}
                  rx={3}
                  fill={doorColor}
                  stroke="#999"
                  strokeWidth="1"
                />

                {/* Door handle */}
                <rect
                  x={cab.x + cab.width / 2 - 8}
                  y={cab.y + mainHeight + doorHeight / 2 - 3}
                  width={16}
                  height={6}
                  rx={3}
                  fill="#888"
                />

                {/* Door rows */}
                {Array.from({ length: doorRows }).map((_, i) => {
                  const ry = cab.y + mainHeight + (i * doorHeight) / doorRows;
                  return i > 0 ? (
                    <line
                      key={`dr-${i}`}
                      x1={cab.x + 6}
                      y1={ry}
                      x2={cab.x + cab.width - 6}
                      y2={ry}
                      stroke="#aaa"
                      strokeWidth="0.5"
                      strokeDasharray="2 2"
                    />
                  ) : null;
                })}

                {/* Door label as Shelf N+1 */}
                <text
                  x={cab.x - 4}
                  y={cab.y + mainHeight + doorHeight / 2}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize="8"
                  fontWeight="700"
                  fill="var(--on-surface)"
                  opacity="0.5"
                >
                  {t("layout.shelf")} {shelfCount + 1}
                </text>
              </g>
            )}

            {/* Resize handle */}
            <rect
              x={cab.x + cab.width - 14}
              y={cab.y + cab.height - 14}
              width={14}
              height={14}
              fill="var(--primary)"
              stroke="var(--on-primary)"
              strokeWidth="1"
              rx={3}
              opacity="0.8"
              onMouseDown={(e) => startResize(cab, e)}
              style={{ cursor: "nwse-resize" }}
            />

            {/* Resize icon */}
            <path
              d={`M${cab.x + cab.width - 10},${cab.y + cab.height - 4}
                 L${cab.x + cab.width - 4},${cab.y + cab.height - 10}`}
              stroke="var(--on-primary)"
              strokeWidth="1.5"
              fill="none"
              style={{ pointerEvents: "none" }}
            />
          </g>
        );
      })}
    </svg>
  );
}
