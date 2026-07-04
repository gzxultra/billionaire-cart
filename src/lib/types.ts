// ─── Types ───────────────────────────────────────────────────────────

export type AssetClass =
  | "supercar"
  | "yacht"
  | "aircraft"
  | "real_estate"
  | "rv_trailer"
  | "commercial_tech"
  | "luxury_fashion"
  | "jewelry"
  | "coffee_equipment"
  | "custom_keyboard"
  | "industrial_equipment"
  | "art"
  | "electronics"
  | "other";

// ─── Wealth DNA — Spending Preference System ─────────────────────────

export type SpendingPersonality =
  | "tech_visionary"
  | "luxury_connoisseur"
  | "value_investor"
  | "empire_builder"
  | "silicon_titan"
  | "sports_mogul"
  | "ai_pioneer"
  | "water_baron"
  | "cloud_king"
  | "philanthropist";

export interface WealthDna {
  /** Category-based price modifiers: negative = discount, positive = surcharge */
  modifiers: Partial<Record<AssetClass, number>>;
  /** Items that are always free for this billionaire */
  freeItems?: string[];
  personality: SpendingPersonality;
  /** Famous quote about money/spending */
  quote: string;
  /** Quote in Chinese */
  quoteZh: string;
}

// ─── Wealth Composition ──────────────────────────────────────────────

export interface WealthSlice {
  label: string;
  labelZh: string;
  pct: number; // 0-1
  ticker?: string;
  color: string;
}

// ─── Signature Purchases ─────────────────────────────────────────────

export interface SignaturePurchase {
  name: string;
  nameZh: string;
  price: number; // USD
  year: number;
  description: string;
  descriptionZh: string;
  emoji: string;
}

// ─── SEC Filing Data ─────────────────────────────────────────────────

export interface SecFiling {
  date: string;
  type: "buy" | "sell" | "option" | "other";
  shares: number;
  pricePerShare: number;
  totalValue: number;
  ticker: string;
  sharesAfter: number;
}

// ─── Stock Data ──────────────────────────────────────────────────────

export interface StockData {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
}

// ─── Wiki Data ───────────────────────────────────────────────────────

export interface WikiData {
  summary: string;
  thumbnail: string | null;
}

// ─── SEC Config ──────────────────────────────────────────────────────

export interface SecConfig {
  /** Company CIK (10-digit, with leading zeros) */
  companyCik: string;
  /** The person's name as it appears in SEC filings */
  filingName: string;
  /** Primary stock ticker */
  ticker: string;
}

// ─── Billionaire ─────────────────────────────────────────────────────

export interface Billionaire {
  id: string;
  name: string;
  company: string;
  netWorthB: number; // in billions USD
  initials: string;
  emoji: string;
  sector: string;
  earningsPerSecond: number; // USD per second
  /** Primary stock ticker for live quote */
  ticker?: string;
  /** SEC EDGAR config for insider trade lookups */
  sec?: SecConfig;
  /** Wikipedia page title for summary API */
  wikiTitle?: string;
  /** Signature real-world purchases */
  signaturePurchases?: SignaturePurchase[];
  /** Spending preference system */
  wealthDna?: WealthDna;
  /** Wealth composition breakdown */
  wealthBreakdown?: WealthSlice[];
}

export interface ParsedProduct {
  title: string;
  price: number; // USD
  imageUrl: string | null;
  description: string;
  sourceUrl: string;
  assetClass: AssetClass;
  monthlyOverhead: number;
  sourceDomain?: string;
  favicon?: string;
  originalPrice?: number;    // Price in original currency before USD conversion
  originalCurrency?: string; // ISO currency code, e.g. "CNY"
}

export interface SavedProduct {
  id: string;
  product: ParsedProduct;
  parsedAt: number;
  purchaseCount: number;
}

export interface Purchase {
  id: string;
  product: ParsedProduct;
  billionaireId: string;
  timestamp: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "legendary";
  unlocked: boolean;
  checkFn: (purchases: Purchase[]) => boolean;
}

export interface ParseResponse {
  success: boolean;
  product?: ParsedProduct;
  error?: string;
}
