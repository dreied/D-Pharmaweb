export function formatPrice(value, i18n, useNewCurrency, currencySymbol) {
  // Ensure numeric
  const base = Number(value) || 0;

  // Apply visual conversion only
  const visualValue = useNewCurrency ? base / 100 : base;

  // Format number
  const formatted = visualValue.toLocaleString("en-US");

  // Resolve currency symbol
  let resolvedSymbol;

  if (currencySymbol === "USD") {
    resolvedSymbol = "$";
  } else if (currencySymbol === "SYP") {
    resolvedSymbol = i18n.language === "ar" ? "ل.س" : "SYP";
  } else {
    resolvedSymbol = currencySymbol;
  }

  return `${formatted} ${resolvedSymbol}`;
}
