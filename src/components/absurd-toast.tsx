"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/format";

interface AbsurdComparison {
  emoji: string;
  text: string;
}

const COMPARISONS: ((price: number, billionaire: string, eps: number) => AbsurdComparison)[] = [
  // Time-based
  (price, billionaire, eps) => ({
    emoji: "⏱️",
    text:
      eps > 0 && price / eps < 60
        ? `${billionaire} earns this back in ${(price / eps).toFixed(1)} seconds`
        : eps > 0 && price / eps < 3600
        ? `${billionaire} earns this back in ${(price / eps / 60).toFixed(1)} minutes`
        : eps > 0
        ? `${billionaire} earns this back in ${(price / eps / 3600).toFixed(1)} hours`
        : `That's a lot of money`,
  }),

  // Food comparisons
  (price) => ({
    emoji: "🍔",
    text: `That's ${Math.floor(price / 5.69).toLocaleString()} Big Macs`,
  }),
  (price) => ({
    emoji: "☕",
    text: `That's ${Math.floor(price / 6.5).toLocaleString()} Starbucks lattes`,
  }),
  (price) => ({
    emoji: "🍕",
    text: `That's ${Math.floor(price / 20).toLocaleString()} pizza deliveries`,
  }),

  // Salary comparisons
  (price) => ({
    emoji: "👤",
    text:
      price >= 75000
        ? `That's ${Math.floor(price / 75000).toLocaleString()} years of average US salary`
        : `That's ${(price / 75000 * 12).toFixed(1)} months of average US salary`,
  }),
  (price) => ({
    emoji: "👨‍⚕️",
    text: `That's ${Math.floor(price / 350000).toLocaleString() || "less than 1"} years of a surgeon's salary`,
  }),

  // Object comparisons
  (price) => ({
    emoji: "📱",
    text: `That's ${Math.floor(price / 1199).toLocaleString()} iPhone 16 Pros`,
  }),
  (price) => ({
    emoji: "🚗",
    text: `That's ${Math.floor(price / 22000).toLocaleString()} Toyota Corollas`,
  }),
  (price) => ({
    emoji: "🏠",
    text:
      price >= 420000
        ? `That's ${(price / 420000).toFixed(1)} median US homes`
        : `That's ${((price / 420000) * 100).toFixed(1)}% of a median US home`,
  }),
  (price) => ({
    emoji: "📺",
    text: `That's ${Math.floor(price / 15.49).toLocaleString()} months of Netflix`,
  }),

  // Life comparisons
  (price) => ({
    emoji: "🎓",
    text: `That could pay off ${Math.floor(price / 37000).toLocaleString()} student loans`,
  }),
  (price) => ({
    emoji: "⛽",
    text: `That's ${Math.floor(price / 55).toLocaleString()} full tanks of gas`,
  }),
  (price) => ({
    emoji: "🐕",
    text: `That could adopt ${Math.floor(price / 300).toLocaleString()} shelter dogs`,
  }),

  // Scale comparisons
  (price) => ({
    emoji: "💵",
    text:
      price >= 1000000
        ? `Stacked in $100 bills, that's ${(price / 100 * 0.1 / 1000).toFixed(1)}m tall`
        : `That's ${Math.floor(price / 100).toLocaleString()} $100 bills`,
  }),
  (price) => ({
    emoji: "⚖️",
    text: `In quarters, that would weigh ${((price / 0.25) * 5.67 / 1000).toFixed(1)} kg`,
  }),

  // Fun ones
  (price) => ({
    emoji: "🎰",
    text: `That's ${Math.floor(price / 2).toLocaleString()} lottery tickets`,
  }),
  (price) => ({
    emoji: "🍌",
    text: `That's ${Math.floor(price / 0.25).toLocaleString()} bananas (Whole Foods)`,
  }),
];

function getRandomComparison(
  price: number,
  billionaireName: string,
  earningsPerSecond: number
): AbsurdComparison {
  // Filter to comparisons that make sense at this price point
  const viable = COMPARISONS.filter((fn) => {
    const result = fn(price, billionaireName, earningsPerSecond);
    // Filter out "0" or "less than 1" comparisons
    return !result.text.includes(" 0 ") && !result.text.startsWith("That's 0");
  });

  const pool = viable.length > 0 ? viable : COMPARISONS;
  const fn = pool[Math.floor(Math.random() * pool.length)];
  return fn(price, billionaireName, earningsPerSecond);
}

interface AbsurdToastProps {
  price: number;
  billionaireName: string;
  earningsPerSecond: number;
  triggerId: number; // increment to trigger new toast
}

export function AbsurdToast({
  price,
  billionaireName,
  earningsPerSecond,
  triggerId,
}: AbsurdToastProps) {
  const [toast, setToast] = useState<AbsurdComparison | null>(null);
  const [visible, setVisible] = useState(false);

  const showToast = useCallback(() => {
    if (price <= 0) return;
    const comparison = getRandomComparison(price, billionaireName, earningsPerSecond);
    setToast(comparison);
    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, [price, billionaireName, earningsPerSecond]);

  useEffect(() => {
    if (triggerId > 0) {
      showToast();
    }
  }, [triggerId, showToast]);

  return (
    <AnimatePresence>
      {visible && toast && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] max-w-sm w-[90%]"
        >
          <div className="px-5 py-3 rounded-2xl bg-surface/95 border border-stone/30 backdrop-blur-xl shadow-stone-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl shrink-0">{toast.emoji}</span>
              <p className="text-xs text-sand/70 leading-relaxed">
                {toast.text}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
