"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { Locale } from "@/lib/i18n";

interface AbsurdComparison {
  emoji: string;
  text: string;
}

type ComparisonFn = (price: number, billionaire: string, eps: number, locale: Locale) => AbsurdComparison;

function fmtNum(n: number): string {
  return n.toLocaleString();
}

const COMPARISONS: ComparisonFn[] = [
  // Time-based
  (price, billionaire, eps, locale) => {
    if (eps <= 0) return { emoji: "⏱️", text: locale === "zh" ? "这可是一大笔钱" : "That's a lot of money" };
    const secs = price / eps;
    if (secs < 60) return {
      emoji: "⏱️",
      text: locale === "zh"
        ? `${billionaire} ${secs.toFixed(1)} 秒就赚回来了`
        : `${billionaire} earns this back in ${secs.toFixed(1)} seconds`,
    };
    if (secs < 3600) return {
      emoji: "⏱️",
      text: locale === "zh"
        ? `${billionaire} ${(secs / 60).toFixed(1)} 分钟就赚回来了`
        : `${billionaire} earns this back in ${(secs / 60).toFixed(1)} minutes`,
    };
    return {
      emoji: "⏱️",
      text: locale === "zh"
        ? `${billionaire} ${(secs / 3600).toFixed(1)} 小时就赚回来了`
        : `${billionaire} earns this back in ${(secs / 3600).toFixed(1)} hours`,
    };
  },

  // Food comparisons
  (price, _b, _e, locale) => ({
    emoji: "🍔",
    text: locale === "zh"
      ? `相当于 ${fmtNum(Math.floor(price / 5.69))} 个巨无霸`
      : `That's ${fmtNum(Math.floor(price / 5.69))} Big Macs`,
  }),
  (price, _b, _e, locale) => ({
    emoji: "☕",
    text: locale === "zh"
      ? `相当于 ${fmtNum(Math.floor(price / 6.5))} 杯星巴克`
      : `That's ${fmtNum(Math.floor(price / 6.5))} Starbucks lattes`,
  }),
  (price, _b, _e, locale) => ({
    emoji: "🍕",
    text: locale === "zh"
      ? `相当于 ${fmtNum(Math.floor(price / 20))} 份外卖披萨`
      : `That's ${fmtNum(Math.floor(price / 20))} pizza deliveries`,
  }),

  // Salary comparisons
  (price, _b, _e, locale) => ({
    emoji: "👤",
    text: price >= 75000
      ? (locale === "zh"
        ? `相当于 ${fmtNum(Math.floor(price / 75000))} 年的美国人均工资`
        : `That's ${fmtNum(Math.floor(price / 75000))} years of average US salary`)
      : (locale === "zh"
        ? `相当于 ${(price / 75000 * 12).toFixed(1)} 个月的美国人均工资`
        : `That's ${(price / 75000 * 12).toFixed(1)} months of average US salary`),
  }),
  (price, _b, _e, locale) => ({
    emoji: "👨‍⚕️",
    text: locale === "zh"
      ? `相当于外科医生 ${fmtNum(Math.floor(price / 350000)) || "不到 1"} 年的薪水`
      : `That's ${fmtNum(Math.floor(price / 350000)) || "less than 1"} years of a surgeon's salary`,
  }),

  // Object comparisons
  (price, _b, _e, locale) => ({
    emoji: "📱",
    text: locale === "zh"
      ? `相当于 ${fmtNum(Math.floor(price / 1199))} 部 iPhone 16 Pro`
      : `That's ${fmtNum(Math.floor(price / 1199))} iPhone 16 Pros`,
  }),
  (price, _b, _e, locale) => ({
    emoji: "🚗",
    text: locale === "zh"
      ? `相当于 ${fmtNum(Math.floor(price / 22000))} 辆丰田卡罗拉`
      : `That's ${fmtNum(Math.floor(price / 22000))} Toyota Corollas`,
  }),
  (price, _b, _e, locale) => ({
    emoji: "🏠",
    text: price >= 420000
      ? (locale === "zh"
        ? `相当于 ${(price / 420000).toFixed(1)} 套美国中位价住房`
        : `That's ${(price / 420000).toFixed(1)} median US homes`)
      : (locale === "zh"
        ? `相当于一套美国中位价住房的 ${((price / 420000) * 100).toFixed(1)}%`
        : `That's ${((price / 420000) * 100).toFixed(1)}% of a median US home`),
  }),
  (price, _b, _e, locale) => ({
    emoji: "📺",
    text: locale === "zh"
      ? `相当于 ${fmtNum(Math.floor(price / 15.49))} 个月的 Netflix`
      : `That's ${fmtNum(Math.floor(price / 15.49))} months of Netflix`,
  }),

  // Life comparisons
  (price, _b, _e, locale) => ({
    emoji: "🎓",
    text: locale === "zh"
      ? `可以还清 ${fmtNum(Math.floor(price / 37000))} 份学生贷款`
      : `That could pay off ${fmtNum(Math.floor(price / 37000))} student loans`,
  }),
  (price, _b, _e, locale) => ({
    emoji: "⛽",
    text: locale === "zh"
      ? `相当于加 ${fmtNum(Math.floor(price / 55))} 满箱油`
      : `That's ${fmtNum(Math.floor(price / 55))} full tanks of gas`,
  }),
  (price, _b, _e, locale) => ({
    emoji: "🐕",
    text: locale === "zh"
      ? `可以领养 ${fmtNum(Math.floor(price / 300))} 只流浪狗`
      : `That could adopt ${fmtNum(Math.floor(price / 300))} shelter dogs`,
  }),

  // Scale comparisons
  (price, _b, _e, locale) => ({
    emoji: "💵",
    text: price >= 1000000
      ? (locale === "zh"
        ? `用 $100 纸币堆起来有 ${(price / 100 * 0.1 / 1000).toFixed(1)} 米高`
        : `Stacked in $100 bills, that's ${(price / 100 * 0.1 / 1000).toFixed(1)}m tall`)
      : (locale === "zh"
        ? `相当于 ${fmtNum(Math.floor(price / 100))} 张百元美钞`
        : `That's ${fmtNum(Math.floor(price / 100))} $100 bills`),
  }),
  (price, _b, _e, locale) => ({
    emoji: "⚖️",
    text: locale === "zh"
      ? `换成硬币重达 ${((price / 0.25) * 5.67 / 1000).toFixed(1)} 公斤`
      : `In quarters, that would weigh ${((price / 0.25) * 5.67 / 1000).toFixed(1)} kg`,
  }),

  // Fun ones
  (price, _b, _e, locale) => ({
    emoji: "🎰",
    text: locale === "zh"
      ? `相当于 ${fmtNum(Math.floor(price / 2))} 张彩票`
      : `That's ${fmtNum(Math.floor(price / 2))} lottery tickets`,
  }),
  (price, _b, _e, locale) => ({
    emoji: "🍌",
    text: locale === "zh"
      ? `相当于 ${fmtNum(Math.floor(price / 0.25))} 根香蕉`
      : `That's ${fmtNum(Math.floor(price / 0.25))} bananas (Whole Foods)`,
  }),
];

function getRandomComparison(
  price: number,
  billionaireName: string,
  earningsPerSecond: number,
  locale: Locale,
): AbsurdComparison {
  // Filter to comparisons that make sense at this price point
  const viable = COMPARISONS.filter((fn) => {
    const result = fn(price, billionaireName, earningsPerSecond, locale);
    return !result.text.includes(" 0 ") && !result.text.startsWith("That's 0") && !result.text.includes(" 0 个");
  });

  const pool = viable.length > 0 ? viable : COMPARISONS;
  const fn = pool[Math.floor(Math.random() * pool.length)];
  return fn(price, billionaireName, earningsPerSecond, locale);
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
  const locale = useLocale((s) => s.locale);

  const showToast = useCallback(() => {
    if (price <= 0) return;
    const comparison = getRandomComparison(price, billionaireName, earningsPerSecond, locale);
    setToast(comparison);
    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, [price, billionaireName, earningsPerSecond, locale]);

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
