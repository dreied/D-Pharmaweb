import { useTranslation } from "react-i18next";

export default function StatsCards({
  totalMedicines,
  totalValue,
  stockItems,
  useNewCurrency,
  currencySymbol,
  i18n,
  expiryWarningMonths,
  onFilter
}) {
  const { t } = useTranslation();

  // Currency conversion
  const visualTotal = useNewCurrency ? totalValue / 100 : totalValue;

  // Resolve symbol
  let symbol;
  if (currencySymbol === "USD") {
    symbol = "$";
  } else if (currencySymbol === "SYP") {
    symbol = i18n.language === "ar" ? "ل.س" : "SYP";
  } else {
    symbol = currencySymbol;
  }

  // Expired items
  const expiredCount = stockItems.filter(
    (i) => i.expiry && new Date(i.expiry) < new Date()
  ).length;

  // Almost expired items (within X months)
  const warningDate = new Date();
  warningDate.setMonth(warningDate.getMonth() + expiryWarningMonths);

  const almostExpiredCount = stockItems.filter(
    (i) =>
      i.expiry &&
      new Date(i.expiry) >= new Date() &&
      new Date(i.expiry) <= warningDate
  ).length;

  // Low stock logic
  const lowStockCount = stockItems.filter(
    (i) =>
      i.totalQty > 0 &&
      i.product.minQty != null &&
      i.totalQty <= i.product.minQty
  ).length;

 return (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

  {/* Total Inventory */}
  <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border-l-4 border-primary
                  opacity-0 translate-y-3 animate-fadeInUp">
    <div className="flex justify-between items-start mb-3">
      <span className="text-base font-bold text-on-surface-variant uppercase tracking-widest">
        {t("stock.stats.totalInventory")}
      </span>

      <div className="bg-primary-container/20 p-2 rounded-lg text-primary">
        <span className="material-symbols-outlined text-xl">inventory_2</span>
      </div>
    </div>

    <div className="text-[2.3rem] font-extrabold text-primary-dim leading-none">
      {totalMedicines}
    </div>

    <div className="text-[16px] text-primary-dim mt-1  font-extrabold">
      {t("stock.totalValue")}: {visualTotal.toLocaleString("en-US")} {symbol}
    </div>
  </div>

  {/* Low Stock + Out of Stock */}
  <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border-l-4 border-orange-500
                  opacity-0 translate-y-3 animate-fadeInUp cursor-pointer">
    <div className="flex flex-col items-center mb-3">
      <span className="text-base font-bold text-on-surface-variant uppercase tracking-widest text-center">
        {t("stock.stats.lowStockAlerts")}
      </span>

      <div className="bg-orange-100 p-2 rounded-lg text-orange-600 mt-1">
        <span className="material-symbols-outlined text-xl">warning</span>
      </div>
    </div>

    <div className="flex items-center justify-between">

      {/* OUT OF STOCK */}
      <button type="button" onClick={() => onFilter("outOfStock")} className="text-center flex-1">
        <div className="text-[2.3rem] font-extrabold text-red-700 leading-none">
          {stockItems.filter((i) => i.totalQty === 0).length}
        </div>
        <div className="text-[13px] text-red-700 mt-1 font-extrabold">
          {t("stock.stats.outOfStock")}
        </div>
      </button>

      <div className="w-px h-10 bg-surface-container-high mx-3"></div>

      {/* LOW STOCK */}
      <button type="button" onClick={() => onFilter("lowStock")} className="text-center flex-1">
        <div className="text-[2.3rem] font-extrabold text-orange-600 leading-none">
          {lowStockCount}
        </div>
        <div className="text-[13px] text-orange-600 mt-1 font-extrabold">
          {t("stock.stats.lowStock")}
        </div>
      </button>

    </div>
  </div>

  {/* Expired + Almost Expired */}
  <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border-l-4 border-red-500
                  opacity-0 translate-y-3 animate-fadeInUp">
    <div className="flex flex-col items-center mb-3">
      <span className="text-base font-bold text-on-surface-variant uppercase tracking-widest text-center">
        {t("stock.stats.expired")}
      </span>

      <div className="bg-red-100 p-2 rounded-lg text-red-600 mt-1">
        <span className="material-symbols-outlined text-xl">event_busy</span>
      </div>
    </div>

    <div className="flex items-center justify-between">

      {/* EXPIRED */}
      <button type="button" onClick={() => onFilter("expired")} className="text-center flex-1">
        <div className="text-[2.3rem] font-extrabold text-red-700 leading-none">
          {expiredCount}
        </div>
        <div className="text-[13px] text-red-600 mt-1 font-extrabold">
          {t("stock.stats.expiredItems")}
        </div>
      </button>

      <div className="w-px h-10 bg-surface-container-high mx-3"></div>

      {/* ALMOST EXPIRED */}
      <button type="button" onClick={() => onFilter("almostExpired")} className="text-center flex-1">
        <div className="text-[2.3rem] font-bold text-orange-600 leading-none">
          {almostExpiredCount}
        </div>
        <div className="text-[13px] text-orange-600 mt-1 font-extrabold">
          {t("stock.stats.almostExpiredItems")}
        </div>
      </button>

    </div>
  </div>

</div>

);

}
