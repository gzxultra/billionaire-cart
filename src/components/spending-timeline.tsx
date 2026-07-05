"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

interface TimePoint {
  index: number;
  timestamp: number;
  cumulative: number;
  price: number;
  title: string;
}

/**
 * SpendingTimeline — SVG sparkline chart showing cumulative spending over time.
 * Each purchase is a data point; the area fills under the line.
 * Hover/touch reveals per-purchase details.
 */
export function SpendingTimeline() {
  const purchases = useCartStore((s) => s.purchases);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);
  const locale = useLocale((s) => s.locale);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const points: TimePoint[] = useMemo(() => {
    if (purchases.length === 0) return [];
    let cumulative = 0;
    return purchases.map((p, i) => {
      cumulative += p.product.price;
      return {
        index: i,
        timestamp: p.timestamp,
        cumulative,
        price: p.product.price,
        title: p.product.title,
      };
    });
  }, [purchases]);

  // Chart dimensions
  const W = 280;
  const H = 100;
  const PAD_X = 4;
  const PAD_TOP = 8;
  const PAD_BOTTOM = 4;

  // Scale helpers
  const maxY = useMemo(() => {
    if (points.length === 0) return 1;
    // Use either total spent or 10% of net worth as max, whichever is larger (for visual context)
    return Math.max(points[points.length - 1].cumulative, netWorth * 0.02);
  }, [points, netWorth]);

  const toX = useCallback(
    (i: number) => PAD_X + (i / Math.max(points.length - 1, 1)) * (W - PAD_X * 2),
    [points.length]
  );
  const toY = useCallback(
    (val: number) => PAD_TOP + (1 - val / maxY) * (H - PAD_TOP - PAD_BOTTOM),
    [maxY]
  );

  // Build SVG path
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: "", areaPath: "" };

    // Start from 0
    const pts: string[] = [];
    const areaStart = `M ${PAD_X},${toY(0)}`;

    // Build line + area from point 0
    points.forEach((p, i) => {
      const x = toX(i);
      const y = toY(p.cumulative);
      if (i === 0) {
        pts.push(`M ${x},${y}`);
      } else {
        // Smooth curve
        const prevX = toX(i - 1);
        const prevY = toY(points[i - 1].cumulative);
        const cpx = (prevX + x) / 2;
        pts.push(`C ${cpx},${prevY} ${cpx},${y} ${x},${y}`);
      }
    });

    const line = pts.join(" ");
    const lastX = toX(points.length - 1);
    const area = `${areaStart} L ${PAD_X},${toY(0)} ${line.replace("M", "L")} L ${lastX},${toY(0)} Z`;

    return { linePath: line, areaPath: area };
  }, [points, toX, toY]);

  // Handle SVG mouse/touch interaction
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (points.length < 2 || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / rect.width) * W;
      // Find nearest point
      let nearest = 0;
      let minDist = Infinity;
      for (let i = 0; i < points.length; i++) {
        const px = toX(i);
        const dist = Math.abs(px - relX);
        if (dist < minDist) {
          minDist = dist;
          nearest = i;
        }
      }
      setHoverIdx(nearest);
    },
    [points, toX]
  );

  const handlePointerLeave = useCallback(() => setHoverIdx(null), []);

  // Find largest single purchase
  const largestPurchase = useMemo(() => {
    if (points.length === 0) return null;
    return points.reduce((max, p) => (p.price > max.price ? p : max), points[0]);
  }, [points]);

  if (purchases.length < 3) return null;

  const hoverPoint = hoverIdx !== null ? points[hoverIdx] : null;
  const spentPercent = netWorth > 0 ? (totalSpent / netWorth) * 100 : 0;

  return (
    <div className="w-full space-y-3">
      <h2 className="section-label flex items-center gap-2">
        <span className="text-base">📈</span>
        {t("timeline.title", locale)}
      </h2>

      {/* SVG chart */}
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto touch-none"
          preserveAspectRatio="none"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          role="img"
          aria-label={locale === "zh" ? "消费时间线" : "Spending timeline"}
        >
          <defs>
            <linearGradient id="timeline-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A68530" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#A68530" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="timeline-line-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8C7A65" />
              <stop offset="100%" stopColor="#A68530" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          {areaPath && (
            <motion.path
              d={areaPath}
              fill="url(#timeline-gradient)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            />
          )}

          {/* Line */}
          {linePath && (
            <motion.path
              d={linePath}
              fill="none"
              stroke="url(#timeline-line-grad)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          )}

          {/* Purchase dots */}
          {points.map((p, i) => {
            const isHovered = hoverIdx === i;
            const isLargest = largestPurchase && p.index === largestPurchase.index;
            return (
              <circle
                key={i}
                cx={toX(i)}
                cy={toY(p.cumulative)}
                r={isHovered ? 4 : isLargest ? 2.5 : 1.5}
                fill={isHovered ? "#A68530" : isLargest ? "#8C7A65" : "#8C7A6580"}
                className="transition-all duration-150"
                style={{
                  filter: isHovered ? "drop-shadow(0 0 4px rgba(166,133,48,0.4))" : undefined,
                }}
              />
            );
          })}

          {/* Hover vertical line */}
          {hoverPoint && (
            <line
              x1={toX(hoverPoint.index)}
              y1={PAD_TOP}
              x2={toX(hoverPoint.index)}
              y2={H - PAD_BOTTOM}
              stroke="#8C7A6540"
              strokeWidth="0.5"
              strokeDasharray="2 2"
            />
          )}
        </svg>

        {/* Hover tooltip */}
        <AnimatePresence>
          {hoverPoint && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.12 }}
              className="absolute top-0 pointer-events-none bg-surface/95 backdrop-blur-sm border border-line/50 rounded-lg px-2.5 py-1.5 shadow-card"
              style={{
                left: `${(toX(hoverPoint.index) / W) * 100}%`,
                transform: `translateX(${hoverPoint.index > points.length * 0.7 ? "-100%" : "0"})`,
              }}
            >
              <div className="text-[10px] text-sand/85 font-medium truncate max-w-[140px]">
                {hoverPoint.title}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-serif text-champagne">
                  {formatCurrency(hoverPoint.price)}
                </span>
                <span className="text-[8px] text-ash/60 font-mono">
                  #{hoverPoint.index + 1}
                </span>
              </div>
              <div className="text-[9px] text-ash/60 font-mono mt-0.5">
                {locale === "zh" ? "累计" : "Cumulative"}: {formatCurrency(hoverPoint.cumulative, true)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Summary stats row */}
      <div className="flex items-center justify-between text-[10px] text-ash/65">
        <span>
          {purchases.length} {locale === "zh" ? "笔交易" : "purchases"}
        </span>
        {largestPurchase && (
          <span className="truncate max-w-[55%] text-right">
            {locale === "zh" ? "最大单笔" : "Biggest"}:{" "}
            <span className="text-champagne/75">
              {formatCurrency(largestPurchase.price, true)}
            </span>
          </span>
        )}
      </div>

      {/* Depletion progress bar */}
      <div className="space-y-1">
        <div className="w-full h-1.5 rounded-full bg-surface-dim/80 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: spentPercent > 50
                ? "linear-gradient(90deg, #8C7A65, #9B6B6B)"
                : "linear-gradient(90deg, #5A8A68, #A68530)",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(spentPercent, 100)}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-ash/55 font-mono">
          <span>{formatCurrency(totalSpent, true)} {locale === "zh" ? "已花" : "spent"}</span>
          <span>{spentPercent.toFixed(4)}%</span>
        </div>
      </div>
    </div>
  );
}
