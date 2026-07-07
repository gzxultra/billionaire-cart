"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectNetWorth, selectRemaining } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

/**
 * WhatIfCalculator — takes the user's most recent purchase and shows
 * absurd "what if you bought X of these" scenarios. Highlights the
 * ludicrous scale of billionaire wealth.
 */

interface WhatIfScenario {
  id: string;
  multiplier: number;
  labelEn: string;
  labelZh: string;
  emoji: string;
}

const SCENARIOS: WhatIfScenario[] = [
  { id: "daily", multiplier: 365, labelEn: "One every day for a year", labelZh: "一天买一个，买一年", emoji: "📅" },
  { id: "hourly", multiplier: 8760, labelEn: "One every hour for a year", labelZh: "一小时一个，买一年", emoji: "⏰" },
  { id: "minute", multiplier: 525_600, labelEn: "One every minute for a year", labelZh: "一分钟一个，买一年", emoji: "⚡" },
  { id: "second", multiplier: 31_536_000, labelEn: "One every second for a year", labelZh: "一秒一个，买一年", emoji: "🤯" },
];

export function WhatIfCalculator() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const netWorth = useCartStore(selectNetWorth);
  const remaining = useCartStore(selectRemaining);
  const [activeScenario, setActiveScenario] = useState(0);

  const lastPurchase = purchases.length > 0 ? purchases[purchases.length - 1] : null;

  const calculations = useMemo(() => {
    if (!lastPurchase || netWorth <= 0) return [];

    const price = lastPurchase.product.price;
    if (price <= 0) return [];

    return SCENARIOS.map((s) => {
      const totalCost = price * s.multiplier;
      const pctOfFortune = (totalCost / netWorth) * 100;
      const canAfford = Math.floor(remaining / price);
      return {
        ...s,
        totalCost,
        pctOfFortune,
        canAfford,
        couldAfford: pctOfFortune <= 100,
      };
    });
  }, [lastPurchase, netWorth, remaining]);

  if (!selectedBillionaire || !lastPurchase || calculations.length === 0) return null;

  const active = calculations[activeScenario];
  const price = lastPurchase.product.price;
  const maxCanBuy = netWorth > 0 && price > 0 ? Math.floor(netWorth / price) : 0;

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">🤔</span>
        <h2 className="text-xs uppercase tracking-[0.2em] text-stone/75 font-medium">
          {locale === "zh" ? "如果…" : "What If..."}
        </h2>
      </div>

      {/* Last purchase context */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-line/20">
        <span className="text-[10px] text-ash/50 uppercase tracking-wider">
          {locale === "zh" ? "基于上次购买" : "Based on last purchase"}:
        </span>
        <span className="text-[11px] font-medium text-sand/80 truncate">
          {lastPurchase.product.title}
        </span>
        <span className="text-[10px] text-champagne/70 font-mono shrink-0">
          {formatCurrency(price, price >= 1_000_000)}
        </span>
      </div>

      {/* Scenario tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {calculations.map((calc, i) => (
          <button
            key={calc.id}
            onClick={() => setActiveScenario(i)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${
              i === activeScenario
                ? "bg-champagne/15 text-champagne/90 border border-champagne/25"
                : "bg-surface-bright/50 text-ash/55 border border-line/25 hover:border-stone/30"
            }`}
          >
            {calc.emoji} {locale === "zh" ? calc.labelZh.split("，")[0] : calc.labelEn.split(" for")[0]}
          </button>
        ))}
      </div>

      {/* Active scenario display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          <div className="text-center py-3">
            <div className="text-sm text-ash/55 mb-2">
              {locale === "zh" ? active.labelZh : active.labelEn}
            </div>
            <div className="text-3xl sm:text-4xl font-serif text-sand/90 tabular-nums">
              {formatCurrency(active.totalCost, true)}
            </div>
            <div className="text-[11px] text-ash/55 mt-2">
              = {active.pctOfFortune.toFixed(active.pctOfFortune < 1 ? 4 : 1)}% {locale === "zh" ? "的总财富" : "of total fortune"}
            </div>
          </div>

          {/* Visual bar — % of fortune */}
          <div className="space-y-1.5">
            <div className="h-3 rounded-full bg-surface-dim/60 overflow-hidden relative">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: active.couldAfford
                    ? "linear-gradient(90deg, #5A8A68, #A68530)"
                    : "linear-gradient(90deg, #9B6B6B, #ef4444)",
                }}
                initial={{ width: "0%" }}
                animate={{ width: `${Math.min(active.pctOfFortune, 100)}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-ash/45 font-mono">
              <span>0%</span>
              <span>{active.couldAfford
                ? (locale === "zh" ? "✅ 买得起" : "✅ Affordable")
                : (locale === "zh" ? "❌ 买不起" : "❌ Not affordable")
              }</span>
              <span>100%</span>
            </div>
          </div>

          {/* Fun stats */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-surface-bright/40 border border-line/20 rounded-lg p-3 text-center">
              <div className="text-lg font-serif text-sand/80 tabular-nums">
                {maxCanBuy >= 1_000_000_000
                  ? `${(maxCanBuy / 1_000_000_000).toFixed(1)}B`
                  : maxCanBuy >= 1_000_000
                  ? `${(maxCanBuy / 1_000_000).toFixed(1)}M`
                  : maxCanBuy >= 1_000
                  ? `${(maxCanBuy / 1_000).toFixed(1)}K`
                  : maxCanBuy.toLocaleString()
                }
              </div>
              <div className="text-[9px] text-ash/50 uppercase tracking-wider mt-1">
                {locale === "zh" ? "最多能买" : "Max Buyable"}
              </div>
            </div>
            <div className="bg-surface-bright/40 border border-line/20 rounded-lg p-3 text-center">
              <div className="text-lg font-serif text-sand/80 tabular-nums">
                {active.multiplier.toLocaleString()}×
              </div>
              <div className="text-[9px] text-ash/50 uppercase tracking-wider mt-1">
                {locale === "zh" ? "购买次数" : "Buy Count"}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
