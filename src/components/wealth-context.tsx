"use client";

import { motion } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";

interface Milestone {
  label: string;
  amount: number;
  emoji: string;
}

const MILESTONES: Milestone[] = [
  { label: "Average Student Debt", amount: 37000, emoji: "🎓" },
  { label: "Tesla Model 3", amount: 38990, emoji: "⚡" },
  { label: "Median US Home", amount: 420000, emoji: "🏠" },
  { label: "One Comma Club", amount: 1000000, emoji: "💰" },
  { label: "Lambo", amount: 248295, emoji: "🏎️" },
  { label: "Private Jet", amount: 78000000, emoji: "✈️" },
  { label: "GDP of Tuvalu", amount: 60000000, emoji: "🏝️" },
  { label: "NFL Team", amount: 5000000000, emoji: "🏈" },
  { label: "GDP of Iceland", amount: 28000000000, emoji: "🇮🇸" },
  { label: "Twitter / X", amount: 44000000000, emoji: "🐦" },
  { label: "GDP of Croatia", amount: 71000000000, emoji: "🇭🇷" },
  { label: "Moon Mission", amount: 100000000000, emoji: "🌕" },
];

const COMPARISONS = [
  {
    unit: "average US yearly salary",
    unitPlural: "years of average US salary",
    amount: 75000,
    emoji: "👤",
  },
  {
    unit: "cup of coffee",
    unitPlural: "cups of coffee",
    amount: 6.5,
    emoji: "☕",
  },
  {
    unit: "iPhone",
    unitPlural: "iPhones",
    amount: 1199,
    emoji: "📱",
  },
  {
    unit: "Toyota Corolla",
    unitPlural: "Toyota Corollas",
    amount: 22000,
    emoji: "🚗",
  },
  {
    unit: "average American's lifetime earnings",
    unitPlural: "lifetimes of average earnings",
    amount: 2700000,
    emoji: "⏳",
  },
];

function getRelevantComparisons(totalSpent: number) {
  return COMPARISONS.map((c) => {
    const count = totalSpent / c.amount;
    if (count < 1) return null;
    return {
      ...c,
      count: Math.floor(count),
    };
  }).filter(Boolean);
}

function getEarnBackTime(totalSpent: number, earningsPerSecond: number) {
  if (earningsPerSecond <= 0) return null;
  const seconds = totalSpent / earningsPerSecond;
  if (seconds < 60) return `${Math.ceil(seconds)} seconds`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} minutes`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} hours`;
  if (seconds < 86400 * 365) return `${(seconds / 86400).toFixed(1)} days`;
  return `${(seconds / (86400 * 365)).toFixed(1)} years`;
}

export function WealthContext() {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);
  const purchases = useCartStore((s) => s.purchases);

  if (!selectedBillionaire || purchases.length === 0) return null;

  const spentPercent = netWorth > 0 ? (totalSpent / netWorth) * 100 : 0;

  // Find milestone markers that fit within spent range
  const visibleMilestones = MILESTONES.filter(
    (m) => m.amount <= netWorth && m.amount <= totalSpent * 2
  )
    .sort((a, b) => a.amount - b.amount)
    .slice(-5); // show up to 5 most relevant

  // Pick 2-3 interesting comparisons
  const comparisons = getRelevantComparisons(totalSpent);
  const topComparisons = comparisons.slice(0, 3);

  // Earn-back time for the total spent
  const earnBackTime = getEarnBackTime(
    totalSpent,
    selectedBillionaire.earningsPerSecond
  );

  // Passed milestones
  const passedMilestones = MILESTONES.filter((m) => totalSpent >= m.amount);
  const nextMilestone = MILESTONES.filter((m) => totalSpent < m.amount).sort(
    (a, b) => a.amount - b.amount
  )[0];

  return (
    <div className="w-full space-y-4">
      <h2 className="text-xs uppercase tracking-[0.3em] text-copper/60 font-sans">
        Spending Context
      </h2>

      {/* Progress bar with milestones */}
      <div className="relative">
        <div className="w-full h-2 bg-charcoal-700/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                spentPercent >= 100
                  ? "linear-gradient(90deg, #ef4444, #dc2626)"
                  : spentPercent >= 50
                  ? "linear-gradient(90deg, #B87333, #D4956B, #eab308)"
                  : "linear-gradient(90deg, #8B5A2B, #B87333, #D4956B)",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(spentPercent, 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        {/* Milestone markers on the bar */}
        {visibleMilestones.map((m) => {
          const pos = netWorth > 0 ? (m.amount / netWorth) * 100 : 0;
          if (pos > 100) return null;
          return (
            <div
              key={m.label}
              className="absolute top-3 -translate-x-1/2"
              style={{ left: `${pos}%` }}
            >
              <div className="text-[8px] text-white/20 whitespace-nowrap">
                {m.emoji} {m.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Passed milestones badges */}
      {passedMilestones.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {passedMilestones.map((m) => (
            <span
              key={m.label}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-copper/10 border border-copper/15 text-[9px] text-copper/70"
            >
              {m.emoji} {m.label}
            </span>
          ))}
        </div>
      )}

      {/* Next milestone */}
      {nextMilestone && (
        <div className="text-[10px] text-white/25">
          Next milestone:{" "}
          <span className="text-copper/50">
            {nextMilestone.emoji} {nextMilestone.label} (
            {formatCurrency(nextMilestone.amount, true)})
          </span>
          {" — "}
          <span className="text-white/40">
            {formatCurrency(nextMilestone.amount - totalSpent, true)} to go
          </span>
        </div>
      )}

      {/* Absurdity comparisons */}
      {topComparisons.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-charcoal-600/10">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/20 mb-1">
            That&apos;s equivalent to…
          </div>
          {topComparisons.map((c) =>
            c ? (
              <motion.div
                key={c.unit}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-xs"
              >
                <span className="text-sm">{c.emoji}</span>
                <span className="text-white/50">
                  <span className="text-copper font-serif">
                    {c.count.toLocaleString()}
                  </span>{" "}
                  {c.count === 1 ? c.unit : c.unitPlural}
                </span>
              </motion.div>
            ) : null
          )}
        </div>
      )}

      {/* Earn-back context */}
      {earnBackTime && (
        <div className="text-[10px] text-white/25 pt-2 border-t border-charcoal-600/10">
          ⏱ {selectedBillionaire.name} earns all this back in{" "}
          <span className="text-copper/60">{earnBackTime}</span>
        </div>
      )}
    </div>
  );
}
