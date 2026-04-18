// src/components/layout/PharmacyLayoutSVG.jsx
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";

const SHELF_COLORS = [
  "#e3f2fd", "#e8f5e9", "#fff8e1", "#fce4ec", "#f3e5f5",
  "#e0f7fa", "#fff3e0", "#e8eaf6", "#f1f8e9", "#fbe9e7",
];

export default function PharmacyLayoutSVG({ layout, highlight, products = [] }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";

  if (!layout) return null;
  const { cabinets } = layout;

  // Dynamic viewBox calculation
  const bounds = useMemo(() => {
    if (!cabinets || !cabinets.length) return { x: 0, y: 0, w: 1000, h: 800 };

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (const cab of cabinets) {
      const r = (cab.rotation || 0) * Math.PI / 180;
      const cx = cab.x + cab.width / 2;
      const cy = cab.y + cab.height / 2;
      const corners = [
        [cab.x, cab.y],
        [cab.x + cab.width, cab.y],
        [cab.x, cab.y + cab.height],
        [cab.x + cab.width, cab.y + cab.height],
      ];
      for (const [px, py] of corners) {
        const dx = px - cx,
          dy = py - cy;
        const rx = cx + dx * Math.cos(r) - dy * Math.sin(r);
        const ry = cy + dx * Math.sin(r) + dy * Math.cos(r);
        minX = Math.min(minX, rx);
        minY = Math.min(minY, ry);
        maxX = Math.max(maxX, rx);
        maxY = Math.max(maxY, ry);
      }
    }

    const pad = 60;
    return {
      x: minX - pad,
      y: minY - pad - 20,
      w: maxX - minX + pad * 2,
      h: maxY - minY + pad * 2 + 30,
    };
  }, [cabinets]);

  // Build lookup: "cabinetLabel|shelfIndex|row" → [productName]
  const productMap = useMemo(() => {
    const map = {};
    for (const p of products) {
      if (!p.cabinet || !p.shelf || !p.shelfRow) continue;
      const key = `${p.cabinet}|${p.shelf}|${p.shelfRow}`;
      if (!map[key]) map[key] = [];
      const name = isRTL
        ? p.nameAr || p.nameEn || "—"
        : p.nameEn || p.nameAr || "—";
      if (!map[key].includes(name)) map[key].push(name);
    }
    return map;
  }, [products, isRTL]);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ overflow: "visible", display: "block" }}
    >
      <defs>
        <filter id="cab-shadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="2" dy="3" stdDeviation="3" floodOpacity="0.15" />
        </filter>
        <filter id="highlight-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feFlood floodColor="red" floodOpacity="0.3" />
          <feComposite in2="blur" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <style>{`
          @keyframes pulse-opacity {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
          .highlight-pulse { animation: pulse-opacity 1.2s infinite; }
        `}</style>
      </defs>

      {cabinets.map((cab) => (
        <CabinetSVG
          key={cab.id}
          cab={cab}
          highlight={highlight}
          productMap={productMap}
          t={t}
          isRTL={isRTL}
        />
      ))}
    </svg>
  );
}

