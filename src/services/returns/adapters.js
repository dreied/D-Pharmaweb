// src/services/returns/adapters.js

export function adaptSupplierReturnPayloadFromModal(result) {
  // result from SupplierReturnModal:
  // { supplierId, refundMethod, items, totalRefund, reason }

  return {
    supplierId: result.supplierId,
    refundMethod: result.refundMethod, // "cash" | "credit"
    reason: result.reason,
    items: result.items.map((it) => ({
      productId: it.productId,
      batchId: it.batchId,
      quantity: it.quantity,
      purchasePrice: it.purchasePrice,
    })),
  };
}
