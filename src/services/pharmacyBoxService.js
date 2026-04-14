// src/services/pharmacyBoxService.js
import { db } from "../db/index";
import { addToHomeCashBox } from "./homeCashBoxService";
import { t } from "i18next";

// ---------------------------------------------------------
// Initialize PharmacyBox if missing
// ---------------------------------------------------------
export async function initPharmacyBox() {
  return db.transaction("rw", db.pharmacyBox, async () => {
    const box = await db.pharmacyBox.get(1);
    if (!box) {
      await db.pharmacyBox.put({
        id: 1,
        amount: 0,
        lastReset: Date.now()
      });
    }
  });
}

// ---------------------------------------------------------
// Add money to PharmacyBox (positive = income, negative = expense)
// This is the CORRECT full-featured version
// ---------------------------------------------------------
export async function addCashToPharmacyBox(
  amount,
  type = "sale",
  note = "",
  supplierName = null
) {
return db.transaction(
  "rw",
  db.pharmacyBox,
  db.pharmacyBoxHistory,
  db.homeCashBox,          // ⭐ REQUIRED
  db.homeCashBoxHistory,   // ⭐ REQUIRED
  async () => {

      await initPharmacyBox();
      const box = await db.pharmacyBox.get(1);

      const newAmount = (box?.amount || 0) + amount;

      await db.pharmacyBox.update(1, {
        amount: newAmount
      });

      const now = new Date();
      const nowIso = now.toISOString();

      // Prevent duplicate history entries
      const lastEntry = await db.pharmacyBoxHistory.orderBy("date").last();
      if (
        lastEntry &&
        lastEntry.amount === amount &&
        lastEntry.type === type &&
        lastEntry.note === (note || t("cashbox.defaultNote")) &&
        now.getTime() - new Date(lastEntry.date).getTime() < 1500
      ) {
        console.warn("Duplicate PharmacyBox history entry prevented");
        return;
      }

      const finalNote = note || t("cashbox.defaultNote");

      let color = "neutral";
      if (type === "supplierPayment") color = "warning";
      else if (amount < 0) color = "danger";
      else if (amount > 0) color = "success";

      await db.pharmacyBoxHistory.add({
        date: nowIso,
        amount,
        type,
        note: finalNote,
        color,
        supplierName: supplierName || null
      });
    }
  );
}

// ---------------------------------------------------------
// Manual withdraw helper
// ---------------------------------------------------------
export async function withdrawFromPharmacyBox(
  amount,
  note = "",
  supplierName = null
) {
  const withdrawAmount = -Math.abs(amount);
  return addCashToPharmacyBox(
    withdrawAmount,
    "withdraw",
    note || t("cashbox.withdrawRecord"),
    supplierName
  );
}

// ---------------------------------------------------------
// Close Pharmacy Cashbox (manual or signout)
// ---------------------------------------------------------
export async function closePharmacyCashbox(reason = "manual") {
  return db.transaction(
    "rw",
    db.pharmacyBox,
    db.pharmacyBoxHistory,
    db.homeCashBox,
    db.homeCashBoxHistory,
    async () => {
      await initPharmacyBox();

      // Ensure HomeCashBox exists
      const home = await db.homeCashBox.get(1);
      if (!home) {
        await db.homeCashBox.put({
          id: 1,
          amount: 0,
          lastReset: Date.now()
        });
      }

      const box = await db.pharmacyBox.get(1);
      const now = new Date();
      const amount = box?.amount || 0;

      if (amount === 0) return;

      const noteKey =
        reason === "signout"
          ? "cashbox.closedOnSignout"
          : "cashbox.closedManually";

      // 1️⃣ Add history entry in PharmacyBox
      await db.pharmacyBoxHistory.add({
        date: now.toISOString(),
        amount,
        type: "manualReset",
        note: t(noteKey),
        color: "info",
        supplierName: null
      });

      // 2️⃣ Transfer money to HomeCashBox
      const homeBox = await db.homeCashBox.get(1);
      await db.homeCashBox.update(1, {
        amount: (homeBox.amount || 0) + amount
      });

      // 3️⃣ Add HomeCashBox history entry
      await db.homeCashBoxHistory.add({
        date: now.toISOString(),
        amount,
        type: "dailyCash",
        note: t(noteKey),
        color: "success",
        supplierName: null
      });

      // 4️⃣ Reset PharmacyBox
      await db.pharmacyBox.update(1, {
        amount: 0,
        lastReset: now.getTime()
      });
    }
  );
}

// ---------------------------------------------------------
// Automatic daily reset at 23:59 if enabled
// ---------------------------------------------------------
export async function checkAndResetPharmacyBox() {
  // 1️⃣ Read setting OUTSIDE the transaction
  const setting = await db.appSettings.get("cashbox_reset_interval");
  const resetInterval = setting?.value || "daily";

  if (resetInterval === "manual") return;

  // 2️⃣ Now run the transaction only on the stores you use inside
  return db.transaction(
    "rw",
    db.pharmacyBox,
    db.pharmacyBoxHistory,
    async () => {
      await initPharmacyBox();
      const box = await db.pharmacyBox.get(1);

      const now = new Date();
      const last = new Date(box.lastReset);

      const nextReset = new Date(last);
      nextReset.setDate(last.getDate() + 1);
      nextReset.setHours(23, 59, 0, 0);

      if (now >= nextReset && box.amount !== 0) {
        const amount = box.amount;

        await db.pharmacyBoxHistory.add({
          date: nextReset.toISOString(),
          amount,
          type: "reset",
          note: t("cashbox.closedManually"),
          color: "info",
          supplierName: null
        });

        await addToHomeCashBox(
          amount,
          "dailyCash",
          t("cashbox.closedManually"),
          null
        );

        await db.pharmacyBox.update(1, {
          amount: 0,
          lastReset: now.getTime()
        });
      }
    }
  );
}


// ---------------------------------------------------------
// Read current amount
// ---------------------------------------------------------
export async function getPharmacyBoxAmount() {
  await initPharmacyBox();
  return db.pharmacyBox.get(1);
}

export async function getPharmacyBoxLastReset() {
  await initPharmacyBox();
  const box = await db.pharmacyBox.get(1);
  return box?.lastReset || null;
}
