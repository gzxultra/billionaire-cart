"use client";

import { memo, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency, assetLabel } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

interface PersonalityType {
  id: string;
  titleEn: string;
  titleZh: string;
  emoji: string;
  descEn: string;
  descZh: string;
  gradient: string;
  badge: string;
}

const PERSONALITIES: PersonalityType[] = [
  {
    id: "whale",
    titleEn: "The Whale",
    titleZh: "巨鲸玩家",
    emoji: "🐋",
    descEn: "Few purchases, massive amounts. You go big or go home.",
    descZh: "买得少但出手惊人，要么不买要么天价。",
    gradient: "from-blue-900/20 to-indigo-900/10",
    badge: "🔱",
  },
  {
    id: "collector",
    titleEn: "The Collector",
    titleZh: "收藏狂魔",
    emoji: "🏛️",
    descEn: "You buy everything in sight. Variety is your vice.",
    descZh: "什么都想买，种类繁多永不满足。",
    gradient: "from-amber-900/15 to-yellow-900/10",
    badge: "📦",
  },
  {
    id: "speedrunner",
    titleEn: "The Speedrunner",
    titleZh: "极速败家",
    emoji: "⚡",
    descEn: "Blazing fast purchases. You're burning through wealth at record pace.",
    descZh: "买买买速度惊人，财富以肉眼可见的速度消失。",
    gradient: "from-red-900/15 to-orange-900/10",
    badge: "🏁",
  },
  {
    id: "techbro",
    titleEn: "Silicon Valley Bro",
    titleZh: "硅谷科技大佬",
    emoji: "💻",
    descEn: "Gadgets, EVs, rockets. Your cart looks like a Wired magazine.",
    descZh: "买的全是科技产品，购物车像一本《连线》杂志。",
    gradient: "from-cyan-900/15 to-blue-900/10",
    badge: "🤖",
  },
  {
    id: "fashionista",
    titleEn: "The Fashionista",
    titleZh: "时尚名流",
    emoji: "👗",
    descEn: "Luxury fashion, jewelry, and art. Exquisite taste, darling.",
    descZh: "奢侈品、珠宝、艺术品，品味无可挑剔。",
    gradient: "from-pink-900/15 to-purple-900/10",
    badge: "💎",
  },
  {
    id: "tycoon",
    titleEn: "Real Estate Tycoon",
    titleZh: "地产大亨",
    emoji: "🏰",
    descEn: "Islands, mansions, penthouses. You're building an empire of addresses.",
    descZh: "岛屿、豪宅、顶层公寓，地址本比电话簿还厚。",
    gradient: "from-emerald-900/15 to-teal-900/10",
    badge: "🗝️",
  },
  {
    id: "balanced",
    titleEn: "The Connoisseur",
    titleZh: "全能鉴赏家",
    emoji: "🎩",
    descEn: "A little of everything. Diverse taste, well-rounded portfolio.",
    descZh: "什么都买一点，品味均衡多元化。",
    gradient: "from-stone-800/15 to-stone-900/10",
    badge: "⚖️",
  },
  {
    id: "frugal",
    titleEn: "The Frugal Billionaire",
    titleZh: "节俭富豪",
    emoji: "🧮",
    descEn: "Mostly small purchases. Warren Buffett would be proud.",
    descZh: "买的基本都是便宜货，巴菲特看了都点头。",
    gradient: "from-green-900/15 to-emerald-900/10",
    badge: "🏷️",
  },
];

function detectPersonality(purchases: { product: { price: number; assetClass: string; title: string } }[]): PersonalityType {
  if (purchases.length === 0) return PERSONALITIES[6]; // balanced fallback

  const totalSpent = purchases.reduce((s, p) => s + p.product.price, 0);
  const avgPrice = totalSpent / purchases.length;

  // Category counts
  const catCounts: Record<string, number> = {};
  for (const p of purchases) {
    const cls = p.product.assetClass || "other";
    catCounts[cls] = (catCounts[cls] || 0) + 1;
  }

  const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "other";
  const topCatPct = (catCounts[topCat] || 0) / purchases.length;

  // Unique categories
  const uniqueCats = Object.keys(catCounts).length;

  // Speed: time between first and last purchase
  const timestamps = purchases.map(() => Date.now()); // approximate
  const timeSpanSec = purchases.length > 1
    ? (purchases[purchases.length - 1] as unknown as { timestamp: number }).timestamp
      ? ((purchases[purchases.length - 1] as unknown as { timestamp: number }).timestamp -
        (purchases[0] as unknown as { timestamp: number }).timestamp) / 1000
      : 60
    : 60;
  const purchasesPerMinute = purchases.length / Math.max(timeSpanSec / 60, 0.5);

  // Detect patterns
  if (purchasesPerMinute > 8 && purchases.length >= 8) return PERSONALITIES[2]; // speedrunner
  if (purchases.length <= 5 && avgPrice > 1_000_000_000) return PERSONALITIES[0]; // whale
  if (avgPrice < 1000 && purchases.length >= 5) return PERSONALITIES[7]; // frugal

  // Category-dominant
  const techCats = ["commercial_tech", "electronics", "custom_keyboard"];
  const fashionCats = ["luxury_fashion", "jewelry", "art"];
  const estateCats = ["real_estate"];

  const techCount = techCats.reduce((s, c) => s + (catCounts[c] || 0), 0);
  const fashionCount = fashionCats.reduce((s, c) => s + (catCounts[c] || 0), 0);
  const estateCount = estateCats.reduce((s, c) => s + (catCounts[c] || 0), 0);

  if (techCount / purchases.length > 0.4) return PERSONALITIES[3]; // techbro
  if (fashionCount / purchases.length > 0.35) return PERSONALITIES[4]; // fashionista
  if (estateCount / purchases.length > 0.3) return PERSONALITIES[5]; // tycoon
  if (uniqueCats >= 5 && topCatPct < 0.35) return PERSONALITIES[6]; // balanced
  if (purchases.length >= 10 && uniqueCats >= 4) return PERSONALITIES[1]; // collector

  // Whale if avg price is very high
  if (avgPrice > 100_000_000) return PERSONALITIES[0]; // whale

  return PERSONALITIES[6]; // balanced fallback
}

