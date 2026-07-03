"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useCartStore, selectTotalSpent } from "@/lib/store";
import { formatCurrency, ASSET_LABELS } from "@/lib/format";

interface CategoryData {
  assetClass: string;
  label: string;
  amount: number;
  count: number;
  percent: number;
  color: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  supercar: "#ef4444",
  yacht: "#3b82f6",
  aircraft: "#8b5cf6",
  real_estate: "#f59e0b",
  rv_trailer: "#10b981",
  commercial_tech: "#06b6d4",
  luxury_fashion: "#ec4899",
  jewelry: "#d946ef",
  coffee_equipment: "#a16207",
  custom_keyboard: "#6366f1",
  industrial_equipment: "#64748b",
  art: "#f43f5e",
  electronics: "#14b8a6",
  other: "#71717a",
};

export function CategoryBreakdown() {
  const purchases = useCartStore((s) => s.purchases);
  const totalSpent = useCartStore(selectTotalSpent);

  const categories = useMemo(() => {
    if (purchases.length === 0) return [];

    const map = new Map<
      string,
      { amount: number; count: number }
    >();

    for (const p of purchases) {
      const cls = p.product.assetClass;
      const existing = map.get(cls) || { amount: 0, count: 0 };
      existing.amount += p.product.price;
      existing.count += 1;
      map.set(cls, existing);
    }

    const result: CategoryData[] = [];
    for (const assetClass of Array.from(map.keys())) {
      const data = map.get(assetClass)!;
      result.push({
        assetClass,
        label: (ASSET_LABELS[assetClass] || assetClass).replace(/^[^\w]*\s*/, ""),
        amount: data.amount,
        count: data.count,
        percent: totalSpent > 0 ? (data.amount / totalSpent) * 100 : 0,
        color: CATEGORY_COLORS[assetClass] || "#71717a",
      });
    }

    return result.sort((a, b) => b.amount - a.amount);
  }, [purchases, totalSpent]);

  if (purchases.length < 2) return null;

  // SVG donut chart
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  const segments = categories.map((cat) => {
    const offset = cumulativePercent;
    cumulativePercent += cat.percent;
    return {
      ...cat,
      dashArray: `${(cat.percent / 100) * circumference} ${circumference}`,
      dashOffset: -((offset / 100) * circumference),
    };
  });

  // Top purchase by category
  const topCategory = categories[0];

  return (
    <div className="w-full">
      <h2 className="text-xs uppercase tracking-[0.3em] text-copper/60 font-sans mb-4">
        Portfolio Breakdown
      </h2>

      <div className="flex items-start gap-6">
        {/* Donut chart */}
        <div className="relative shrink-0">
          <svg width="140" height="140" viewBox="0 0 140 140">
            {/* Background ring */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="16"
            />
            {/* Category segments */}
            {segments.map((seg, i) => (
              <motion.circle
                key={seg.assetClass}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={seg.dashArray}
                strokeDashoffset={seg.dashOffset}
                transform="rotate(-90 70 70)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                style={{ filter: `drop-shadow(0 0 4px ${seg.color}40)` }}
              />
            ))}
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[10px] text-white/25 uppercase tracking-wider">
              Items
            </div>
            <div className="text-xl font-serif text-white/70 tabular-nums">
              {purchases.length}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {categories.slice(0, 6).map((cat, i) => (
            <motion.div
              key={cat.assetClass}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2"
            >
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: cat.color, opacity: 0.7 }}
              />
              <div className="flex-1 min-w-0 flex items-baseline justify-between gap-1">
                <span className="text-[11px] text-white/50 truncate">
                  {cat.label}
                </span>
                <span className="text-[10px] text-white/25 shrink-0 tabular-nums">
                  {cat.percent.toFixed(1)}%
                </span>
              </div>
            </motion.div>
          ))}
          {categories.length > 6 && (
            <div className="text-[9px] text-white/15">
              +{categories.length - 6} more categories
            </div>
          )}
        </div>
      </div>

      {/* Top spending stat */}
      {topCategory && (
        <div className="mt-4 pt-3 border-t border-charcoal-600/10 text-[10px] text-white/25">
          Biggest category:{" "}
          <span className="text-copper/60">
            {ASSET_LABELS[topCategory.assetClass] || topCategory.assetClass}
          </span>{" "}
          — {formatCurrency(topCategory.amount, true)} ({topCategory.count}{" "}
          {topCategory.count === 1 ? "item" : "items"})
        </div>
      )}
    </div>
  );
}
