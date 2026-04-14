import JSZip from "jszip";
import { db } from "../../db";
import { decryptBackup } from "./decrypt";

const EXCLUDED = ["universalPharmacy", "backupFolder", "users","backupHistory"];

export async function restoreFromEncryptedBackup(encryptedObj, password) {
  // 1) Decrypt to ZIP bytes
  const zipBytes = await decryptBackup(encryptedObj, password);

  // 2) Load ZIP
  const zip = await JSZip.loadAsync(zipBytes);

  // 3) Read metadata (optional use)
  const metadataFile = zip.file("metadata.json");
  if (!metadataFile) throw new Error("Invalid backup: missing metadata.json");
  const metadata = JSON.parse(await metadataFile.async("string"));
  console.log("Restoring backup from:", metadata.timestamp);

  // 4) Build data per table
  const dataByTable = {};

  for (const table of db.tables) {
    if (EXCLUDED.includes(table.name)) continue;

    const file = zip.file(`${table.name}.json`);
    if (!file) continue;

    const json = await file.async("string");
    dataByTable[table.name] = JSON.parse(json);
  }

  // 5) Transaction: clear + bulkAdd
  await db.transaction("rw", db.tables, async () => {
    for (const table of db.tables) {
      if (EXCLUDED.includes(table.name)) continue;
      if (!dataByTable[table.name]) continue;

      await table.clear();
      if (dataByTable[table.name].length > 0) {
        await table.bulkAdd(dataByTable[table.name]);
      }
    }
  });

  return true;
}
