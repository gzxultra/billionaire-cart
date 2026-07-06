"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useCartStore, selectTotalSpent } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

/**
 * PhilanthropicImpact — Shows what charitable impact the spending could have had.
 * "Your spending could fund X meals / Y vaccines / Z clean water wells."
 * Adds a fun guilt-trip / perspective element.
 */

interface CharityMetric {
  emoji: string;
  labelEn: string;
  labelZh: string;
  unitEn: string;
  unitZh: string;
  costPer: number; // USD per unit
  source: string;
}

const CHARITY_METRICS: CharityMetric[] = [
  {
    emoji: "🍚",
    labelEn: "School meals",
    labelZh: "学校午餐",
    unitEn: "meals",
    unitZh: "份",
    costPer: 0.25,
    source: "WFP",
  },
  {
    emoji: "💉",
    labelEn: "Vaccine doses",
    labelZh: "疫苗剂次",
    unitEn: "doses",
    unitZh: "剂",
    costPer: 3,
    source: "UNICEF",
  },
  {
    emoji: "🚰",
    labelEn: "Clean water access",
    labelZh: "清洁水源供给",
    unitEn: "people (1 year)",
    unitZh: "人（一年）",
    costPer: 50,
    source: "charity: water",
  },
  {
    emoji: "📚",
    labelEn: "Books for kids",
    labelZh: "儿童图书",
    unitEn: "books",
    unitZh: "本",
    costPer: 2,
    source: "Room to Read",
  },
  {
    emoji: "🏥",
    labelEn: "Malaria bed nets",
    labelZh: "防疟蚊帐",
    unitEn: "nets",
    unitZh: "顶",
    costPer: 2.5,
    source: "AMF",
  },
  {
    emoji: "🌳",
    labelEn: "Trees planted",
    labelZh: "种植树木",
    unitEn: "trees",
    unitZh: "棵",
    costPer: 0.10,
    source: "One Tree Planted",
  },
  {
    emoji: "🏠",
    labelEn: "Homes built",
    labelZh: "建造住房",
    unitEn: "homes",
    unitZh: "栋",
    costPer: 10_000,
    source: "Habitat for Humanity",
  },
  {
    emoji: "🎓",
    labelEn: "Student scholarships",
    labelZh: "学生奖学金",
    unitEn: "scholarships (4yr)",
    unitZh: "个（四年）",
    costPer: 100_000,
    source: "avg. US university",
  },
];

function formatBigNumber(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}

export function PhilanthropicImpact() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const totalSpent = useCartStore(selectTotalSpent);

  const impacts = useMemo(() => {
    if (totalSpent <= 0) return [];
    return CHARITY_METRICS
      .map((m) => ({
        ...m,
        count: Math.floor(totalSpent / m.costPer),
      }))
      .filter((m) => m.count >= 1)
      .sort((a, b) => b.count - a.count);
  }, [totalSpent]);

  if (!selectedBillionaire || totalSpent < 10 || impacts.length === 0) return null;

  // Pick top 4 most impressive
  const topImpacts = impacts.slice(0, 4);

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">🌍</span>
        <h2 className="section-label">
          {locale === "zh" ? "如果你把钱捐了..." : "If You'd Donated Instead..."}
        </h2>
      </div>
      <p className="text-[10px] text-ash/50 mb-4">
        {locale === "zh"
          ? `你花的 ${formatCurrency(totalSpent, totalSpent >= 1_000_000)} 本可以...`
          : `Your ${formatCurrency(totalSpent, totalSpent >= 1_000_000)} spending could have funded...`}
      </p>

      <div className="grid grid-cols-2 gap-3">
        {topImpacts.map((impact, i) => (
          <motion.div
            key={impact.labelEn}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-surface-dim/60 rounded-xl p-4 border border-line/30 text-center"
          >
            <div className="text-2xl mb-2">{impact.emoji}</div>
            <div className="text-lg font-serif text-champagne tabular-nums font-medium">
              {formatBigNumber(impact.count)}
            </div>
            <div className="text-[11px] text-sand/80 mt-1">
              {locale === "zh" ? impact.labelZh : impact.labelEn}
            </div>
            <div className="text-[9px] text-ash/40 mt-1 font-mono">
              {locale === "zh"
                ? `@ $${impact.costPer}/${impact.unitZh}`
                : `@ $${impact.costPer}/${impact.unitEn.split(" ")[0]}`}
            </div>
            <div className="text-[8px] text-ash/30 mt-0.5 italic">
              {impact.source}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Emotional nudge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-4 text-center"
      >
        <p className="text-[10px] text-ash/45 italic">
          {totalSpent >= 1e9
            ? (locale === "zh" ? "💭 一个人的购物车，足以改变整个国家" : "💭 One cart, enough to transform a nation")
            : totalSpent >= 1e6
            ? (locale === "zh" ? "💭 这些钱能让一个社区焕然一新" : "💭 Enough to transform an entire community")
            : (locale === "zh" ? "💭 但购物也快乐，对吧？" : "💭 But shopping is fun too, right?")}
        </p>
      </motion.div>
    </section>
  );
}