function CabinetSVG({ cab, highlight, productMap, t, isRTL }) {
  const isCabHighlighted = highlight?.cabinetId === cab.id;
  const rotation = cab.rotation || 0;
  const cx = cab.x + cab.width / 2;
  const cy = cab.y + cab.height / 2;
  const facing = cab.facing || "front";

  // 3D depth based on facing
  const baseDepth = 12;
  let dx = baseDepth;
  let dy = -baseDepth;

  switch (facing) {
    case "front":
      dx = baseDepth;
      dy = -baseDepth;
      break;
    case "back":
      dx = -baseDepth;
      dy = baseDepth;
      break;
    case "left":
      dx = -baseDepth;
      dy = -baseDepth;
      break;
    case "right":
      dx = baseDepth;
      dy = baseDepth;
      break;
    default:
      dx = baseDepth;
      dy = -baseDepth;
  }

  // Determine sections: main shelves + optional door section
  const hasDoors = cab.hasDoors || false;
  const doorRows = cab.doorRows || 2;
  const doorHeight = hasDoors ? cab.height * 0.25 : 0;
  const mainHeight = cab.height - doorHeight;
  const shelfCount = cab.shelves?.length || 1;
  const shelfHeight = mainHeight / shelfCount;

  // Facing arrow indicator
  const facingArrow =
    {
      front: {
        x1: cx,
        y1: cab.y + cab.height + 8,
        x2: cx,
        y2: cab.y + cab.height + 20,
      },
      back: { x1: cx, y1: cab.y - 8, x2: cx, y2: cab.y - 20 },
      left: { x1: cab.x - 8, y1: cy, x2: cab.x - 20, y2: cy },
      right: {
        x1: cab.x + cab.width + 8,
        y1: cy,
        x2: cab.x + cab.width + 20,
        y2: cy,
      },
    }[facing] || {};

  return (
    <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
      {/* 3D right face */}
      <polygon
        points={`
          ${cab.x + cab.width},${cab.y}
          ${cab.x + cab.width + dx},${cab.y + dy}
          ${cab.x + cab.width + dx},${cab.y + cab.height + dy}
          ${cab.x + cab.width},${cab.y + cab.height}
        `}
        fill={cab.color || "#d0d0d0"}
        stroke="var(--outline-variant)"
        strokeWidth="0.8"
        opacity="0.6"
      />
      {/* 3D top face */}
      <polygon
        points={`
          ${cab.x},${cab.y}
          ${cab.x + dx},${cab.y + dy}
          ${cab.x + cab.width + dx},${cab.y + dy}
          ${cab.x + cab.width},${cab.y}
        `}
        fill={cab.color || "#e8e8e8"}
        stroke="var(--outline-variant)"
        strokeWidth="0.8"
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
        stroke={isCabHighlighted ? "#1976d2" : "#999"}
        strokeWidth={isCabHighlighted ? 3 : 1.2}
        filter="url(#cab-shadow)"
      />
      {/* Cabinet label */}
      <text
        x={cab.x + cab.width / 2}
        y={cab.y - baseDepth - 8}
        textAnchor="middle"
        fontSize="14"
        fontWeight="800"
        fill="var(--on-surface)"
      >
        {cab.label}
      </text>
      {/* Facing direction arrow */}
      {facingArrow.x1 !== undefined && (
        <line
          x1={facingArrow.x1}
          y1={facingArrow.y1}
          x2={facingArrow.x2}
          y2={facingArrow.y2}
          stroke="#1976d2"
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
        />
      )}
      {/* Shelves */}
      {cab.shelves?.map((shelf, idx) => {
        const shelfY = cab.y + idx * shelfHeight;
        const shelfColor = shelf.color || SHELF_COLORS[idx % SHELF_COLORS.length];
        return (
          <ShelfSVG
            key={shelf.id}
            cab={cab}
            shelf={shelf}
            shelfIndex={idx}
            shelfY={shelfY}
            shelfHeight={shelfHeight}
            shelfColor={shelfColor}
            highlight={highlight}
            productMap={productMap}
            t={t}
            isRTL={isRTL}
          />
        );
      })}
      {/* Door section treated as last shelf */}
      {hasDoors && (
        <DoorSection
          cab={cab}
          doorRows={doorRows}
          doorHeight={doorHeight}
          mainHeight={mainHeight}
          t={t}
          isRTL={isRTL}
          highlight={highlight}
          productMap={productMap}
        />
      )}
      {/* Cabinet type label */}
      {cab.type && (
        <text
          x={cab.x + cab.width / 2}
          y={cab.y + cab.height + 16}
          textAnchor="middle"
          fontSize="10"
          fill="var(--on-surface-variant)"
          opacity="0.7"
        >
          {cab.type}
        </text>
      )}
    </g>
  );
}

