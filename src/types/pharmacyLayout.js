// Shape of the pharmacy 3D layout. Stored as a single row in Dexie:
// db.pharmacyLayout = { id: "default", layout: PharmacyLayout }

export const WALLS = ["front", "right", "back", "left"];

export const WALL_LABELS = {
  front: "Front Wall",
  right: "Right Wall",
  back: "Back Wall",
  left: "Left Wall",
};

export const CABINET_PALETTE = [
  "#06b6d4", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#3b82f6", "#14b8a6",
];

// A fresh empty layout (4 walls, 0 cabinets).
export const DEFAULT_LAYOUT = {
  id: "default",
  walls: WALLS.map((w) => ({
    id: w,
    label: WALL_LABELS[w],
    dataUrl: null,
  })),
  cabinets: [],
  updatedAt: new Date().toISOString(),
};

/**
 * Cabinet shape (for reference):
 * {
 *   id: string,
 *   label: string,        // "A", "B", ...
 *   wall: "front"|"right"|"back"|"left",
 *   x, y, width, height: number,   // 0..1 normalized on the wall photo
 *   color: string,        // hex
 *   shelves: [
 *     {
 *       id, label,                // "S1"
 *       yTop, yBottom: number,    // 0..1 inside the cabinet
 *       rows: [{ id, label }]     // "1", "2", "3"
 *     }
 *   ]
 * }
 *
 * HighlightTarget:
 * { cabinetLabel, shelfLabel, rowLabel, medicineName? }
 */

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/**
 * Safely set a wall photo. Guards against missing layout/walls.
 */
export function setWallPhoto(layout, wallId, dataUrl) {
  if (!layout) return DEFAULT_LAYOUT;
  if (!Array.isArray(layout.walls)) {
    return { ...layout, walls: DEFAULT_LAYOUT.walls };
  }

  return {
    ...layout,
    walls: layout.walls.map((w) =>
      w.id === wallId ? { ...w, dataUrl } : w
    ),
    updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------
// SAVE LAYOUT TO DEXIE (used by 3D viewer)
// ---------------------------------------------
export async function savePharmacyLayout(layout) {
  if (!window.db) return;

  try {
    await window.db.pharmacyLayout.put({
      id: "default",
      layout: layout, // ⭐ always wrap inside "layout"
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to save pharmacy layout:", err);
  }
}
