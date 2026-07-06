"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

interface Headline {
  id: number;
  text: string;
  icon: string;
}

function generateHeadlines(
  purchaseCount: number,
  totalSpent: number,
  netWorth: number,
  billionaireName: string,
  earningsPerSec: number,
  locale: string,
): Headline[] {
  const pctSpent = netWorth > 0 ? (totalSpent / netWorth) * 100 : 0;
  const secondsToEarn = earningsPerSec > 0 ? totalSpent / earningsPerSec : 0;
  const spentFormatted = formatCurrency(totalSpent, true);
  const perSecFormatted = formatCurrency(earningsPerSec);

  const isZh = locale === "zh";

  const pool: { text: string; icon: string; min?: number }[] = isZh
    ? [
        { text: `快讯：匿名买家今日已消费 ${spentFormatted}，毫无减速迹象`, icon: "📰", min: 1 },
        { text: `市场震动：单一消费者已购入 ${purchaseCount} 件商品，分析师表示"闻所未闻"`, icon: "📊", min: 3 },
        { text: `独家：${billionaireName} 每秒赚 ${perSecFormatted}，而你花的钱 ${secondsToEarn.toFixed(1)} 秒就赚回来了`, icon: "⏱️", min: 1 },
        { text: `突发：购物车已爆满！今日 ${purchaseCount} 笔交易打破所有记录`, icon: "🔥", min: 5 },
        { text: `经济观察：此次消费狂潮已烧掉 ${billionaireName} ${pctSpent.toFixed(2)}% 的净资产`, icon: "📉", min: 1 },
        { text: `华尔街震惊：一个消费者居然在一次坐下来的时间内花了 ${spentFormatted}`, icon: "💸", min: 1 },
        { text: `专家分析："照这个速度，破产大约需要...永远不会"`, icon: "🧠", min: 2 },
        { text: `社交媒体热议：#亿万富翁购物车 成为全球趋势话题`, icon: "📱", min: 3 },
        { text: `实时更新：第 ${purchaseCount} 笔交易确认！收银机冒烟了`, icon: "🧾", min: 4 },
        { text: `调查报告：消费额 ${spentFormatted} 已超越 12 个小国 GDP`, icon: "🌍", min: 5 },
      ]
    : [
        { text: `BREAKING: Anonymous shopper drops ${spentFormatted} today with no signs of stopping`, icon: "📰", min: 1 },
        { text: `MARKET ALERT: Single consumer acquires ${purchaseCount} items — analysts say "unprecedented"`, icon: "📊", min: 3 },
        { text: `EXCLUSIVE: ${billionaireName} earns ${perSecFormatted}/sec — today's spending recovered in ${secondsToEarn.toFixed(1)}s`, icon: "⏱️", min: 1 },
        { text: `FLASH: Shopping spree reaches ${purchaseCount} transactions, shattering all records`, icon: "🔥", min: 5 },
        { text: `ECONOMY WATCH: Spending spree burns through ${pctSpent.toFixed(2)}% of ${billionaireName}'s net worth`, icon: "📉", min: 1 },
        { text: `WALL ST STUNNED: One person just spent ${spentFormatted} in a single sitting`, icon: "💸", min: 1 },
        { text: `ANALYSTS: "At this burn rate, bankruptcy ETA is approximately... never"`, icon: "🧠", min: 2 },
        { text: `TRENDING: #BillionaireCart goes viral as spending exceeds GDP of 12 small nations`, icon: "📱", min: 3 },
        { text: `LIVE: Transaction #${purchaseCount} confirmed! Cash registers literally on fire`, icon: "🧾", min: 4 },
        { text: `INVESTIGATION: Total spend of ${spentFormatted} now exceeds GDP of multiple countries`, icon: "🌍", min: 5 },
      ];

  return pool
    .filter((h) => purchaseCount >= (h.min || 0))
    .map((h, i) => ({ id: i, text: h.text, icon: h.icon }));
}

export function SpendingNewsTicker() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchaseCount = useCartStore((s) => s.purchases.length);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);

  const [currentIdx, setCurrentIdx] = useState(0);
  const tickerRef = useRef<HTMLDivElement>(null);

  const headlines = useMemo(() => {
    if (!selectedBillionaire || purchaseCount === 0) return [];
    return generateHeadlines(
      purchaseCount,
      totalSpent,
      netWorth, // selectNetWorth already returns raw USD
      selectedBillionaire.name,
      selectedBillionaire.earningsPerSecond,
      locale,
    );
  }, [selectedBillionaire, purchaseCount, totalSpent, netWorth, locale]);

  // Rotate headlines
  useEffect(() => {
    if (headlines.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % headlines.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [headlines.length]);

  // Reset index when headlines change
  useEffect(() => {
    setCurrentIdx(0);
  }, [purchaseCount]);

  if (!selectedBillionaire || headlines.length === 0) return null;

  const current = headlines[currentIdx % headlines.length];
  if (!current) return null;

  return (
    <section className="relative overflow-hidden rounded-xl border border-line/8 bg-gradient-to-r from-base via-sand/[0.03] to-base">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Live badge */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-[#9B6B6B]"
          />
          <span className="text-[9px] font-mono uppercase tracking-widest text-[#9B6B6B]/80 font-bold">
            LIVE
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-line/15 flex-shrink-0" />

        {/* Headlines */}
        <div ref={tickerRef} className="flex-1 min-w-0 overflow-hidden relative h-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentIdx}-${purchaseCount}`}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="absolute inset-0 flex items-center"
            >
              <span className="mr-1.5 flex-shrink-0">{current.icon}</span>
              <span className="text-[11px] text-ash/75 font-mono truncate leading-tight">
                {current.text}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
