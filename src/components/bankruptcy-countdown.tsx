"use client";

import { memo, useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

/**
 * BankruptcyCountdown — calculates spending velocity from recent purchases
 * and projects a dramatic countdown to when the fortune runs out.
 */

function formatTimeLeft(seconds: number, locale: string): { value: string; unit: string; urgency: "calm" | "warning" | "critical" } {
  const zh = locale === "zh";
  if (seconds <= 0) return { value: "0", unit: zh ? "秒" : "s", urgency: "critical" };

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  let urgency: "calm" | "warning" | "critical" = "calm";
  if (seconds < 300) urgency = "critical";
  else if (seconds < 3600) urgency = "warning";

  if (days > 365) {
    const years = (days / 365).toFixed(1);
    return { value: years, unit: zh ? "年" : "years", urgency };
  }
  if (days > 30) {
    return { value: `${days}`, unit: zh ? "天" : "days", urgency };
  }
  if (days > 0) {
    return { value: `${days}d ${hours}h`, unit: "", urgency };
  }
  if (hours > 0) {
    return { value: `${hours}h ${minutes}m`, unit: "", urgency };
  }
  if (minutes > 0) {
    return { value: `${minutes}m ${secs}s`, unit: "", urgency };
  }
  return { value: `${secs}`, unit: zh ? "秒" : "s", urgency };
}

function BankruptcyCountdownInner() {
  const locale = useLocale((s) => s.locale);
  const zh = locale === "zh";
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);
  const remaining = netWorth - totalSpent;

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [spendPerSec, setSpendPerSec] = useState(0);
  const lastCalcRef = useRef(Date.now());

  // Calculate spending velocity from purchase history
  useEffect(() => {
    if (purchases.length < 2) {
      setSecondsLeft(null);
      setSpendPerSec(0);
      return;
    }

    const now = Date.now();
    // Use last 60 seconds of purchases, or all if session is short
    const windowMs = 120_000;
    const recent = purchases.filter(p => now - p.timestamp < windowMs);

    if (recent.length < 2) {
      // Fallback: use entire session
      const first = purchases[0].timestamp;
      const last = purchases[purchases.length - 1].timestamp;
      const elapsed = (last - first) / 1000;
      if (elapsed <= 0) { setSecondsLeft(null); return; }
      const rate = totalSpent / elapsed;
      setSpendPerSec(rate);
      if (rate > 0) {
        setSecondsLeft(remaining / rate);
      }
    } else {
      const firstTime = recent[0].timestamp;
      const lastTime = recent[recent.length - 1].timestamp;
      const elapsed = (lastTime - firstTime) / 1000;
      if (elapsed <= 0) { setSecondsLeft(null); return; }
      const recentTotal = recent.reduce((s, p) => s + p.product.price, 0);
      const rate = recentTotal / elapsed;
      setSpendPerSec(rate);
      if (rate > 0) {
        setSecondsLeft(remaining / rate);
      }
    }
    lastCalcRef.current = now;
  }, [purchases, totalSpent, remaining]);

  // Tick down the countdown every second
  const isActive = secondsLeft !== null && secondsLeft > 0;
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev === null) return null;
        const elapsed = (Date.now() - lastCalcRef.current) / 1000;
        lastCalcRef.current = Date.now();
        return Math.max(0, prev - elapsed);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  if (!selectedBillionaire || purchases.length < 2 || secondsLeft === null) return null;

  const timeInfo = formatTimeLeft(secondsLeft, locale);
  const urgencyColors = {
    calm: "text-sage",
    warning: "text-champagne",
    critical: "text-[#e05555]",
  };
  const urgencyBg = {
    calm: "bg-sage/[0.06]",
    warning: "bg-champagne/[0.06]",
    critical: "bg-[#e05555]/[0.06]",
  };
  const urgencyBorder = {
    calm: "border-sage/20",
    warning: "border-champagne/25",
    critical: "border-[#e05555]/25",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-4 sm:p-5 border ${urgencyBg[timeInfo.urgency]} ${urgencyBorder[timeInfo.urgency]} transition-colors duration-500`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <motion.span
            animate={timeInfo.urgency === "critical" ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="text-sm"
          >
            ⏳
          </motion.span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-stone/75 font-medium">
            {zh ? "破产倒计时" : "Bankruptcy Countdown"}
          </span>
        </div>
        <span className="text-[9px] font-mono text-ash/50">
          {formatCurrency(spendPerSec, true)}/s
        </span>
      </div>

      <div className="text-center space-y-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={timeInfo.value}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className={`text-2xl sm:text-3xl font-mono font-bold tabular-nums ${urgencyColors[timeInfo.urgency]} transition-colors duration-500`}
          >
            {timeInfo.value}
            {timeInfo.unit && (
              <span className="text-sm ml-1 font-normal opacity-70">{timeInfo.unit}</span>
            )}
          </motion.div>
        </AnimatePresence>
        <p className="text-[10px] text-ash/55">
          {zh ? "按当前速度，你将在这个时间花光所有钱" : "until the fortune is gone at current pace"}
        </p>
      </div>

      {/* Urgency bar */}
      {timeInfo.urgency !== "calm" && (
        <motion.div
          className="mt-3 h-1 rounded-full overflow-hidden bg-surface-dim/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className={`h-full rounded-full ${
              timeInfo.urgency === "critical" ? "bg-[#e05555]/60" : "bg-champagne/50"
            }`}
            animate={{ width: ["0%", "100%"] }}
            transition={{
              duration: timeInfo.urgency === "critical" ? 1 : 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </motion.div>
      )}
    </motion.div>
  );
}

export const BankruptcyCountdown = memo(BankruptcyCountdownInner);