function ShelfSVG({
  cab,
  shelf,
  shelfIndex,
  shelfY,
  shelfHeight,
  shelfColor,
  highlight,
  productMap,
  t,
  isRTL,
}) {
  const rowCount = shelf.rows || 1;
  const rowHeight = shelfHeight / rowCount;

  return (
    <g>
      {/* Shelf background */}
      <rect
        x={cab.x + 1}
        y={shelfY + 1}
        width={cab.width - 2}
        height={shelfHeight - 2}
        fill={shelfColor}
        opacity="0.35"
        rx={2}
      />
      {/* Shelf label on the side */}
      <text
        x={isRTL ? cab.x + cab.width + 4 : cab.x - 4}
        y={shelfY + shelfHeight / 2}
        textAnchor={isRTL ? "start" : "end"}
        dominantBaseline="middle"
        fontSize="10"
        fontWeight="800"
        fill="var(--on-surface)"
      >
        {t("layout.shelf")} {shelfIndex + 1}
      </text>
      {/* Rows */}
      {Array.from({ length: rowCount }).map((_, i) => {
        const y = shelfY + i * rowHeight;
        const rowNum = i + 1;

        const isRowHighlighted =
          highlight?.cabinetId === cab.id &&
          highlight?.shelfId === shelf.id &&
          Number(highlight?.row) === rowNum;

        // Use cabinet label + shelf index (1-based) + row
        const key = `${cab.label}|${shelfIndex + 1}|${rowNum}`;
        const medicines = productMap[key] || [];
        const highlightName = isRowHighlighted ? highlight?.medicineName : null;

        return (
          <g key={i}>
            {/* Row divider line */}
            {i > 0 && (
              <line
                x1={cab.x + 2}
                y1={y}
                x2={cab.x + cab.width - 2}
                y2={y}
                stroke="#bbb"
                strokeWidth="0.6"
                strokeDasharray="3 2"
              />
            )}
            {/* Row number */}
            <text
              x={isRTL ? cab.x + cab.width - 6 : cab.x + 6}
              y={y + rowHeight / 2}
              dominantBaseline="middle"
              textAnchor={isRTL ? "end" : "start"}
              fontSize="7"
              fontWeight="700"
              fill="var(--on-surface)"
              opacity="0.35"
            >
              {rowNum}
            </text>
            {/* Highlight background for the whole row */}
            {isRowHighlighted && (
              <rect
                x={cab.x + 1}
                y={y + 1}
                width={cab.width - 2}
                height={rowHeight - 2}
                fill="red"
                opacity="0.18"
                rx={2}
                className="highlight-pulse"
              />
            )}
            {/* Medicine name INSIDE the red box */}
            <MedicineLabel
              medicines={medicines}
              highlightName={highlightName}
              isHighlighted={isRowHighlighted}
              x={cab.x}
              y={y}
              width={cab.width}
              height={rowHeight}
              isRTL={isRTL}
            />
          </g>
        );
      })}
    </g>
  );
}

function MedicineLabel({
  medicines,
  highlightName,
  isHighlighted,
  x,
  y,
  width,
  height,
  isRTL,
}) {
  if (!medicines.length && !highlightName) return null;

  const name = highlightName || medicines[0] || "";
  const fontSize = Math.min(height * 0.5, 12);
  const centerY = y + height / 2;
  const padding = 14;
  const textX = isRTL ? x + width - padding : x + padding;
  const anchor = isRTL ? "end" : "start";
  const maxTextWidth = width - padding * 2;

  // Estimate pill width
  const charW = fontSize * 0.55;
  const textLen = Math.min(name.length, Math.floor(maxTextWidth / charW));
  const pillW = Math.min(textLen * charW + 16, maxTextWidth);
  const pillH = height * 0.7;
  const pillX = isRTL ? x + width - padding - pillW + 4 : x + padding - 8;
  const pillY = centerY - pillH / 2;

  return (
    <g>
      {/* Red pill background for highlighted medicine */}
      {isHighlighted && (
        <rect
          x={pillX}
          y={pillY}
          width={pillW}
          height={pillH}
          rx={pillH / 2}
          fill="#e53935"
          opacity="0.9"
        />
      )}
      {/* Medicine text — centered vertically inside the row/pill */}
      <text
        x={textX}
        y={centerY}
        dominantBaseline="central"
        textAnchor={anchor}
        fontSize={fontSize}
        fontWeight="700"
        fill={isHighlighted ? "#fff" : "var(--on-surface)"}
        style={{ pointerEvents: "none" }}
      >
        {truncateText(name, maxTextWidth, fontSize)}
      </text>
    </g>
  );
}

