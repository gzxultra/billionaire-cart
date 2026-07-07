"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth, selectRemaining } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { toast } from "@/lib/use-toast";
import { useLocale } from "@/lib/use-locale";

// Spending tier titles based on percentage spent
function getSpenderTitle(pct: number, locale: "en" | "zh"): { title: string; emoji: string } {
  if (pct >= 95) return locale === "zh" ? { title: "破产边缘者", emoji: "💀" } : { title: "Bankruptcy Speedrunner", emoji: "💀" };
  if (pct >= 80) return locale === "zh" ? { title: "挥金如土大师", emoji: "🔥" } : { title: "Master of Excess", emoji: "🔥" };
  if (pct >= 60) return locale === "zh" ? { title: "豪掷千金者", emoji: "💸" } : { title: "Big Spender", emoji: "💸" };
  if (pct >= 40) return locale === "zh" ? { title: "稳健消费者", emoji: "🛍️" } : { title: "Steady Shopper", emoji: "🛍️" };
  if (pct >= 20) return locale === "zh" ? { title: "理性购物达人", emoji: "🧐" } : { title: "Cautious Buyer", emoji: "🧐" };
  if (pct >= 5) return locale === "zh" ? { title: "试水玩家", emoji: "💧" } : { title: "Window Shopper", emoji: "💧" };
  return locale === "zh" ? { title: "旁观者", emoji: "👀" } : { title: "Just Looking", emoji: "👀" };
}

function getSpeedRank(purchaseCount: number, totalSpent: number, locale: "en" | "zh"): string {
  const avgPrice = purchaseCount > 0 ? totalSpent / purchaseCount : 0;
  if (avgPrice >= 1_000_000_000) return locale === "zh" ? "👑 鲸鱼级买家" : "👑 Whale Buyer";
  if (avgPrice >= 100_000_000) return locale === "zh" ? "🦈 鲨鱼级买家" : "🦈 Shark Buyer";
  if (avgPrice >= 1_000_000) return locale === "zh" ? "🐬 海豚级买家" : "🐬 Dolphin Buyer";
  if (avgPrice >= 10_000) return locale === "zh" ? "🐟 小鱼级买家" : "🐟 Fish Buyer";
  return locale === "zh" ? "🦐 虾米级买家" : "🦐 Shrimp Buyer";
}

