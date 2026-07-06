"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

/**
 * SpendingPowerCards — animated auto-rotating cards showing
 * "Your spending equals X real-world things."
 * Updated live as you spend more.
 */

interface PowerCard {
  emoji: string;
  count: number;
  labelEn: string;
  labelZh: string;
  unitCost: number;
}

const POWER_REFERENCES: { labelEn: string; labelZh: string; emoji: string; cost: number }[] = [
  { labelEn: "Big Macs", labelZh: "巨无霸", emoji: "🍔", cost: 5.69 },
  { labelEn: "Starbucks lattes", labelZh: "星巴克拿铁", emoji: "☕", cost: 6.5 },
  { labelEn: "iPhone 16 Pros", labelZh: "iPhone 16 Pro", emoji: "📱", cost: 1_199 },
  { labelEn: "Tesla Model 3s", labelZh: "特斯拉 Model 3", emoji: "🚗", cost: 42_990 },
  { labelEn: "year avg US salaries", labelZh: "年美国平均工资", emoji: "💼", cost: 63_795 },
  { labelEn: "NYC apartments", labelZh: "纽约公寓", emoji: "🏙️", cost: 1_200_000 },
  { labelEn: "Bugatti Chirons", labelZh: "布加迪 Chiron", emoji: "🏎️", cost: 3_000_000 },
  { labelEn: "Boeing 747s", labelZh: "波音 747", emoji: "✈️", cost: 418_000_000 },
  { labelEn: "aircraft carriers", labelZh: "航空母舰", emoji: "⚓", cost: 13_000_000_000 },
  { labelEn: "ISS stations", labelZh: "国际空间站", emoji: "🛸", cost: 150_000_000_000 },
];

export function SpendingPowerCards() {
  const locale = useLocale((s) => s.locale);
  const totalSpent = useCartStore(selectTotalSpent);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Compute cards with count > 0
  const cards: PowerCard[] = useMemo(() => {
    if (totalSpent <= 0) return [];
    return POWER_REFERENCES
      .map((ref) => ({
        emoji: ref.emoji,
        count: Math.floor(totalSpent / ref.cost),
        labelEn: ref.labelEn,
        labelZh: ref.labelZh,
        unitCost: ref.cost,
      }))
      .filter((c) => c.count >= 1);
  }, [totalSpent]);

  // Auto-rotate
  useEffect(() => {
    if (cards.length <= 1) return;

    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % cards.length);
    }, 3500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cards.length]);

  // Reset index if cards change
  useEffect(() => {
    if (activeIndex >= cards.length) {
      setActiveIndex(0);
    }
  }, [cards.length, activeIndex]);

  const goTo = useCallback(
    (idx: number) => {
      setActiveIndex(idx);
      // Reset timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % cards.length);
      }, 3500);
    },
    [cards.length]
  );

  if (!selectedBillionaire || cards.length === 0) return null;

  const card = cards[activeIndex] ?? cards[0];
  if (!card) return null;

  return (
    <section className="card-panel-champagne p-5 sm:p-8 stagger-section">
      <h2 className="section-label flex items-center gap-2 mb-4">
        <span className="text-base">💳</span>
        {locale === "zh" ? "消费购买力" : "Spending Power"}
      </h2>

      {/* Main card */}
      <div className="relative overflow-hidden rounded-xl bg-surface-dim/40 border border-line/30 p-5 min-h-[100px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${card.labelEn}-${card.count}`}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="text-center space-y-1.5"
          >
            <div className="text-3xl">{card.emoji}</div>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-2xl sm:text-3xl font-serif text-champagne tabular-nums font-medium">
                {card.count.toLocaleString()}
              </span>
              <span className="text-xs text-ash/70">×</span>
            </div>
            <div className="text-sm text-sand/80">
              {locale === "zh" ? card.labelZh : card.labelEn}
            </div>
            <div className="text-[10px] text-ash/55 font-mono tabular-nums">
              @ {formatCurrency(card.unitCost)}{locale === "zh" ? "/个" : " each"}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      {cards.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === activeIndex
                  ? "bg-champagne/60 w-3"
                  : "bg-ash/25 hover:bg-ash/40"
              }`}
              aria-label={`${locale === "zh" ? "第" : "Card "}${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Total spending context */}
      <div className="text-center mt-3">
        <span className="text-[10px] text-ash/55 font-mono">
          {locale === "zh" ? "你已花费" : "You have spent"}{" "}
          <span className="text-champagne/75">{formatCurrency(totalSpent, true)}</span>
        </span>
      </div>
    </section>
  );
}
