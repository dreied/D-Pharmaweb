import SupplierCard from "./SupplierCard";
import { useTranslation } from "react-i18next";

export default function SupplierGrid({
  suppliers,
  onMakePayment,
  onAddSupplier,
  onViewDetails,
  onEditSupplier,
  onDeleteSupplier
}) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

      {suppliers.map((s) => (
        <SupplierCard
          key={s.id}
          supplier={s}
          onMakePayment={() => onMakePayment(s)}
          onViewDetails={() => onViewDetails(s)}
          onEditSupplier={() => onEditSupplier(s)}
          onDeleteSupplier={() => onDeleteSupplier(s)}
        />
      ))}

      {/* Add Supplier Card */}
      <div
        onClick={onAddSupplier}
        className="
          border-2 border-dashed border-outline-variant/30 
          rounded-xl flex flex-col items-center justify-center 
          p-8 bg-surface/30 hover:bg-white cursor-pointer transition
        "
      >
        <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-outline">add</span>
        </div>

        <span className="font-bold text-on-surface-variant">
          {t("suppliers.addSupplier")}
        </span>
      </div>

    </div>
  );
}
