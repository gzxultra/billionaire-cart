"use client";

import { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

/**
 * SpendingConfessions — auto-generated humorous "confession" cards
 * based on spending patterns. Shareable + viral.
 */

interface Confession {
  emoji: string;
  textEn: string;
  textZh: string;
  category: "absurd" | "guilt" | "flex" | "perspective";
}

function generateConfessions(
  totalSpent: number,
  purchaseCount: number,
  topPurchase: string | null,
  topPrice: number,
  netWorthB: number,
  earningsPerSec: number,
  billionaireName: string,
): Confession[] {
  const confessions: Confession[] = [];
  const netWorth = netWorthB * 1_000_000_000;
  const pct = netWorth > 0 ? (totalSpent / netWorth) * 100 : 0;

  // Scale-based confessions
  if (totalSpent > 0) {
    const bigMacs = Math.floor(totalSpent / 5.69);
    if (bigMacs > 100) {
      confessions.push({
        emoji: "🍔",
        textEn: `I could've bought ${bigMacs.toLocaleString()} Big Macs. I regret nothing.`,
        textZh: `我本可以买 ${bigMacs.toLocaleString()} 个巨无霸。但我不后悔。`,
        category: "absurd",
      });
    }

    const coffees = Math.floor(totalSpent / 6.5);
    if (coffees > 1000) {
      const yearsOfCoffee = (coffees / 365).toFixed(0);
      confessions.push({
        emoji: "☕",
        textEn: `My spending equals ${yearsOfCoffee} years of daily Starbucks. Every. Single. Day.`,
        textZh: `我花的钱等于 ${yearsOfCoffee} 年的每日星巴克。每！一！天！`,
        category: "perspective",
      });
    }
  }

  if (topPrice > 1_000_000 && topPurchase) {
    confessions.push({
      emoji: "🤫",
      textEn: `My most expensive impulse buy was "${topPurchase}" at ${formatCurrency(topPrice, true)}. On someone else's money.`,
      textZh: `我最贵的冲动消费："${topPurchase}" ${formatCurrency(topPrice, true)}。还是花别人的钱。`,
      category: "guilt",
    });
  }

  if (pct > 0.001 && pct < 1) {
    confessions.push({
      emoji: "💅",
      textEn: `I spent ${pct.toFixed(3)}% of ${billionaireName}'s fortune and honestly? It felt too easy.`,
      textZh: `我花了${billionaireName} ${pct.toFixed(3)}% 的财富，说实话？太轻松了。`,
      category: "flex",
    });
  }

  if (pct >= 1 && pct < 50) {
    confessions.push({
      emoji: "😈",
      textEn: `I've burned through ${pct.toFixed(1)}% of a billionaire's fortune. I might have a problem.`,
      textZh: `我已经烧掉了一个亿万富翁 ${pct.toFixed(1)}% 的钱。我可能有问题。`,
      category: "guilt",
    });
  }

  if (pct >= 50) {
    confessions.push({
      emoji: "💸",
      textEn: `Over HALF the fortune is gone. ${billionaireName} would need therapy if they saw this.`,
      textZh: `超过一半的钱没了。${billionaireName} 看到这个需要心理治疗。`,
      category: "absurd",
    });
  }

  if (purchaseCount >= 10) {
    confessions.push({
      emoji: "🛒",
      textEn: `${purchaseCount} items and counting. My cart has more diversity than most ETFs.`,
      textZh: `${purchaseCount} 件商品了。我的购物车比大多数ETF还多样化。`,
      category: "flex",
    });
  }

  if (earningsPerSec > 0 && totalSpent > 0) {
    const secondsToEarnBack = totalSpent / earningsPerSec;
    if (secondsToEarnBack < 60) {
      confessions.push({
        emoji: "⏱",
        textEn: `Everything I bought? ${billionaireName} earns it back in ${Math.ceil(secondsToEarnBack)} seconds. I feel irrelevant.`,
        textZh: `我买的所有东西？${billionaireName} ${Math.ceil(secondsToEarnBack)} 秒就赚回来了。我觉得自己好渺小。`,
        category: "perspective",
      });
    } else if (secondsToEarnBack < 3600) {
      confessions.push({
        emoji: "⏳",
        textEn: `My entire shopping spree gets earned back in ${Math.ceil(secondsToEarnBack / 60)} minutes. Money is a simulation.`,
        textZh: `我所有的消费 ${Math.ceil(secondsToEarnBack / 60)} 分钟就赚回来了。钱只是数字游戏。`,
        category: "perspective",
      });
    }
  }

  if (totalSpent > 75_000) {
    const salaries = (totalSpent / 75_000).toFixed(0);
    confessions.push({
      emoji: "👔",
      textEn: `I just spent ${salaries} average American annual salaries. In one sitting.`,
      textZh: `我刚花了 ${salaries} 个美国人的年薪。在一次购物中。`,
      category: "guilt",
    });
  }

  if (totalSpent > 10_000_000_000) {
    confessions.push({
      emoji: "🌍",
      textEn: `My spending exceeds the GDP of multiple small nations. I'm basically an economy.`,
      textZh: `我的消费超过了好几个小国的GDP。我就是一个经济体。`,
      category: "absurd",
    });
  }

  return confessions;
}

export function SpendingConfessions() {
  const locale = useLocale((s) => s.locale);
  const purchases = useCartStore((s) => s.purchases);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);
  const billionaire = useCartStore((s) => s.selectedBillionaire);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const confessions = useMemo(() => {
    if (!billionaire || purchases.length === 0) return [];
    const sorted = [...purchases].sort((a, b) => b.product.price - a.product.price);
    const topPurchase = sorted[0]?.product.title ?? null;
    const topPrice = sorted[0]?.product.price ?? 0;
    return generateConfessions(
      totalSpent,
      purchases.length,
      topPurchase,
      topPrice,
      billionaire.netWorthB,
      billionaire.earningsPerSecond,
      billionaire.name,
    );
  }, [totalSpent, purchases, billionaire]);

  const copyConfession = useCallback(async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(`${text}\n\n— billionaire-cart.pages.dev`);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // clipboard not available
    }
  }, []);

  if (!billionaire || confessions.length === 0) return null;

  const CATEGORY_LABELS: Record<string, { en: string; zh: string }> = {
    absurd: { en: "ABSURD", zh: "荒诞" },
    guilt: { en: "GUILTY", zh: "罪恶感" },
    flex: { en: "FLEX", zh: "炫耀" },
    perspective: { en: "PERSPECTIVE", zh: "人间真实" },
  };

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section">
      <div className="section-label flex items-center gap-2">
        <span>🤫</span>
        <span>{locale === "zh" ? "消费忏悔录" : "Spending Confessions"}</span>
      </div>
      <p className="text-[10px] text-ash/50 mt-1 mb-4">
        {locale === "zh"
          ? "你的钱包有话要说..."
          : "Your wallet has something to confess..."}
      </p>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {confessions.slice(0, 4).map((c, i) => {
            const text = locale === "zh" ? c.textZh : c.textEn;
            const catLabel = CATEGORY_LABELS[c.category]?.[locale] ?? c.category;
            return (
              <motion.div
                key={`${c.category}-${i}`}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.08 }}
                className="relative group rounded-xl bg-surface-bright/60 border border-line/30 p-3.5 hover:border-stone/25 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5 shrink-0">{c.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`
                        text-[8px] px-1.5 py-0.5 rounded-full border font-medium uppercase tracking-wider
                        ${c.category === "absurd" ? "bg-[#EF4444]/8 text-[#EF4444]/70 border-[#EF4444]/15" :
                          c.category === "guilt" ? "bg-[#8B5CF6]/8 text-[#8B5CF6]/70 border-[#8B5CF6]/15" :
                          c.category === "flex" ? "bg-champagne/10 text-champagne border-champagne/20" :
                          "bg-sage/8 text-sage/70 border-sage/15"}
                      `}>
                        {catLabel}
                      </span>
                    </div>
                    <p className="text-xs text-stone/90 leading-relaxed italic">
                      &ldquo;{text}&rdquo;
                    </p>
                  </div>
                  {/* Copy/share button */}
                  <button
                    onClick={() => copyConfession(text, i)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-ash/50 hover:text-stone/60 mt-0.5"
                    title={locale === "zh" ? "复制" : "Copy"}
                  >
                    {copiedIdx === i ? "✓" : "📋"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}
