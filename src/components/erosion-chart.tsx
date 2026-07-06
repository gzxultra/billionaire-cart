"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useCartStore, selectTotalSpent } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

/**
 * ErosionChart — SVG line chart showing net worth dropping with each purchase.
 * Like watching a stock chart crash in real time. Shows the "damage" visually.
 */

const CHART_W = 400;
const CHART_H = 120;
const PAD_X = 8;
const PAD_Y = 8;

export function ErosionChart() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const totalSpent = useCartStore(selectTotalSpent);

  const chartData = useMemo(() => {
    if (!selectedBillionaire || purchases.length === 0) return null;

    const nw = selectedBillionaire.netWorthB * 1e9;
    // Build points: start at full net worth, subtract each purchase
    const points: { x: number; y: number; label: string; amount: number }[] = [
      { x: 0, y: nw, label: "Start", amount: 0 },
    ];

    let running = nw;
    for (let i = 0; i < purchases.length; i++) {
      running -= purchases[i].product.price;
      points.push({
        x: i + 1,
        y: Math.max(running, 0),
        label: purchases[i].product.title,
        amount: purchases[i].product.price,
      });
    }

    // Scale to chart coordinates
    const maxX = points.length - 1;
    const minY = Math.max(Math.min(...points.map((p) => p.y)), 0);
    const maxY = nw;
    const rangeY = maxY - minY || 1;

    const scaled = points.map((p) => ({
      ...p,
      cx: PAD_X + (maxX > 0 ? (p.x / maxX) * (CHART_W - PAD_X * 2) : 0),
      cy: PAD_Y + (1 - (p.y - minY) / rangeY) * (CHART_H - PAD_Y * 2),
    }));

    // Build SVG path
    let path = `M ${scaled[0].cx} ${scaled[0].cy}`;
    for (let i = 1; i < scaled.length; i++) {
      path += ` L ${scaled[i].cx} ${scaled[i].cy}`;
    }

    // Area fill path
    const areaPath = path +
      ` L ${scaled[scaled.length - 1].cx} ${CHART_H - PAD_Y}` +
      ` L ${scaled[0].cx} ${CHART_H - PAD_Y} Z`;

    const pctSpent = (totalSpent / nw) * 100;

    return { points: scaled, path, areaPath, pctSpent, remaining: running, nw };
  }, [selectedBillionaire, purchases, totalSpent]);

  if (!chartData || purchases.length < 2) return null;

  const last = chartData.points[chartData.points.length - 1];
  const crashColor = chartData.pctSpent > 50
    ? "#9B6B6B"
    : chartData.pctSpent > 20
    ? "#C5A572"
    : "#7D9B8A";

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">📉</span>
          <h2 className="section-label">
            {locale === "zh" ? "财富侵蚀图" : "Fortune Erosion"}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: crashColor }} />
          <span className="text-[10px] font-mono tabular-nums" style={{ color: crashColor }}>
            -{chartData.pctSpent.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full h-auto" preserveAspectRatio="none">
          <defs>
            <linearGradient id="erosion-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={crashColor} stopOpacity={0.15} />
              <stop offset="100%" stopColor={crashColor} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="erosion-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7D9B8A" />
              <stop offset="50%" stopColor="#C5A572" />
              <stop offset="100%" stopColor={crashColor} />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((pct) => (
            <line
              key={pct}
              x1={PAD_X}
              y1={PAD_Y + pct * (CHART_H - PAD_Y * 2)}
              x2={CHART_W - PAD_X}
              y2={PAD_Y + pct * (CHART_H - PAD_Y * 2)}
              stroke="rgba(140,122,101,0.08)"
              strokeWidth={0.5}
            />
          ))}

          {/* Area fill */}
          <motion.path
            d={chartData.areaPath}
            fill="url(#erosion-fill)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />

          {/* Line */}
          <motion.path
            d={chartData.path}
            fill="none"
            stroke="url(#erosion-line)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />

          {/* Start dot */}
          <circle
            cx={chartData.points[0].cx}
            cy={chartData.points[0].cy}
            r={3}
            fill="#7D9B8A"
          />

          {/* End dot (pulsing) */}
          <motion.circle
            cx={last.cx}
            cy={last.cy}
            r={4}
            fill={crashColor}
            animate={{ r: [4, 6, 4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />

          {/* Big purchase markers (top 3 drops) */}
          {chartData.points
            .filter((p) => p.amount > 0)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 3)
            .map((p, i) => (
              <circle
                key={i}
                cx={p.cx}
                cy={p.cy}
                r={2.5}
                fill="none"
                stroke={crashColor}
                strokeWidth={1}
                opacity={0.6}
              />
            ))}
        </svg>
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between mt-3">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-ash/50">
            {locale === "zh" ? "起始" : "Started"}
          </div>
          <div className="text-xs font-serif text-sage tabular-nums">
            {formatCurrency(chartData.nw, true)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[9px] uppercase tracking-wider text-ash/50">
            {locale === "zh" ? "已花费" : "Spent"}
          </div>
          <div className="text-xs font-serif tabular-nums" style={{ color: crashColor }}>
            {formatCurrency(totalSpent, true)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-wider text-ash/50">
            {locale === "zh" ? "剩余" : "Remaining"}
          </div>
          <div className="text-xs font-serif text-stone tabular-nums">
            {formatCurrency(Math.max(chartData.remaining, 0), true)}
          </div>
        </div>
      </div>

      {/* Dramatic message based on erosion level */}
      {chartData.pctSpent >= 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-center"
        >
          <span className="text-[10px] italic" style={{ color: crashColor, opacity: 0.7 }}>
            {chartData.pctSpent >= 80
              ? (locale === "zh" ? "💀 帝国即将崩塌..." : "💀 The empire is crumbling...")
              : chartData.pctSpent >= 50
              ? (locale === "zh" ? "🔥 半壁江山已去！" : "🔥 Half the fortune gone!")
              : chartData.pctSpent >= 20
              ? (locale === "zh" ? "📉 亿万富翁开始紧张了" : "📉 The billionaire is getting nervous")
              : chartData.pctSpent >= 5
              ? (locale === "zh" ? "😰 钱包在出血..." : "😰 The wallet is bleeding...")
              : (locale === "zh" ? "💸 开始了..." : "💸 It begins...")}
          </span>
        </motion.div>
      )}
    </section>
  );
}
