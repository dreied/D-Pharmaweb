// src/db/loadUniversal.js
import { db } from "./index";
import { normalizeRow } from "../utils/update.js";

export async function loadUniversalIfEmpty() {
  // 1) If data already exists, do nothing
  const count = await db.universalPharmacy.count();
  if (count > 0) return;

  console.log("⏳ First‑time setup: loading offline universal database…");

  // 2) Load bundled offline JSON
  const raw = await fetch("/d-pharma-web/D-Pharma.json").then((r) => r.json());

  // 3) Normalize + strict ID validation + debug logging
  const cleaned = [];

  for (const row of raw) {
    const normalized = normalizeRow(row);

    // Skip null rows from normalizeRow
    if (!normalized) {
      console.warn("❌ Skipped row (normalizeRow returned null):", row);
      continue;
    }

    const id = normalized.id;

    // Strict ID validation
    if (
      id === undefined ||
      id === null ||
      id === "" ||
      String(id).trim() === "" ||
      String(id).trim().toLowerCase() === "nan" ||
      String(id).trim().toLowerCase() === "null" ||
      String(id).trim().toLowerCase() === "undefined"
    ) {
      console.warn("❌ Skipped row with invalid ID:", id, "Row:", row);
      continue;
    }

    cleaned.push(normalized);
  }

  console.log(`✔ Valid rows to insert: ${cleaned.length}`);

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

  console.log("🎉 Loaded offline universalPharmacy:", cleaned.length);
}