function DoorSection({
  cab,
  doorRows,
  doorHeight,
  mainHeight,
  t,
  isRTL,
  highlight,
  productMap,
}) {
  const doorY = cab.y + mainHeight;
  const rowH = doorHeight / doorRows;

  // Door is treated as last shelf: index = shelves.length + 1
  const shelfIndex = (cab.shelves?.length || 0) + 1;

  return (
    <g>
      {/* Door background */}
      <rect
        x={cab.x + 2}
        y={doorY}
        width={cab.width - 4}
        height={doorHeight - 2}
        rx={3}
        fill={cab.doorColor || "rgba(120,120,120,0.12)"}
        stroke="#999"
        strokeWidth="1.2"
      />
      {/* Door handle */}
      <rect
        x={cab.x + cab.width / 2 - 8}
        y={doorY + doorHeight / 2 - 3}
        width={16}
        height={6}
        rx={3}
        fill="#888"
      />
      {/* Rows inside door */}
      {Array.from({ length: doorRows }).map((_, i) => {
        const rowNum = i + 1;
        const ry = doorY + i * rowH;

        const isRowHighlighted =
          highlight?.cabinetId === cab.id &&
          highlight?.isDoor === true &&
          Number(highlight?.row) === rowNum;

        // Door as shelfIndex (N+1)
        const key = `${cab.label}|${shelfIndex}|${rowNum}`;
        const medicines = productMap[key] || [];
        const highlightName = isRowHighlighted ? highlight?.medicineName : null;

        return (
          <g key={`door-${i}`}>
            {/* Divider line */}
            {i > 0 && (
              <line
                x1={cab.x + 6}
                y1={ry}
                x2={cab.x + cab.width - 6}
                y2={ry}
                stroke="#aaa"
                strokeWidth="0.5"
                strokeDasharray="2 2"
              />
            )}
            {/* Row number */}
            <text
              x={isRTL ? cab.x + cab.width - 8 : cab.x + 8}
              y={ry + rowH / 2}
              dominantBaseline="central"
              textAnchor={isRTL ? "end" : "start"}
              fontSize="7"
              fill="var(--on-surface)"
              opacity="0.4"
            >
              {rowNum}
            </text>
            {/* Highlight background */}
            {isRowHighlighted && (
              <rect
                x={cab.x + 1}
                y={ry + 1}
                width={cab.width - 2}
                height={rowH - 2}
                fill="red"
                opacity="0.18"
                rx={2}
                className="highlight-pulse"
              />
            )}
            {/* Medicine label */}
            <MedicineLabel
              medicines={medicines}
              highlightName={highlightName}
              isHighlighted={isRowHighlighted}
              x={cab.x}
              y={ry}
              width={cab.width}
              height={rowH}
              isRTL={isRTL}
            />
          </g>
        );
      })}
      {/* Door label — shown as Shelf N+1 */}
      <text
        x={isRTL ? cab.x + cab.width + 4 : cab.x - 4}
        y={doorY + doorHeight / 2}
        textAnchor={isRTL ? "start" : "end"}
        dominantBaseline="central"
        fontSize="9"
        fontWeight="700"
        fill="var(--on-surface)"
        opacity="0.6"
      >
        {t("layout.shelf")} {shelfIndex}
      </text>
    </g>
  );
}

function truncateText(text, maxWidth, fontSize) {
  const charWidth = fontSize * 0.55;
  const maxChars = Math.floor(maxWidth / charWidth);
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1) + "…";
}
