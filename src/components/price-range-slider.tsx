"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

/**
 * PriceRangeSlider — dual-thumb range slider for filtering catalog by price.
 * Uses a logarithmic scale since catalog prices span $2.90 → $220B.
 */

interface PriceRangeSliderProps {
  min: number;
  max: number;
  onRangeChange: (low: number, high: number) => void;
  /** Currently active range */
  low: number;
  high: number;
}

function toLog(val: number, min: number, max: number): number {
  const minLog = Math.log10(Math.max(min, 0.01));
  const maxLog = Math.log10(Math.max(max, 0.01));
  const valLog = Math.log10(Math.max(val, 0.01));
  return (valLog - minLog) / (maxLog - minLog);
}

function fromLog(pct: number, min: number, max: number): number {
  const minLog = Math.log10(Math.max(min, 0.01));
  const maxLog = Math.log10(Math.max(max, 0.01));
  const valLog = minLog + pct * (maxLog - minLog);
  return Math.pow(10, valLog);
}

function formatShort(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(0)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function PriceRangeSlider({ min, max, low, high, onRangeChange }: PriceRangeSliderProps) {
  const locale = useLocale((s) => s.locale);
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"low" | "high" | null>(null);

  const lowPct = toLog(low, min, max) * 100;
  const highPct = toLog(high, min, max) * 100;
  const isFiltered = low > min || high < max;

  const handlePointerDown = useCallback((thumb: "low" | "high") => {
    setDragging(thumb);
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const val = fromLog(pct, min, max);

    if (dragging === "low") {
      const clamped = Math.min(val, high * 0.95);
      onRangeChange(Math.max(min, clamped), high);
    } else {
      const clamped = Math.max(val, low * 1.05);
      onRangeChange(low, Math.min(max, clamped));
    }
  }, [dragging, min, max, low, high, onRangeChange]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };
    }
  }, [dragging, handlePointerMove, handlePointerUp]);

  const handleReset = useCallback(() => {
    onRangeChange(min, max);
  }, [min, max, onRangeChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.15em] text-ash/55 font-mono">
            {locale === "zh" ? "价格区间" : "Price Range"}
          </span>
          {isFiltered && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-champagne/15 text-champagne border border-champagne/20 font-mono">
              {locale === "zh" ? "筛选中" : "filtered"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-ash/60 tabular-nums">
            {formatShort(low)} — {formatShort(high)}
          </span>
          {isFiltered && (
            <button
              onClick={handleReset}
              className="text-[9px] text-ash/50 hover:text-ash/70 transition-colors underline"
            >
              {locale === "zh" ? "重置" : "reset"}
            </button>
          )}
        </div>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-6 flex items-center cursor-pointer select-none touch-none"
      >
        {/* Background track */}
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-surface-bright/80 border border-line/30" />

        {/* Active range fill */}
        <div
          className="absolute h-1.5 rounded-full bg-stone/35"
          style={{ left: `${lowPct}%`, right: `${100 - highPct}%` }}
        />

        {/* Log-scale tick marks */}
        {[100, 1000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000, 1_000_000_000].map(v => {
          if (v < min || v > max) return null;
          const pct = toLog(v, min, max) * 100;
          return (
            <div
              key={v}
              className="absolute w-px h-2.5 bg-ash/20 top-1/2 -translate-y-1/2"
              style={{ left: `${pct}%` }}
            />
          );
        })}

        {/* Low thumb */}
        <motion.div
          className={`absolute w-4 h-4 rounded-full border-2 cursor-grab active:cursor-grabbing z-10 -translate-x-1/2 ${
            dragging === "low"
              ? "bg-stone border-stone/80 scale-125 shadow-lg"
              : "bg-surface border-stone/50 shadow-sm hover:border-stone/70"
          }`}
          style={{ left: `${lowPct}%` }}
          onPointerDown={(e) => {
            e.preventDefault();
            handlePointerDown("low");
          }}
          whileHover={{ scale: 1.15 }}
        />

        {/* High thumb */}
        <motion.div
          className={`absolute w-4 h-4 rounded-full border-2 cursor-grab active:cursor-grabbing z-10 -translate-x-1/2 ${
            dragging === "high"
              ? "bg-stone border-stone/80 scale-125 shadow-lg"
              : "bg-surface border-stone/50 shadow-sm hover:border-stone/70"
          }`}
          style={{ left: `${highPct}%` }}
          onPointerDown={(e) => {
            e.preventDefault();
            handlePointerDown("high");
          }}
          whileHover={{ scale: 1.15 }}
        />
      </div>
    </div>
  );
}
