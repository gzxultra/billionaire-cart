"use client";

import { motion } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

interface Milestone {
  label: string;
  labelZh: string;
  amount: number;
  emoji: string;
}

const MILESTONES: Milestone[] = [
  { label: "Average Student Debt", labelZh: "美国学生贷款平均", amount: 37000, emoji: "🎓" },
  { label: "Tesla Model 3", labelZh: "特斯拉 Model 3", amount: 38990, emoji: "⚡" },
  { label: "Median US Home", labelZh: "美国房价中位数", amount: 420000, emoji: "🏠" },
  { label: "One Comma Club", labelZh: "百万俱乐部", amount: 1000000, emoji: "💰" },
  { label: "Lambo", labelZh: "兰博基尼", amount: 248295, emoji: "🏎️" },
  { label: "Private Jet", labelZh: "私人飞机", amount: 78000000, emoji: "✈️" },
  { label: "GDP of Tuvalu", labelZh: "图瓦卢GDP", amount: 60000000, emoji: "🏝️" },
  { label: "NFL Team", labelZh: "NFL球队", amount: 5000000000, emoji: "🏈" },
  { label: "GDP of Iceland", labelZh: "冰岛GDP", amount: 28000000000, emoji: "🇮🇸" },
  { label: "Twitter / X", labelZh: "推特 / X", amount: 44000000000, emoji: "🐦" },
  { label: "GDP of Croatia", labelZh: "克罗地亚GDP", amount: 71000000000, emoji: "🇭🇷" },
  { label: "Moon Mission", labelZh: "登月任务", amount: 100000000000, emoji: "🌕" },
];

const COMPARISONS = [
  {
    unit: "average US yearly salary",
    unitZh: "年美国人均工资",
    unitPlural: "years of average US salary",
    unitPluralZh: "年美国人均工资",
    amount: 75000,
    emoji: "👤",
  },
  {
    unit: "cup of coffee",
    unitZh: "杯咖啡",
    unitPlural: "cups of coffee",
    unitPluralZh: "杯咖啡",
    amount: 6.5,
    emoji: "☕",
  },
  {
    unit: "iPhone",
    unitZh: "部 iPhone",
    unitPlural: "iPhones",
    unitPluralZh: "部 iPhone",
    amount: 1199,
    emoji: "📱",
  },
  {
    unit: "Toyota Corolla",
    unitZh: "辆丰田卡罗拉",
    unitPlural: "Toyota Corollas",
    unitPluralZh: "辆丰田卡罗拉",
    amount: 22000,
    emoji: "🚗",
  },
  {
    unit: "average American's lifetime earnings",
    unitZh: "个美国人一生收入",
    unitPlural: "lifetimes of average earnings",
    unitPluralZh: "个美国人一生收入",
    amount: 2700000,
    emoji: "⏳",
  },
];

function getRelevantComparisons(totalSpent: number, locale: string) {
  return COMPARISONS.map((c) => {
    const count = totalSpent / c.amount;
    if (count < 1) return null;
    return {
      ...c,
      count: Math.floor(count),
      displayUnit:
        locale === "zh"
          ? c.unitPluralZh
          : Math.floor(count) === 1
          ? c.unit
          : c.unitPlural,
    };
  }).filter(Boolean);
}

function getEarnBackTime(totalSpent: number, earningsPerSecond: number, locale: string) {
  if (earningsPerSecond <= 0) return null;
  const seconds = totalSpent / earningsPerSecond;
  if (locale === "zh") {
    if (seconds < 60) return `${Math.ceil(seconds)} 秒`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)} 分钟`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} 小时`;
    if (seconds < 86400 * 365) return `${(seconds / 86400).toFixed(1)} 天`;
    return `${(seconds / (86400 * 365)).toFixed(1)} 年`;
  }
  if (seconds < 60) return `${Math.ceil(seconds)} seconds`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} minutes`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} hours`;
  if (seconds < 86400 * 365) return `${(seconds / 86400).toFixed(1)} days`;
  return `${(seconds / (86400 * 365)).toFixed(1)} years`;
}

export function WealthContext() {
  const locale = useLocale((s) => s.locale);
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
    .slice(-5);

  const comparisons = getRelevantComparisons(totalSpent, locale);
  const topComparisons = comparisons.slice(0, 3);

  const earnBackTime = getEarnBackTime(
    totalSpent,
    selectedBillionaire.earningsPerSecond,
    locale
  );

  const passedMilestones = MILESTONES.filter((m) => totalSpent >= m.amount);
  const nextMilestone = MILESTONES.filter((m) => totalSpent < m.amount).sort(
    (a, b) => a.amount - b.amount
  )[0];

  return (
    <div className="w-full space-y-4">
      <h2 className="section-label">
        {t("wealth.title", locale)}
      </h2>

      {/* Progress bar with milestones */}
      <div className="relative">
        <div className="w-full h-2 bg-surface-bright/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                spentPercent >= 100
                  ? "linear-gradient(90deg, #ef4444, #dc2626)"
                  : spentPercent >= 50
                  ? "linear-gradient(90deg, #818CF8, #A5B4FC, #FCD34D)"
                  : "linear-gradient(90deg, #6366F1, #818CF8, #A5B4FC)",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(spentPercent, 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

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
                {m.emoji} {locale === "zh" ? m.labelZh : m.label}
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
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/15 text-[9px] text-accent/70"
            >
              {m.emoji} {locale === "zh" ? m.labelZh : m.label}
            </span>
          ))}
        </div>
      )}

      {/* Next milestone */}
      {nextMilestone && (
        <div className="text-[10px] text-white/25">
          {t("wealth.nextMilestone", locale)}:{" "}
          <span className="text-accent/50">
            {nextMilestone.emoji} {locale === "zh" ? nextMilestone.labelZh : nextMilestone.label} (
            {formatCurrency(nextMilestone.amount, true)})
          </span>
          {" — "}
          <span className="text-white/40">
            {formatCurrency(nextMilestone.amount - totalSpent, true)} {t("wealth.toGo", locale)}
          </span>
        </div>
      )}

      {/* Absurdity comparisons */}
      {topComparisons.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-line/10">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/20 mb-1">
            {t("wealth.equivalentTo", locale)}
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
                  <span className="text-accent font-serif">
                    {c.count.toLocaleString()}
                  </span>{" "}
                  {c.displayUnit}
                </span>
              </motion.div>
            ) : null
          )}
        </div>
      )}

      {/* Earn-back context */}
      {earnBackTime && (
        <div className="text-[10px] text-white/25 pt-2 border-t border-line/10">
          ⏱ {selectedBillionaire.name} {t("wealth.earnBack", locale)}{" "}
          <span className="text-accent/60">{earnBackTime}</span>
        </div>
      )}
    </div>
  );
}
