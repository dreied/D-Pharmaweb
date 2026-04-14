import Dexie from "dexie";

export const db = new Dexie("pharmacy");

// Version 10 — keeps ALL fields, only adds indexes for fast search
db.version(11).stores({
  customers: "++id, name, phone, balance, createdAt",
  customerPayments: "++id, customerId, name, amount, date, type",
  sales: "++id, customerId, paymentMethod, total, date, previousBalance, paidNow, newBalance, isDebt",


  saleItems: "++id, saleId, productId, batchId, batchNumber, quantity, price, total, returnedQty",


  cashBox: "++id, amount, date, note",
  pharmacyBox: "id, amount, lastReset",
 pharmacyBoxHistory:
  "++id, date, amount, qty, salePrice, purchasePrice, productId, nameEn, nameAr, type, color, note, supplierName",

homeCashBox: "id, amount, lastReset, lastUpdated",

 homeCashBoxHistory: "++id, date, amount, type, note, color, supplierName",

  universalPharmacy:
    "id, purchasePrice, salePrice, form, allBarcodes, date, boxFashion, company, indications, antidotes, c3, dosage, fact, *nameEn, *nameAr, *barcode",

  stockProducts:
    "++id, nameAr, nameEn, barcode, purchasePrice, salePrice, form, company, categoryId, isAccessory, minQty, shelf, shelfRow, cabinet, cabinetRow",

  stockBatches:
  "++id, stockProductId, batch, expiry, quantity, purchasePrice, salePrice, supplierId",


  productBarcodes: "++id, stockProductId, barcode",

  suppliers:
    "++id, name, phone, imageUrl, icon, pastBalance, createdAt",

  supplierPayments:
    "++id, supplierId, amount, timestamp, transactionId",

  // 🔹 NEW: per‑item stock entries for suppliers
  supplierStockEntries: 
  "++id, purchaseId, supplierId, supplierName, stockProductId, medicineName, quantity, purchasePrice, expiryDate, batchNumber, timestamp",


  // 🔹 NEW: stock purchase payments for suppliers
  supplierStockPurchases:
    "++id, supplierId, supplierName, totalCost, amountPaid, remainingBalance, timestamp, transactionId, type",

  categories: "++id, name",

  users: "++id, username, role, passwordHash, salt",
  backupHistory: "++id, timestamp, filename",

  appSettings: "key, value",
  backupFolder: "key",

salesReturns:
  "++id, saleId, date, totalRefund, note",

salesReturnItems:
  "++id, salesReturnId, saleItemId, productId, quantity, refundAmount",


supplierReturns:
  "++id, supplierId, date, totalAmount, note",

supplierReturnItems:
  "++id, supplierReturnId, productId, batchId, quantity, amount",

notifications: "++id, type, message, link, createdAt, read",


});

window.db = db;

db.open().catch((err) => {
  console.error("DEXIE INIT ERROR:", err);
});
