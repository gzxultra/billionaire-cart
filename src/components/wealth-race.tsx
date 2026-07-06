"use client";

import { memo, useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useCartStore, selectTotalSpent } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

function WealthRaceInner() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const totalSpent = useCartStore(selectTotalSpent);

  const [spendRate, setSpendRate] = useState(0);
  const purchaseLog = useRef<{ time: number; amount: number }[]>([]);

  // Track purchase timestamps for spending rate calculation
  useEffect(() => {
    if (purchases.length === 0) {
      purchaseLog.current = [];
      return;
    }
    const last = purchases[purchases.length - 1];
    purchaseLog.current.push({ time: last.timestamp, amount: last.product.price });
  }, [purchases]);

  // Update spend rate every second
  useEffect(() => {
    if (!selectedBillionaire) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const window = 60_000; // 60s window
      const recent = purchaseLog.current.filter((e) => now - e.time < window);
      const totalInWindow = recent.reduce((s, e) => s + e.amount, 0);
      setSpendRate(totalInWindow / 60);
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedBillionaire]);

  if (!selectedBillionaire || purchases.length === 0) return null;

  const earningsRate = selectedBillionaire.earningsPerSecond;
  const maxRate = Math.max(spendRate, earningsRate, 1);
  const spendPct = Math.min((spendRate / maxRate) * 100, 100);
  const earnPct = Math.min((earningsRate / maxRate) * 100, 100);
  const isOutspending = spendRate > earningsRate;
  const ratio = earningsRate > 0 ? spendRate / earningsRate : 0;

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">🏁</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-stone/75 font-medium">
            {t("race.title", locale)}
          </span>
        </div>
        {spendRate > 0 && (
          <motion.span
            key={isOutspending ? "out" : "under"}
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            className={`text-[10px] font-medium ${isOutspending ? "text-[#9B6B6B]" : "text-[#5A8A68]"}`}
          >
            {isOutspending
              ? t("race.outspending", locale)
              : t("race.earningFaster", locale)}
          </motion.span>
        )}
      </div>

      {/* Race bars */}
      <div className="space-y-3">
        {/* Spending bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] uppercase tracking-wider text-ash/50">
              {t("race.yourSpending", locale)}
            </span>
            <span className="text-[10px] font-mono text-stone/70 tabular-nums">
              {formatCurrency(spendRate, true)}/s
            </span>
          </div>
          <div className="h-4 rounded-full bg-surface-bright/70 border border-line/20 overflow-hidden relative">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              animate={{ width: `${spendPct}%` }}
              transition={{ type: "spring", stiffness: 60, damping: 18 }}
              style={{
                background: "linear-gradient(90deg, rgba(155,107,107,0.6), rgba(155,107,107,0.85))",
                boxShadow: isOutspending ? "0 0 10px rgba(155,107,107,0.3)" : undefined,
              }}
            />
          </div>
        </div>

        {/* Earnings bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] uppercase tracking-wider text-ash/50">
              {t("race.theirEarnings", locale)}
            </span>
            <span className="text-[10px] font-mono text-stone/70 tabular-nums">
              {formatCurrency(earningsRate, true)}/s
            </span>
          </div>
          <div className="h-4 rounded-full bg-surface-bright/70 border border-line/20 overflow-hidden relative">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              animate={{ width: `${earnPct}%` }}
              transition={{ type: "spring", stiffness: 60, damping: 18 }}
              style={{
                background: "linear-gradient(90deg, rgba(90,138,104,0.5), rgba(90,138,104,0.8))",
                boxShadow: !isOutspending ? "0 0 10px rgba(90,138,104,0.3)" : undefined,
              }}
            />
          </div>
        </div>
      </div>

      {/* Status indicator */}
      {spendRate > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-center"
        >
          {isOutspending ? (
            <motion.div
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#9B6B6B]/10 border border-[#9B6B6B]/20"
            >
              <span className="text-xs">🔥</span>
              <span className="text-[10px] font-medium text-[#9B6B6B]">
                {t("race.burning", locale)} — {ratio.toFixed(1)}x
              </span>
            </motion.div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#5A8A68]/10 border border-[#5A8A68]/20">
              <span className="text-xs">💰</span>
              <span className="text-[10px] font-medium text-[#5A8A68]">
                {t("race.recovering", locale)}
              </span>
            </div>
          )}
        </motion.div>
      )}
    </section>
  );
}

export const WealthRace = memo(WealthRaceInner);
