"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { Purchase } from "@/lib/types";

/**
 * PurchaseHallOfFame — ranks the user's top 5 most expensive purchases
 * with medals, fun titles, and billionaire-context commentary.
 */

const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

interface RankedPurchase {
  purchase: Purchase;
  rank: number;
  pctOfNetWorth: number;
  titleEn: string;
  titleZh: string;
}

function getTitle(rank: number, pctOfNetWorth: number): { en: string; zh: string } {
  if (rank === 0) {
    if (pctOfNetWorth > 10) return { en: "The YOLO Move", zh: "梭哈时刻" };
    if (pctOfNetWorth > 1) return { en: "Crown Jewel", zh: "镇店之宝" };
    return { en: "Biggest Flex", zh: "最大手笔" };
  }
  if (rank === 1) {
    if (pctOfNetWorth > 5) return { en: "Almost Reckless", zh: "差点破产" };
    return { en: "Runner Up", zh: "亚军选手" };
  }
  if (rank === 2) return { en: "Honorable Mention", zh: "荣誉提名" };
  if (rank === 3) return { en: "Noteworthy", zh: "值得一提" };
  return { en: "Made the List", zh: "上榜了" };
}

function PurchaseHallOfFameInner() {
  const locale = useLocale((s) => s.locale);
  const zh = locale === "zh";
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const netWorth = useCartStore(selectNetWorth);

  const ranked: RankedPurchase[] = useMemo(() => {
    if (purchases.length === 0 || !netWorth) return [];
    const sorted = [...purchases].sort((a, b) => b.product.price - a.product.price);
    return sorted.slice(0, 5).map((p, i) => {
      const pctOfNetWorth = (p.product.price / netWorth) * 100;
      const title = getTitle(i, pctOfNetWorth);
      return {
        purchase: p,
        rank: i,
        pctOfNetWorth,
        titleEn: title.en,
        titleZh: title.zh,
      };
    });
  }, [purchases, netWorth]);

  if (!selectedBillionaire || ranked.length < 3) return null;

  const totalSpent = purchases.reduce((s, p) => s + p.product.price, 0);
  const topSpent = ranked.reduce((s, r) => s + r.purchase.product.price, 0);
  const topPct = totalSpent > 0 ? (topSpent / totalSpent) * 100 : 0;

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">🏆</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-stone/75 font-medium">
            {zh ? "消费名人堂" : "Hall of Fame"}
          </span>
        </div>
        <span className="text-[9px] font-mono text-ash/50">
          Top {ranked.length} = {topPct.toFixed(0)}% {zh ? "总消费" : "of spend"}
        </span>
      </div>

      <div className="space-y-2">
        {ranked.map((r, i) => (
          <motion.div
            key={r.purchase.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
              i === 0
                ? "bg-champagne/[0.06] border-champagne/20"
                : "bg-surface-dim/60 border-line/30"
            }`}
          >
            {/* Medal */}
            <span className="text-lg shrink-0 w-7 text-center">{MEDALS[i]}</span>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[12px] font-medium truncate ${i === 0 ? "text-champagne" : "text-sand"}`}>
                  {r.purchase.product.title}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                  i === 0 ? "bg-champagne/15 text-champagne/80" : "bg-stone/10 text-stone/60"
                }`}>
                  {zh ? r.titleZh : r.titleEn}
                </span>
                <span className="text-[9px] text-ash/45">
                  {r.pctOfNetWorth >= 0.01
                    ? `${r.pctOfNetWorth.toFixed(r.pctOfNetWorth >= 1 ? 1 : 3)}% ${zh ? "净资产" : "net worth"}`
                    : zh ? "九牛一毛" : "pocket change"}
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="text-right shrink-0 min-w-[64px]">
              <div className={`text-[12px] font-mono tabular-nums ${i === 0 ? "text-champagne font-semibold" : "text-sand/80"}`}>
                {formatCurrency(r.purchase.product.price, true)}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export const PurchaseHallOfFame = memo(PurchaseHallOfFameInner);
