"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

/**
 * SpendingGauge — animated SVG arc speedometer showing real-time spending velocity.
 * Zones: Idle → Browsing → Shopping → Splurging → Whale Mode → Light Speed
 */

interface Zone {
  label: string;
  labelZh: string;
  emoji: string;
  minRate: number;
  color: string;
}

const ZONES: Zone[] = [
  { label: "Idle", labelZh: "待机", emoji: "😴", minRate: 0, color: "#6b7280" },
  { label: "Browsing", labelZh: "闲逛", emoji: "👀", minRate: 100, color: "#7D9B8A" },
  { label: "Shopping", labelZh: "购物中", emoji: "🛍️", minRate: 10_000, color: "#A68530" },
  { label: "Splurging", labelZh: "挥金如土", emoji: "💸", minRate: 1_000_000, color: "#C5A572" },
  { label: "Whale Mode", labelZh: "巨鲸模式", emoji: "🐋", minRate: 100_000_000, color: "#8C7A65" },
  { label: "Light Speed", labelZh: "光速消费", emoji: "⚡", minRate: 1_000_000_000, color: "#D4AF37" },
];

function getZone(rate: number): Zone {
  let best = ZONES[0];
  for (const z of ZONES) {
    if (rate >= z.minRate) best = z;
  }
  return best;
}

// Map rate to angle (0 = left, 180 = right on the arc)
function rateToAngle(rate: number): number {
  if (rate <= 0) return 0;
  // Log scale: $1/s = ~5°, $1B/s = ~175°
  const log = Math.log10(Math.max(rate, 1));
  const maxLog = 12; // $1 trillion/s
  return Math.min((log / maxLog) * 175, 175);
}

