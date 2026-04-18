// src/db/layoutStorage.js
import { db } from "./index";
import { DEFAULT_LAYOUT } from "../types/pharmacyLayout";

const LAYOUT_ID = "default";

export async function loadPharmacyLayout() {
  const existing = await db.pharmacyLayout.get(LAYOUT_ID);
  if (existing && existing.layout) return existing.layout;

  // If not found → save default and return it
  const layout = DEFAULT_LAYOUT;
  await db.pharmacyLayout.put({ id: LAYOUT_ID, layout });
  return layout;
}

export async function savePharmacyLayout(layout) {
  await db.pharmacyLayout.put({ id: LAYOUT_ID, layout });
}
