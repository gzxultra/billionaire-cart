"use client";

import { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";
import { formatCurrency } from "@/lib/format";
import { playAchievement } from "@/lib/sounds";
import { AssetClass } from "@/lib/types";

/**
 * PurchaseBingo — A 5×5 bingo card with spending milestones and category goals.
 * Cells fill as you shop. Complete a row, column, or diagonal for celebrations.
 */

interface BingoCell {
  id: string;
  labelEn: string;
  labelZh: string;
  emoji: string;
  check: (ctx: BingoContext) => boolean;
}

interface BingoContext {
  totalSpent: number;
  purchaseCount: number;
  categoryCount: Map<AssetClass, number>;
  uniqueCategories: number;
  maxSinglePrice: number;
  minSinglePrice: number;
  totalItems: number;
}

const BINGO_CELLS: BingoCell[] = [
  // Row 1: Spending milestones
  { id: "b-1k", labelEn: "Spend $1K", labelZh: "花 $1K", emoji: "💵", check: (c) => c.totalSpent >= 1_000 },
  { id: "b-100k", labelEn: "Spend $100K", labelZh: "花 $100K", emoji: "💰", check: (c) => c.totalSpent >= 100_000 },
  { id: "b-1m", labelEn: "Spend $1M", labelZh: "花 $1M", emoji: "🏦", check: (c) => c.totalSpent >= 1_000_000 },
  { id: "b-100m", labelEn: "Spend $100M", labelZh: "花 $1亿", emoji: "💎", check: (c) => c.totalSpent >= 100_000_000 },
  { id: "b-1b", labelEn: "Spend $1B", labelZh: "花 $10亿", emoji: "👑", check: (c) => c.totalSpent >= 1_000_000_000 },

  // Row 2: Purchase count milestones
  { id: "b-buy5", labelEn: "Buy 5 items", labelZh: "买 5 件", emoji: "🛒", check: (c) => c.purchaseCount >= 5 },
  { id: "b-buy15", labelEn: "Buy 15 items", labelZh: "买 15 件", emoji: "🛍️", check: (c) => c.purchaseCount >= 15 },
  { id: "b-buy30", labelEn: "Buy 30 items", labelZh: "买 30 件", emoji: "📦", check: (c) => c.purchaseCount >= 30 },
  { id: "b-buy50", labelEn: "Buy 50 items", labelZh: "买 50 件", emoji: "🚛", check: (c) => c.purchaseCount >= 50 },
  { id: "b-buy100", labelEn: "100 items!", labelZh: "买 100 件", emoji: "🏭", check: (c) => c.purchaseCount >= 100 },

  // Row 3: Category coverage
  { id: "b-car", labelEn: "Buy a Car", labelZh: "买辆车", emoji: "🏎️", check: (c) => (c.categoryCount.get("supercar") || 0) >= 1 },
  { id: "b-yacht", labelEn: "Buy a Yacht", labelZh: "买艘游艇", emoji: "🛥️", check: (c) => (c.categoryCount.get("yacht") || 0) >= 1 },
  { id: "b-free", labelEn: "FREE SPACE", labelZh: "免费格", emoji: "⭐", check: () => true }, // Always filled
  { id: "b-house", labelEn: "Buy Property", labelZh: "买房产", emoji: "🏰", check: (c) => (c.categoryCount.get("real_estate") || 0) >= 1 },
  { id: "b-jet", labelEn: "Buy a Jet", labelZh: "买飞机", emoji: "✈️", check: (c) => (c.categoryCount.get("aircraft") || 0) >= 1 },

  // Row 4: Style goals
  { id: "b-fashion", labelEn: "Fashion Buy", labelZh: "买时装", emoji: "👗", check: (c) => (c.categoryCount.get("luxury_fashion") || 0) >= 1 },
  { id: "b-art", labelEn: "Buy Art", labelZh: "买艺术品", emoji: "🎨", check: (c) => (c.categoryCount.get("art") || 0) >= 1 },
  { id: "b-jewel", labelEn: "Buy Jewelry", labelZh: "买珠宝", emoji: "💍", check: (c) => (c.categoryCount.get("jewelry") || 0) >= 1 },
  { id: "b-tech", labelEn: "Buy Tech", labelZh: "买科技", emoji: "📱", check: (c) => (c.categoryCount.get("electronics") || 0) >= 1 },
  { id: "b-3cat", labelEn: "3 Categories", labelZh: "3 种类别", emoji: "🎯", check: (c) => c.uniqueCategories >= 3 },

  // Row 5: Special achievements
  { id: "b-big", labelEn: "$10M+ item", labelZh: "千万单品", emoji: "🔥", check: (c) => c.maxSinglePrice >= 10_000_000 },
  { id: "b-cheap", labelEn: "Under $10", labelZh: "<$10 的", emoji: "🪙", check: (c) => c.minSinglePrice < 10 && c.minSinglePrice > 0 },
  { id: "b-5cat", labelEn: "5 Categories", labelZh: "5 种类别", emoji: "🌈", check: (c) => c.uniqueCategories >= 5 },
  { id: "b-10buy1cat", labelEn: "10 of 1 type", labelZh: "一类买10", emoji: "🔁", check: (c) => Array.from(c.categoryCount.values()).some(v => v >= 10) },
  { id: "b-whale", labelEn: "Spend $10B", labelZh: "花 $100亿", emoji: "🐋", check: (c) => c.totalSpent >= 10_000_000_000 },
];

// Check winning lines (rows, columns, diagonals)
function getWinningLines(filled: boolean[]): number[][] {
  const lines: number[][] = [];
  // Rows
  for (let r = 0; r < 5; r++) {
    const row = [r*5, r*5+1, r*5+2, r*5+3, r*5+4];
    if (row.every(i => filled[i])) lines.push(row);
  }
  // Columns
  for (let c = 0; c < 5; c++) {
    const col = [c, c+5, c+10, c+15, c+20];
    if (col.every(i => filled[i])) lines.push(col);
  }
  // Diagonals
  const d1 = [0, 6, 12, 18, 24];
  const d2 = [4, 8, 12, 16, 20];
  if (d1.every(i => filled[i])) lines.push(d1);
  if (d2.every(i => filled[i])) lines.push(d2);
  return lines;
}

export function PurchaseBingo() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const totalSpent = useCartStore(selectTotalSpent);
  const soundEnabled = useCartStore((s) => s.soundEnabled);

  const [celebrated, setCelebrated] = useState<Set<string>>(new Set());

  // Build context
  const ctx = useMemo<BingoContext>(() => {
    const categoryCount = new Map<AssetClass, number>();
    let maxSinglePrice = 0;
    let minSinglePrice = Infinity;

    for (const p of purchases) {
      const cls = p.product.assetClass;
      categoryCount.set(cls, (categoryCount.get(cls) || 0) + 1);
      if (p.product.price > maxSinglePrice) maxSinglePrice = p.product.price;
      if (p.product.price > 0 && p.product.price < minSinglePrice) minSinglePrice = p.product.price;
    }

    return {
      totalSpent,
      purchaseCount: purchases.length,
      categoryCount,
      uniqueCategories: categoryCount.size,
      maxSinglePrice,
      minSinglePrice: minSinglePrice === Infinity ? 0 : minSinglePrice,
      totalItems: purchases.length,
    };
  }, [purchases, totalSpent]);

  // Evaluate cells
  const filled = useMemo(() => BINGO_CELLS.map(cell => cell.check(ctx)), [ctx]);
  const filledCount = filled.filter(Boolean).length;
  const winningLines = useMemo(() => getWinningLines(filled), [filled]);
  const winningCells = useMemo(() => {
    const s = new Set<number>();
    winningLines.forEach(line => line.forEach(i => s.add(i)));
    return s;
  }, [winningLines]);

  // Celebrate new bingo lines
  const handleCelebrate = useCallback((lineKey: string) => {
    if (!celebrated.has(lineKey)) {
      setCelebrated(prev => new Set(prev).add(lineKey));
      if (soundEnabled) playAchievement();
    }
  }, [celebrated, soundEnabled]);

  // Check for new lines
  useMemo(() => {
    for (const line of winningLines) {
      const key = line.join("-");
      if (!celebrated.has(key)) {
        // Trigger celebration in next tick
        setTimeout(() => handleCelebrate(key), 500);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winningLines]);

  if (!selectedBillionaire || purchases.length < 1) return null;

  return (
    <section className="card-panel p-5 sm:p-8">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">🎱</span>
        <h2 className="text-xs uppercase tracking-[0.2em] text-stone/75 font-medium">
          {locale === "zh" ? "购物宾果" : "Purchase Bingo"}
        </h2>
        <span className="text-[10px] text-ash/50 ml-auto font-mono tabular-nums">
          {filledCount}/25 • {winningLines.length} {locale === "zh" ? "条线" : winningLines.length === 1 ? "line" : "lines"}
        </span>
      </div>
      <p className="text-[10px] text-ash/50 mb-4">
        {locale === "zh"
          ? "通过购物完成一行/列/对角线！"
          : "Complete rows, columns, or diagonals by shopping!"}
      </p>

      {/* 5×5 Bingo Grid */}
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
        {BINGO_CELLS.map((cell, i) => {
          const isFilled = filled[i];
          const isWinning = winningCells.has(i);

          return (
            <motion.div
              key={cell.id}
              initial={false}
              animate={isFilled ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.3 }}
              className={`
                relative aspect-square rounded-lg flex flex-col items-center justify-center p-1
                border transition-all duration-300 cursor-default
                ${isFilled
                  ? isWinning
                    ? "bg-champagne/20 border-champagne/50 shadow-champagne-sm"
                    : "bg-sage/15 border-sage/30"
                  : "bg-surface-bright/60 border-line/30"
                }
              `}
              title={`${locale === "zh" ? cell.labelZh : cell.labelEn} — ${isFilled ? "✓" : "○"}`}
            >
              {/* Emoji */}
              <span className={`text-sm sm:text-base ${isFilled ? "" : "opacity-30 grayscale"}`}>
                {cell.emoji}
              </span>

              {/* Label */}
              <span className={`text-[7px] sm:text-[8px] text-center leading-tight mt-0.5 font-medium ${
                isFilled ? "text-sand/90" : "text-ash/45"
              }`}>
                {locale === "zh" ? cell.labelZh : cell.labelEn}
              </span>

              {/* Filled check */}
              {isFilled && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-sage flex items-center justify-center"
                >
                  <span className="text-[8px] text-white font-bold">✓</span>
                </motion.div>
              )}

              {/* Winning glow */}
              {isWinning && (
                <motion.div
                  className="absolute inset-0 rounded-lg border-2 border-champagne/40 pointer-events-none"
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Bingo celebration */}
      <AnimatePresence>
        {winningLines.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-center"
          >
            <span className="text-sm font-serif text-champagne">
              {winningLines.length === 1
                ? (locale === "zh" ? "🎉 宾果！完成了一条线！" : "🎉 BINGO! You completed a line!")
                : (locale === "zh"
                    ? `🎉 ${winningLines.length} 条宾果线！太强了！`
                    : `🎉 ${winningLines.length} BINGO lines! Incredible!`
                  )}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
