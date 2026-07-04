// ─── Wealth DNA — Price Adjustment Engine ─────────────────────────────
// Applies billionaire-specific spending preferences to product prices.
// Negative modifiers = discount (Arnault gets -25% on fashion).
// Positive modifiers = surcharge (Musk pays +30% for fashion).
// Free items match case-insensitively against the product title.

import type { Billionaire, AssetClass, SpendingPersonality } from "@/lib/types";

export interface DnaAdjustment {
  originalPrice: number;
  adjustedPrice: number;
  /** Raw modifier value, e.g. -0.15 = 15% discount, 0.3 = 30% surcharge */
  modifier: number | null;
  isFree: boolean;
  matchedFreeItem: string | null;
  personality: SpendingPersonality | null;
}

/**
 * Compute the DNA-adjusted price for a product given the active billionaire.
 * Returns the original price unchanged if no billionaire or no DNA data.
 */
export function applyWealthDna(
  product: { title: string; price: number; assetClass: AssetClass },
  billionaire: Billionaire | null
): DnaAdjustment {
  const none: DnaAdjustment = {
    originalPrice: product.price,
    adjustedPrice: product.price,
    modifier: null,
    isFree: false,
    matchedFreeItem: null,
    personality: null,
  };

  if (!billionaire?.wealthDna) return none;

  const dna = billionaire.wealthDna;

  // 1. Check free items — case-insensitive substring match
  if (dna.freeItems && dna.freeItems.length > 0) {
    const titleLower = product.title.toLowerCase();
    const match = dna.freeItems.find((item) =>
      titleLower.includes(item.toLowerCase())
    );
    if (match) {
      return {
        originalPrice: product.price,
        adjustedPrice: 0,
        modifier: null,
        isFree: true,
        matchedFreeItem: match,
        personality: dna.personality,
      };
    }
  }

  // 2. Apply asset-class modifier
  const mod = dna.modifiers[product.assetClass] ?? null;
  if (mod != null) {
    const adjusted = Math.max(0, Math.round(product.price * (1 + mod) * 100) / 100);
    return {
      originalPrice: product.price,
      adjustedPrice: adjusted,
      modifier: mod,
      isFree: false,
      matchedFreeItem: null,
      personality: dna.personality,
    };
  }

  return { ...none, personality: dna.personality };
}

/**
 * Format the modifier as a human-readable label.
 * e.g. "-15%" or "+30%"
 */
export function formatModifier(mod: number): string {
  const pct = Math.round(mod * 100);
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}
