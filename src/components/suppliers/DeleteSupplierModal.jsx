import { useTranslation } from "react-i18next";
import { db } from "../../db";

export default function DeleteSupplierModal({ open, supplier, onClose }) {
  const { t } = useTranslation();

  if (!open || !supplier) return null;

  const confirmDelete = async () => {
    await db.suppliers.delete(supplier.id);
    // Optionally also delete related payments/invoices:
    // await db.supplierPayments.where("supplierId").equals(supplier.id).delete();
    // await db.supplierInvoices.where("supplierId").equals(supplier.id).delete();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-xl w-[420px]">
        <h2 className="text-xl font-bold mb-3 text-error">
          {t("suppliers.deleteSupplier")}
        </h2>
        <p className="text-sm text-on-surface-variant mb-6">
          {t("suppliers.deleteConfirm", { name: supplier.name })}
        </p>

        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface"
            onClick={onClose}
          >
            {t("suppliers.cancel")}
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-error text-on-error font-semibold"
            onClick={confirmDelete}
          >
            {t("suppliers.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}
