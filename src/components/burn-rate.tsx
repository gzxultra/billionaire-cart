"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useCartStore, selectMonthlyBurn, selectRemaining } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

export function BurnRate() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const monthlyBurn = useCartStore(selectMonthlyBurn);
  const remaining = useCartStore(selectRemaining);

  // Top 3 most expensive monthly costs
  const topCosts = useMemo(() => {
    return purchases
      .filter((p) => p.product.monthlyOverhead > 0)
      .sort((a, b) => b.product.monthlyOverhead - a.product.monthlyOverhead)
      .slice(0, 3);
  }, [purchases]);

  // Months until bankruptcy from burn rate alone
  const monthsUntilBroke = useMemo(() => {
    if (monthlyBurn <= 0 || remaining <= 0) return null;
    return remaining / monthlyBurn;
  }, [monthlyBurn, remaining]);

  // Flame size: 0-4 scale based on burn rate as fraction of net worth
  const flameScale = useMemo(() => {
    if (!selectedBillionaire || monthlyBurn <= 0) return 0;
    const netWorth = selectedBillionaire.netWorthB * 1_000_000_000;
    const yearlyBurn = monthlyBurn * 12;
    const ratio = yearlyBurn / netWorth;
    if (ratio < 0.001) return 1;
    if (ratio < 0.01) return 2;
    if (ratio < 0.1) return 3;
    return 4;
  }, [selectedBillionaire, monthlyBurn]);

  const flameEmojis = ["", "🔥", "🔥🔥", "🔥🔥🔥", "🔥🔥🔥🔥"];

  if (!selectedBillionaire || monthlyBurn <= 0) return null;

  const formatTimeUntilBroke = (months: number): string => {
    if (months > 12000) {
      const years = Math.round(months / 12);
      return locale === "zh" ? `${years.toLocaleString()} 年` : `${years.toLocaleString()} years`;
    }
    if (months > 120) {
      const years = Math.round(months / 12);
      return locale === "zh" ? `${years} 年` : `${years} years`;
    }
    if (months > 1) {
      return locale === "zh" ? `${Math.round(months)} 个月` : `${Math.round(months)} months`;
    }
    const days = Math.round(months * 30);
    return locale === "zh" ? `${days} 天` : `${days} days`;
  };

  return (
    <section className="card-panel-accent p-5 sm:p-8">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-base">🔥</span>
        <h2 className="text-xs uppercase tracking-[0.2em] text-stone/75 font-medium">
          {locale === "zh" ? "烧钱速度" : "Burn Rate"}
        </h2>
        <motion.span
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="ml-auto text-sm"
        >
          {flameEmojis[flameScale] || "🔥"}
        </motion.span>
      </div>

      {/* Main burn rate */}
      <div className="text-center mb-5">
        <div className="text-[10px] uppercase tracking-widest text-stone/50 font-mono mb-2">
          {locale === "zh" ? "你的生活方式每月花费" : "Your lifestyle costs"}
        </div>
        <motion.div
          key={monthlyBurn}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          className="text-2xl sm:text-3xl font-serif text-champagne"
        >
          {formatCurrency(monthlyBurn)}
          <span className="text-sm text-stone/50">
            {locale === "zh" ? "/月" : "/mo"}
          </span>
        </motion.div>

        {monthsUntilBroke !== null && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] text-ash/60 mt-2"
          >
            {locale === "zh"
              ? `按此速度，${formatTimeUntilBroke(monthsUntilBroke)}后破产`
              : `At this rate, broke in ${formatTimeUntilBroke(monthsUntilBroke)}`}
          </motion.p>
        )}
      </div>

      {/* Top 3 costs */}
      {topCosts.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-stone/40 font-mono">
            {locale === "zh" ? "最烧钱的" : "Top expenses"}
          </div>
          {topCosts.map((p, i) => {
            const pctOfBurn = monthlyBurn > 0 ? (p.product.monthlyOverhead / monthlyBurn) * 100 : 0;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 bg-surface-bright/40 rounded-lg px-3 py-2"
              >
                <span className="text-[10px] text-stone/40 font-mono w-4">#{i + 1}</span>
                <span className="text-[11px] text-sand flex-1 truncate">
                  {p.product.title.replace(/^[⚡⚔️🤝🎰🎁] /, "").replace(/ \(.*\)$/, "")}
                </span>
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-champagne font-mono">
                    {formatCurrency(p.product.monthlyOverhead, true)}/mo
                  </div>
                  <div className="text-[9px] text-ash/40">
                    {pctOfBurn.toFixed(0)}%
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Yearly projection */}
      <div className="mt-4 pt-3 border-t border-line/20 text-center">
        <span className="text-[10px] text-ash/40 font-mono">
          {locale === "zh" ? "年化" : "Yearly"}: {" "}
        </span>
        <span className="text-[11px] text-stone/70 font-serif">
          {formatCurrency(monthlyBurn * 12, true)}
        </span>
      </div>
    </section>
  );
}
