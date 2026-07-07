"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

/**
 * SpendingPace — real-time comparison of the user's spending speed to
 * world-scale money flows. Cycles through comparisons with smooth animation.
 */

interface Benchmark {
  id: string;
  labelEn: string;
  labelZh: string;
  perSecond: number; // USD per second
  emoji: string;
}

const BENCHMARKS: Benchmark[] = [
  { id: "us-military", labelEn: "US Military Budget", labelZh: "美国军费", perSecond: 28_538, emoji: "🎖️" },
  { id: "apple-rev", labelEn: "Apple Revenue", labelZh: "苹果公司收入", perSecond: 12_141, emoji: "🍎" },
  { id: "nasa", labelEn: "NASA Budget", labelZh: "NASA 预算", perSecond: 839, emoji: "🚀" },
  { id: "avg-salary", labelEn: "Average US Salary", labelZh: "美国平均工资", perSecond: 1.85, emoji: "👷" },
  { id: "mcdonalds", labelEn: "McDonald's Global Revenue", labelZh: "麦当劳全球收入", perSecond: 796, emoji: "🍔" },
  { id: "bitcoin-mining", labelEn: "Bitcoin Mining Revenue", labelZh: "比特币挖矿收入", perSecond: 950, emoji: "⛏️" },
  { id: "amazon-rev", labelEn: "Amazon Revenue", labelZh: "亚马逊收入", perSecond: 19_340, emoji: "📦" },
  { id: "global-aid", labelEn: "Global Foreign Aid", labelZh: "全球外援", perSecond: 6_340, emoji: "🌍" },
  { id: "netflix-rev", labelEn: "Netflix Revenue", labelZh: "Netflix 收入", perSecond: 1_072, emoji: "🎬" },
  { id: "starbucks-rev", labelEn: "Starbucks Revenue", labelZh: "星巴克收入", perSecond: 1_140, emoji: "☕" },
];

