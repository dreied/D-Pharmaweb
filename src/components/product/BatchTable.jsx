import { useState } from "react";
import { useTranslation } from "react-i18next";
import EditBatchModal from "./EditBatchModal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { db } from "../../db/index";
import { useAuth } from "../../context/AuthContext";

import { formatPrice } from "../../currency";

export default function BatchTable({
  batches,
  reload,
  useNewCurrency,
  currencySymbol
}) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  const isAdmin = currentUser?.role === "admin";

  const [editBatch, setEditBatch] = useState(null);
  const [deleteBatch, setDeleteBatch] = useState(null);

  async function deleteBatchNow() {
    if (!isAdmin) {
      alert(t("security.users.accessDenied") || "Access denied");
      return;
    }

    await db.stockBatches.delete(deleteBatch.id);
    setDeleteBatch(null);
    reload();
  }

  return (
    <div className="rounded-xl border border-outline-variant/20 p-6 bg-surface-container-low shadow-sm">
      <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined">inventory</span>
        {t("stock.batches")}
      </h3>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-xs uppercase text-on-surface-variant border-b">
            <th className="px-6 py-3 text-left">{t("stock.batchId")}</th>
            <th className="px-6 py-3 text-left">{t("stock.expiryDate")}</th>
            <th className="px-6 py-3 text-left">{t("stock.quantity")}</th>
            <th className="px-6 py-3 text-left">{t("stock.purchasePrice")}</th>
            <th className="px-6 py-3 text-left">{t("stock.salePrice")}</th>
            <th className="px-6 py-3 text-left">{t("stock.columns.actions")}</th>
          </tr>
        </thead>

        <tbody>
          {batches.map((b) => (
            <tr key={b.id} className="border-b">
              <td className="px-6 py-3">{b.batch}</td>
              <td className="px-6 py-3">
                {b.expiry ? new Date(b.expiry).toLocaleDateString() : "-"}
              </td>
              <td className="px-6 py-3">{b.quantity}</td>

              {/* PURCHASE PRICE */}
              <td className="px-6 py-3 text-secondary font-bold">
                {(() => {
                  const { formatted, symbol } = formatPrice(
                    b.purchasePrice || 0,
                    useNewCurrency,
                    currencySymbol
                  );
                  return `${formatted} ${symbol}`;
                })()}
              </td>

              {/* SALE PRICE */}
              <td className="px-6 py-3 text-primary font-bold">
                {(() => {
                  const { formatted, symbol } = formatPrice(
                    b.salePrice || 0,
                    useNewCurrency,
                    currencySymbol
                  );
                  return `${formatted} ${symbol}`;
                })()}
              </td>

              <td className="px-6 py-3 flex gap-2">

                {/* EDIT BUTTON — Admin only */}
                {isAdmin && (
                  <button
                    className="text-primary hover:underline flex items-center gap-1"
                    onClick={() => setEditBatch(b)}
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    {t("edit")}
                  </button>
                )}

                {/* DELETE BUTTON — Admin only */}
                {isAdmin && (
                  <button
                    className="text-error hover:underline flex items-center gap-1"
                    onClick={() => setDeleteBatch(b)}
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    {t("delete")}
                  </button>
                )}

              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editBatch && (
        <EditBatchModal
          batch={editBatch}
          onClose={() => setEditBatch(null)}
          reload={reload}
        />
      )}

      {deleteBatch && (
        <ConfirmDeleteModal
          title={t("delete")}
          message={t("deleteBatchConfirm")}
          onConfirm={deleteBatchNow}
          onCancel={() => setDeleteBatch(null)}
        />
      )}
    </div>
  );
}
