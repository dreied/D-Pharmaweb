import { db } from "../db/index";

export async function findSalesByBarcode(barcode) {
  // 1. Find product
  let product =
    await db.stockProducts.where("barcode").equals(barcode).first();

  if (!product) {
    const alt = await db.productBarcodes
      .where("barcode")
      .equals(barcode)
      .first();
    if (alt) product = await db.stockProducts.get(alt.stockProductId);
  }

  if (!product) return [];

  // 2. Find sale items
  const saleItems = await db.saleItems
    .where("productId")
    .equals(product.id)
    .toArray();

  if (saleItems.length === 0) return [];

  const saleIds = [...new Set(saleItems.map((i) => i.saleId))];
  const sales = await db.sales.bulkGet(saleIds);

  // 3. Load customers
  const customerIds = [...new Set(sales.map((s) => s?.customerId).filter(Boolean))];
  const customers = await db.customers.bulkGet(customerIds);

  return sales
    .filter(Boolean)
    .map((sale) => {
      const items = saleItems.filter((i) => i.saleId === sale.id);
      const customer = customers.find((c) => c?.id === sale.customerId);

      return {
        sale,
        items,
        product,
        customerName: customer?.name || "-",
        saleDate: sale.date
      };
    });
}
