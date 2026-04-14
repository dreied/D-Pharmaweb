import i18n from "./i18n";

export function convertPrice(value, useNewCurrency) {
  if (value == null) return 0;
  return useNewCurrency ? value / 100 : value;
}

export function formatPrice(value, useNewCurrency, symbol) {
  const converted = convertPrice(value, useNewCurrency);

  // Always English digits + separators
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(converted);

  const isArabic = i18n.language === "ar";

  // Currency symbol logic
  let finalSymbol = symbol;

  // SYP rules
  if (symbol === "SYP" || symbol === "ل.س") {
    finalSymbol = isArabic ? "ل.س" : "SYP";
  }

  // USD rules
  if (symbol === "$" || symbol === "USD") {
    finalSymbol = "$"; // same for Arabic + English
  }

  return { formatted, symbol: finalSymbol };
}
