"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";
import { formatCurrency } from "@/lib/format";

// ─── Physical money facts ───────────────────────────────────────────
// US $100 bill: 0.0043 inches thick, 6.14 × 2.61 inches, ~1g
const BILL_THICKNESS_M = 0.0043 * 0.0254; // ~0.000109m
const BILL_WEIGHT_KG = 0.001; // 1 gram

interface ScaleComparison {
  threshold: number; // meters
  emoji: string;
  labelEn: string;
  labelZh: string;
  height: number; // meters
}

const HEIGHT_COMPARISONS: ScaleComparison[] = [
  { threshold: 0, emoji: "🪙", labelEn: "a coin", labelZh: "一枚硬币", height: 0.002 },
  { threshold: 0.01, emoji: "📱", labelEn: "a phone", labelZh: "一部手机", height: 0.15 },
  { threshold: 0.3, emoji: "🧍", labelEn: "a person", labelZh: "一个人", height: 1.75 },
  { threshold: 3, emoji: "🏠", labelEn: "a house", labelZh: "一栋房子", height: 10 },
  { threshold: 20, emoji: "🗽", labelEn: "Statue of Liberty", labelZh: "自由女神像", height: 93 },
  { threshold: 100, emoji: "🗼", labelEn: "Eiffel Tower", labelZh: "埃菲尔铁塔", height: 330 },
  { threshold: 500, emoji: "🏔️", labelEn: "Empire State Building", labelZh: "帝国大厦", height: 443 },
  { threshold: 1000, emoji: "✈️", labelEn: "cruising altitude", labelZh: "飞行高度", height: 10668 },
  { threshold: 15000, emoji: "🌍", labelEn: "Earth's atmosphere", labelZh: "地球大气层", height: 100000 },
  { threshold: 200000, emoji: "🛸", labelEn: "ISS orbit", labelZh: "国际空间站轨道", height: 408000 },
  { threshold: 500000, emoji: "🌙", labelEn: "the Moon", labelZh: "月球距离", height: 384400000 },
  { threshold: 400000000, emoji: "☀️", labelEn: "the Sun", labelZh: "太阳距离", height: 149597870700 },
];

function findComparison(heightM: number): ScaleComparison | null {
  let best: ScaleComparison | null = null;
  for (const c of HEIGHT_COMPARISONS) {
    if (heightM >= c.threshold) best = c;
  }
  return best;
}

function formatHeight(meters: number, locale: "en" | "zh"): string {
  if (meters < 0.01) {
    return locale === "zh" ? `${(meters * 1000).toFixed(1)} 毫米` : `${(meters * 1000).toFixed(1)} mm`;
  }
  if (meters < 1) {
    return locale === "zh" ? `${(meters * 100).toFixed(1)} 厘米` : `${(meters * 100).toFixed(1)} cm`;
  }
  if (meters < 1000) {
    return locale === "zh" ? `${meters.toFixed(1)} 米` : `${meters.toFixed(1)} m`;
  }
  if (meters < 1_000_000) {
    return locale === "zh" ? `${(meters / 1000).toFixed(1)} 公里` : `${(meters / 1000).toFixed(1)} km`;
  }
  if (meters < 1_000_000_000) {
    return locale === "zh" ? `${(meters / 1_000_000).toFixed(0)} 千公里` : `${(meters / 1_000_000).toFixed(0)}K km`;
  }
  return locale === "zh" ? `${(meters / 1_000_000_000).toFixed(1)} 百万公里` : `${(meters / 1_000_000_000).toFixed(1)}M km`;
}

function formatWeight(kg: number, locale: "en" | "zh"): string {
  if (kg < 1) {
    return locale === "zh" ? `${(kg * 1000).toFixed(0)} 克` : `${(kg * 1000).toFixed(0)} g`;
  }
  if (kg < 1000) {
    return locale === "zh" ? `${kg.toFixed(1)} 公斤` : `${kg.toFixed(1)} kg`;
  }
  if (kg < 1_000_000) {
    return locale === "zh" ? `${(kg / 1000).toFixed(1)} 吨` : `${(kg / 1000).toFixed(1)} tons`;
  }
  return locale === "zh" ? `${(kg / 1_000_000).toFixed(1)} 千吨` : `${(kg / 1_000_000).toFixed(1)}K tons`;
}

