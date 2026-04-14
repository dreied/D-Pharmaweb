import React from "react";
import { useTranslation } from "react-i18next";

export default function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange
}) {
  const { t } = useTranslation();

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="px-6 py-4 flex items-center justify-between bg-surface-container-low/30 backdrop-blur-sm">
      <p className="text-xs text-outline font-medium">
        {t("debtBook.showingRange", {
          start,
          end,
          total: totalItems
        })}
      </p>

      <div className="flex gap-1">
        <button
          className="p-2 rounded-lg hover:bg-white/50 transition-colors disabled:opacity-30"
          disabled={page <= 1}
          onClick={() => page > 1 && onPageChange(page - 1)}
        >
          <span className="material-symbols-outlined text-[18px]">
            chevron_left
          </span>
        </button>

        {Array.from({ length: totalPages }).map((_, idx) => {
          const p = idx + 1;
          const isActive = p === page;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${
                isActive
                  ? "bg-primary text-on-primary font-bold"
                  : "hover:bg-white/50"
              }`}
            >
              {p}
            </button>
          );
        })}

        <button
          className="p-2 rounded-lg hover:bg-white/50 transition-colors disabled:opacity-30"
          disabled={page >= totalPages}
          onClick={() => page < totalPages && onPageChange(page + 1)}
        >
          <span className="material-symbols-outlined text-[18px]">
            chevron_right
          </span>
        </button>
      </div>
    </div>
  );
}
