"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";
import { formatCurrency } from "@/lib/format";

const NORMAL_SALARY = 75_000;
const ROTATE_INTERVAL = 5_000;

interface Comparison {
  key: string;
  text: string;
}

export function WealthPerspective() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const totalSpent = useCartStore(selectTotalSpent);
  const [activeIdx, setActiveIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Track seconds on page
  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const comparisons = useMemo<Comparison[]>(() => {
    if (!selectedBillionaire) return [];
    const eps = selectedBillionaire.earningsPerSecond;
    const netWorth = selectedBillionaire.netWorthB * 1_000_000_000;
    const name = selectedBillionaire.name.split(" ")[0];
    const items: Comparison[] = [];

    // 1. Years to earn what they make in 1 second
    if (eps > 0) {
      const yearsToEarnOneSec = eps / NORMAL_SALARY;
      const yearsStr = yearsToEarnOneSec >= 1
        ? Math.round(yearsToEarnOneSec).toLocaleString()
        : yearsToEarnOneSec.toFixed(2);
      items.push({
        key: "years-1sec",
        text: t("perspective.yearsToEarn", locale, { years: yearsStr, name }),
      });
    }

    // 2. Spending equivalence (only when they've spent something)
    if (totalSpent > 0 && eps > 0) {
      const secondsToEarnBack = totalSpent / eps;
      let timeStr: string;
      if (secondsToEarnBack < 1) {
        timeStr = locale === "zh"
          ? `${(secondsToEarnBack * 1000).toFixed(0)} 毫秒`
          : `${(secondsToEarnBack * 1000).toFixed(0)}ms`;
      } else if (secondsToEarnBack < 60) {
        timeStr = locale === "zh"
          ? `${secondsToEarnBack.toFixed(1)} 秒`
          : `${secondsToEarnBack.toFixed(1)} seconds`;
      } else if (secondsToEarnBack < 3600) {
        timeStr = locale === "zh"
          ? `${(secondsToEarnBack / 60).toFixed(1)} 分钟`
          : `${(secondsToEarnBack / 60).toFixed(1)} minutes`;
      } else {
        timeStr = locale === "zh"
          ? `${(secondsToEarnBack / 3600).toFixed(1)} 小时`
          : `${(secondsToEarnBack / 3600).toFixed(1)} hours`;
      }
      items.push({
        key: "earned-back",
        text: t("perspective.earnedBack", locale, {
          amount: formatCurrency(totalSpent, totalSpent >= 1_000_000),
          name,
          time: timeStr,
        }),
      });
    }

    // 3. Fountain coin comparison
    if (totalSpent > 0 && netWorth > 0) {
      const normalEquiv = (totalSpent / netWorth) * NORMAL_SALARY;
      let coin: string;
      if (normalEquiv < 0.01) {
        coin = locale === "zh" ? "一粒灰尘" : "a speck of dust";
      } else if (normalEquiv < 0.05) {
        coin = locale === "zh" ? "一分钱" : "a penny";
      } else if (normalEquiv < 0.1) {
        coin = locale === "zh" ? "五分钱" : "a nickel";
      } else if (normalEquiv < 0.25) {
        coin = locale === "zh" ? "一毛钱" : "a dime";
      } else {
        coin = locale === "zh" ? "两毛五" : "a quarter";
      }
      items.push({
        key: "fountain",
        text: t("perspective.fountain", locale, {
          name,
          amount: formatCurrency(totalSpent, totalSpent >= 1_000_000),
          coin,
        }),
      });
    }

    // 4. Live earnings since page load
    if (eps > 0 && elapsed > 0) {
      const earnedSince = eps * elapsed;
      items.push({
        key: `live-${Math.floor(elapsed / 5)}`, // re-key every 5s for fresh animation
        text: t("perspective.secondsOfLife", locale, {
          name,
          amount: formatCurrency(earnedSince, earnedSince >= 1_000_000),
        }),
      });
    }

    return items;
  }, [selectedBillionaire, totalSpent, locale, elapsed]);

  // Rotate comparisons
  useEffect(() => {
    if (comparisons.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % comparisons.length);
    }, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [comparisons.length]);

  const handleDotClick = useCallback((idx: number) => {
    setActiveIdx(idx);
  }, []);

  if (!selectedBillionaire || comparisons.length === 0) return null;

  const currentComparison = comparisons[activeIdx % comparisons.length];

  return (
    <div className="w-full">
      <h2 className="section-label mb-4">
        <span className="mr-1.5">🔍</span>
        {t("perspective.title", locale)}
      </h2>

      <div className="relative min-h-[60px] flex items-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentComparison.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="text-xs text-ash/75 leading-relaxed font-serif italic"
          >
            {currentComparison.text}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Dots indicator */}
      {comparisons.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {comparisons.map((_, i) => (
            <button
              key={i}
              onClick={() => handleDotClick(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === activeIdx % comparisons.length
                  ? "bg-stone/50 scale-110"
                  : "bg-ash/20 hover:bg-ash/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
