"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useCartStore, selectTotalSpent } from "@/lib/store";
import { formatCurrency, assetLabel } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

interface CategoryData {
  assetClass: string;
  label: string;
  amount: number;
  count: number;
  percent: number;
  color: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  supercar: "#9B6B6B",
  yacht: "#6B7F9B",
  aircraft: "#8B7B9B",
  real_estate: "#9B8B6B",
  rv_trailer: "#7D9B8A",
  commercial_tech: "#6B8B9B",
  luxury_fashion: "#9B7B8B",
  jewelry: "#8B6B9B",
  coffee_equipment: "#8B7A5B",
  custom_keyboard: "#7A7B9B",
  industrial_equipment: "#7B7B7B",
  art: "#9B6B7B",
  electronics: "#6B9B8B",
  other: "#6B6560",
};

export function CategoryBreakdown() {
  const purchases = useCartStore((s) => s.purchases);
  const totalSpent = useCartStore(selectTotalSpent);
  const locale = useLocale((s) => s.locale);

  const categories = useMemo(() => {
    if (purchases.length === 0) return [];

    const map = new Map<string, { amount: number; count: number }>();

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
        label: assetLabel(assetClass, locale).replace(/^[^\w]*\s*/, ""),
        amount: data.amount,
        count: data.count,
        percent: totalSpent > 0 ? (data.amount / totalSpent) * 100 : 0,
        color: CATEGORY_COLORS[assetClass] || "#71717a",
      });
    }

    return result.sort((a, b) => b.amount - a.amount);
  }, [purchases, totalSpent, locale]);

  if (purchases.length < 2) return null;

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

  const topCategory = categories[0];

  return (
    <div className="w-full">
      <h2 className="section-label mb-4">
        {t("category.title", locale)}
      </h2>

      <div className="flex items-start gap-6">
        {/* Donut chart */}
        <div className="relative shrink-0">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="16" />
            {segments.map((seg, i) => (
              <motion.circle
                key={seg.assetClass}
                cx="70" cy="70" r={radius} fill="none"
                stroke={seg.color} strokeWidth="16" strokeLinecap="round"
                strokeDasharray={seg.dashArray} strokeDashoffset={seg.dashOffset}
                transform="rotate(-90 70 70)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                style={{ filter: `drop-shadow(0 0 4px ${seg.color}40)` }}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[10px] text-ash/70 uppercase tracking-wider font-mono">
              {t("category.items", locale)}
            </div>
            <div className="text-xl font-serif text-sand/85 tabular-nums">
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
                <span className="text-[11px] text-ash/80 truncate">
                  {cat.label}
                </span>
                <span className="text-[10px] text-ash/70 shrink-0 tabular-nums font-mono">
                  {cat.percent.toFixed(1)}%
                </span>
              </div>
            </motion.div>
          ))}
          {categories.length > 6 && (
            <div className="text-[9px] text-ash/72 font-mono">
              {t("category.moreCategories", locale, { n: categories.length - 6 })}
            </div>
          )}
        </div>
      </div>

      {topCategory && (
        <div className="mt-4 pt-3 border-t border-line/50 text-[10px] text-ash/70">
          {t("category.biggest", locale)}:{" "}
          <span className="text-stone/85">
            {assetLabel(topCategory.assetClass, locale)}
          </span>{" "}
          — {formatCurrency(topCategory.amount, true)} ({topCategory.count}{" "}
          {topCategory.count === 1
            ? t("category.item", locale)
            : t("category.itemPlural", locale)})
        </div>
      )}
    </div>
  );
}
