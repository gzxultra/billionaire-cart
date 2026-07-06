"use client";

import { memo, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { formatCurrency, formatNetWorth } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { useLiveData } from "@/lib/use-live-data";
import { billionaires as staticBillionaires } from "@/data/billionaires";

function CompareCardInner() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const mergedBillionaires = useLiveData((s) => s.mergedBillionaires);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const allBillionaires = useMemo(() => {
    return mergedBillionaires.length > 0 ? mergedBillionaires : staticBillionaires;
  }, [mergedBillionaires]);

  const compareTo = useMemo(() => {
    if (!compareId) return null;
    return allBillionaires.find((b) => b.id === compareId) ?? null;
  }, [compareId, allBillionaires]);

  const others = useMemo(() => {
    return allBillionaires.filter((b) => b.id !== selectedBillionaire?.id);
  }, [allBillionaires, selectedBillionaire]);

  const handleOpen = useCallback(() => {
    if (!compareId && others.length > 0) {
      setCompareId(others[0].id);
    }
    setIsOpen(true);
  }, [compareId, others]);

  if (!selectedBillionaire) return null;

  const a = selectedBillionaire;
  const b = compareTo;

  const maxNetWorth = b ? Math.max(a.netWorthB, b.netWorthB) : a.netWorthB;
  const maxEps = b ? Math.max(a.earningsPerSecond, b.earningsPerSecond) : a.earningsPerSecond;

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">⚔️</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-stone/75 font-medium">
            {locale === "zh" ? "富豪对决" : "Billionaire Duel"}
          </span>
        </div>
        {!isOpen && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpen}
            className="px-3 py-1.5 rounded-lg text-[10px] font-medium text-stone bg-stone/[0.08] border border-stone/20 hover:bg-stone/[0.12] transition-all"
          >
            {locale === "zh" ? "比一比" : "Compare"}
          </motion.button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-ash/50 text-center py-4"
          >
            {locale === "zh"
              ? `看看 ${a.name} 和其他富豪比起来如何`
              : `See how ${a.name} stacks up against others`}
          </motion.p>
        ) : (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Opponent selector */}
            <div className="mb-4">
              <label className="text-[9px] uppercase tracking-wider text-ash/50 mb-1.5 block">
                {locale === "zh" ? "选择对手" : "Choose Opponent"}
              </label>
              <select
                value={compareId ?? ""}
                onChange={(e) => setCompareId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-dim/80 border border-line/40 text-xs text-sand focus:outline-none focus:border-stone/40 transition-colors"
              >
                {others.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.emoji} {o.name} — {formatNetWorth(o.netWorthB)}
                  </option>
                ))}
              </select>
            </div>

            {b && (
              <div className="space-y-4">
                {/* Head-to-head header */}
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-stone/[0.06] rounded-xl p-3 border border-stone/15">
                    <div className="text-2xl mb-1">{a.emoji}</div>
                    <div className="text-[12px] font-semibold text-sand truncate">{a.name}</div>
                    <div className="text-[9px] text-ash/50">{a.company}</div>
                  </div>
                  <div className="bg-surface-dim/60 rounded-xl p-3 border border-line/20">
                    <div className="text-2xl mb-1">{b.emoji}</div>
                    <div className="text-[12px] font-semibold text-sand truncate">{b.name}</div>
                    <div className="text-[9px] text-ash/50">{b.company}</div>
                  </div>
                </div>

                {/* VS badge */}
                <div className="flex items-center justify-center -my-1">
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-xs font-bold text-stone/50 bg-surface border border-line/30 px-2 py-0.5 rounded-full"
                  >
                    VS
                  </motion.span>
                </div>

                {/* Comparison bars */}
                <div className="space-y-3">
                  {/* Net Worth */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] uppercase tracking-wider text-ash/50">
                        {locale === "zh" ? "净资产" : "Net Worth"}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-stone/60 w-5 shrink-0">{a.emoji}</span>
                        <div className="flex-1 h-3.5 rounded-full bg-surface-dim/60 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(a.netWorthB / maxNetWorth) * 100}%` }}
                            transition={{ duration: 0.6 }}
                            className="h-full rounded-full bg-champagne/60"
                          />
                        </div>
                        <span className="text-[10px] font-mono text-champagne/80 tabular-nums w-14 text-right shrink-0">
                          ${a.netWorthB}B
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-stone/60 w-5 shrink-0">{b.emoji}</span>
                        <div className="flex-1 h-3.5 rounded-full bg-surface-dim/60 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(b.netWorthB / maxNetWorth) * 100}%` }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="h-full rounded-full bg-stone/40"
                          />
                        </div>
                        <span className="text-[10px] font-mono text-stone/60 tabular-nums w-14 text-right shrink-0">
                          ${b.netWorthB}B
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Earnings per second */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] uppercase tracking-wider text-ash/50">
                        {locale === "zh" ? "每秒收入" : "Earnings/Sec"}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-stone/60 w-5 shrink-0">{a.emoji}</span>
                        <div className="flex-1 h-3.5 rounded-full bg-surface-dim/60 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(a.earningsPerSecond / maxEps) * 100}%` }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="h-full rounded-full bg-sage/50"
                          />
                        </div>
                        <span className="text-[10px] font-mono text-sage/70 tabular-nums w-16 text-right shrink-0">
                          {formatCurrency(a.earningsPerSecond)}/s
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-stone/60 w-5 shrink-0">{b.emoji}</span>
                        <div className="flex-1 h-3.5 rounded-full bg-surface-dim/60 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(b.earningsPerSecond / maxEps) * 100}%` }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="h-full rounded-full bg-stone/40"
                          />
                        </div>
                        <span className="text-[10px] font-mono text-stone/60 tabular-nums w-16 text-right shrink-0">
                          {formatCurrency(b.earningsPerSecond)}/s
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Time to earn $1B */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-surface-dim/60 rounded-lg p-2.5 text-center border border-line/15">
                      <div className="text-[8px] uppercase tracking-wider text-ash/45 mb-1">
                        {locale === "zh" ? "赚 $1B 需" : "Time to $1B"}
                      </div>
                      <div className="text-[11px] font-mono text-sand tabular-nums">
                        {a.earningsPerSecond > 0
                          ? `${(1e9 / a.earningsPerSecond / 86400).toFixed(1)} ${locale === "zh" ? "天" : "days"}`
                          : "∞"}
                      </div>
                    </div>
                    <div className="bg-surface-dim/60 rounded-lg p-2.5 text-center border border-line/15">
                      <div className="text-[8px] uppercase tracking-wider text-ash/45 mb-1">
                        {locale === "zh" ? "赚 $1B 需" : "Time to $1B"}
                      </div>
                      <div className="text-[11px] font-mono text-sand tabular-nums">
                        {b.earningsPerSecond > 0
                          ? `${(1e9 / b.earningsPerSecond / 86400).toFixed(1)} ${locale === "zh" ? "天" : "days"}`
                          : "∞"}
                      </div>
                    </div>
                  </div>

                  {/* Wealth difference */}
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-center pt-2"
                  >
                    {a.netWorthB !== b.netWorthB && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone/[0.06] border border-line/20">
                        <span className="text-xs">
                          {a.netWorthB > b.netWorthB ? a.emoji : b.emoji}
                        </span>
                        <span className="text-[10px] text-ash/60">
                          {locale === "zh"
                            ? `多 $${Math.abs(a.netWorthB - b.netWorthB)}B`
                            : `$${Math.abs(a.netWorthB - b.netWorthB)}B richer`}
                        </span>
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full text-[10px] text-ash/40 hover:text-ash/60 transition-colors mt-2 py-1"
                >
                  {locale === "zh" ? "收起" : "Collapse"}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export const CompareCard = memo(CompareCardInner);
