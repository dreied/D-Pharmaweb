// src/utils/deviceFolder.js
import { openDB } from "idb";

const DB_NAME = "dpharmacy_device";
const STORE = "folder";

/** Persist folder handle in IndexedDB */
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

/** Load folder handle from IndexedDB */
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

/** Read device.id from a folder handle */
export async function readDeviceId(handle) {
  const fileHandle = await handle.getFileHandle("device.id");
  const file = await fileHandle.getFile();
  return (await file.text()).trim();
}

/**
 * Try to auto-detect the license folder.
 * We expect the EXE to write to:
 *   C:\Users\Public\Documents\DPharmacy
 *
 * Browser cannot jump directly to that path, but we can start in "documents"
 * and look for a folder named "DPharmacy".
 */
export async function tryAutoDetectFolder() {
  try {
    const docsHandle = await window.showDirectoryPicker({
      startIn: "documents",
    });

    // Look for DPharmacy inside Documents
    for await (const entry of docsHandle.values()) {
      if (entry.kind === "directory" && entry.name === "DPharmacy") {
        return entry;
      }
    }

    return null;
  } catch (e) {
    // User cancelled or permission denied
    return null;
  }
}
