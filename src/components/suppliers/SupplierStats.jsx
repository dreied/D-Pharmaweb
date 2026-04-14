import { useTranslation } from "react-i18next";

export default function SupplierStats({ stats }) {
  const { t } = useTranslation();

  return (
   <div className="col-span-12 bg-surface-container-low p-5 rounded-xl relative overflow-hidden">

  {/* Decorative circle */}
  <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />

  {/* SMALLER TITLE */}
  <span className="text-[14px] font-bold tracking-[0.18em] text-primary uppercase">
    {t("suppliers.accountsPayable")}
  </span>

  {/* SMALLER HEADING */}
  <h3 className="text-2xl font-headline font-extrabold text-on-surface mt-1">
    {t("suppliers.totalOutstanding")}
  </h3>

  {/* SMALLER DESCRIPTION */}
  <p className="text-on-surface-variant text-sm max-w-md mt-1">
    {t("suppliers.totalOutstandingDescription", {
      count: stats.supplierCount,
      pending: stats.pendingSuppliers
    })}
  </p>

  {/* TOTAL OUTSTANDING */}
  <div className="mt-6 flex items-end gap-2">
    <span
      className={`text-4xl font-headline font-black leading-none ${stats.totalOutstandingColor}`}
    >
      {stats.totalOutstandingFormatted} {stats.totalOutstandingSymbol}
    </span>
  </div>

</div>

  );
}


       