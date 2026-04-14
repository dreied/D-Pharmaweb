import JSZip from "jszip";

export async function createBackupZip(backup) {
  const zip = new JSZip();

  zip.file("metadata.json", JSON.stringify(backup.metadata, null, 2));

  for (const [table, rows] of Object.entries(backup.data)) {
    zip.file(`${table}.json`, JSON.stringify(rows, null, 2));
  }

  return await zip.generateAsync({ type: "uint8array" });
}
