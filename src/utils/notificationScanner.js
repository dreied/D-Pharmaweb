import { db } from "../db";
import { t } from "i18next";

export async function scanNotifications() {
  const setting = await db.appSettings.get("nearExpiryDays");
  const nearExpiryDays = setting?.value || 30;

  const batches = await db.stockBatches.toArray();

  for (const b of batches) {
    const product = await db.stockProducts.get(b.stockProductId);
    if (!product) continue;

    const name = product.nameAr || product.nameEn || "Unknown";
    const daysLeft =
      (new Date(b.expiry) - new Date()) / (1000 * 60 * 60 * 24);

    if (daysLeft < 0) {
      await add("expired", name, "/dashboard", "expiry");
    }

    if (daysLeft >= 0 && daysLeft <= nearExpiryDays) {
      await add("nearExpiry", name, "/dashboard", "expiry");
    }

    if (b.quantity === 0) {
      await add("outOfStock", name, "/dashboard", "stock");
    }

    if (product.minQty && b.quantity > 0 && b.quantity <= product.minQty) {
      await add("lowStock", name, "/dashboard", "stock");
    }
  }

  // CUSTOMER NOTIFICATIONS
  const customers = await db.customers.toArray();
  const now = new Date();

  for (const c of customers) {
    const balance = c.balance || 0;
    const createdAt = new Date(c.createdAt);
    const daysSinceDebt = (now - createdAt) / (1000 * 60 * 60 * 24);

    if (balance >= 50000) {
      await add("highDebt", c.name, "/debt", "customers");
    }

    if (daysSinceDebt >= 30) {
      await add("overdueCustomer", c.name, "/debt", "customers");
    }
  }

  // SYSTEM NOTIFICATIONS (optional)
  const updateAvailable = false;
  if (updateAvailable) {
    await add("updateAvailable", "", "/settings", "system");
  }

  const dbUpdate = false;
  if (dbUpdate) {
    await add("updateDatabase", "", "/settings", "system");
  }
}

async function add(type, name, link, category) {
  const message = t(`notifications.${type}`, { name });

  const exists = await db.notifications
    .where({ type, message })
    .first();

  if (exists) return;

  await db.notifications.add({
    type,
    message,
    link,
    category,
    read: false,
    createdAt: Date.now()
  });
}
