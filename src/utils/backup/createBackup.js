import { db } from "../../db";

export async function createBackupData() {
  const excluded = ["universalPharmacy", "backupFolder", "users","backupHistory"];

  const data = {};

  for (const table of db.tables) {
    if (!excluded.includes(table.name)) {
      data[table.name] = await table.toArray();
    }
  }

  const metadata = {
    version: db.verno,
    timestamp: new Date().toISOString(),
    tableCounts: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v.length])
    )
  };

  return { metadata, data };
}
