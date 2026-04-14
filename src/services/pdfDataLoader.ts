// src/services/pdfDataLoader.ts
import { db } from "../db";

// ------------------------------
// Load pharmacy settings
// ------------------------------
export async function loadPharmacySettings() {
  const nameSetting = await db.appSettings.get("pharmacy_name");
  const logoSetting = await db.appSettings.get("pharmacy_logo");

  return {
    pharmacyName: nameSetting?.value || "",
    pharmacyLogo: logoSetting?.value || null,
  };
}

// ------------------------------
// Load supplier info
// ------------------------------
export async function loadSupplierInfo(supplierId) {
  const supplier = await db.suppliers.get(supplierId);

  return {
    supplierName: supplier?.name || "",
    supplierPhone: supplier?.phone || "",
  };
}

// ------------------------------
// Load Supplier Return (header + items)
// ------------------------------
export async function loadSupplierReturn(returnId) {
  const header = await db.supplierReturns.get(returnId);
  if (!header) throw new Error("Supplier return not found");

  const items = await db.supplierReturnItems
    .where("supplierReturnId")
    .equals(returnId)
    .toArray();

  return {
    header,
    items,
  };
}

// ------------------------------
// Build Supplier Return PDF Data
// ------------------------------
export async function buildSupplierReturnPDFData(returnId) {
  // Load header + items
  const { header, items } = await loadSupplierReturn(returnId);

  // Load pharmacy info
  const { pharmacyName, pharmacyLogo } = await loadPharmacySettings();

  // Load supplier info
  const { supplierName, supplierPhone } = await loadSupplierInfo(
    header.supplierId
  );

  // Build PDF items
  const pdfItems = [];

  for (const it of items) {
    const product = await db.stockProducts.get(it.productId);
    const batch = await db.stockBatches.get(it.batchId);

    pdfItems.push({
      name: product?.nameAr || product?.nameEn || "",
      barcode: product?.barcode || "",
      batch: batch?.batch || "",
      qty: it.quantity,
      purchasePrice: batch?.purchasePrice || 0, // RAW number
      total: it.amount,
    });
  }

  return {
    pharmacyName,
    pharmacyLogo,
    supplierName,
    supplierPhone,
    returnId,
    returnDate: new Date(header.date).toLocaleString(),
    totalAmount: header.totalAmount,
    items: pdfItems,
  };
}
