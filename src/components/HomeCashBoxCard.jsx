import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../db";
import { formatPrice } from "../currency";
import { useAppSettings } from "../useAppSettings";

export default function HomeCashBoxCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [currencySymbol, setCurrencySymbol] = useState("SYP");
  const [useNewCurrency, setUseNewCurrency] = useState(false);
  useAppSettings(setCurrencySymbol, setUseNewCurrency);

  // ⭐ LIVE REACTIVE CASHBOX
  const box = useLiveQuery(() => db.homeCashBox.get(1), []);

  const amount = box?.amount || 0;

  // ⭐ REAL LAST UPDATED TIME (add, withdraw, reset)
  const lastUpdated = box?.lastUpdated
    ? new Date(box.lastUpdated).toLocaleString()
    : "—";

  const { formatted, symbol } = formatPrice(
    amount,
    useNewCurrency,
    currencySymbol
  );

  return (
    <div
      onClick={() => navigate("/home-cashbox-history")}
      className="
        bg-surface-container-lowest p-6 rounded-xl shadow-sm
        border-l-4 border-secondary cursor-pointer
        hover:bg-surface-container transition
      "
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <span className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">
          {t("homecash.title")}
        </span>

        <div className="bg-secondary-container/20 p-2 rounded-lg text-secondary">
          <span className="material-symbols-outlined">
            account_balance_wallet
          </span>
        </div>
      </div>

      {/* Amount */}
      <div className="text-4xl font-black text-on-secondary-container">
        {formatted} {symbol}
      </div>

      {/* Updated text */}
      <div className="text-xs text-on-surface-variant mt-1 font-medium">
        {t("stock.stats.updated", { time: lastUpdated })}
      </div>
    </div>
  );
}
