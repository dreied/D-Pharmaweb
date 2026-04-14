// src/services/homeCashBoxService.js
import { db } from "../db";
import { t } from "i18next";

// ---------------------------------------------------------
// Initialize HomeCashBox if missing  ✅ NO TRANSACTION HERE
// ---------------------------------------------------------
export async function initHomeCashBox() {
  const box = await db.homeCashBox.get(1);
  if (!box) {
    await db.homeCashBox.put({
      id: 1,
      amount: 0,
      lastReset: Date.now(),
      lastUpdated: Date.now()
    });
  }
}

// ---------------------------------------------------------
// Add money (positive = income, negative = expense)
// ✅ NO TRANSACTION: safe to call from other transactions
// ---------------------------------------------------------
export async function addToHomeCashBox(
  amount,
  type = "dailyCash",
  note = "",
  supplierName = null
) {
  await initHomeCashBox();
  const box = await db.homeCashBox.get(1);

  const newAmount = (box?.amount || 0) + amount;

  await db.homeCashBox.update(1, {
    amount: newAmount,
    lastUpdated: Date.now()
  });

  const now = new Date();
  const nowIso = now.toISOString();

  // Prevent accidental duplicate entries (same amount/type/note within 1.5s)
  const lastEntry = await db.homeCashBoxHistory.orderBy("date").last();
  if (
    lastEntry &&
    lastEntry.amount === amount &&
    lastEntry.type === type &&
    lastEntry.note === (note || t("homecash.defaultNote")) &&
    now.getTime() - new Date(lastEntry.date).getTime() < 1500
  ) {
    console.warn("Duplicate HomeCashBox history entry prevented");
    return;
  }

  const finalNote = note || t("homecash.defaultNote");

  let color = "neutral";
  if (type === "supplierPayment") color = "warning";
  else if (amount < 0) color = "danger";
  else if (amount > 0) color = "success";

  await db.homeCashBoxHistory.add({
    date: nowIso,
    amount,
    type,
    note: finalNote,
    color,
    supplierName: supplierName || null
  });
}

// ---------------------------------------------------------
// Read current amount
// ---------------------------------------------------------
export async function getHomeCashBoxAmount() {
  await initHomeCashBox();
  return db.homeCashBox.get(1);
}

// ---------------------------------------------------------
// last day of month for given date
// ---------------------------------------------------------
function getMonthEndDate(baseDate) {
  const d = new Date(baseDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  return new Date(year, month + 1, 0);
}

// ---------------------------------------------------------
// Monthly / automatic reset  ✅ HAS OWN TRANSACTION
// ---------------------------------------------------------
export async function checkAndResetHomeCashBox(resetInterval, resetTime) {
  return db.transaction(
    "rw",
    db.homeCashBox,
    db.homeCashBoxHistory,
    async () => {
      await initHomeCashBox();
      const box = await db.homeCashBox.get(1);

      const now = new Date();
      const [resetHour, resetMinute] = resetTime.split(":").map(Number);

      if (resetInterval === "manual") return;

      const lastResetDate = new Date(box.lastReset);
      const monthEnd = getMonthEndDate(lastResetDate);
      const nextReset = new Date(monthEnd);
      nextReset.setHours(resetHour, resetMinute, 0, 0);

      if (now >= nextReset && box.amount !== 0) {
        await db.homeCashBoxHistory.add({
          date: nextReset.toISOString(),
          amount: box.amount,
          type: "monthlyReset",
          note: t("homecash.monthlyReset"),
          color: "info",
          supplierName: null
        });

        await db.homeCashBox.update(1, {
          amount: 0,
          lastReset: now.getTime(),
          lastUpdated: now.getTime()
        });
      }
    }
  );
}

// ---------------------------------------------------------
// Manual reset button  ✅ HAS OWN TRANSACTION
// ---------------------------------------------------------
export async function manualResetHomeCashBox() {
  return db.transaction(
    "rw",
    db.homeCashBox,
    db.homeCashBoxHistory,
    async () => {
      await initHomeCashBox();
      const box = await db.homeCashBox.get(1);
      const now = new Date();

      if (box.amount !== 0) {
        await db.homeCashBoxHistory.add({
          date: now.toISOString(),
          amount: box.amount,
          type: "manualReset",
          note: t("homecash.manualReset"),
          color: "info",
          supplierName: null
        });
      }

      await db.homeCashBox.update(1, {
        amount: 0,
        lastReset: now.getTime(),
        lastUpdated: now.getTime()
      });
    }
  );
}

// ---------------------------------------------------------
// Withdraw  ✅ HAS OWN TRANSACTION
// ---------------------------------------------------------
export async function withdrawFromHomeCashBox(amount, note = "") {
  const withdrawAmount = -Math.abs(amount);

  return db.transaction(
    "rw",
    db.homeCashBox,
    db.homeCashBoxHistory,
    async () => {
      await initHomeCashBox();
      const box = await db.homeCashBox.get(1);

      const newAmount = (box?.amount || 0) + withdrawAmount;

      await db.homeCashBox.update(1, {
        amount: newAmount,
        lastUpdated: Date.now()
      });

      await db.homeCashBoxHistory.add({
        date: new Date().toISOString(),
        amount: withdrawAmount,
        type: "withdraw",
        note: note || t("homecash.withdrawRecord"),
        color: "danger",
        supplierName: null
      });
    }
  );
}
