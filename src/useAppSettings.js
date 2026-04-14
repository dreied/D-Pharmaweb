// src/useAppSettings.js
import { useEffect } from "react";
import { db } from "./db";
import { useTranslation } from "react-i18next";

export function useAppSettings(setCurrencySymbol, setUseNewCurrency) {
  const { i18n } = useTranslation();

  useEffect(() => {
    async function load() {
      const langSetting = await db.appSettings.get("language");
      const symbolSetting = await db.appSettings.get("currency_symbol");
      const newCurrencySetting = await db.appSettings.get("use_new_currency");

      // Language + direction
      const lang = langSetting?.value || "en";
      i18n.changeLanguage(lang);
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

      // Currency
      setCurrencySymbol(symbolSetting?.value || "SYP");
      setUseNewCurrency(newCurrencySetting?.value === true);
    }

    load();
  }, [i18n, setCurrencySymbol, setUseNewCurrency]);
}
