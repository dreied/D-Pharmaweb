import { useTranslation } from "react-i18next";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db";
import { formatPrice } from "../../currency";

export default function RecentPayments({ payments }) {
  const { t } = useTranslation();

  // Load currency settings
  const appSettings = useLiveQuery(() => db.appSettings.toArray(), []);
  const useNewCurrency =
    appSettings?.find((s) => s.key === "use_new_currency")?.value || false;
  const currencySymbol =
    appSettings?.find((s) => s.key === "currency_symbol")?.value || "SYP";

  const fmt = (value) => formatPrice(value, useNewCurrency, currencySymbol);

  return (
    <div className="mt-16 bg-surface-container-low rounded-2xl p-8">
      <h4 className="text-xl font-headline font-bold text-on-surface mb-6">
        {t("suppliers.recentPayments")}
      </h4>

      <div className="space-y-1">
        {payments.map((p, idx) => {
          const money = fmt(p.amount);

          return (
            <div
              key={p.id}
              className={`flex items-center justify-between p-4 ${
                idx % 2 === 0
                  ? "bg-white rounded-lg shadow-sm"
                  : "bg-transparent"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-secondary-container">
                    check
                  </span>
                </div>

                <div>
                  <p className="font-bold text-on-surface text-sm">
                    {t("suppliers.paymentTo", { name: p.supplierName })}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {t("suppliers.transactionId", {
                      id: p.transactionId,
                      timeAgo: ""
                    })}
                  </p>
                </div>
              </div>

              <span className="font-headline font-bold text-on-surface">
                -{money.formatted} {money.symbol}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
