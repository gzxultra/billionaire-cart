"use client";

import { memo, useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency, assetLabel } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

interface GradeInfo {
  grade: string;
  color: string;
  titleEn: string;
  titleZh: string;
}

function getGrade(pct: number, elapsedMinutes: number): GradeInfo {
  if (pct > 90 && elapsedMinutes < 5)
    return { grade: "S+", color: "rgba(180,60,60,0.9)", titleEn: "The Fortune Annihilator", titleZh: "财富毁灭者" };
  if (pct > 75)
    return { grade: "S", color: "rgba(166,133,48,0.9)", titleEn: "Legendary Spender", titleZh: "传奇败家子" };
  if (pct > 50)
    return { grade: "A", color: "rgba(140,122,101,0.85)", titleEn: "Elite Shopper", titleZh: "精英购物狂" };
  if (pct > 25)
    return { grade: "B", color: "rgba(90,138,104,0.8)", titleEn: "Serious Buyer", titleZh: "认真剁手族" };
  if (pct > 10)
    return { grade: "C", color: "rgba(120,120,120,0.7)", titleEn: "Window Shopper", titleZh: "橱窗购物者" };
  return { grade: "D", color: "rgba(160,160,160,0.6)", titleEn: "The Cautious One", titleZh: "谨慎选手" };
}

function formatElapsed(seconds: number, locale: string): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return locale === "zh" ? `${h}时${m}分${s}秒` : `${h}h ${m}m ${s}s`;
  }
  if (m > 0) {
    return locale === "zh" ? `${m}分${s}秒` : `${m}m ${s}s`;
  }
  return locale === "zh" ? `${s}秒` : `${s}s`;
}

function SessionReportInner() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);

  const [elapsed, setElapsed] = useState(0);

  // Session timer
  const firstPurchaseTime = purchases.length > 0 ? purchases[0].timestamp : 0;
  useEffect(() => {
    if (firstPurchaseTime === 0) return;
    const update = () => setElapsed(Math.floor((Date.now() - firstPurchaseTime) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [firstPurchaseTime]);

  const stats = useMemo(() => {
    if (purchases.length === 0) return null;

    // Biggest single purchase
    let biggest = purchases[0];
    for (const p of purchases) {
      if (p.product.price > biggest.product.price) biggest = p;
    }

    // Most-bought category
    const catCounts: Record<string, number> = {};
    for (const p of purchases) {
      const cls = p.product.assetClass || "other";
      catCounts[cls] = (catCounts[cls] || 0) + 1;
    }
    let topCat = "other";
    let topCount = 0;
    for (const [k, v] of Object.entries(catCounts)) {
      if (v > topCount) { topCat = k; topCount = v; }
    }

    // Average purchase price
    const avgPrice = totalSpent / purchases.length;

    // Fortune % depleted
    const depletedPct = netWorth > 0 ? (totalSpent / netWorth) * 100 : 0;

    return {
      totalItems: purchases.length,
      biggest,
      topCategory: topCat,
      topCategoryCount: topCount,
      avgPrice,
      depletedPct,
    };
  }, [purchases, totalSpent, netWorth]);

  if (!selectedBillionaire || !stats) return null;

  const elapsedMinutes = elapsed / 60;
  const gradeInfo = getGrade(stats.depletedPct, elapsedMinutes);

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm">📋</span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-stone/75 font-medium">
          {t("session.title", locale)}
        </span>
      </div>

      {/* Grade hero */}
      <div className="flex items-center gap-4 mb-5">
        <motion.div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white"
          style={{ backgroundColor: gradeInfo.color }}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          {gradeInfo.grade}
        </motion.div>
        <div>
          <div className="text-sm font-serif text-sand">
            {locale === "zh" ? gradeInfo.titleZh : gradeInfo.titleEn}
          </div>
          <div className="text-[10px] text-ash/50 font-mono mt-0.5">
            ⏱ {formatElapsed(elapsed, locale)}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-surface-bright/60 rounded-lg p-3 border border-line/20">
          <div className="text-[9px] uppercase tracking-wider text-ash/50 mb-1">
            {t("session.totalItems", locale)}
          </div>
          <div className="text-lg font-serif text-sand tabular-nums">{stats.totalItems}</div>
        </div>

        <div className="bg-surface-bright/60 rounded-lg p-3 border border-line/20">
          <div className="text-[9px] uppercase tracking-wider text-ash/50 mb-1">
            {t("session.avgPrice", locale)}
          </div>
          <div className="text-xs font-serif text-sand tabular-nums">{formatCurrency(stats.avgPrice, true)}</div>
        </div>

        <div className="bg-surface-bright/60 rounded-lg p-3 border border-line/20">
          <div className="text-[9px] uppercase tracking-wider text-ash/50 mb-1">
            {t("session.depleted", locale)}
          </div>
          <div className="text-lg font-serif tabular-nums" style={{ color: gradeInfo.color }}>
            {stats.depletedPct.toFixed(1)}%
          </div>
        </div>

        <div className="bg-surface-bright/60 rounded-lg p-3 border border-line/20 col-span-2 sm:col-span-1">
          <div className="text-[9px] uppercase tracking-wider text-ash/50 mb-1">
            {t("session.biggest", locale)}
          </div>
          <div className="text-[11px] text-sand truncate">{stats.biggest.product.title}</div>
          <div className="text-[10px] text-champagne font-mono">{formatCurrency(stats.biggest.product.price, true)}</div>
        </div>

        <div className="bg-surface-bright/60 rounded-lg p-3 border border-line/20 col-span-2">
          <div className="text-[9px] uppercase tracking-wider text-ash/50 mb-1">
            {t("session.topCategory", locale)}
          </div>
          <div className="text-[11px] text-sand">
            {assetLabel(stats.topCategory, locale)} × {stats.topCategoryCount}
          </div>
        </div>
      </div>
    </section>
  );
}

export const SessionReport = memo(SessionReportInner);
