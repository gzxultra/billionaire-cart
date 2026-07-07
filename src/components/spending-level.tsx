"use client";

import { memo, useMemo, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";

interface SpendingLevel {
  threshold: number; // % of net worth spent
  titleEn: string;
  titleZh: string;
  emoji: string;
  color: string;
}

const SPENDING_LEVELS: SpendingLevel[] = [
  { threshold: 0,    titleEn: "Window Shopper",        titleZh: "橱窗购物者",     emoji: "👀", color: "text-ash/70" },
  { threshold: 0.1,  titleEn: "Casual Browser",        titleZh: "随便看看",       emoji: "🛍️", color: "text-sage/80" },
  { threshold: 1,    titleEn: "Retail Therapist",       titleZh: "购物疗法师",     emoji: "💆", color: "text-sage" },
  { threshold: 5,    titleEn: "Serious Spender",        titleZh: "认真败家",       emoji: "💰", color: "text-champagne/80" },
  { threshold: 10,   titleEn: "Mega Whale",             titleZh: "超级巨鲸",       emoji: "🐋", color: "text-champagne" },
  { threshold: 25,   titleEn: "Economic Weapon",        titleZh: "经济武器",       emoji: "💣", color: "text-stone" },
  { threshold: 50,   titleEn: "Fortune Destroyer",      titleZh: "财富毁灭者",     emoji: "🔥", color: "text-[#9B6B6B]" },
  { threshold: 75,   titleEn: "Financially Unhinged",   titleZh: "财务失控",       emoji: "🤪", color: "text-[#B44040]" },
  { threshold: 90,   titleEn: "Bankruptcy Speedrunner", titleZh: "破产速通选手",   emoji: "⚡", color: "text-[#B44040]" },
  { threshold: 99,   titleEn: "Absolute Madlad",        titleZh: "绝对疯子",       emoji: "👑", color: "text-[#B44040]" },
];

function getSpendingLevel(pct: number): SpendingLevel {
  let best = SPENDING_LEVELS[0];
  for (const level of SPENDING_LEVELS) {
    if (pct >= level.threshold) best = level;
  }
  return best;
}

function SpendingLevelInner() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);
  const purchaseCount = useCartStore((s) => s.purchases.length);

  const [showLevelUp, setShowLevelUp] = useState(false);
  const prevLevelRef = useRef<string>("");

  const pct = netWorth > 0 ? (totalSpent / netWorth) * 100 : 0;
  const level = useMemo(() => getSpendingLevel(pct), [pct]);

  // Detect level change
  useEffect(() => {
    const key = level.titleEn;
    if (prevLevelRef.current && prevLevelRef.current !== key) {
      setShowLevelUp(true);
      const timer = setTimeout(() => setShowLevelUp(false), 2500);
      return () => clearTimeout(timer);
    }
    prevLevelRef.current = key;
  }, [level]);

  if (!selectedBillionaire || purchaseCount === 0) return null;

  const title = locale === "zh" ? level.titleZh : level.titleEn;
  // Progress to next level
  const nextLevel = SPENDING_LEVELS.find((l) => l.threshold > pct);
  const progressToNext = nextLevel
    ? ((pct - level.threshold) / (nextLevel.threshold - level.threshold)) * 100
    : 100;

  return (
    <section className="card-panel p-4 sm:p-5 stagger-section">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <motion.span
            key={level.emoji}
            initial={{ scale: 0.5, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            className="text-xl"
          >
            {level.emoji}
          </motion.span>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-ash/55 font-mono mb-0.5">
              {locale === "zh" ? "消费段位" : "Spending Level"}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={level.titleEn}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`text-sm font-serif font-medium ${level.color}`}
              >
                {title}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Level-up flash */}
        <AnimatePresence>
          {showLevelUp && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="px-2.5 py-1 rounded-lg bg-champagne/10 border border-champagne/25 text-[10px] font-medium text-champagne uppercase tracking-wider"
            >
              {locale === "zh" ? "⬆ 升级!" : "⬆ Level Up!"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress to next level */}
      {nextLevel && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[9px] text-ash/50 font-mono mb-1">
            <span>{title}</span>
            <span>{locale === "zh" ? nextLevel.titleZh : nextLevel.titleEn}</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-dim/60 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-stone/40 to-champagne/60"
              initial={{ width: "0%" }}
              animate={{ width: `${Math.min(progressToNext, 100)}%` }}
              transition={{ type: "spring", stiffness: 80, damping: 20 }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

export const SpendingLevel = memo(SpendingLevelInner);
