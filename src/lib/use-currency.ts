"use client";

import { create } from "zustand";

interface CurrencyState {
  currency: string;
  rates: Record<string, number>;
  ratesLoaded: boolean;
  setCurrency: (c: string) => void;
  setRates: (r: Record<string, number>) => void;
  convert: (usd: number) => number;
  symbol: () => string;
  formatConverted: (usd: number, compact?: boolean) => string;
}

const SYMBOLS: Record<string, string> = {
  USD: "$",
  CNY: "¥",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  KRW: "₩",
  INR: "₹",
  BRL: "R$",
  CAD: "C$",
  AUD: "A$",
  CHF: "CHF ",
};

export const CURRENCY_OPTIONS = [
  { code: "USD", label: "🇺🇸 USD", name: "US Dollar" },
  { code: "CNY", label: "🇨🇳 CNY", name: "人民币" },
  { code: "EUR", label: "🇪🇺 EUR", name: "Euro" },
  { code: "GBP", label: "🇬🇧 GBP", name: "British Pound" },
  { code: "JPY", label: "🇯🇵 JPY", name: "Japanese Yen" },
  { code: "KRW", label: "🇰🇷 KRW", name: "Korean Won" },
  { code: "INR", label: "🇮🇳 INR", name: "Indian Rupee" },
];

function formatWithSymbol(amount: number, sym: string, currCode: string, compact: boolean): string {
  if (compact) {
    const absVal = Math.abs(amount);
    let formatted: string;
    if (absVal >= 1e12) formatted = `${(amount / 1e12).toFixed(2)}T`;
    else if (absVal >= 1e9) formatted = `${(amount / 1e9).toFixed(2)}B`;
    else if (absVal >= 1e6) formatted = `${(amount / 1e6).toFixed(1)}M`;
    else if (absVal >= 1e3) formatted = `${(amount / 1e3).toFixed(1)}K`;
    else formatted = amount.toFixed(0);
    return `${sym}${formatted}`;
  }

  // For JPY/KRW, no decimals
  const noDecimals = ["JPY", "KRW", "INR"].includes(currCode);
  return new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: noDecimals ? 0 : 0,
  })
    .format(Math.round(amount))
    .replace(/^/, sym);
}

export const useCurrency = create<CurrencyState>()((set, get) => ({
  currency: "USD",
  rates: { USD: 1 },
  ratesLoaded: false,

  setCurrency: (c: string) => set({ currency: c }),
  setRates: (r: Record<string, number>) => set({ rates: r, ratesLoaded: true }),

  convert: (usd: number) => {
    const { currency, rates } = get();
    const rate = rates[currency] ?? 1;
    return usd * rate;
  },

  symbol: () => SYMBOLS[get().currency] ?? "$",

  formatConverted: (usd: number, compact = false) => {
    const { currency, rates } = get();
    if (currency === "USD") return ""; // don't show duplicate
    const rate = rates[currency] ?? 1;
    const converted = usd * rate;
    const sym = SYMBOLS[currency] ?? "";
    return formatWithSymbol(converted, sym, currency, compact);
  },
}));

// Fetch rates on mount
export function initRates() {
  fetch("/api/rates")
    .then((r) => r.json())
    .then((data) => {
      if (data.success && data.rates) {
        useCurrency.getState().setRates(data.rates);
      }
    })
    .catch(() => {});
}