const ARC_RADIUS = 80;
const CENTER_X = 100;
const CENTER_Y = 95;
const STROKE_WIDTH = 10;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 180) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(startAngle: number, endAngle: number): string {
  const start = polarToCartesian(CENTER_X, CENTER_Y, ARC_RADIUS, endAngle);
  const end = polarToCartesian(CENTER_X, CENTER_Y, ARC_RADIUS, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${ARC_RADIUS} ${ARC_RADIUS} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function SpendingGauge() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const totalSpent = useCartStore(selectTotalSpent);
  const [rate, setRate] = useState(0);
  const [peakRate, setPeakRate] = useState(0);
  const timestampsRef = useRef<{ time: number; amount: number }[]>([]);
  const prevCountRef = useRef(0);

  // Track purchases
  useEffect(() => {
    if (purchases.length > prevCountRef.current && purchases.length > 0) {
      const last = purchases[purchases.length - 1];
      timestampsRef.current.push({ time: last.timestamp, amount: last.product.price });
      // Keep only last 30 seconds of data
      const cutoff = Date.now() - 30_000;
      timestampsRef.current = timestampsRef.current.filter((t) => t.time > cutoff);
    }
    prevCountRef.current = purchases.length;
  }, [purchases]);

  // Update rate every 200ms
  useEffect(() => {
    if (!selectedBillionaire) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const window10s = timestampsRef.current.filter((t) => t.time > now - 10_000);
      const sum = window10s.reduce((s, t) => s + t.amount, 0);
      const elapsed = Math.min((now - (window10s[0]?.time || now)) / 1000, 10);
      const currentRate = elapsed > 0.1 ? sum / elapsed : 0;
      setRate(currentRate);
      setPeakRate((prev) => Math.max(prev, currentRate));
    }, 200);
    return () => clearInterval(interval);
  }, [selectedBillionaire]);

  // Reset on billionaire change
  useEffect(() => {
    setRate(0);
    setPeakRate(0);
    timestampsRef.current = [];
    prevCountRef.current = 0;
  }, [selectedBillionaire?.id]);

  if (!selectedBillionaire || purchases.length === 0) return null;

  const angle = rateToAngle(rate);
  const peakAngle = rateToAngle(peakRate);
  const zone = getZone(rate);

  // Needle endpoint
  const needleEnd = polarToCartesian(CENTER_X, CENTER_Y, ARC_RADIUS - 20, angle);
  const peakEnd = polarToCartesian(CENTER_X, CENTER_Y, ARC_RADIUS + 6, peakAngle);

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">🏎️</span>
        <h2 className="section-label">
          {locale === "zh" ? "消费速度仪表盘" : "Spending Velocity"}
        </h2>
      </div>

      <div className="flex flex-col items-center">
        <svg viewBox="0 0 200 120" className="w-full max-w-[280px]" aria-hidden="true">
          {/* Background arc */}
          <path
            d={describeArc(0, 180)}
            fill="none"
            stroke="rgba(140,122,101,0.1)"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
          />

          {/* Zone color segments */}
          {ZONES.map((z, i) => {
            const startDeg = rateToAngle(z.minRate);
            const endDeg = i < ZONES.length - 1 ? rateToAngle(ZONES[i + 1].minRate) : 180;
            if (endDeg <= startDeg) return null;
            return (
              <path
                key={z.label}
                d={describeArc(startDeg, endDeg)}
                fill="none"
                stroke={z.color}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="butt"
                opacity={0.25}
              />
            );
          })}

          {/* Active fill arc */}
          {angle > 0 && (
            <motion.path
              d={describeArc(0, angle)}
              fill="none"
              stroke={zone.color}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          )}

          {/* Peak marker */}
          {peakRate > 0 && (
            <line
              x1={peakEnd.x}
              y1={peakEnd.y}
              x2={polarToCartesian(CENTER_X, CENTER_Y, ARC_RADIUS - 6, peakAngle).x}
              y2={polarToCartesian(CENTER_X, CENTER_Y, ARC_RADIUS - 6, peakAngle).y}
              stroke="#D4AF37"
              strokeWidth={2}
              opacity={0.5}
            />
          )}

          {/* Needle */}
          <motion.line
            x1={CENTER_X}
            y1={CENTER_Y}
            animate={{ x2: needleEnd.x, y2: needleEnd.y }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            stroke={zone.color}
            strokeWidth={2.5}
            strokeLinecap="round"
          />

          {/* Center dot */}
          <circle cx={CENTER_X} cy={CENTER_Y} r={4} fill={zone.color} />
          <circle cx={CENTER_X} cy={CENTER_Y} r={2} fill="#F8F5F0" />

          {/* Tick marks */}
          {[0, 30, 60, 90, 120, 150, 180].map((deg) => {
            const outer = polarToCartesian(CENTER_X, CENTER_Y, ARC_RADIUS + 8, deg);
            const inner = polarToCartesian(CENTER_X, CENTER_Y, ARC_RADIUS + 3, deg);
            return (
              <line
                key={deg}
                x1={outer.x}
                y1={outer.y}
                x2={inner.x}
                y2={inner.y}
                stroke="rgba(140,122,101,0.3)"
                strokeWidth={1}
              />
            );
          })}
        </svg>

        {/* Rate display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={zone.label}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-center -mt-4"
          >
            <div className="text-2xl mb-1">{zone.emoji}</div>
            <div className="text-lg font-serif tabular-nums" style={{ color: zone.color }}>
              {rate < 1 ? "$0" : formatCurrency(rate, rate >= 1_000_000)}/s
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] mt-1" style={{ color: zone.color, opacity: 0.8 }}>
              {locale === "zh" ? zone.labelZh : zone.label}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Stats row */}
        <div className="flex items-center gap-6 mt-4 text-center">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-ash/50 mb-0.5">
              {locale === "zh" ? "峰值速度" : "Peak Rate"}
            </div>
            <div className="text-xs font-serif text-champagne tabular-nums">
              {peakRate < 1 ? "—" : `${formatCurrency(peakRate, peakRate >= 1_000_000)}/s`}
            </div>
          </div>
          <div className="w-px h-6 bg-line/30" />
          <div>
            <div className="text-[9px] uppercase tracking-wider text-ash/50 mb-0.5">
              {locale === "zh" ? "总消费" : "Total Spent"}
            </div>
            <div className="text-xs font-serif text-stone tabular-nums">
              {formatCurrency(totalSpent, totalSpent >= 1_000_000)}
            </div>
          </div>
          <div className="w-px h-6 bg-line/30" />
          <div>
            <div className="text-[9px] uppercase tracking-wider text-ash/50 mb-0.5">
              {locale === "zh" ? "购买次数" : "Purchases"}
            </div>
            <div className="text-xs font-serif text-stone tabular-nums">
              {purchases.length}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
