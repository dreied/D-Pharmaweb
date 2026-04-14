// src/services/returns/salesReturnAdapter.js

// rows = [{ saleItemId, returnQty, ... }]
export function buildSalesReturnPayload({
  saleId,
  rows,
  note,
  customerReturnLabel,
  extraRefundLabel,
}) {
  const items = rows
    .filter((r) => r.returnQty > 0)
    .map((r) => ({
      saleItemId: r.saleItemId,
      quantity: r.returnQty,
    }));

  return {
    saleId,
    items,
    note,
    customerReturnLabel,
    extraRefundLabel,
  };
}
