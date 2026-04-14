// src/services/returns/salesReturn_v2.js
import { db } from "../../db";
import { refundFromCashboxes } from "../returnsService";

export async function processSaleReturn_v2(payload) {
  const {
    saleId,
    items, // [{ saleItemId, quantity }]
    note, // t("returns.customerReturn")
    customerReturnLabel, // t("customer.return")
    extraRefundLabel, // t("customer.extraRefund")
  } = payload;

  if (!items || items.length === 0) return;

  await db.transaction(
    "rw",
    db.sales,
    db.salesReturns,
    db.salesReturnItems,
    db.saleItems,
    db.stockBatches,
    db.pharmacyBox,
    db.pharmacyBoxHistory,
    db.homeCashBox,
    db.homeCashBoxHistory,
    db.customers,
    db.customerPayments,
    async () => {
      const now = new Date().toISOString();
      const sale = await db.sales.get(saleId);
      if (!sale) return;

      // 1) Compute total refund based on original sale items
      let totalRefund = 0;
      const enrichedItems = [];

      for (const it of items) {
        const saleItem = await db.saleItems.get(it.saleItemId);
        if (!saleItem) continue;

        const price = saleItem.price || 0;
        const qty = Math.min(
          Math.max(it.quantity || 0, 0),
          (saleItem.quantity || 0) - (saleItem.returnedQty || 0)
        );
        if (qty <= 0) continue;

        const lineRefund = qty * price;
        totalRefund += lineRefund;

        enrichedItems.push({
          saleItemId: it.saleItemId,
          productId: saleItem.productId,
          batchId: saleItem.batchId,
          quantity: qty,
          price,
          refundAmount: lineRefund,
        });
      }

      if (enrichedItems.length === 0 || totalRefund <= 0) return;

      // 2) Save return header
      const salesReturnId = await db.salesReturns.add({
        saleId,
        date: now,
        totalRefund,
        note,
      });

      // 3) Save return items + update returnedQty
      for (const r of enrichedItems) {
        await db.salesReturnItems.add({
          salesReturnId,
          saleItemId: r.saleItemId,
          productId: r.productId,
          quantity: r.quantity,
          refundAmount: r.refundAmount,
        });

        const original = await db.saleItems.get(r.saleItemId);
        const prevReturned = original?.returnedQty || 0;
        const maxQty = original?.quantity || 0;

        const newReturned = Math.min(prevReturned + r.quantity, maxQty);

        await db.saleItems.update(r.saleItemId, {
          returnedQty: newReturned,
        });
      }

      // 4) Restore stock to ORIGINAL batch (Option B)
      for (const r of enrichedItems) {
        if (!r.quantity || r.quantity <= 0) continue;

        if (r.batchId) {
          const batch = await db.stockBatches.get(r.batchId);
          if (batch) {
            await db.stockBatches.update(r.batchId, {
              quantity: (batch.quantity || 0) + r.quantity,
            });
            continue;
          }
        }

        // Fallback: create a RETURN batch if original batch is missing
        await db.stockBatches.add({
          stockProductId: r.productId,
          batch: "RETURN",
          expiry: null,
          quantity: r.quantity,
          purchasePrice: 0,
          salePrice: r.price || 0,
        });
      }

      // 5) Financial logic
      if (sale.paymentMethod === "debt" && sale.customerId) {
        const customer = await db.customers.get(sale.customerId);
        const oldBalance = customer?.balance || 0;

        let newBalance = oldBalance - totalRefund;

        // Normal debt-return record
        await db.customerPayments.add({
          customerId: sale.customerId,
          name: customerReturnLabel,
          amount: -totalRefund,
          date: now,
          type: "return",
          saleId: sale.id,
        });

        // Extra refund if balance goes negative
        if (newBalance < 0) {
          const extraRefund = Math.abs(newBalance);

          await refundFromCashboxes(extraRefund, note);

          await db.customerPayments.add({
            customerId: sale.customerId,
            name: extraRefundLabel,
            amount: -extraRefund,
            date: now,
            type: "extra_refund",
            saleId: sale.id,
          });

          newBalance = 0;
        }

        await db.customers.update(sale.customerId, {
          balance: newBalance,
          lastUpdated: now,
        });
      } else {
        // CASH SALE → refund from cashboxes
        await refundFromCashboxes(totalRefund, note);
      }
    }
  );
}