function ShoppingPersonalityInner() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const totalSpent = useCartStore(selectTotalSpent);
  const [revealed, setRevealed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const personality = useMemo(() => detectPersonality(purchases), [purchases]);

  // Stats for the detail view
  const stats = useMemo(() => {
    if (purchases.length === 0) return null;
    const catCounts: Record<string, number> = {};
    const catSpent: Record<string, number> = {};
    for (const p of purchases) {
      const cls = p.product.assetClass || "other";
      catCounts[cls] = (catCounts[cls] || 0) + 1;
      catSpent[cls] = (catSpent[cls] || 0) + p.product.price;
    }
    const sorted = Object.entries(catSpent).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return {
      avgPrice: totalSpent / purchases.length,
      topCategories: sorted.map(([cat, spent]) => ({
        cat,
        spent,
        count: catCounts[cat] || 0,
        pct: totalSpent > 0 ? spent / totalSpent : 0,
      })),
    };
  }, [purchases, totalSpent]);

  if (!selectedBillionaire || purchases.length < 5) return null;

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">🧬</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-stone/75 font-medium">
            {locale === "zh" ? "购物人格" : "Shopping Personality"}
          </span>
        </div>
        {!revealed && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setRevealed(true)}
            className="px-3 py-1.5 rounded-lg text-[10px] font-medium text-stone bg-stone/[0.08] border border-stone/20 hover:bg-stone/[0.12] transition-all"
          >
            {locale === "zh" ? "✨ 揭晓" : "✨ Reveal"}
          </motion.button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!revealed ? (
          <motion.div
            key="teaser"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center py-6"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="text-4xl mb-3"
            >
              🎭
            </motion.div>
            <p className="text-xs text-ash/60">
              {locale === "zh"
                ? `已分析 ${purchases.length} 笔消费，你的购物人格已就绪`
                : `${purchases.length} purchases analyzed. Your personality is ready.`}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            {/* Personality card */}
            <div className={`relative rounded-xl p-5 bg-gradient-to-br ${personality.gradient} border border-line/20 overflow-hidden`}>
              {/* Decorative corner badge */}
              <div className="absolute top-3 right-3 text-2xl opacity-20">
                {personality.badge}
              </div>

              <div className="flex items-start gap-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.3, 1] }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-4xl shrink-0"
                >
                  {personality.emoji}
                </motion.div>
                <div className="min-w-0">
                  <motion.h3
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-lg font-serif text-sand"
                  >
                    {locale === "zh" ? personality.titleZh : personality.titleEn}
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-[11px] text-ash/70 mt-1 leading-relaxed"
                  >
                    {locale === "zh" ? personality.descZh : personality.descEn}
                  </motion.p>
                </div>
              </div>

              {/* Quick stats */}
              {stats && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-4 grid grid-cols-3 gap-2"
                >
                  <div className="bg-black/[0.06] rounded-lg p-2 text-center">
                    <div className="text-[9px] text-ash/50 uppercase tracking-wider">
                      {locale === "zh" ? "购买数" : "Items"}
                    </div>
                    <div className="text-sm font-serif text-sand tabular-nums mt-0.5">
                      {purchases.length}
                    </div>
                  </div>
                  <div className="bg-black/[0.06] rounded-lg p-2 text-center">
                    <div className="text-[9px] text-ash/50 uppercase tracking-wider">
                      {locale === "zh" ? "均价" : "Avg"}
                    </div>
                    <div className="text-[10px] font-serif text-sand tabular-nums mt-0.5">
                      {formatCurrency(stats.avgPrice, true)}
                    </div>
                  </div>
                  <div className="bg-black/[0.06] rounded-lg p-2 text-center">
                    <div className="text-[9px] text-ash/50 uppercase tracking-wider">
                      {locale === "zh" ? "类别" : "Types"}
                    </div>
                    <div className="text-sm font-serif text-sand tabular-nums mt-0.5">
                      {stats.topCategories.length}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Expand to see category breakdown */}
            {stats && stats.topCategories.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => setShowDetails((p) => !p)}
                  className="w-full text-[10px] text-ash/50 hover:text-ash/70 transition-colors flex items-center justify-center gap-1 py-1"
                >
                  <span>{locale === "zh" ? "消费明细" : "Category Breakdown"}</span>
                  <motion.span
                    animate={{ rotate: showDetails ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    ▾
                  </motion.span>
                </button>
                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 pt-2">
                        {stats.topCategories.map(({ cat, spent, count, pct }) => (
                          <div key={cat} className="flex items-center gap-2">
                            <div className="w-16 text-[10px] text-ash/60 truncate shrink-0">
                              {assetLabel(cat, locale)}
                            </div>
                            <div className="flex-1 h-3 rounded-full bg-surface-dim/60 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct * 100}%` }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="h-full rounded-full bg-stone/40"
                              />
                            </div>
                            <div className="text-[9px] text-ash/50 font-mono tabular-nums w-10 text-right shrink-0">
                              {(pct * 100).toFixed(0)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export const ShoppingPersonality = memo(ShoppingPersonalityInner);
