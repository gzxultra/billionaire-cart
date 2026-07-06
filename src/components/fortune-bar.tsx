"use client";

import { memo, useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

const MILESTONES = [25, 50, 75, 90] as const;

function getBarColor(pct: number): string {
  if (pct < 30) return "rgba(90,138,104,0.85)";   // sage green
  if (pct < 60) return "rgba(166,133,48,0.85)";    // champagne gold
  if (pct < 90) return "rgba(155,107,107,0.85)";   // muted rose
  return "rgba(180,60,60,0.9)";                     // critical red
}

function getBarGlow(pct: number): string {
  if (pct < 30) return "0 0 8px rgba(90,138,104,0.3)";
  if (pct < 60) return "0 0 8px rgba(166,133,48,0.3)";
  if (pct < 90) return "0 0 10px rgba(155,107,107,0.35)";
  return "0 0 14px rgba(180,60,60,0.45)";
}

function FortuneBarInner() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);
  const purchaseCount = useCartStore((s) => s.purchases.length);

  const [lastCrossed, setLastCrossed] = useState<number | null>(null);
  const prevPctRef = useRef(0);

  const pct = netWorth > 0 ? Math.min((totalSpent / netWorth) * 100, 100) : 0;
  const remaining = Math.max(netWorth - totalSpent, 0);

  // Detect milestone crossing
  useEffect(() => {
    const prev = prevPctRef.current;
    for (const ms of MILESTONES) {
      if (prev < ms && pct >= ms) {
        setLastCrossed(ms);
        const timer = setTimeout(() => setLastCrossed(null), 2000);
        return () => clearTimeout(timer);
      }
    }
    prevPctRef.current = pct;
  }, [pct]);

  if (!selectedBillionaire || purchaseCount === 0) return null;

  const barColor = getBarColor(pct);
  const isCritical = pct >= 90;

  return (
    <section className="card-panel p-4 sm:p-5 stagger-section">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">📊</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-stone/75 font-medium">
            {t("fortune.title", locale)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-ash/60 font-mono tabular-nums">
          <span>
            {t("fortune.spent", locale)}: {pct.toFixed(1)}%
          </span>
          <span className="text-ash/30">|</span>
          <span>
            {t("fortune.remaining", locale)}: {formatCurrency(remaining, true)}
          </span>
        </div>
      </div>

      {/* Bar container */}
      <div className="relative h-5 rounded-full bg-surface-bright/80 border border-line/30 overflow-hidden">
        {/* Milestone markers */}
        {MILESTONES.map((ms) => (
          <div
            key={ms}
            className="absolute top-0 bottom-0 w-px bg-ash/20 z-10"
            style={{ left: `${ms}%` }}
          >
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] text-ash/40 font-mono">
              {ms}%
            </span>
          </div>
        ))}

        {/* Animated fill */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
          style={{
            backgroundColor: barColor,
            boxShadow: getBarGlow(pct),
          }}
        >
          {/* Critical pulsing effect */}
          {isCritical && (
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              style={{ backgroundColor: "rgba(180,60,60,0.3)" }}
            />
          )}
        </motion.div>

        {/* Percentage label on bar */}
        {pct > 8 && (
          <motion.div
            className="absolute inset-y-0 flex items-center z-20"
            animate={{ left: `${Math.min(pct - 1, 96)}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 20 }}
          >
            <span className="text-[9px] font-mono font-semibold text-white/90 drop-shadow-sm pr-2 text-right">
              {pct.toFixed(1)}%
            </span>
          </motion.div>
        )}
      </div>

      {/* Milestone toast */}
      <AnimatePresence>
        {lastCrossed !== null && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-2 text-center text-[11px] font-medium text-champagne"
          >
            🎯 {t(`fortune.milestone${lastCrossed}`, locale)}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export const FortuneBar = memo(FortuneBarInner);
