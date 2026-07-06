"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";
import { formatCurrency } from "@/lib/format";

/**
 * SpendingHeatmap — a GitHub-contribution-style grid visualizing
 * purchase activity by amount and time ordering.
 * Each cell = one purchase, colored by price tier.
 */

interface HeatCell {
  id: string;
  title: string;
  price: number;
  tier: number; // 0-4 intensity
  emoji: string;
}

function priceTier(price: number): number {
  if (price < 100) return 0;
  if (price < 10_000) return 1;
  if (price < 1_000_000) return 2;
  if (price < 100_000_000) return 3;
  return 4;
}

const TIER_COLORS = [
  "bg-stone/10",
  "bg-emerald-500/25",
  "bg-emerald-500/45",
  "bg-emerald-500/65",
  "bg-emerald-400/90",
];

const TIER_BORDERS = [
  "border-stone/10",
  "border-emerald-500/20",
  "border-emerald-500/30",
  "border-emerald-500/40",
  "border-emerald-400/50",
];

const TIER_LABELS_EN = ["< $100", "$100–$10K", "$10K–$1M", "$1M–$100M", "$100M+"];
const TIER_LABELS_ZH = ["< $100", "$100–1万", "1万–100万", "100万–1亿", "1亿+"];

export function SpendingHeatmap() {
  const locale = useLocale((s) => s.locale);
  const purchases = useCartStore((s) => s.purchases);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);

  const cells = useMemo<HeatCell[]>(
    () =>
      purchases.map((p) => ({
        id: p.id,
        title: p.product.title,
        price: p.product.price,
        tier: priceTier(p.product.price),
        emoji: p.product.assetClass === "supercar" ? "🏎️" :
               p.product.assetClass === "yacht" ? "🛥️" :
               p.product.assetClass === "aircraft" ? "✈️" :
               p.product.assetClass === "real_estate" ? "🏰" :
               p.product.assetClass === "luxury_fashion" ? "👗" :
               p.product.assetClass === "jewelry" ? "💎" :
               p.product.assetClass === "art" ? "🎨" :
               p.product.assetClass === "electronics" ? "📱" : "📦",
      })),
    [purchases]
  );

  // Stats
  const stats = useMemo(() => {
    if (cells.length === 0) return null;
    const tierCounts = [0, 0, 0, 0, 0];
    let maxPrice = 0;
    let maxItem = "";
    for (const c of cells) {
      tierCounts[c.tier]++;
      if (c.price > maxPrice) {
        maxPrice = c.price;
        maxItem = c.title;
      }
    }
    const dominantTier = tierCounts.indexOf(Math.max(...tierCounts));
    return { tierCounts, maxPrice, maxItem, dominantTier, total: cells.length };
  }, [cells]);

  if (!selectedBillionaire || cells.length < 3) return null;

  // Compute grid dimensions — aim for ~7 columns
  const cols = Math.min(7, Math.max(3, Math.ceil(Math.sqrt(cells.length * 1.5))));

  return (
    <section className="card-panel p-5 sm:p-8">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">🗺️</span>
        <h2 className="text-xs uppercase tracking-[0.2em] text-stone/75 font-medium">
          {locale === "zh" ? "消费热力图" : "Spending Heatmap"}
        </h2>
      </div>
      <p className="text-[10px] text-ash/50 mb-4">
        {locale === "zh"
          ? `${stats?.total || 0} 笔购买的价格分布`
          : `Price distribution across ${stats?.total || 0} purchases`}
      </p>

      {/* Heatmap grid */}
      <div
        className="grid gap-1 sm:gap-1.5 mb-4"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {cells.map((cell, i) => (
          <motion.div
            key={cell.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02, duration: 0.2 }}
            className={`
              group relative aspect-square rounded-sm sm:rounded-md
              ${TIER_COLORS[cell.tier]} border ${TIER_BORDERS[cell.tier]}
              cursor-default transition-transform hover:scale-110 hover:z-10
            `}
            title={`${cell.title} — ${formatCurrency(cell.price)}`}
          >
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[#1a1a1a] text-white rounded text-[9px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 font-mono">
              {cell.title.length > 20 ? cell.title.slice(0, 20) + "…" : cell.title}
              <br />
              {formatCurrency(cell.price)}
            </div>
          </motion.div>
        ))}

        {/* Empty cells to fill the last row */}
        {Array.from({ length: (cols - (cells.length % cols)) % cols }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="aspect-square rounded-sm sm:rounded-md bg-surface-dim/20 border border-line/10"
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-ash/45 font-mono">
            {locale === "zh" ? "少" : "Less"}
          </span>
          {TIER_COLORS.map((color, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-sm ${color} border ${TIER_BORDERS[i]}`}
              title={locale === "zh" ? TIER_LABELS_ZH[i] : TIER_LABELS_EN[i]}
            />
          ))}
          <span className="text-[9px] text-ash/45 font-mono">
            {locale === "zh" ? "多" : "More"}
          </span>
        </div>

        {/* Quick stat */}
        {stats && (
          <div className="text-[9px] text-ash/45 font-mono">
            {locale === "zh"
              ? `最多: ${TIER_LABELS_ZH[stats.dominantTier]} (${stats.tierCounts[stats.dominantTier]}笔)`
              : `Most: ${TIER_LABELS_EN[stats.dominantTier]} (${stats.tierCounts[stats.dominantTier]})`}
          </div>
        )}
      </div>
    </section>
  );
}
