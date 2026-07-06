"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

/**
 * SpendingMilestoneTracker — shows a visual progress track of real-world
 * spending milestones. As you spend, you pass famous costs/GDPs.
 * Each milestone shows a checkmark when passed.
 */

interface Milestone {
  amount: number;
  labelEn: string;
  labelZh: string;
  emoji: string;
}

const MILESTONES: Milestone[] = [
  { amount: 1_000, labelEn: "Monthly groceries", labelZh: "一个月伙食费", emoji: "🛒" },
  { amount: 10_000, labelEn: "Used car", labelZh: "二手车", emoji: "🚗" },
  { amount: 50_000, labelEn: "College tuition (1 yr)", labelZh: "一年大学学费", emoji: "🎓" },
  { amount: 250_000, labelEn: "Median US home", labelZh: "美国中位数房价", emoji: "🏠" },
  { amount: 1_000_000, labelEn: "Manhattan apartment", labelZh: "曼哈顿公寓", emoji: "🏙️" },
  { amount: 5_000_000, labelEn: "Private island", labelZh: "私人岛屿", emoji: "🏝️" },
  { amount: 25_000_000, labelEn: "Private jet", labelZh: "私人飞机", emoji: "✈️" },
  { amount: 100_000_000, labelEn: "Pro sports team", labelZh: "职业体育队", emoji: "🏟️" },
  { amount: 500_000_000, labelEn: "Skyscraper", labelZh: "摩天大楼", emoji: "🏗️" },
  { amount: 1_000_000_000, labelEn: "Aircraft carrier", labelZh: "航空母舰", emoji: "⚓" },
  { amount: 5_000_000_000, labelEn: "Mars mission", labelZh: "火星任务", emoji: "🚀" },
  { amount: 10_000_000_000, labelEn: "Olympic Games", labelZh: "奥运会", emoji: "🏅" },
  { amount: 50_000_000_000, labelEn: "GDP of Luxembourg", labelZh: "卢森堡GDP", emoji: "🇱🇺" },
  { amount: 100_000_000_000, labelEn: "GDP of Morocco", labelZh: "摩洛哥GDP", emoji: "🇲🇦" },
  { amount: 200_000_000_000, labelEn: "Apple's annual revenue", labelZh: "苹果年收入", emoji: "🍎" },
];

function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(0)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function SpendingMilestoneTracker() {
  const locale = useLocale((s) => s.locale);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const [lastCelebrated, setLastCelebrated] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Find relevant milestones (cap at net worth)
  const relevantMilestones = useMemo(() => {
    return MILESTONES.filter((m) => m.amount <= netWorth * 1.2);
  }, [netWorth]);

  // How many milestones passed
  const passedCount = useMemo(() => {
    return relevantMilestones.filter((m) => totalSpent >= m.amount).length;
  }, [relevantMilestones, totalSpent]);

  // Next milestone
  const nextMilestone = useMemo(() => {
    return relevantMilestones.find((m) => totalSpent < m.amount) ?? null;
  }, [relevantMilestones, totalSpent]);

  // Celebrate newly passed milestone
  useEffect(() => {
    if (passedCount > 0) {
      const latest = relevantMilestones[passedCount - 1];
      if (latest && latest.amount !== lastCelebrated && totalSpent >= latest.amount) {
        setLastCelebrated(latest.amount);
      }
    }
  }, [passedCount, relevantMilestones, totalSpent, lastCelebrated]);

  const toggleExpand = useCallback(() => setExpanded((p) => !p), []);

  if (!selectedBillionaire || totalSpent < 100 || relevantMilestones.length === 0) return null;

  // Show the last 2 passed + next 3 upcoming (or all if expanded)
  const visibleMilestones = expanded
    ? relevantMilestones
    : (() => {
        const passedIdx = relevantMilestones.findIndex((m) => totalSpent < m.amount);
        const startIdx = Math.max(0, (passedIdx === -1 ? relevantMilestones.length : passedIdx) - 2);
        const endIdx = Math.min(relevantMilestones.length, startIdx + 5);
        return relevantMilestones.slice(startIdx, endIdx);
      })();

  const progressToNext = nextMilestone
    ? (() => {
        const prevAmount = passedCount > 0 ? relevantMilestones[passedCount - 1].amount : 0;
        return ((totalSpent - prevAmount) / (nextMilestone.amount - prevAmount)) * 100;
      })()
    : 100;

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-label flex items-center gap-2">
          <span className="text-base">🏔️</span>
          {locale === "zh" ? "消费里程碑" : "Spending Milestones"}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-champagne/80 tabular-nums">
            {passedCount}/{relevantMilestones.length}
          </span>
          {relevantMilestones.length > 5 && (
            <button
              onClick={toggleExpand}
              className="text-[9px] text-ash/60 hover:text-ash/80 transition-colors px-1.5 py-0.5 rounded border border-line/40"
            >
              {expanded
                ? (locale === "zh" ? "收起" : "Less")
                : (locale === "zh" ? "展开" : "All")}
            </button>
          )}
        </div>
      </div>

      {/* Milestone track */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-0 bottom-0 w-px bg-line/40" />

        <div className="space-y-0">
          <AnimatePresence mode="popLayout">
            {visibleMilestones.map((milestone, i) => {
              const passed = totalSpent >= milestone.amount;
              const isCurrent = nextMilestone?.amount === milestone.amount;

              return (
                <motion.div
                  key={milestone.amount}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: i * 0.05 }}
                  className={`relative flex items-center gap-3 py-2 pl-0 ${
                    isCurrent ? "" : ""
                  }`}
                >
                  {/* Dot / checkmark */}
                  <div
                    className={`relative z-10 w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 text-sm border transition-all ${
                      passed
                        ? "bg-sage/20 border-sage/40 text-sage"
                        : isCurrent
                        ? "bg-champagne/15 border-champagne/40 text-champagne animate-pulse"
                        : "bg-surface-dim/60 border-line/50 text-ash/40"
                    }`}
                  >
                    {passed ? "✓" : milestone.emoji}
                  </div>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`text-xs truncate ${
                          passed ? "text-sand/85" : isCurrent ? "text-sand/75" : "text-ash/55"
                        }`}
                      >
                        {locale === "zh" ? milestone.labelZh : milestone.labelEn}
                      </span>
                      <span
                        className={`text-[10px] font-mono shrink-0 tabular-nums ${
                          passed ? "text-sage/70" : isCurrent ? "text-champagne/70" : "text-ash/45"
                        }`}
                      >
                        {formatCompact(milestone.amount)}
                      </span>
                    </div>

                    {/* Progress to this milestone */}
                    {isCurrent && (
                      <div className="mt-1.5">
                        <div className="w-full h-1 rounded-full bg-surface-dim/60 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-champagne/60"
                            animate={{ width: `${Math.min(progressToNext, 100)}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <div className="text-[9px] text-ash/50 font-mono mt-0.5 text-right tabular-nums">
                          {formatCurrency(nextMilestone!.amount - totalSpent, true)}{" "}
                          {locale === "zh" ? "还差" : "to go"}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
