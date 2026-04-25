export type SupportedCurrencyCode =
  | "EUR"
  | "USD"
  | "GBP"
  | "AUD"
  | "CAD"
  | "CHF"
  | "BRL"
  | "MXN"
  | "ZAR"
  | "MAD"
  | "AED"
  | "TRY"
  | "NOK"
  | "SEK"
  | "DKK"
  | "PLN"
  | "CZK"
  | "HUF"
  | "IDR"
  | "THB"
  | "PHP"
  | "VND"
  | "LKR"
  | "CRC"
  | "DOP";

export type CurrencyGroup = "mostUsed" | "other";

export interface CurrencyDefinition {
  code: SupportedCurrencyCode;
  symbol: string;
  group: CurrencyGroup;
}

export const CURRENCIES: CurrencyDefinition[] = [
  // Most used
  { code: "EUR", symbol: "€", group: "mostUsed" },
  { code: "USD", symbol: "$", group: "mostUsed" },
  { code: "GBP", symbol: "£", group: "mostUsed" },
  { code: "AUD", symbol: "$", group: "mostUsed" },
  { code: "CAD", symbol: "$", group: "mostUsed" },
  // Other
  { code: "CHF", symbol: "CHF", group: "other" },
  { code: "BRL", symbol: "R$", group: "other" },
  { code: "MXN", symbol: "$", group: "other" },
  { code: "ZAR", symbol: "R", group: "other" },
  { code: "MAD", symbol: "MAD", group: "other" },
  { code: "AED", symbol: "AED", group: "other" },
  { code: "TRY", symbol: "₺", group: "other" },
  { code: "NOK", symbol: "kr", group: "other" },
  { code: "SEK", symbol: "kr", group: "other" },
  { code: "DKK", symbol: "kr", group: "other" },
  { code: "PLN", symbol: "zł", group: "other" },
  { code: "CZK", symbol: "Kč", group: "other" },
  { code: "HUF", symbol: "Ft", group: "other" },
  { code: "IDR", symbol: "Rp", group: "other" },
  { code: "THB", symbol: "฿", group: "other" },
  { code: "PHP", symbol: "₱", group: "other" },
  { code: "VND", symbol: "₫", group: "other" },
  { code: "LKR", symbol: "Rs", group: "other" },
  { code: "CRC", symbol: "₡", group: "other" },
  { code: "DOP", symbol: "RD$", group: "other" },
];

export const MOST_USED_CURRENCIES = CURRENCIES.filter(
  (c) => c.group === "mostUsed",
);

export const OTHER_CURRENCIES = CURRENCIES.filter(
  (c) => c.group === "other",
);

export const getCurrencySymbol = (code: string): string => {
  const upper = code.toUpperCase();
  const found = CURRENCIES.find((c) => c.code === upper);
  return found?.symbol ?? upper;
};