export function SpendingSnapshot() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);
  const remaining = useCartStore(selectRemaining);
  const [showCard, setShowCard] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    if (!selectedBillionaire || purchases.length === 0) return null;

    const pct = (totalSpent / netWorth) * 100;
    const spenderTitle = getSpenderTitle(pct, locale);
    const speedRank = getSpeedRank(purchases.length, totalSpent, locale);

    // Most expensive purchase
    const sortedByPrice = [...purchases].sort((a, b) => b.product.price - a.product.price);
    const topPurchase = sortedByPrice[0];

    // Category breakdown
    const categories = new Map<string, number>();
    for (const p of purchases) {
      const key = p.product.assetClass;
      categories.set(key, (categories.get(key) || 0) + p.product.price);
    }
    const topCategory = Array.from(categories.entries()).sort((a, b) => b[1] - a[1])[0];

    // Time stats
    const firstTs = purchases[0].timestamp;
    const lastTs = purchases[purchases.length - 1].timestamp;
    const sessionMinutes = Math.max(1, Math.round((lastTs - firstTs) / 60000));

    return {
      pct,
      spenderTitle,
      speedRank,
      topPurchase,
      topCategory,
      sessionMinutes,
      purchaseCount: purchases.length,
    };
  }, [selectedBillionaire, purchases, totalSpent, netWorth, locale]);

  if (!selectedBillionaire || !stats || purchases.length < 3) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-panel p-5 sm:p-6 stagger-section"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">📸</span>
            <h2 className="section-label">
              {locale === "zh" ? "消费快照" : "Spending Snapshot"}
            </h2>
          </div>
          <button
            onClick={() => setShowCard(true)}
            className="px-3 py-1.5 rounded-lg text-[10px] font-medium text-stone/80 bg-stone/10 border border-stone/25 hover:bg-stone/15 transition-colors"
          >
            {locale === "zh" ? "📸 生成卡片" : "📸 Generate Card"}
          </button>
        </div>

        {/* Quick stats preview */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center">
            <div className="text-lg">{stats.spenderTitle.emoji}</div>
            <div className="text-[10px] text-ash/60 mt-1">
              {locale === "zh" ? "称号" : "Title"}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-serif text-champagne font-bold">
              {stats.purchaseCount}
            </div>
            <div className="text-[10px] text-ash/60 mt-0.5">
              {locale === "zh" ? "笔购买" : "Purchases"}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-serif text-champagne font-bold">
              {stats.pct.toFixed(1)}%
            </div>
            <div className="text-[10px] text-ash/60 mt-0.5">
              {locale === "zh" ? "已花费" : "Spent"}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Full snapshot card modal */}
      <AnimatePresence>
        {showCard && stats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowCard(false)}
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm"
            >
              {/* The snapshot card */}
              <div
                ref={cardRef}
                className="rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  background: "linear-gradient(145deg, #2A2520 0%, #1a1815 50%, #2A2520 100%)",
                }}
              >
                {/* Header */}
                <div className="p-5 pb-3 text-center">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-[#C5A572]/60 font-mono">
                    Billionaire Cart
                  </div>
                  <div className="text-2xl mt-2">{stats.spenderTitle.emoji}</div>
                  <div className="text-sm font-bold text-[#F5F1EB] mt-1 tracking-wide">
                    {stats.spenderTitle.title}
                  </div>
                  <div className="text-[10px] text-[#C5A572]/70 mt-1">
                    {stats.speedRank}
                  </div>
                </div>

                {/* Divider */}
                <div className="mx-5 h-px bg-gradient-to-r from-transparent via-[#C5A572]/30 to-transparent" />

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-px bg-[#C5A572]/10 mx-5 my-3 rounded-xl overflow-hidden">
                  <div className="bg-[#2A2520] p-3 text-center">
                    <div className="text-[9px] text-[#8C7A65]/80 uppercase tracking-wider">
                      {locale === "zh" ? "身份" : "Playing as"}
                    </div>
                    <div className="text-xs text-[#F5F1EB] font-medium mt-1 truncate">
                      {selectedBillionaire.emoji} {selectedBillionaire.name}
                    </div>
                  </div>
                  <div className="bg-[#2A2520] p-3 text-center">
                    <div className="text-[9px] text-[#8C7A65]/80 uppercase tracking-wider">
                      {locale === "zh" ? "总消费" : "Total Spent"}
                    </div>
                    <div className="text-xs text-[#C5A572] font-bold font-serif mt-1">
                      {formatCurrency(totalSpent, true)}
                    </div>
                  </div>
                  <div className="bg-[#2A2520] p-3 text-center">
                    <div className="text-[9px] text-[#8C7A65]/80 uppercase tracking-wider">
                      {locale === "zh" ? "购买次数" : "Purchases"}
                    </div>
                    <div className="text-xs text-[#F5F1EB] font-serif mt-1">
                      {stats.purchaseCount}
                    </div>
                  </div>
                  <div className="bg-[#2A2520] p-3 text-center">
                    <div className="text-[9px] text-[#8C7A65]/80 uppercase tracking-wider">
                      {locale === "zh" ? "花费占比" : "Wealth Used"}
                    </div>
                    <div className="text-xs text-[#C5A572] font-serif mt-1">
                      {stats.pct.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Top purchase */}
                <div className="mx-5 p-3 rounded-xl bg-[#C5A572]/5 border border-[#C5A572]/15 mb-3">
                  <div className="text-[9px] text-[#8C7A65]/80 uppercase tracking-wider mb-1">
                    {locale === "zh" ? "💎 最贵的一笔" : "💎 Biggest Splurge"}
                  </div>
                  <div className="text-xs text-[#F5F1EB] font-medium truncate">
                    {stats.topPurchase.product.title}
                  </div>
                  <div className="text-[10px] text-[#C5A572] font-serif mt-0.5">
                    {formatCurrency(stats.topPurchase.product.price, true)}
                  </div>
                </div>

                {/* Remaining fortune bar */}
                <div className="mx-5 mb-4">
                  <div className="flex justify-between text-[9px] text-[#8C7A65]/60 mb-1">
                    <span>{locale === "zh" ? "剩余财富" : "Remaining"}</span>
                    <span>{formatCurrency(remaining, true)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#1a1815] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: "linear-gradient(90deg, #C5A572, #A68530)",
                        width: `${Math.max(2, 100 - stats.pct)}%`,
                      }}
                      initial={{ width: "100%" }}
                      animate={{ width: `${Math.max(2, 100 - stats.pct)}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-[#1a1815]/50 text-center">
                  <div className="text-[8px] text-[#8C7A65]/50 font-mono tracking-wider">
                    billionaire-cart.pages.dev · {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Actions below card */}
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={() => setShowCard(false)}
                  className="px-4 py-2 rounded-xl text-xs text-ash/70 bg-surface/80 border border-line/40 hover:bg-surface transition-colors"
                >
                  {locale === "zh" ? "关闭" : "Close"}
                </button>
                <button
                  onClick={() => {
                    // Copy stats as text to clipboard
                    const text = `🃏 Billionaire Cart\n${stats.spenderTitle.emoji} ${stats.spenderTitle.title}\n\n${selectedBillionaire.emoji} ${selectedBillionaire.name}\n💰 Spent: ${formatCurrency(totalSpent, true)} (${stats.pct.toFixed(1)}%)\n🛍️ ${stats.purchaseCount} purchases\n💎 Top: ${stats.topPurchase.product.title} (${formatCurrency(stats.topPurchase.product.price, true)})\n\nbillionaire-cart.pages.dev`;
                    navigator.clipboard?.writeText(text).then(() => {
                      toast(locale === "zh" ? "✓ 已复制到剪贴板" : "✓ Copied to clipboard", 2000);
                    }).catch(() => {});
                  }}
                  className="px-4 py-2 rounded-xl text-xs text-white bg-stone hover:bg-stone/90 transition-colors"
                >
                  {locale === "zh" ? "📋 复制分享" : "📋 Copy & Share"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