// ─── Visual stack bar ───────────────────────────────────────────────
function StackBar({
  label,
  value,
  maxValue,
  color,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}) {
  const pct = Math.min((value / maxValue) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[9px] text-ash/50">
        <span>{label}</span>
        <span className="tabular-nums">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-surface-dim/60 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export function MoneyScale() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);

  const stats = useMemo(() => {
    if (totalSpent <= 0) return null;

    const bills = totalSpent / 100; // number of $100 bills
    const heightM = bills * BILL_THICKNESS_M;
    const weightKg = bills * BILL_WEIGHT_KG;
    const comparison = findComparison(heightM);

    // Time comparisons
    const secondsToCount = totalSpent; // 1 bill per second
    const daysToCount = secondsToCount / 86400;
    const yearsToCount = daysToCount / 365.25;

    // Area: laid flat side by side
    const billAreaM2 = 0.016 * 0.066; // 6.14" × 2.61" in m²
    const totalAreaM2 = bills * billAreaM2;
    const footballFields = totalAreaM2 / 5351; // FIFA field

    return {
      bills,
      heightM,
      weightKg,
      comparison,
      daysToCount,
      yearsToCount,
      footballFields,
    };
  }, [totalSpent]);

  // Also compute for full net worth
  const fullStats = useMemo(() => {
    if (netWorth <= 0) return null;
    const bills = netWorth / 100;
    const heightM = bills * BILL_THICKNESS_M;
    const comparison = findComparison(heightM);
    return { bills, heightM, comparison };
  }, [netWorth]);

  if (!selectedBillionaire || !stats) return null;

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">💵</span>
        <h2 className="text-xs uppercase tracking-[0.2em] text-stone/75 font-medium">
          {locale === "zh" ? "实体钞票" : "Physical Money Scale"}
        </h2>
      </div>

      <p className="text-[11px] text-ash/55 mb-5">
        {locale === "zh"
          ? `如果你花的 ${formatCurrency(totalSpent, true)} 全部用 $100 钞票堆起来…`
          : `If your ${formatCurrency(totalSpent, true)} spending was stacked in $100 bills…`}
      </p>

      {/* Key stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Height */}
        <div className="p-3 rounded-xl bg-surface-bright/40 border border-line/15">
          <div className="text-[9px] text-ash/45 uppercase tracking-wider mb-1">
            {locale === "zh" ? "堆叠高度" : "Stack Height"}
          </div>
          <div className="text-sm font-serif text-champagne tabular-nums">
            {formatHeight(stats.heightM, locale)}
          </div>
          {stats.comparison && (
            <div className="text-[9px] text-ash/40 mt-1">
              {stats.comparison.emoji}{" "}
              {locale === "zh"
                ? `≈ ${(stats.heightM / stats.comparison.height).toFixed(1)}× ${stats.comparison.labelZh}`
                : `≈ ${(stats.heightM / stats.comparison.height).toFixed(1)}× ${stats.comparison.labelEn}`}
            </div>
          )}
        </div>

        {/* Weight */}
        <div className="p-3 rounded-xl bg-surface-bright/40 border border-line/15">
          <div className="text-[9px] text-ash/45 uppercase tracking-wider mb-1">
            {locale === "zh" ? "重量" : "Weight"}
          </div>
          <div className="text-sm font-serif text-champagne tabular-nums">
            {formatWeight(stats.weightKg, locale)}
          </div>
          <div className="text-[9px] text-ash/40 mt-1">
            {stats.weightKg >= 1000
              ? locale === "zh"
                ? `🐘 ≈ ${(stats.weightKg / 5000).toFixed(1)} 头大象`
                : `🐘 ≈ ${(stats.weightKg / 5000).toFixed(1)} elephants`
              : stats.weightKg >= 50
              ? locale === "zh"
                ? `🧍 ≈ ${(stats.weightKg / 70).toFixed(1)} 个人`
                : `🧍 ≈ ${(stats.weightKg / 70).toFixed(1)} people`
              : locale === "zh"
              ? `📦 ${stats.weightKg.toFixed(1)} 公斤`
              : `📦 ${stats.weightKg.toFixed(1)} kg`}
          </div>
        </div>

        {/* Count time */}
        <div className="p-3 rounded-xl bg-surface-bright/40 border border-line/15">
          <div className="text-[9px] text-ash/45 uppercase tracking-wider mb-1">
            {locale === "zh" ? "数钱时间" : "Time to Count"}
          </div>
          <div className="text-sm font-serif text-champagne tabular-nums">
            {stats.yearsToCount >= 1
              ? locale === "zh"
                ? `${stats.yearsToCount.toFixed(1)} 年`
                : `${stats.yearsToCount.toFixed(1)} yrs`
              : locale === "zh"
              ? `${stats.daysToCount.toFixed(0)} 天`
              : `${stats.daysToCount.toFixed(0)} days`}
          </div>
          <div className="text-[9px] text-ash/40 mt-1">
            {locale === "zh" ? "每秒数一张" : "1 bill/second"}
          </div>
        </div>

        {/* Area */}
        <div className="p-3 rounded-xl bg-surface-bright/40 border border-line/15">
          <div className="text-[9px] text-ash/45 uppercase tracking-wider mb-1">
            {locale === "zh" ? "平铺面积" : "Laid Flat"}
          </div>
          <div className="text-sm font-serif text-champagne tabular-nums">
            {stats.footballFields >= 1
              ? locale === "zh"
                ? `${stats.footballFields.toFixed(1)} 个球场`
                : `${stats.footballFields.toFixed(1)} fields`
              : locale === "zh"
              ? `${(stats.footballFields * 100).toFixed(1)}% 球场`
              : `${(stats.footballFields * 100).toFixed(1)}% field`}
          </div>
          <div className="text-[9px] text-ash/40 mt-1">
            ⚽ {locale === "zh" ? "FIFA 标准球场" : "FIFA football fields"}
          </div>
        </div>
      </div>

      {/* Progress bar: spent vs full fortune */}
      {fullStats && (
        <div className="space-y-2">
          <StackBar
            label={
              locale === "zh"
                ? `你花的 vs ${selectedBillionaire.name} 全部身家`
                : `Your spending vs ${selectedBillionaire.name.split(" ")[0]}'s fortune`
            }
            value={stats.heightM}
            maxValue={fullStats.heightM}
            color="rgba(166,133,48,0.6)"
          />
          {fullStats.comparison && (
            <div className="text-[10px] text-ash/45 text-right">
              {locale === "zh"
                ? `全部身家堆起来: ${formatHeight(fullStats.heightM, locale)} ${fullStats.comparison.emoji}`
                : `Full fortune stacked: ${formatHeight(fullStats.heightM, locale)} ${fullStats.comparison.emoji}`}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
