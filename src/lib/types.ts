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

export interface Billionaire {
  id: string;
  name: string;
  company: string;
  netWorthB: number; // in billions USD
  initials: string;
  emoji: string;
  sector: string;
  earningsPerSecond: number; // USD per second
}

export interface ParsedProduct {
  title: string;
  price: number; // USD
  imageUrl: string | null;
  description: string;
  sourceUrl: string;
  assetClass: AssetClass;
  monthlyOverhead: number;
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