function formatMultiplier(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K×`;
  if (value >= 100) return `${Math.round(value)}×`;
  if (value >= 10) return `${value.toFixed(1)}×`;
  if (value >= 1) return `${value.toFixed(2)}×`;
  if (value >= 0.01) return `${value.toFixed(2)}×`;
  return `${(value * 100).toFixed(2)}%`;
}

export function SpendingPace() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const totalSpent = useCartStore(selectTotalSpent);
  const purchases = useCartStore((s) => s.purchases);
  const [activeIdx, setActiveIdx] = useState(0);

  // Calculate spending per second based on session duration
  const spendingPerSecond = useMemo(() => {
    if (purchases.length < 2) return 0;
    const first = purchases[0].timestamp;
    const last = purchases[purchases.length - 1].timestamp;
    const elapsed = Math.max((last - first) / 1000, 1);
    return totalSpent / elapsed;
  }, [purchases, totalSpent]);

  // Find relevant benchmarks (where user has at least 0.001× the rate)
  const relevantBenchmarks = useMemo(() => {
    if (spendingPerSecond <= 0) return [];
    return BENCHMARKS
      .map((b) => ({
        ...b,
        multiplier: spendingPerSecond / b.perSecond,
      }))
      .filter((b) => b.multiplier >= 0.001)
      .sort((a, b) => {
        // Prioritize ones close to 1× (most dramatic)
        const aDist = Math.abs(Math.log10(a.multiplier));
        const bDist = Math.abs(Math.log10(b.multiplier));
        return aDist - bDist;
      })
      .slice(0, 5);
  }, [spendingPerSecond]);

  // Cycle through benchmarks
  useEffect(() => {
    if (relevantBenchmarks.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % relevantBenchmarks.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [relevantBenchmarks.length]);

  // Track spending velocity visually
  const velocityRef = useRef<number[]>([]);
  const [velocityTrend, setVelocityTrend] = useState<"rising" | "falling" | "steady">("steady");

  useEffect(() => {
    velocityRef.current.push(spendingPerSecond);
    if (velocityRef.current.length > 5) velocityRef.current.shift();
    const arr = velocityRef.current;
    if (arr.length >= 3) {
      const recent = arr.slice(-2).reduce((a, b) => a + b, 0) / 2;
      const older = arr.slice(0, -2).reduce((a, b) => a + b, 0) / Math.max(arr.length - 2, 1);
      if (recent > older * 1.3) setVelocityTrend("rising");
      else if (recent < older * 0.7) setVelocityTrend("falling");
      else setVelocityTrend("steady");
    }
  }, [spendingPerSecond]);

  if (!selectedBillionaire || purchases.length < 2) return null;

  const trendEmoji = velocityTrend === "rising" ? "📈" : velocityTrend === "falling" ? "📉" : "➡️";
  const trendLabelEn = velocityTrend === "rising" ? "Accelerating" : velocityTrend === "falling" ? "Slowing" : "Steady";
  const trendLabelZh = velocityTrend === "rising" ? "加速中" : velocityTrend === "falling" ? "减速中" : "平稳";

  const activeBenchmark = relevantBenchmarks[activeIdx % Math.max(relevantBenchmarks.length, 1)];

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">⚡</span>
        <h2 className="text-xs uppercase tracking-[0.2em] text-stone/75 font-medium">
          {locale === "zh" ? "消费速率" : "Spending Pace"}
        </h2>
        <span className="ml-auto text-[10px] text-ash/50 font-mono flex items-center gap-1">
          {trendEmoji} {locale === "zh" ? trendLabelZh : trendLabelEn}
        </span>
      </div>

      {/* Spending rate */}
      <div className="flex items-baseline gap-2 mb-5">
        <span className="text-2xl sm:text-3xl font-serif text-sand/90 tabular-nums">
          {formatCurrency(spendingPerSecond)}
        </span>
        <span className="text-[10px] text-ash/55 uppercase tracking-wider font-mono">
          {locale === "zh" ? "/秒" : "/sec"}
        </span>
      </div>

      {/* Benchmark comparison — cycles */}
      {activeBenchmark && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeBenchmark.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="bg-surface-bright/60 border border-line/30 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{activeBenchmark.emoji}</span>
                <div>
                  <div className="text-[11px] text-sand/80 font-medium">
                    {locale === "zh" ? activeBenchmark.labelZh : activeBenchmark.labelEn}
                  </div>
                  <div className="text-[9px] text-ash/50 font-mono tabular-nums mt-0.5">
                    {formatCurrency(activeBenchmark.perSecond)}{locale === "zh" ? "/秒" : "/sec"}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className={`text-lg font-serif tabular-nums ${
                  activeBenchmark.multiplier >= 1 ? "text-champagne" : "text-ash/70"
                }`}>
                  {formatMultiplier(activeBenchmark.multiplier)}
                </div>
                <div className="text-[9px] text-ash/45 mt-0.5">
                  {activeBenchmark.multiplier >= 1
                    ? (locale === "zh" ? "更快" : "faster")
                    : (locale === "zh" ? "倍率" : "of rate")}
                </div>
              </div>
            </div>

            {/* Visual bar */}
            <div className="mt-3 h-2 rounded-full bg-surface-dim/60 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: activeBenchmark.multiplier >= 1
                    ? "linear-gradient(90deg, #A68530, #C5A572)"
                    : "linear-gradient(90deg, #8C7A65, #A0917F)",
                }}
                initial={{ width: "0%" }}
                animate={{
                  width: `${Math.min(
                    activeBenchmark.multiplier >= 1
                      ? Math.min(activeBenchmark.multiplier * 20, 100)
                      : activeBenchmark.multiplier * 100,
                    100
                  )}%`,
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Benchmark dots — navigation */}
      {relevantBenchmarks.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {relevantBenchmarks.map((b, i) => (
            <button
              key={b.id}
              onClick={() => setActiveIdx(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === activeIdx % relevantBenchmarks.length
                  ? "bg-champagne/70 w-4"
                  : "bg-ash/25 hover:bg-ash/40"
              }`}
              aria-label={locale === "zh" ? b.labelZh : b.labelEn}
            />
          ))}
        </div>
      )}
    </section>
  );
}
