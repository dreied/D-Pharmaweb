// src/services/returns/supplierReturn_v2.js
import { db } from "../../db";

export async function processSupplierReturn_v2(payload) {
  // payload: { supplierId, refundMethod: "cash" | "credit", reason, items: [...] }

  const supplierId = Number(payload.supplierId);
  if (!supplierId || isNaN(supplierId)) {
    throw new Error("Invalid supplierId in processSupplierReturn_v2");
  }

  // 1) Compute total
  const totalAmount = payload.items.reduce(
    (sum, it) => sum + it.quantity * it.purchasePrice,
    0
  );

  return db.transaction(
    "rw",
    db.stockBatches,
    db.supplierReturns,
    db.supplierReturnItems,
    db.suppliers,
    db.pharmacyBox,
    db.pharmacyBoxHistory,
    db.supplierPayments,
    async () => {
      const now = new Date();

      // 2) Deduct stock per batch
      for (const it of payload.items) {
        const batchId = Number(it.batchId);
        if (!batchId || isNaN(batchId)) continue;

        const batch = await db.stockBatches.get(batchId);
        if (!batch) continue;

        const newQty = (batch.quantity || 0) - it.quantity;
        if (newQty < 0) {
          throw new Error(`Return qty exceeds stock for batch ${batchId}`);
        }

        await db.stockBatches.update(batchId, { quantity: newQty });
      }

      // 3) Create supplierReturn header
      const supplierReturnId = await db.supplierReturns.add({
        supplierId,
        date: now,
        totalAmount,
        note: payload.reason || "",
      });

      // 4) Create supplierReturnItems
      for (const it of payload.items) {
        await db.supplierReturnItems.add({
          supplierReturnId,
          productId: it.productId,
          batchId: it.batchId,   // <-- ADD THIS
          quantity: it.quantity,
          amount: it.quantity * it.purchasePrice,
        });
      }

      // 5) Load supplier
      const supplier = await db.suppliers.get(supplierId);
      const oldBalance = supplier?.pastBalance || 0;

      // 6) Handle refund method
      if (payload.refundMethod === "cash") {
        // cash from supplier → cashbox increases
        const box = await db.pharmacyBox.get(1);
        const oldAmount = box?.amount || 0;
        const newAmount = oldAmount + totalAmount;

        await db.pharmacyBox.put({
          id: 1,
          amount: newAmount,
          lastReset: box?.lastReset || now,
        });

        await db.pharmacyBoxHistory.add({
          date: now,
          amount: totalAmount,
          type: "supplier_return_cash",
          color: "green",
          note: payload.reason || "",
          supplierName: supplier?.name || "",
        });

        // supplier balance unchanged in pure cash refund
        await db.suppliers.update(supplierId, {
          pastBalance: oldBalance,
        });
      }

      if (payload.refundMethod === "credit") {
        // credit refund → supplier balance decreases
        const newBalance = oldBalance - totalAmount;

        await db.suppliers.update(supplierId, {
          pastBalance: newBalance,
        });

        await db.supplierPayments.add({
          supplierId,
          amount: -totalAmount,
          timestamp: now,
          transactionId: `SUPPLIER_RETURN_${now.getTime()}`,
        });
      }

      return {
        supplierReturnId,
        supplierId,
        totalAmount,
        refundMethod: payload.refundMethod,
      };
    }
  );
}
