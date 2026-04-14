import { useTranslation } from "react-i18next";

export default function Pagination({ displayedItems, stockItems }) {
  const { t } = useTranslation();

  return (
    <div className="px-6 py-4 bg-surface-container-low/80 border-t border-outline-variant/10 
      flex items-center justify-between">
      <span className="text-xs text-on-surface-variant font-medium">
        {t("stock.pagination.showing", {
          from: 1,
          to: displayedItems?.length || 0,
          total: stockItems?.length || 0
        })}
      </span>
    </div>
  );
}
