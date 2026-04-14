import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="flex gap-2">
      <button
        onClick={() => i18n.changeLanguage("en")}
        className={`px-3 py-1 rounded ${
          i18n.language === "en" ? "bg-primary text-white" : "bg-slate-200"
        }`}
      >
        EN
      </button>

      <button
        onClick={() => i18n.changeLanguage("ar")}
        className={`px-3 py-1 rounded ${
          i18n.language === "ar" ? "bg-primary text-white" : "bg-slate-200"
        }`}
      >
        AR
      </button>
    </div>
  );
}
