import { useTranslation } from "react-i18next";

export default function CurrencyDisplayer({ resolvedSymbol, currency }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold text-on-surface">
        {t("stock.currency")}
      </span>
      <span className="px-2 py-1 rounded bg-surface-container-high 
        text-on-surface font-mono text-sm">
        {currency} ({resolvedSymbol})
      </span>
    </div>
  );
}
