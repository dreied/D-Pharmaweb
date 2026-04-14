import React from "react";
import { useTranslation } from "react-i18next";

const toneToClasses = {
  error: {
    border: "border-l-4 border-red-500",
    iconBg: "bg-red-100 text-red-600",
    numberColor: "text-red-700"
  },
  secondary: {
    border: "border-l-4 border-orange-500",
    iconBg: "bg-orange-100 text-orange-600",
    numberColor: "text-orange-600"
  },
  primary: {
    border: "border-l-4 border-primary",
    iconBg: "bg-primary-container/20 text-primary",
    numberColor: "text-primary-dim"
  }
};

export default function InsightCard({
  icon,
  tone = "primary",
  titleKey,
  descriptionKey,
  descriptionValues,
  footerKey,
  footerIcon,
  onClick
}) {
  const { t } = useTranslation();
  const toneClasses = toneToClasses[tone] || toneToClasses.primary;
const isDual = tone === "error" && descriptionValues?.dual === true;

  return (
  <div
    className={`bg-surface-container-lowest p-6 rounded-xl shadow-sm 
                ${toneClasses.border}
                ${onClick ? "cursor-pointer" : ""}
                opacity-0 translate-y-3 animate-fadeInUp`}
  >
    {/* TITLE + ICON */}
    <div className="flex justify-between items-start mb-4">
      <span className="text-m font-bold text-on-surface-variant uppercase tracking-widest">
        {t(titleKey)}
      </span>

      <div className={`${toneClasses.iconBg} p-2 rounded-lg`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
    </div>

    {/* SPECIAL TWO-SECTION LAYOUT */}
    {isDual ? (
      <div className="flex items-center justify-between">

        {/* LEFT SECTION — OVERDUE > 30 DAYS */}
        <button
          type="button"
          onClick={descriptionValues.onOverdue}
          className="text-center flex-1"
        >
          <div className="text-3xl font-black text-red-700">
            {descriptionValues.count}
          </div>
          <div className="text-s text-red-700 mt-1 font-extrabold">
            {t("debtBook.cards.criticalArrears.overdue")}
          </div>
        </button>

        {/* DIVIDER */}
        <div className="w-px h-12 bg-surface-container-high mx-4"></div>

        {/* RIGHT SECTION — HIGHEST DEBT */}
        <button
          type="button"
          onClick={descriptionValues.onHighestDebt}
          className="text-center flex-1"
        >
          <div className="text-3xl font-black text-red-700">
            ↑
          </div>
          <div className="text-s text-red-700 mt-1 font-extrabold">
            {t("debtBook.cards.criticalArrears.highestDebt")}
          </div>
        </button>

      </div>
    ) : (
      <>
        {/* NORMAL CARD DESCRIPTION */}
        <div className="text-xs text-on-surface-variant leading-relaxed mb-2">
          {t(descriptionKey, descriptionValues)}
        </div>

        {footerKey && (
          <div className="flex items-center gap-2 pt-2 border-t border-surface-container-high">
            {footerIcon && (
              <span className="material-symbols-outlined text-[16px] text-primary/70">
                {footerIcon}
              </span>
            )}
            <span className="text-[11px] font-bold text-primary uppercase tracking-widest">
              {t(footerKey)}
            </span>
          </div>
        )}
      </>
    )}
  </div>
);

}
