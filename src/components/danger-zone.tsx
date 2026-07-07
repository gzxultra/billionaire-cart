"use client";

import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";

/**
 * DangerZone — visual escalation overlay when spending exceeds wealth thresholds.
 * 50% = warning amber pulse, 75% = danger red glow, 90% = critical flashing.
 * Pure visual effect — no interaction, no blocking.
 */

interface DangerLevel {
  threshold: number;
  labelEn: string;
  labelZh: string;
  emoji: string;
  glowColor: string;
  borderColor: string;
  pulseSpeed: number;
}

const DANGER_LEVELS: DangerLevel[] = [
  {
    threshold: 0.90,
    labelEn: "CRITICAL",
    labelZh: "濒临破产",
    emoji: "💀",
    glowColor: "rgba(220, 38, 38, 0.25)",
    borderColor: "rgba(220, 38, 38, 0.5)",
    pulseSpeed: 0.6,
  },
  {
    threshold: 0.75,
    labelEn: "DANGER",
    labelZh: "危险区域",
    emoji: "🚨",
    glowColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.3)",
    pulseSpeed: 1.2,
  },
  {
    threshold: 0.50,
    labelEn: "WARNING",
    labelZh: "过半消耗",
    emoji: "⚠️",
    glowColor: "rgba(245, 158, 11, 0.1)",
    borderColor: "rgba(245, 158, 11, 0.2)",
    pulseSpeed: 2,
  },
];

function DangerZoneInner() {
  const locale = useLocale((s) => s.locale);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);

  const spentPct = useMemo(() => {
    if (netWorth <= 0) return 0;
    return totalSpent / netWorth;
  }, [totalSpent, netWorth]);

  const activeLevel = useMemo(() => {
    for (const level of DANGER_LEVELS) {
      if (spentPct >= level.threshold) return level;
    }
    return null;
  }, [spentPct]);

  if (!selectedBillionaire || !activeLevel) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={activeLevel.threshold}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-30 pointer-events-none"
      >
        {/* Pulsing vignette glow */}
        <motion.div
          className="absolute inset-0"
          animate={{
            boxShadow: [
              `inset 0 0 60px 20px ${activeLevel.glowColor}`,
              `inset 0 0 100px 40px ${activeLevel.glowColor}`,
              `inset 0 0 60px 20px ${activeLevel.glowColor}`,
            ],
          }}
          transition={{
            duration: activeLevel.pulseSpeed,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Corner warning badges */}
        {spentPct >= 0.75 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute bottom-24 left-4"
          >
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{
                duration: activeLevel.pulseSpeed,
                repeat: Infinity,
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border text-[10px] font-mono uppercase tracking-wider"
              style={{
                backgroundColor: `${activeLevel.glowColor}`,
                borderColor: activeLevel.borderColor,
                color:
                  spentPct >= 0.9
                    ? "rgba(252, 165, 165, 0.9)"
                    : spentPct >= 0.75
                    ? "rgba(252, 165, 165, 0.7)"
                    : "rgba(251, 191, 36, 0.8)",
              }}
            >
              <span>{activeLevel.emoji}</span>
              <span>
                {locale === "zh" ? activeLevel.labelZh : activeLevel.labelEn}
              </span>
              <span className="tabular-nums">
                {(spentPct * 100).toFixed(1)}%
              </span>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export const DangerZone = memo(DangerZoneInner);
