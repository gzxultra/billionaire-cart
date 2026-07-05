"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

/**
 * Equivalence benchmarks — common items people understand.
 * Ordered from cheap to expensive so the display picks the best scale.
 */
const BENCHMARKS = [
  { emoji: "🍔", en: "Big Macs", zh: "巨无霸", price: 5.69 },
  { emoji: "☕", en: "Starbucks Lattes", zh: "星巴克拿铁", price: 6.5 },
  { emoji: "🎬", en: "Movie Tickets", zh: "电影票", price: 15 },
  { emoji: "📱", en: "iPhones", zh: "iPhone", price: 1199 },
  { emoji: "💻", en: "MacBook Pros", zh: "MacBook Pro", price: 2499 },
  { emoji: "🚗", en: "Tesla Model 3s", zh: "特斯拉 Model 3", price: 38990 },
  { emoji: "🏠", en: "Median US Homes", zh: "美国中位数房产", price: 420000 },
  { emoji: "🏎️", en: "Ferraris", zh: "法拉利", price: 350000 },
  { emoji: "✈️", en: "Boeing 737s", zh: "波音 737", price: 100_000_000 },
  { emoji: "🚀", en: "SpaceX Launches", zh: "SpaceX 发射", price: 67_000_000 },
  { emoji: "🏟️", en: "NFL Stadiums", zh: "NFL 球场", price: 1_500_000_000 },
  { emoji: "🗽", en: "Statues of Liberty", zh: "自由女神像", price: 4_560_000_000 },
];

interface EquivItem {
  emoji: string;
  label: string;
  count: number;
  price: number;
}

function pickBestEquivalences(totalSpent: number, locale: "en" | "zh"): EquivItem[] {
  if (totalSpent <= 0) return [];

  const results: EquivItem[] = [];

  for (const bench of BENCHMARKS) {
    const count = Math.floor(totalSpent / bench.price);
    if (count >= 1 && count <= 999_999_999) {
      results.push({
        emoji: bench.emoji,
        label: locale === "zh" ? bench.zh : bench.en,
        count,
        price: bench.price,
      });
    }
  }

  // Pick up to 4 that give interesting variety: one cheap, one mid, one expensive
  if (results.length <= 4) return results;

  const cheap = results[0];
  const mid = results[Math.floor(results.length / 2)];
  const expensive = results[results.length - 1];
  const alt = results[Math.floor(results.length / 3)];

  // Dedupe
  const picked = new Map<string, EquivItem>();
  if (cheap) picked.set(cheap.emoji, cheap);
  if (alt) picked.set(alt.emoji, alt);
  if (mid) picked.set(mid.emoji, mid);
  if (expensive) picked.set(expensive.emoji, expensive);

  return Array.from(picked.values()).slice(0, 4);
}

function formatCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

/**
 * SpendingEquivalences — "You've spent enough to buy X Big Macs, Y Teslas, Z Ferraris"
 * Shows after 2+ purchases to give fun spending context.
 */
export function SpendingEquivalences() {
  const locale = useLocale((s) => s.locale);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);
  const purchases = useCartStore((s) => s.purchases);

  const equivalences = useMemo(
    () => pickBestEquivalences(totalSpent, locale),
    [totalSpent, locale]
  );

  if (purchases.length < 2 || equivalences.length === 0) return null;

  const pctSpent = netWorth > 0 ? (totalSpent / netWorth) * 100 : 0;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-ash/50 font-mono">
          {locale === "zh" ? "消费换算" : "Spending Equivalents"}
        </span>
        <div className="flex-1 h-px bg-line/20" />
        <span className="text-[10px] text-ash/45 font-mono">
          {pctSpent.toFixed(pctSpent < 1 ? 4 : 2)}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {equivalences.map((eq, i) => (
          <motion.div
            key={eq.emoji}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-surface/60 border border-line/30"
          >
            <span className="text-lg shrink-0">{eq.emoji}</span>
            <div className="min-w-0">
              <div className="text-sm font-serif text-stone/85 tabular-nums">
                {formatCount(eq.count)}×
              </div>
              <div className="text-[10px] text-ash/60 truncate">
                {eq.label}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
