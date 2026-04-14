import { db } from "../db";

// Generate next batch for a specific product
export async function generateNextBatch(productNameEn) {
  if (!productNameEn) {
    // fallback if product has no name yet
    return "BATCH-" + Date.now();
  }

  const prefix = productNameEn
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 4); // PARA, AMOX, IBUP, etc.

  // Find last batch for this product
  const last = await db.stockBatches
    .where("batch")
    .startsWith(prefix + "-")
    .last();

  if (!last) {
    return `${prefix}-001`;
  }

  const lastNumber = Number(last.batch.split("-")[1] || "0");
  const nextNumber = (lastNumber + 1).toString().padStart(3, "0");

  return `${prefix}-${nextNumber}`;
}
