"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";
import { formatCurrency } from "@/lib/format";

/**
 * WealthTicker — Bloomberg-style scrolling ticker tape at the top of the spending area.
 * Shows real-time net worth, earning rate, spending stats, and breaking-news style alerts.
 * Updates every second with smooth animations.
 */

interface TickerAlert {
  id: string;
  text: string;
  textZh: string;
  emoji: string;
  priority: "normal" | "breaking";
}

function getAlerts(
  remaining: number,
  netWorth: number,
  totalSpent: number,
  purchaseCount: number,
  earningsPerSec: number,
  prevRemaining: number
): TickerAlert[] {
  const alerts: TickerAlert[] = [];
  const spentPct = netWorth > 0 ? (totalSpent / netWorth) * 100 : 0;

  // Milestone alerts
  if (spentPct >= 50 && spentPct < 51) {
    alerts.push({
      id: "half",
      text: "BREAKING: Fortune drops below 50%!",
      textZh: "突发：财富跌破50%！",
      emoji: "📉",
      priority: "breaking",
    });
  }
  if (spentPct >= 25 && spentPct < 26) {
    alerts.push({
      id: "quarter",
      text: "25% of fortune depleted — spending accelerates",
      textZh: "25%的财富已花光——消费还在加速",
      emoji: "⚠️",
      priority: "normal",
    });
  }
  if (spentPct >= 75 && spentPct < 76) {
    alerts.push({
      id: "3quarter",
      text: "BREAKING: Only 25% of fortune remains!",
      textZh: "突发：仅剩25%的财富！",
      emoji: "🚨",
      priority: "breaking",
    });
  }
  if (spentPct >= 90 && spentPct < 91) {
    alerts.push({
      id: "ninety",
      text: "CRITICAL: 90% spent — bankruptcy imminent",
      textZh: "危急：已花掉90%——即将破产",
      emoji: "💀",
      priority: "breaking",
    });
  }

  // Purchase count alerts
  if (purchaseCount === 10) {
    alerts.push({
      id: "ten-buys",
      text: "10 purchases and counting — shopping spree in progress",
      textZh: "已购买10件——疯狂购物进行中",
      emoji: "🛍️",
      priority: "normal",
    });
  }
  if (purchaseCount === 50) {
    alerts.push({
      id: "fifty-buys",
      text: "50 purchases! This is a legendary spending session",
      textZh: "50件商品！这是一次传说级消费",
      emoji: "🏆",
      priority: "normal",
    });
  }
  if (purchaseCount === 100) {
    alerts.push({
      id: "hundred-buys",
      text: "MILESTONE: 100 purchases — unstoppable spender",
      textZh: "里程碑：100件商品——无人能挡的消费者",
      emoji: "💯",
      priority: "breaking",
    });
  }

  // Remaining thresholds
  const remainingB = remaining / 1_000_000_000;
  if (remainingB > 0) {
    if (remainingB < 1 && netWorth / 1_000_000_000 >= 10) {
      alerts.push({
        id: "sub-billion",
        text: "Net worth drops below $1 billion — welcome to the millionaire club",
        textZh: "净资产跌破10亿美元——欢迎来到百万富翁俱乐部",
        emoji: "📉",
        priority: "breaking",
      });
    }
  }

  return alerts;
}

