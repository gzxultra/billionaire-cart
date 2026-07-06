"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";
import { formatCurrency } from "@/lib/format";

/**
 * InvestmentCost — "What if you invested instead?" section.
 * Shows the opportunity cost of spending: how much your total spending
 * would be worth if invested in famous assets over 1y/5y/10y periods.
 */

interface InvestmentOption {
  id: string;
  name: string;
  nameZh: string;
  emoji: string;
  /** Annualized return rate (e.g., 0.12 = 12%) */
  annualReturn: number;
  color: string;
}

const INVESTMENTS: InvestmentOption[] = [
  {
    id: "sp500",
    name: "S&P 500",
    nameZh: "标普500",
    emoji: "📈",
    annualReturn: 0.105,
    color: "#22c55e",
  },
  {
    id: "btc",
    name: "Bitcoin",
    nameZh: "比特币",
    emoji: "₿",
    annualReturn: 0.60,
    color: "#f7931a",
  },
  {
    id: "nasdaq",
    name: "NASDAQ",
    nameZh: "纳斯达克",
    emoji: "💻",
    annualReturn: 0.145,
    color: "#0ea5e9",
  },
  {
    id: "gold",
    name: "Gold",
    nameZh: "黄金",
    emoji: "🥇",
    annualReturn: 0.08,
    color: "#d4a017",
  },
];

const TIME_PERIODS = [
  { years: 1, labelEn: "1Y", labelZh: "1年" },
  { years: 5, labelEn: "5Y", labelZh: "5年" },
  { years: 10, labelEn: "10Y", labelZh: "10年" },
];

function compoundGrowth(principal: number, rate: number, years: number): number {
  return principal * Math.pow(1 + rate, years);
}

export function InvestmentCost() {
  const locale = useLocale((s) => s.locale);
  const purchases = useCartStore((s) => s.purchases);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);

  const totalSpent = useMemo(
    () => purchases.reduce((sum, p) => sum + p.product.price, 0),
    [purchases]
  );

  // Also compute: use the billionaire's own ticker as a special row if they have one
  const billionaireInvestment = useMemo<InvestmentOption | null>(() => {
    if (!selectedBillionaire?.ticker) return null;
    // Approximate "billionaire's company" return based on sector
    const sector = selectedBillionaire.sector.toLowerCase();
    let rate = 0.15; // default
    if (sector.includes("tech")) rate = 0.22;
    if (sector.includes("luxury")) rate = 0.12;
    if (sector.includes("finance") || sector.includes("invest")) rate = 0.18;
    return {
      id: "billionaire-company",
      name: `${selectedBillionaire.ticker}`,
      nameZh: `${selectedBillionaire.ticker}`,
      emoji: selectedBillionaire.emoji,
      annualReturn: rate,
      color: selectedBillionaire.wealthBreakdown?.[0]?.color || "#8b5cf6",
    };
  }, [selectedBillionaire]);

  if (!selectedBillionaire || purchases.length === 0) return null;

  const allInvestments = billionaireInvestment
    ? [billionaireInvestment, ...INVESTMENTS]
    : INVESTMENTS;

  // Find the best performer at 10Y
  const best10Y = allInvestments.reduce((best, inv) =>
    compoundGrowth(totalSpent, inv.annualReturn, 10) >
    compoundGrowth(totalSpent, best.annualReturn, 10)
      ? inv
      : best
  );

  return (
    <section className="card-panel p-5 sm:p-8">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">💸</span>
        <h2 className="text-xs uppercase tracking-[0.2em] text-stone/75 font-medium">
          {locale === "zh" ? "如果你投资了呢" : "What If You Invested?"}
        </h2>
      </div>
      <p className="text-[10px] text-ash/50 mb-5">
        {locale === "zh"
          ? `你花了 ${formatCurrency(totalSpent)} — 如果拿去投资...`
          : `You spent ${formatCurrency(totalSpent)} — what if you'd invested it instead...`}
      </p>

      {/* Investment comparison table */}
      <div className="space-y-3">
        {allInvestments.map((inv, idx) => {
          const values = TIME_PERIODS.map((tp) => ({
            ...tp,
            value: compoundGrowth(totalSpent, inv.annualReturn, tp.years),
            gain: compoundGrowth(totalSpent, inv.annualReturn, tp.years) - totalSpent,
          }));

          const maxGain = compoundGrowth(totalSpent, best10Y.annualReturn, 10) - totalSpent;
          const thisGain10Y = values[2].gain;
          const barWidth = maxGain > 0 ? Math.max(5, (thisGain10Y / maxGain) * 100) : 5;

          return (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="group"
            >
              <div className="flex items-center gap-3 mb-1.5">
                <span className="text-sm w-6 text-center">{inv.emoji}</span>
                <span className="text-[11px] font-medium text-sand/85 min-w-[70px]">
                  {locale === "zh" ? inv.nameZh : inv.name}
                </span>
                <div className="flex-1 flex gap-2 sm:gap-4 justify-end">
                  {values.map((v) => (
                    <div key={v.years} className="text-right min-w-[60px] sm:min-w-[80px]">
                      <div className="text-[10px] text-ash/45 font-mono mb-0.5">
                        {locale === "zh" ? v.labelZh : v.labelEn}
                      </div>
                      <div className="text-[11px] font-serif text-champagne/90 tabular-nums">
                        {formatCurrency(v.value, true)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Growth bar */}
              <div className="flex items-center gap-3">
                <div className="w-6" />
                <div className="flex-1 h-1.5 rounded-full bg-surface-dim/60 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                    className="h-full rounded-full"
                    style={{ background: inv.color }}
                  />
                </div>
                <span className="text-[9px] font-mono text-emerald-500/70 min-w-[50px] text-right">
                  +{formatCurrency(thisGain10Y, true)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom insight */}
      <div className="mt-5 pt-4 border-t border-line/30">
        <p className="text-[10px] text-ash/55 text-center italic">
          {locale === "zh"
            ? `10年后，${best10Y.emoji} ${locale === "zh" ? best10Y.nameZh : best10Y.name} 会让你的 ${formatCurrency(totalSpent)} 变成 ${formatCurrency(compoundGrowth(totalSpent, best10Y.annualReturn, 10), true)}`
            : `In 10 years, ${best10Y.emoji} ${best10Y.name} would turn your ${formatCurrency(totalSpent)} into ${formatCurrency(compoundGrowth(totalSpent, best10Y.annualReturn, 10), true)}`}
        </p>
      </div>
    </section>
  );
}
