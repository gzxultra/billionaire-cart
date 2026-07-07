"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

// US CPI data (Bureau of Labor Statistics) — base 1982-1984 = 100
// Used to compute what today's dollar amount "felt like" in past decades
const CPI_DATA: { year: number; cpi: number; emoji: string; event: string; eventZh: string }[] = [
  { year: 1950, cpi: 24.1, emoji: "🎷", event: "Post-war boom", eventZh: "战后繁荣" },
  { year: 1960, cpi: 29.6, emoji: "🚀", event: "Space race era", eventZh: "太空竞赛" },
  { year: 1970, cpi: 38.8, emoji: "🌸", event: "Moon landing era", eventZh: "登月时代" },
  { year: 1980, cpi: 82.4, emoji: "🕹️", event: "Arcade golden age", eventZh: "街机黄金时代" },
  { year: 1990, cpi: 130.7, emoji: "📼", event: "Fall of the Wall", eventZh: "柏林墙倒塌" },
  { year: 2000, cpi: 172.2, emoji: "💻", event: "Dot-com peak", eventZh: "互联网泡沫" },
  { year: 2010, cpi: 218.1, emoji: "📱", event: "iPhone era", eventZh: "智能手机时代" },
  { year: 2020, cpi: 258.8, emoji: "😷", event: "Pandemic year", eventZh: "疫情年" },
];

// Approximate 2025 CPI
const CURRENT_CPI = 316;

function inflationAdjust(todayPrice: number, pastCpi: number): number {
  return todayPrice * (pastCpi / CURRENT_CPI);
}

export function TimeMachine() {
  const locale = useLocale((s) => s.locale);
  const purchases = useCartStore((s) => s.purchases);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const [expanded, setExpanded] = useState(false);
  const [selectedEra, setSelectedEra] = useState<number | null>(null);

  // Use the most recent purchase for context, or total spent
  const totalSpent = useMemo(
    () => purchases.reduce((sum, p) => sum + p.product.price, 0),
    [purchases]
  );

  const lastPurchase = purchases.length > 0 ? purchases[purchases.length - 1] : null;
  const referencePrice = lastPurchase?.product.price || totalSpent;
  const referenceName = lastPurchase?.product.title || (locale === "zh" ? "总消费" : "Total spent");

  if (!selectedBillionaire || purchases.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-panel p-5 sm:p-6 stagger-section"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">⏳</span>
          <h2 className="section-label">
            {locale === "zh" ? "价格时光机" : "Price Time Machine"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-ash/55 font-mono">
            {locale === "zh" ? "通胀换算" : "Inflation-adjusted"}
          </span>
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            className="text-ash/50 text-xs"
          >
            ▼
          </motion.span>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3">
              {/* Reference item */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-dim/60 border border-line/30">
                <span className="text-xs text-ash/60">
                  {locale === "zh" ? "参考" : "Ref"}:
                </span>
                <span className="text-xs text-sand font-medium truncate flex-1">
                  {referenceName}
                </span>
                <span className="text-xs font-serif text-champagne">
                  {formatCurrency(referencePrice, referencePrice >= 1_000_000)}
                </span>
              </div>

              {/* Era cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CPI_DATA.map((era) => {
                  const adjusted = inflationAdjust(referencePrice, era.cpi);
                  const ratio = adjusted / referencePrice;
                  const isSelected = selectedEra === era.year;

                  return (
                    <motion.button
                      key={era.year}
                      onClick={() => setSelectedEra(isSelected ? null : era.year)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className={`p-3 rounded-xl text-left transition-all border ${
                        isSelected
                          ? "bg-stone/12 border-stone/35 shadow-sm"
                          : "bg-surface/50 border-line/30 hover:border-stone/25"
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-sm">{era.emoji}</span>
                        <span className="text-[11px] font-bold text-sand">{era.year}</span>
                      </div>
                      <div className="text-[12px] font-serif text-champagne font-medium">
                        {formatCurrency(adjusted, adjusted >= 1_000_000)}
                      </div>
                      <div className="text-[9px] text-ash/50 mt-0.5">
                        {(ratio * 100).toFixed(1)}%{" "}
                        {locale === "zh" ? "的价格" : "of today"}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Detail panel for selected era */}
              <AnimatePresence>
                {selectedEra && (() => {
                  const era = CPI_DATA.find(e => e.year === selectedEra)!;
                  const adjusted = inflationAdjust(referencePrice, era.cpi);
                  const savings = referencePrice - adjusted;
                  return (
                    <motion.div
                      key={selectedEra}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="p-4 rounded-xl bg-stone/8 border border-stone/20"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{era.emoji}</span>
                        <div>
                          <div className="text-xs font-bold text-sand">{era.year}</div>
                          <div className="text-[10px] text-ash/60">
                            {locale === "zh" ? era.eventZh : era.event}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <div className="text-[9px] text-ash/50 uppercase tracking-wider mb-0.5">
                            {locale === "zh" ? "当年价格" : "Price then"}
                          </div>
                          <div className="text-sm font-serif text-champagne font-medium">
                            {formatCurrency(adjusted, adjusted >= 1_000_000)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-ash/50 uppercase tracking-wider mb-0.5">
                            {locale === "zh" ? "通胀差额" : "Inflation gap"}
                          </div>
                          <div className="text-sm font-serif text-sage font-medium">
                            {formatCurrency(savings, savings >= 1_000_000)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 text-[10px] text-ash/55 leading-relaxed">
                        {locale === "zh"
                          ? `在 ${era.year} 年（${era.eventZh}），你的 ${referenceName} 只需要 ${formatCurrency(adjusted, adjusted >= 1_000_000)}。美元在过去 ${new Date().getFullYear() - era.year} 年中贬值了 ${((1 - era.cpi / CURRENT_CPI) * 100).toFixed(0)}%。`
                          : `In ${era.year} (${era.event}), your ${referenceName} would have cost just ${formatCurrency(adjusted, adjusted >= 1_000_000)}. The dollar has lost ${((1 - era.cpi / CURRENT_CPI) * 100).toFixed(0)}% of its value in ${new Date().getFullYear() - era.year} years.`}
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>

              {/* Fun fact footer */}
              <div className="text-center">
                <span className="text-[9px] text-ash/40 font-mono">
                  {locale === "zh"
                    ? "基于美国消费者价格指数 (CPI) 计算"
                    : "Based on US Consumer Price Index (CPI)"}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
