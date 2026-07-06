"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { catalogItems } from "@/data/catalog";
import { formatCurrency, generateId } from "@/lib/format";
import { applyWealthDna } from "@/lib/wealth-dna";
import { playAuthorize } from "@/lib/sounds";
import { useLocale } from "@/lib/use-locale";
import { AssetClass } from "@/lib/types";

interface RecommendedItem {
  item: typeof catalogItems[number];
  reason: string;
  reasonZh: string;
  effectivePrice: number;
}

function getRecommendations(
  purchases: { product: { assetClass: string; price: number; sourceUrl?: string } }[],
  billionaire: ReturnType<typeof useCartStore.getState>["selectedBillionaire"],
): RecommendedItem[] {
  if (purchases.length === 0 || !billionaire) return [];

  // Count asset class frequencies
  const classCounts = new Map<string, number>();
  let totalPrice = 0;
  for (const p of purchases) {
    classCounts.set(p.product.assetClass, (classCounts.get(p.product.assetClass) || 0) + 1);
    totalPrice += p.product.price;
  }
  const avgPrice = totalPrice / purchases.length;

  // Get purchased catalog IDs
  const purchasedIds = new Set<string>();
  for (const p of purchases) {
    const match = p.product.sourceUrl?.match(/^catalog:\/\/(.+)$/);
    if (match) purchasedIds.add(match[1]);
  }

  // Score each unpurchased catalog item
  const scored: { item: typeof catalogItems[number]; score: number; reason: string; reasonZh: string }[] = [];

  for (const item of catalogItems) {
    if (purchasedIds.has(item.id)) continue;

    let score = 0;
    let reason = "";
    let reasonZh = "";

    // Boost items in frequently purchased classes
    const classCount = classCounts.get(item.assetClass) || 0;
    if (classCount > 0) {
      score += classCount * 3;
      reason = "Matches your taste";
      reasonZh = "符合你的口味";
    }

    // Boost items near average price range (within 5x)
    const priceRatio = item.price / avgPrice;
    if (priceRatio >= 0.2 && priceRatio <= 5) {
      score += 2;
      if (!reason) {
        reason = "In your price range";
        reasonZh = "在你的价位";
      }
    }

    // Boost items with DNA discounts
    if (billionaire.wealthDna?.modifiers) {
      const mod = billionaire.wealthDna.modifiers[item.assetClass as AssetClass];
      if (mod !== undefined && mod < 0) {
        score += 3;
        reason = "DNA discount available";
        reasonZh = "DNA 折扣";
      }
    }

    // Tier variety bonus — suggest a different tier than most purchases
    const tierCounts = new Map<string, number>();
    for (const p of purchases) {
      const catalogMatch = catalogItems.find((c) => `catalog://${c.id}` === p.product.sourceUrl);
      if (catalogMatch) {
        tierCounts.set(catalogMatch.tier, (tierCounts.get(catalogMatch.tier) || 0) + 1);
      }
    }
    if (!tierCounts.has(item.tier)) {
      score += 2;
      if (!reason) {
        reason = "Try something different";
        reasonZh = "试试不一样的";
      }
    }

    // Small random factor for variety
    score += Math.random() * 1.5;

    if (score > 0) {
      scored.push({
        item,
        score,
        reason: reason || "You might like this",
        reasonZh: reasonZh || "你可能会喜欢",
      });
    }
  }

  // Top 4
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 4).map((s) => {
    const dna = applyWealthDna(
      { title: s.item.name, price: s.item.price, assetClass: s.item.assetClass },
      billionaire,
    );
    return {
      item: s.item,
      reason: s.reason,
      reasonZh: s.reasonZh,
      effectivePrice: dna.adjustedPrice,
    };
  });
}

export function ImpulseAisle({ onPurchase }: { onPurchase?: (price: number) => void }) {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const addPurchase = useCartStore((s) => s.addPurchase);
  const soundEnabled = useCartStore((s) => s.soundEnabled);

  const recommendations = useMemo(
    () => getRecommendations(purchases, selectedBillionaire),
    // Re-derive every 3 purchases to avoid excessive recomputation
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.floor(purchases.length / 3), selectedBillionaire?.id],
  );

  const handleBuy = (rec: RecommendedItem) => {
    if (!selectedBillionaire) return;

    addPurchase({
      id: generateId(),
      product: {
        title: rec.item.name,
        price: rec.effectivePrice,
        imageUrl: null,
        description: rec.item.description,
        sourceUrl: `catalog://${rec.item.id}`,
        assetClass: rec.item.assetClass,
        monthlyOverhead: rec.item.monthlyOverhead,
      },
      billionaireId: selectedBillionaire.id,
      timestamp: Date.now(),
    });

    if (soundEnabled) playAuthorize();
    onPurchase?.(rec.effectivePrice);
  };

  if (!selectedBillionaire || recommendations.length === 0) return null;

  return (
    <section className="card-panel p-5 sm:p-8">
      <h2 className="section-label mb-2">
        {locale === "zh" ? "🛒 冲动购物区" : "🛒 Impulse Aisle"}
      </h2>
      <p className="text-xs text-ash/60 mb-4">
        {locale === "zh"
          ? "根据你的购物习惯推荐——就像超市收银台旁边的货架"
          : "Based on your shopping habits — like the checkout counter display, but for billionaires."}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {recommendations.map((rec, idx) => (
            <motion.button
              key={rec.item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.08 }}
              onClick={() => handleBuy(rec)}
              className="group relative p-4 rounded-xl bg-sand/[0.03] border border-line/8 hover:border-champagne/20 hover:bg-sand/[0.06] transition-all text-left"
            >
              {/* Emoji */}
              <div className="text-2xl mb-2">{rec.item.emoji}</div>

              {/* Name */}
              <div className="text-xs font-serif text-sand/85 mb-1 leading-tight line-clamp-2">
                {locale === "zh" ? rec.item.nameZh : rec.item.name}
              </div>

              {/* Price */}
              <div className="text-sm font-serif text-champagne tabular-nums">
                {formatCurrency(rec.effectivePrice, true)}
              </div>

              {/* Reason tag */}
              <div className="text-[9px] text-ash/45 mt-1.5 font-mono">
                {locale === "zh" ? rec.reasonZh : rec.reason}
              </div>

              {/* Quick buy hint */}
              <div className="absolute top-2 right-2 text-[9px] text-champagne/0 group-hover:text-champagne/60 transition-colors">
                {locale === "zh" ? "点击购买" : "tap to buy"}
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
