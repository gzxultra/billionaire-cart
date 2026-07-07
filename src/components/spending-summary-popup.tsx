"use client";

import { useState, useEffect, useRef, useMemo, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

/**
 * SpendingSummaryPopup — appears every N purchases with a fun summary card
 * showing spending stats, top purchase, and a witty message.
 */

const TRIGGER_EVERY = 5; // Show every 5 purchases

interface SpendingFact {
  emoji: string;
  textEn: string;
  textZh: string;
}

function getSpendingFacts(
  totalSpent: number,
  netWorth: number,
  purchaseCount: number,
  topPurchaseName: string,
  topPurchasePrice: number,
  avgPrice: number,
): SpendingFact[] {
  const pct = netWorth > 0 ? (totalSpent / netWorth * 100) : 0;
  const bigMacs = Math.floor(totalSpent / 5.69);
  const teslas = (totalSpent / 42000).toFixed(1);
  const houses = (totalSpent / 400000).toFixed(1);

  const facts: SpendingFact[] = [
    {
      emoji: "🍔",
      textEn: `You've spent ${bigMacs.toLocaleString()} Big Macs worth`,
      textZh: `你已经花了 ${bigMacs.toLocaleString()} 个巨无霸的钱`,
    },
    {
      emoji: "📊",
      textEn: `${pct.toFixed(3)}% of fortune depleted`,
      textZh: `已花掉财富的 ${pct.toFixed(3)}%`,
    },
  ];

  if (totalSpent > 42000) {
    facts.push({
      emoji: "🚗",
      textEn: `That's ${teslas} Teslas`,
      textZh: `相当于 ${teslas} 辆特斯拉`,
    });
  }

  if (totalSpent > 400000) {
    facts.push({
      emoji: "🏠",
      textEn: `Or ${houses} average US homes`,
      textZh: `或者 ${houses} 套美国普通住宅`,
    });
  }

  return facts.slice(0, 3);
}

const WITTY_MESSAGES_EN = [
  "Keep going, money is just a number!",
  "At this rate, bankruptcy is a lifestyle choice.",
  "Financial advisors hate this one trick.",
  "Your accountant just fainted.",
  "The economy thanks you for your sacrifice.",
  "Money can't buy happiness, but you're sure trying.",
  "Wall Street is watching in awe.",
  "Your spending power knows no bounds.",
];

const WITTY_MESSAGES_ZH = [
  "继续花！钱不过是个数字！",
  "照这个速度，破产是一种生活方式。",
  "理财顾问恨透了这个技巧。",
  "你的会计刚晕过去了。",
  "经济因你的牺牲而感谢你。",
  "钱买不到幸福，但你在努力尝试。",
  "华尔街在惊叹中注视着你。",
  "你的消费力不知边界。",
];

function SpendingSummaryPopupInner() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);
  const purchaseCount = purchases.length;

  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const prevCountRef = useRef(0);
  const shownAtRef = useRef(0); // last purchase count we showed the popup

  // Show popup at milestone purchase counts
  useEffect(() => {
    if (!selectedBillionaire) return;
    if (purchaseCount <= prevCountRef.current) {
      prevCountRef.current = purchaseCount;
      return;
    }
    prevCountRef.current = purchaseCount;

    // Show every TRIGGER_EVERY purchases, but not if we already showed for this milestone
    if (purchaseCount >= TRIGGER_EVERY && purchaseCount % TRIGGER_EVERY === 0 && shownAtRef.current !== purchaseCount) {
      shownAtRef.current = purchaseCount;
      setDismissed(false);
      // Slight delay so the purchase animation plays first
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [purchaseCount, selectedBillionaire]);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setVisible(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, [visible]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setDismissed(true);
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    if (purchases.length === 0) return null;
    const sorted = [...purchases].sort((a, b) => b.product.price - a.product.price);
    const topPurchase = sorted[0];
    const avgPrice = totalSpent / purchases.length;
    return {
      topPurchaseName: topPurchase.product.title,
      topPurchasePrice: topPurchase.product.price,
      avgPrice,
    };
  }, [purchases, totalSpent]);

  const facts = useMemo(() => {
    if (!stats) return [];
    return getSpendingFacts(
      totalSpent, netWorth, purchaseCount,
      stats.topPurchaseName, stats.topPurchasePrice, stats.avgPrice
    );
  }, [totalSpent, netWorth, purchaseCount, stats]);

  const wittyMessage = useMemo(() => {
    const idx = Math.floor(purchaseCount / TRIGGER_EVERY) % WITTY_MESSAGES_EN.length;
    return locale === "zh" ? WITTY_MESSAGES_ZH[idx] : WITTY_MESSAGES_EN[idx];
  }, [purchaseCount, locale]);

  if (!selectedBillionaire || !stats) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-20 right-6 z-50 w-72 sm:w-80"
        >
          <div className="bg-surface/95 backdrop-blur-xl border border-line/50 rounded-2xl shadow-stone overflow-hidden">
            {/* Header */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-ash/55 font-mono">
                    {locale === "zh" ? "消费报告" : "Spending Report"}
                  </div>
                  <div className="text-xs font-serif text-sand/90">
                    {locale === "zh"
                      ? `第 ${purchaseCount} 笔购买`
                      : `Purchase #${purchaseCount}`}
                  </div>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-ash/40 hover:text-ash/70 transition-colors text-sm"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>

            {/* Stats */}
            <div className="px-4 py-2 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-ash/65">
                  {locale === "zh" ? "总消费" : "Total Spent"}
                </span>
                <span className="font-serif text-champagne tabular-nums">
                  {formatCurrency(totalSpent, true)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-ash/65 truncate mr-2">
                  {locale === "zh" ? "最贵" : "Top Purchase"}
                </span>
                <span className="font-mono text-stone/80 text-[10px] tabular-nums truncate max-w-[120px]">
                  {stats.topPurchaseName}
                </span>
              </div>
            </div>

            {/* Fun facts */}
            <div className="px-4 py-2 border-t border-line/20 space-y-1">
              {facts.map((fact, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.15 }}
                  className="flex items-center gap-2 text-[10px] text-ash/60"
                >
                  <span>{fact.emoji}</span>
                  <span>{locale === "zh" ? fact.textZh : fact.textEn}</span>
                </motion.div>
              ))}
            </div>

            {/* Witty message */}
            <div className="px-4 py-3 bg-surface-dim/30 border-t border-line/15">
              <p className="text-[10px] text-stone/70 italic text-center font-serif">
                &ldquo;{wittyMessage}&rdquo;
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const SpendingSummaryPopup = memo(SpendingSummaryPopupInner);
