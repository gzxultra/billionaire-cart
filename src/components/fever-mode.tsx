"use client";

import { memo, useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";

/**
 * FeverMode — visual escalation during rapid purchasing.
 * Activates when 3+ purchases happen within 30 seconds.
 * Shows glowing screen edges, a multiplier badge, and a countdown timer.
 * The fever intensifies with more rapid purchases.
 */

const FEVER_THRESHOLD = 3; // purchases within window to trigger
const FEVER_WINDOW_MS = 30_000; // 30 seconds
const FEVER_DURATION_MS = 15_000; // 15 seconds of fever
const FEVER_EXTEND_MS = 5_000; // each additional purchase extends by 5s

interface FeverState {
  active: boolean;
  level: number; // 1 = warm, 2 = hot, 3 = inferno
  expiresAt: number;
  streak: number;
}

function FeverModeInner() {
  const locale = useLocale((s) => s.locale);
  const purchases = useCartStore((s) => s.purchases);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const [fever, setFever] = useState<FeverState>({
    active: false,
    level: 0,
    expiresAt: 0,
    streak: 0,
  });
  const [timeLeft, setTimeLeft] = useState(0);
  const prevPurchaseCount = useRef(purchases.length);
  const purchaseTimestamps = useRef<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Track rapid purchases
  useEffect(() => {
    if (purchases.length <= prevPurchaseCount.current) {
      prevPurchaseCount.current = purchases.length;
      return;
    }

    const now = Date.now();
    purchaseTimestamps.current.push(now);
    // Prune old timestamps
    purchaseTimestamps.current = purchaseTimestamps.current.filter(
      (ts) => now - ts < FEVER_WINDOW_MS
    );

    const recentCount = purchaseTimestamps.current.length;
    prevPurchaseCount.current = purchases.length;

    if (recentCount >= FEVER_THRESHOLD) {
      setFever((prev) => {
        const newStreak = prev.active ? prev.streak + 1 : recentCount;
        const level = newStreak >= 10 ? 3 : newStreak >= 6 ? 2 : 1;
        const expiresAt = prev.active
          ? prev.expiresAt + FEVER_EXTEND_MS
          : now + FEVER_DURATION_MS;

        return {
          active: true,
          level,
          expiresAt,
          streak: newStreak,
        };
      });
    }
  }, [purchases.length]);

  // Countdown timer
  useEffect(() => {
    if (!fever.active) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const tick = () => {
      const remaining = fever.expiresAt - Date.now();
      if (remaining <= 0) {
        setFever({ active: false, level: 0, expiresAt: 0, streak: 0 });
        setTimeLeft(0);
        purchaseTimestamps.current = [];
      } else {
        setTimeLeft(remaining);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 100);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fever.active, fever.expiresAt]);

  if (!selectedBillionaire) return null;

  const LEVEL_LABELS = [
    "", 
    locale === "zh" ? "🔥 购物热潮" : "🔥 Shopping Fever",
    locale === "zh" ? "🔥🔥 疯狂购物" : "🔥🔥 Buying Frenzy",
    locale === "zh" ? "🔥🔥🔥 极限狂热" : "🔥🔥🔥 INFERNO MODE",
  ];

  const LEVEL_COLORS = [
    "",
    "from-orange-500/20 via-transparent to-orange-500/20",
    "from-red-500/30 via-transparent to-red-500/30",
    "from-red-600/40 via-yellow-500/10 to-red-600/40",
  ];

  const GLOW_COLORS = [
    "",
    "rgba(249,115,22,0.15)",
    "rgba(239,68,68,0.25)",
    "rgba(239,68,68,0.35)",
  ];

  return (
    <AnimatePresence>
      {fever.active && (
        <>
          {/* Screen edge glow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 pointer-events-none"
            style={{
              boxShadow: `inset 0 0 ${fever.level * 30 + 20}px ${fever.level * 10}px ${GLOW_COLORS[fever.level]}`,
            }}
          >
            {/* Top/bottom gradient bars */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${LEVEL_COLORS[fever.level]}`}
              style={{ animation: "fever-pulse 1s ease-in-out infinite" }}
            />
            <div
              className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${LEVEL_COLORS[fever.level]}`}
              style={{ animation: "fever-pulse 1s ease-in-out infinite 0.5s" }}
            />
          </motion.div>

          {/* Fever badge — top-center floating */}
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border shadow-lg"
              style={{
                background: fever.level >= 3
                  ? "rgba(153,27,27,0.85)"
                  : fever.level >= 2
                  ? "rgba(185,28,28,0.75)"
                  : "rgba(194,65,12,0.7)",
                borderColor: fever.level >= 3
                  ? "rgba(252,165,165,0.3)"
                  : "rgba(251,191,36,0.2)",
              }}
            >
              <motion.span
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="text-sm"
              >
                {fever.level >= 3 ? "🌋" : fever.level >= 2 ? "🔥" : "♨️"}
              </motion.span>
              <span className="text-[10px] font-mono text-white/90 uppercase tracking-wider font-medium">
                {LEVEL_LABELS[fever.level]}
              </span>
              <span className="text-[10px] font-mono text-white/60 tabular-nums">
                ×{fever.streak}
              </span>
              {/* Timer bar */}
              <div className="w-12 h-1.5 rounded-full bg-white/20 overflow-hidden ml-1">
                <motion.div
                  className="h-full rounded-full bg-white/70"
                  style={{
                    width: `${Math.max((timeLeft / FEVER_DURATION_MS) * 100, 0)}%`,
                  }}
                />
              </div>
            </div>
          </motion.div>

          {/* Inject keyframes */}
          <style>{`
            @keyframes fever-pulse {
              0%, 100% { opacity: 0.5; }
              50% { opacity: 1; }
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}

export const FeverMode = memo(FeverModeInner);
