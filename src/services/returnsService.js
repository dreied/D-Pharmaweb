// src/services/returnsService.js
import { db } from "../db";
import { addCashToPharmacyBox } from "./pharmacyBoxService";
import { addToHomeCashBox } from "./homeCashBoxService";

/**
 * Refund money to the customer.
 * Priority:
 *   1) Deduct from pharmacyBox
 *   2) If not enough, deduct the rest from homeCashBox
 *
 * @param {number} totalRefund - amount to refund
 * @param {string} note - localized note (already translated)
 */
export async function refundFromCashboxes(totalRefund, note) {
  if (!totalRefund || totalRefund <= 0) return;

  const pharmacy = await db.pharmacyBox.get(1);
  const pharmacyAmount = pharmacy?.amount || 0;

  // Deduct from pharmacyBox first
  if (pharmacyAmount >= totalRefund) {
    await addCashToPharmacyBox(-totalRefund, "saleReturn", note, null);
    return;
  }

  // Deduct what we can from pharmacyBox
  if (pharmacyAmount > 0) {
    await addCashToPharmacyBox(-pharmacyAmount, "saleReturn", note, null);
  }

  // Deduct the rest from homeCashBox
  const remaining = totalRefund - pharmacyAmount;
  await addToHomeCashBox(-remaining, "saleReturn", note, null);
}