export function WealthTicker() {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const netWorth = useCartStore(selectNetWorth);
  const totalSpent = useCartStore(selectTotalSpent);
  const purchases = useCartStore((s) => s.purchases);
  const locale = useLocale((s) => s.locale);

  const [elapsed, setElapsed] = useState(0);
  const [activeAlert, setActiveAlert] = useState<TickerAlert | null>(null);
  const startTimeRef = useRef(Date.now());
  const prevRemainingRef = useRef(0);
  const shownAlertsRef = useRef(new Set<string>());

  // Tick every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const earningsPerSec = selectedBillionaire?.earningsPerSecond ?? 0;
  const totalEarned = earningsPerSec * elapsed;
  const remaining = netWorth - totalSpent + totalEarned;
  const spentPct = netWorth > 0 ? (totalSpent / netWorth) * 100 : 0;
  const spendingPerSec = elapsed > 0 ? totalSpent / elapsed : 0;
  const netFlowPerSec = earningsPerSec - spendingPerSec;

  // Check for alerts
  useEffect(() => {
    if (!selectedBillionaire) return;
    const alerts = getAlerts(
      remaining,
      netWorth,
      totalSpent,
      purchases.length,
      earningsPerSec,
      prevRemainingRef.current
    );
    prevRemainingRef.current = remaining;

    const newAlert = alerts.find((a) => !shownAlertsRef.current.has(a.id));
    if (newAlert) {
      shownAlertsRef.current.add(newAlert.id);
      setActiveAlert(newAlert);
      setTimeout(() => setActiveAlert(null), 5000);
    }
  }, [remaining, netWorth, totalSpent, purchases.length, earningsPerSec, selectedBillionaire]);

  // Ticker items
  const tickerItems = useMemo(() => {
    const items = [
      {
        label: locale === "zh" ? "净资产" : "NET WORTH",
        value: formatCurrency(remaining, true),
        color: remaining > 0 ? "text-sand" : "text-red-400",
      },
      {
        label: locale === "zh" ? "已花费" : "SPENT",
        value: `▼ ${formatCurrency(totalSpent, true)}`,
        color: "text-red-400/80",
      },
      {
        label: locale === "zh" ? "消耗率" : "DEPLETED",
        value: `${spentPct.toFixed(4)}%`,
        color: spentPct > 50 ? "text-red-400/80" : "text-champagne/80",
      },
      {
        label: locale === "zh" ? "收入/秒" : "EARN/S",
        value: `▲ ${formatCurrency(earningsPerSec)}`,
        color: "text-emerald-400/80",
      },
      {
        label: locale === "zh" ? "消费/秒" : "SPEND/S",
        value: `▼ ${formatCurrency(spendingPerSec)}`,
        color: spendingPerSec > earningsPerSec ? "text-red-400/80" : "text-ash/60",
      },
      {
        label: locale === "zh" ? "净流量" : "NET FLOW",
        value: `${netFlowPerSec >= 0 ? "▲" : "▼"} ${formatCurrency(Math.abs(netFlowPerSec))}/s`,
        color: netFlowPerSec >= 0 ? "text-emerald-400/70" : "text-red-400/70",
      },
      {
        label: locale === "zh" ? "商品数" : "ITEMS",
        value: `${purchases.length}`,
        color: "text-ash/70",
      },
    ];
    return items;
  }, [remaining, totalSpent, spentPct, earningsPerSec, spendingPerSec, netFlowPerSec, purchases.length, locale]);

  if (!selectedBillionaire) return null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#0C0C10]/90 border border-line/20 stagger-section">
      {/* Breaking news alert bar */}
      <AnimatePresence>
        {activeAlert && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`overflow-hidden ${
              activeAlert.priority === "breaking"
                ? "bg-red-500/10 border-b border-red-500/20"
                : "bg-champagne/5 border-b border-champagne/15"
            }`}
          >
            <div className="px-3 py-1.5 flex items-center gap-2">
              {activeAlert.priority === "breaking" && (
                <span className="text-[8px] uppercase tracking-wider font-bold text-red-400/90 bg-red-500/15 px-1.5 py-0.5 rounded animate-pulse">
                  {locale === "zh" ? "突发" : "BREAKING"}
                </span>
              )}
              <span className="text-[10px]">{activeAlert.emoji}</span>
              <span className="text-[10px] text-sand/90 font-medium">
                {locale === "zh" ? activeAlert.textZh : activeAlert.text}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrolling ticker tape */}
      <div className="relative h-7 overflow-hidden">
        <motion.div
          className="flex items-center gap-6 h-full absolute whitespace-nowrap"
          animate={{ x: [0, -1200] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 20,
              ease: "linear",
            },
          }}
        >
          {/* Double the items for seamless loop */}
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <div key={`ticker-${i}`} className="flex items-center gap-1.5 shrink-0">
              <span className="text-[8px] uppercase tracking-wider text-ash/45 font-mono">
                {item.label}
              </span>
              <span className={`text-[10px] font-mono font-medium tabular-nums ${item.color}`}>
                {item.value}
              </span>
              <span className="text-ash/20 mx-1">│</span>
            </div>
          ))}
        </motion.div>

        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[#0C0C10] to-transparent pointer-events-none z-10" />
        <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[#0C0C10] to-transparent pointer-events-none z-10" />
      </div>
    </div>
  );
}
