import { db } from "../db";

export async function chooseBackupFolder() {
  const handle = await window.showDirectoryPicker();

  await db.backupFolder.put({ key: "folder", handle });

  return handle;
}

export async function loadBackupFolder() {
  const entry = await db.backupFolder.get("folder");
  return entry?.handle || null;
}

export async function saveBackupToFolder(blob, filename) {
  const folder = await loadBackupFolder();
  if (!folder) {
    alert("No backup folder selected");
    return;
  }

  const fileHandle = await folder.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}
