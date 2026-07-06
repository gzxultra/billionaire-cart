"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

/**
 * PurchaseStats — compact session analytics dashboard.
 * Shows: biggest purchase, average price, purchases/minute, most-bought category, 
 * fastest milestone, and a spending velocity spark.
 */

interface StatItem {
  label: string;
  labelZh: string;
  value: string;
  emoji: string;
  detail?: string;
  detailZh?: string;
}

function PurchaseStatsInner() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);

  const stats = useMemo((): StatItem[] => {
    if (purchases.length < 3) return [];

    const prices = purchases.map((p) => p.product.price);
    const biggest = Math.max(...prices);
    const biggestProduct = purchases.find((p) => p.product.price === biggest);
    const average = totalSpent / purchases.length;
    const smallest = Math.min(...prices);

    // Time-based stats
    const firstTs = purchases[0]?.timestamp ?? Date.now();
    const lastTs = purchases[purchases.length - 1]?.timestamp ?? Date.now();
    const sessionMinutes = Math.max((lastTs - firstTs) / 60000, 0.1);
    const purchasesPerMinute = purchases.length / sessionMinutes;

    // Category breakdown
    const catCounts = new Map<string, number>();
    for (const p of purchases) {
      const cls = p.product.assetClass;
      catCounts.set(cls, (catCounts.get(cls) || 0) + 1);
    }
    let topCat = "other";
    let topCatCount = 0;
    catCounts.forEach((count, cat) => {
      if (count > topCatCount) {
        topCat = cat;
        topCatCount = count;
      }
    });

    const CATEGORY_EMOJI: Record<string, string> = {
      supercar: "🏎️", yacht: "🛥️", aircraft: "✈️",
      real_estate: "🏠", rv_trailer: "🏕️", commercial_tech: "💻",
      luxury_fashion: "👜", jewelry: "💎", coffee_equipment: "☕",
      custom_keyboard: "⌨️", industrial_equipment: "🏭", art: "🎨",
      electronics: "📱", other: "📦",
    };

    const CATEGORY_LABEL: Record<string, string> = {
      supercar: "Supercars", yacht: "Yachts", aircraft: "Aircraft",
      real_estate: "Real Estate", rv_trailer: "RV/Trailers", commercial_tech: "Tech",
      luxury_fashion: "Fashion", jewelry: "Jewelry", coffee_equipment: "Coffee",
      custom_keyboard: "Keyboards", industrial_equipment: "Industrial", art: "Art",
      electronics: "Electronics", other: "Other",
    };
    const CATEGORY_LABEL_ZH: Record<string, string> = {
      supercar: "超跑", yacht: "游艇", aircraft: "飞机",
      real_estate: "房产", rv_trailer: "房车", commercial_tech: "科技",
      luxury_fashion: "时尚", jewelry: "珠宝", coffee_equipment: "咖啡",
      custom_keyboard: "键盘", industrial_equipment: "工业", art: "艺术",
      electronics: "电子", other: "其他",
    };

    // Time to first billion
    let timeToFirstBillion = "";
    let timeToFirstBillionZh = "";
    let billionTs = 0;
    let runningTotal = 0;
    for (const p of purchases) {
      runningTotal += p.product.price;
      if (runningTotal >= 1_000_000_000 && !billionTs) {
        billionTs = p.timestamp;
      }
    }
    if (billionTs && firstTs) {
      const billionSecs = (billionTs - firstTs) / 1000;
      if (billionSecs < 60) {
        timeToFirstBillion = `${Math.round(billionSecs)}s`;
        timeToFirstBillionZh = `${Math.round(billionSecs)}秒`;
      } else if (billionSecs < 3600) {
        timeToFirstBillion = `${(billionSecs / 60).toFixed(1)}min`;
        timeToFirstBillionZh = `${(billionSecs / 60).toFixed(1)}分钟`;
      } else {
        timeToFirstBillion = `${(billionSecs / 3600).toFixed(1)}hr`;
        timeToFirstBillionZh = `${(billionSecs / 3600).toFixed(1)}小时`;
      }
    }

    // Spending velocity (USD per second)
    const sessionSecs = Math.max((lastTs - firstTs) / 1000, 1);
    const usdPerSec = totalSpent / sessionSecs;

    const result: StatItem[] = [
      {
        label: "Biggest Buy",
        labelZh: "最大单笔",
        value: formatCurrency(biggest, true),
        emoji: "👑",
        detail: biggestProduct?.product.title.slice(0, 25) ?? "",
        detailZh: biggestProduct?.product.title.slice(0, 25) ?? "",
      },
      {
        label: "Average Price",
        labelZh: "平均价格",
        value: formatCurrency(average, true),
        emoji: "📊",
      },
      {
        label: "Buy Speed",
        labelZh: "购买速度",
        value: `${purchasesPerMinute.toFixed(1)}/min`,
        emoji: "⚡",
      },
      {
        label: "Top Category",
        labelZh: "最爱品类",
        value: `${CATEGORY_EMOJI[topCat] || "📦"} ${locale === "zh" ? (CATEGORY_LABEL_ZH[topCat] || topCat) : (CATEGORY_LABEL[topCat] || topCat)}`,
        emoji: "",
        detail: `${topCatCount} items`,
        detailZh: `${topCatCount} 件`,
      },
      {
        label: "Spending Velocity",
        labelZh: "花钱速度",
        value: `${formatCurrency(usdPerSec, true)}/s`,
        emoji: "🔥",
      },
      {
        label: "Cheapest Buy",
        labelZh: "最省一笔",
        value: formatCurrency(smallest, true),
        emoji: "🪙",
      },
    ];

    if (timeToFirstBillion) {
      result.splice(3, 0, {
        label: "First $1B",
        labelZh: "首个10亿",
        value: locale === "zh" ? timeToFirstBillionZh : timeToFirstBillion,
        emoji: "🏁",
      });
    }

    return result;
  }, [purchases, totalSpent, locale]);

  if (!selectedBillionaire || stats.length === 0) return null;

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">📈</span>
        <h2 className="text-xs uppercase tracking-[0.2em] text-stone/75 font-medium">
          {locale === "zh" ? "消费数据面板" : "Purchase Analytics"}
        </h2>
        <span className="text-[9px] font-mono text-ash/40 ml-auto tabular-nums">
          {purchases.length} {locale === "zh" ? "笔交易" : "txns"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-lg bg-surface-dim/40 border border-line/30 p-3 relative overflow-hidden group hover:border-stone/30 transition-colors"
          >
            {/* Decorative glow */}
            <div className="absolute top-0 right-0 w-8 h-8 rounded-full bg-champagne/[0.03] blur-xl pointer-events-none" />

            <div className="flex items-center gap-1 mb-1.5">
              {stat.emoji && <span className="text-[10px]">{stat.emoji}</span>}
              <span className="text-[9px] uppercase tracking-wider text-ash/50 font-mono">
                {locale === "zh" ? stat.labelZh : stat.label}
              </span>
            </div>
            <div className="text-sm font-serif text-sand tabular-nums leading-tight">
              {stat.value}
            </div>
            {(stat.detail || stat.detailZh) && (
              <div className="text-[8px] text-ash/40 mt-0.5 truncate font-mono">
                {locale === "zh" ? stat.detailZh : stat.detail}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export const PurchaseStats = memo(PurchaseStatsInner);
