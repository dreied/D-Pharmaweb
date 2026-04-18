// src/utils/deviceFolder.js
import { openDB } from "idb";

const DB_NAME = "dpharmacy_device";
const STORE = "folder";

/* -------------------------------------------------------
   Permission helper (prevents double-selection issue)
------------------------------------------------------- */
async function ensurePermission(handle) {
  const opts = { mode: "readwrite" };

  // Already granted
  if ((await handle.queryPermission(opts)) === "granted") return true;

  // Request permission
  if ((await handle.requestPermission(opts)) === "granted") return true;

  return false;
}

/* -------------------------------------------------------
   Save folder handle in IndexedDB
------------------------------------------------------- */
export async function saveFolderHandle(handle) {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    },
  });

  await db.put(STORE, handle, "folderHandle");
}

/* -------------------------------------------------------
   Load folder handle from IndexedDB
------------------------------------------------------- */
export async function loadFolderHandle() {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    },
  });

  return db.get(STORE, "folderHandle");
}

/* -------------------------------------------------------
   Read device.id safely
------------------------------------------------------- */
export async function readDeviceId(handle) {
  if (!handle) return null;

  const ok = await ensurePermission(handle);
  if (!ok) return null;

  try {
    const fileHandle = await handle.getFileHandle("device.id");
    const file = await fileHandle.getFile();
    return (await file.text()).trim();
  } catch (e) {
    console.error("Failed to read device.id:", e);
    return null;
  }
}

/* -------------------------------------------------------
   Auto-detect DPharmacy folder inside Documents
------------------------------------------------------- */
async function autoDetectDPharmacy() {
  try {
    const docs = await window.showDirectoryPicker({ startIn: "documents" });

    for await (const entry of docs.values()) {
      if (entry.kind === "directory" && entry.name === "DPharmacy") {
        const ok = await ensurePermission(entry);
        return ok ? entry : null;
      }
    }

    return null;
  } catch (e) {
    return null;
  }
}

/* -------------------------------------------------------
   Main function: pick device folder
   - Auto-detects DPharmacy
   - If not found, lets user select manually
------------------------------------------------------- */
export async function pickDeviceFolder() {
  // 1. Try auto-detect
  const auto = await autoDetectDPharmacy();
  if (auto) return auto;

  // 2. Manual selection fallback
  try {
    const handle = await window.showDirectoryPicker({ startIn: "documents" });

    const ok = await ensurePermission(handle);
    if (!ok) return null;

    return handle;
  } catch (e) {
    return null;
  }
}
