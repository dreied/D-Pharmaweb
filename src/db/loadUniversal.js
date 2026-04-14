// src/db/loadUniversalIfEmpty.js
import { db } from "./index";
import { normalizeRow } from "../utils/update";

export async function loadUniversalIfEmpty() {
  // 1) If data already exists, do nothing
  const count = await db.universalPharmacy.count();
  if (count > 0) return;

  // 2) Load bundled offline JSON
  const raw = await fetch("/D-Pharma.json").then((r) => r.json());

  // 3) Normalize using the SAME logic as GitHub updates
  const cleaned = raw.map(normalizeRow);

  // 4) Save normalized data into Dexie
  await db.universalPharmacy.bulkAdd(cleaned);

  // 5) Save version = 1 ONLY if not already set
  const existing = await db.appSettings.get("universalVersion");
  if (!existing) {
    await db.appSettings.put({
      key: "universalVersion",
      value: 1,
    });
  }

  console.log("Loaded offline universalPharmacy:", cleaned.length);
}
