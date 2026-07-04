"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { playComboTick } from "@/lib/sounds";

const COMBO_WINDOW_MS = 3000; // 3 seconds between purchases to keep combo

const COMBO_TIERS = [
  { min: 2, label: "x2", color: "text-sage", bg: "bg-sage/10", border: "border-sage/20" },
  { min: 5, label: "x5", color: "text-champagne", bg: "bg-champagne/10", border: "border-champagne/40" },
  { min: 10, label: "x10", color: "text-stone-light", bg: "bg-stone/20", border: "border-stone/35" },
  { min: 25, label: "x25", color: "text-champagne-light", bg: "bg-champagne/15", border: "border-champagne/40" },
  { min: 50, label: "x50", color: "text-stone", bg: "bg-stone/20", border: "border-stone/30" },
  { min: 100, label: "x100", color: "text-champagne", bg: "bg-champagne/20", border: "border-champagne/35" },
];

function getComboTier(combo: number) {
  let best = COMBO_TIERS[0];
  for (const tier of COMBO_TIERS) {
    if (combo >= tier.min) best = tier;
  }
  return best;
}

const COMBO_MESSAGES = [
  "NICE! 🔥",
  "UNSTOPPABLE! 💥",
  "SPENDING SPREE! 💸",
  "MONEY MACHINE! 🤑",
  "ABSOLUTE UNIT! 🏆",
  "WHALE MODE! 🐋",
  "LEGENDARY! ⚡",
  "GOD MODE! 👑",
];

export function ComboStreak() {
  const purchases = useCartStore((s) => s.purchases);
  const soundEnabled = useCartStore((s) => s.soundEnabled);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);

  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [comboMessage, setComboMessage] = useState("");
  const [timerWidth, setTimerWidth] = useState(0);

  const lastPurchaseTimeRef = useRef<number>(0);
  const comboRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const decayStartRef = useRef<number>(0);
  const prevPurchaseCountRef = useRef(0);

  // Track purchases and build combo
  useEffect(() => {
    if (!selectedBillionaire) return;
    if (purchases.length <= prevPurchaseCountRef.current) {
      prevPurchaseCountRef.current = purchases.length;
      return;
    }

    const now = Date.now();
    const timeSinceLast = now - lastPurchaseTimeRef.current;

    if (lastPurchaseTimeRef.current > 0 && timeSinceLast <= COMBO_WINDOW_MS) {
      comboRef.current += 1;
    } else {
      comboRef.current = 1;
    }

    lastPurchaseTimeRef.current = now;
    decayStartRef.current = now;
    prevPurchaseCountRef.current = purchases.length;

    const currentCombo = comboRef.current;
    setCombo(currentCombo);
    setMaxCombo((prev) => Math.max(prev, currentCombo));

    if (currentCombo >= 2) {
      setShowCombo(true);

      // Pick a message based on combo level
      const msgIdx = Math.min(
        Math.floor((currentCombo - 2) / 3),
        COMBO_MESSAGES.length - 1
      );
      setComboMessage(COMBO_MESSAGES[msgIdx]);

      // Play combo sound
      if (soundEnabled) {
        playComboTick(currentCombo);
      }
    }

    // Reset timer bar
    setTimerWidth(100);
  }, [purchases, selectedBillionaire, soundEnabled]);

  // Decay timer — animates the timer bar down.
  // Uses comboRef (not combo state) inside the interval to avoid a dep-cycle
  // where setCombo(0) would re-trigger this effect.
  useEffect(() => {
    if (comboRef.current < 2) return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - decayStartRef.current;
      const remaining = 1 - elapsed / COMBO_WINDOW_MS;

      if (remaining <= 0) {
        setTimerWidth(0);
        setShowCombo(false);
        comboRef.current = 0;
        setCombo(0);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setTimerWidth(remaining * 100);
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combo]);

  // Reset on billionaire change
  useEffect(() => {
    comboRef.current = 0;
    setCombo(0);
    setMaxCombo(0);
    setShowCombo(false);
    lastPurchaseTimeRef.current = 0;
    prevPurchaseCountRef.current = 0;
  }, [selectedBillionaire?.id]);

  if (!selectedBillionaire) return null;

  const tier = combo >= 2 ? getComboTier(combo) : null;

  return (
    <>
      {/* Floating combo indicator */}
      <AnimatePresence>
        {showCombo && combo >= 2 && tier && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.3, y: -30 }}
            className="fixed top-20 right-4 z-50 pointer-events-none"
          >
            <div
              className={`relative px-4 py-3 rounded-2xl backdrop-blur-xl border ${tier.bg} ${tier.border}`}
            >
              {/* Combo number */}
              <motion.div
                key={combo}
                initial={{ scale: 1.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                className={`text-3xl font-serif font-bold tabular-nums text-center ${tier.color}`}
              >
                {combo}x
              </motion.div>

              {/* Message */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={comboMessage}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className={`text-[10px] font-bold tracking-wider text-center mt-0.5 ${tier.color}`}
                >
                  {comboMessage}
                </motion.div>
              </AnimatePresence>

              {/* Timer bar */}
              <div className="w-full h-1 bg-sand/5 rounded-full mt-2 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    width: `${timerWidth}%`,
                    backgroundColor:
                      timerWidth > 60
                        ? "rgba(125, 155, 138, 0.6)"
                        : timerWidth > 30
                        ? "rgba(251, 191, 36, 0.6)"
                        : "rgba(239, 68, 68, 0.7)",
                  }}
                  transition={{ duration: 0.05 }}
                />
              </div>

              {/* Pulse ring */}
              {combo >= 10 && (
                <motion.div
                  className={`absolute -inset-1 rounded-2xl border ${tier.border}`}
                  animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.2, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session stats — inline in page, shows max combo */}
      {maxCombo >= 2 && (
        <div className="w-full">
          <h2 className="section-label mb-3">
            Combo Stats
          </h2>
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-ash/70 mb-0.5">
                Best Combo
              </div>
              <div className="text-xl font-serif text-stone tabular-nums">
                {maxCombo}x
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-ash/70 mb-0.5">
                Current
              </div>
              <div
                className={`text-xl font-serif tabular-nums ${
                  combo >= 2 ? tier?.color || "text-stone" : "text-ash/65"
                }`}
              >
                {combo >= 2 ? `${combo}x` : "—"}
              </div>
            </div>
            {maxCombo >= 5 && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-ash/70 mb-0.5">
                  Rank
                </div>
                <div className="text-sm text-ash/80">
                  {maxCombo >= 100
                    ? "👑 GOD"
                    : maxCombo >= 50
                    ? "⚡ LEGEND"
                    : maxCombo >= 25
                    ? "🔥 INSANE"
                    : maxCombo >= 10
                    ? "💥 BEAST"
                    : "💫 NICE"}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
