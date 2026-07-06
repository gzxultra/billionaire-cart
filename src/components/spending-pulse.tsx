"use client";

import { memo, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";

/**
 * SpendingPulse — a visual heartbeat that reflects spending intensity.
 * Calm pulse when idle, rapid flicker during a spending spree.
 * Shows BPM-style number next to the pulse visualization.
 */

function getIntensity(bpm: number): { label: string; labelZh: string; color: string; bgColor: string } {
  if (bpm === 0) return { label: "Resting", labelZh: "静止", color: "text-ash/50", bgColor: "bg-ash/10" };
  if (bpm < 20) return { label: "Calm", labelZh: "平静", color: "text-sage", bgColor: "bg-sage/10" };
  if (bpm < 60) return { label: "Warming Up", labelZh: "升温中", color: "text-champagne", bgColor: "bg-champagne/10" };
  if (bpm < 120) return { label: "Heated", labelZh: "狂热", color: "text-stone", bgColor: "bg-stone/15" };
  return { label: "FRENZY", labelZh: "失控", color: "text-[#e05555]", bgColor: "bg-[#e05555]/10" };
}

function SpendingPulseInner() {
  const locale = useLocale((s) => s.locale);
  const zh = locale === "zh";
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const [bpm, setBpm] = useState(0);
  const [pulseKey, setPulseKey] = useState(0);

  // Calculate BPM based on recent purchases (purchases per minute, scaled)
  useEffect(() => {
    const now = Date.now();
    const windowMs = 60_000; // 1 minute window
    const recentCount = purchases.filter(p => now - p.timestamp < windowMs).length;
    // Scale: each purchase = ~15 BPM
    const newBpm = Math.min(200, recentCount * 15);
    setBpm(newBpm);
    setPulseKey(k => k + 1);
  }, [purchases]);

  // Decay BPM over time
  useEffect(() => {
    if (bpm === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const windowMs = 60_000;
      const recentCount = purchases.filter(p => now - p.timestamp < windowMs).length;
      const newBpm = Math.min(200, recentCount * 15);
      setBpm(newBpm);
    }, 5000);
    return () => clearInterval(interval);
  }, [bpm, purchases]);

  if (!selectedBillionaire || purchases.length === 0) return null;

  const intensity = getIntensity(bpm);
  const pulseDuration = bpm > 0 ? Math.max(0.3, 60 / Math.max(bpm, 1)) : 2;

  // Generate ECG-like path points
  const ecgPath = bpm > 0
    ? "M0,20 L8,20 L10,20 L12,5 L14,35 L16,15 L18,25 L20,20 L28,20 L30,20 L32,5 L34,35 L36,15 L38,25 L40,20 L48,20 L50,20 L52,5 L54,35 L56,15 L58,25 L60,20 L68,20"
    : "M0,20 L68,20";

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-dim/60 border border-line/30">
      {/* Pulse dot */}
      <motion.div
        animate={{
          scale: bpm > 0 ? [1, 1.4, 1] : 1,
          opacity: bpm > 0 ? [0.6, 1, 0.6] : 0.4,
        }}
        transition={{
          duration: pulseDuration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
          bpm > 100 ? "bg-[#e05555]" : bpm > 40 ? "bg-champagne" : bpm > 0 ? "bg-sage" : "bg-ash/30"
        }`}
      />

      {/* Mini ECG line */}
      <svg
        viewBox="0 0 68 40"
        className="w-16 h-6 shrink-0"
        preserveAspectRatio="none"
      >
        <motion.path
          d={ecgPath}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={intensity.color}
          initial={{ pathLength: 0, opacity: 0.5 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: pulseDuration, repeat: Infinity, ease: "linear" }}
        />
      </svg>

      {/* BPM display */}
      <div className="flex items-baseline gap-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.span
            key={bpm}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className={`text-sm font-mono font-semibold tabular-nums ${intensity.color}`}
          >
            {bpm}
          </motion.span>
        </AnimatePresence>
        <span className="text-[8px] text-ash/45 font-mono uppercase">
          {zh ? "次/分" : "BPM"}
        </span>
      </div>

      {/* Intensity label */}
      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${intensity.bgColor} ${intensity.color} shrink-0`}>
        {zh ? intensity.labelZh : intensity.label}
      </span>
    </div>
  );
}

export const SpendingPulse = memo(SpendingPulseInner);
