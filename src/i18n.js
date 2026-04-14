import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en/translation.json";
import ar from "./locales/ar/translation.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar }
    },

    // ⭐ Force Arabic as default
    lng: "ar",

    // ⭐ If something missing → fallback to Arabic
    fallbackLng: "ar",

    detection: {
      // ⭐ Disable browser override
      order: ["localStorage", "querystring", "cookie"],
      caches: ["localStorage"]
    },

    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
