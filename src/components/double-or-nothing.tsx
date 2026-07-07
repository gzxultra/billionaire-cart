"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectRemaining } from "@/lib/store";
import { formatCurrency, generateId } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { toast } from "@/lib/use-toast";

/**
 * DoubleOrNothing — after every 3rd purchase, offer a gamble:
 * Flip a coin. Win → get a free duplicate of your last purchase.
 * Lose → your last purchase is removed (refunded).
 * Creates tension and replayability.
 */

const TRIGGER_EVERY = 3; // Offer every N purchases

type Phase = "idle" | "offer" | "flipping" | "result";

export function DoubleOrNothing() {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const addPurchase = useCartStore((s) => s.addPurchase);
  const removePurchase = useCartStore((s) => s.removePurchase);
  const remaining = useCartStore(selectRemaining);
  const locale = useLocale((s) => s.locale);

  const [phase, setPhase] = useState<Phase>("idle");
  const [won, setWon] = useState(false);
  const prevCountRef = useRef(purchases.length);
  const dismissedRef = useRef(new Set<number>());
  const lastOfferCountRef = useRef(0);

  // Detect new purchase and trigger offer
  useEffect(() => {
    const prev = prevCountRef.current;
    const curr = purchases.length;
    prevCountRef.current = curr;

    if (curr <= prev || phase !== "idle") return;
    if (curr < TRIGGER_EVERY) return;
    if (curr % TRIGGER_EVERY !== 0) return;
    if (dismissedRef.current.has(curr)) return;
    if (lastOfferCountRef.current === curr) return;

    lastOfferCountRef.current = curr;
    // Small delay for the purchase to settle
    setTimeout(() => setPhase("offer"), 1200);
  }, [purchases.length, phase]);

  const lastPurchase = purchases[purchases.length - 1] ?? null;

  const handleGamble = useCallback(() => {
    setPhase("flipping");
    const result = Math.random() > 0.5;
    setWon(result);

    // Show coin flip for 1.5s
    setTimeout(() => {
      setPhase("result");

      if (result && lastPurchase && selectedBillionaire) {
        // Win — add a free duplicate
        addPurchase({
          id: generateId(),
          product: { ...lastPurchase.product, price: 0 },
          billionaireId: selectedBillionaire.id,
          timestamp: Date.now(),
        });
      } else if (!result && lastPurchase) {
        // Lose — remove last purchase (refund)
        removePurchase(lastPurchase.id);
      }

      // Auto-dismiss after 2.5s
      setTimeout(() => {
        setPhase("idle");
        dismissedRef.current.add(purchases.length);
      }, 2500);
    }, 1500);
  }, [lastPurchase, selectedBillionaire, addPurchase, removePurchase, purchases.length]);

  const handleDecline = useCallback(() => {
    setPhase("idle");
    dismissedRef.current.add(purchases.length);
  }, [purchases.length]);

  if (!selectedBillionaire || phase === "idle") return null;

  return (
    <AnimatePresence>
      <motion.div
        key="double-or-nothing-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && phase === "offer") handleDecline();
          }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 30 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="bg-[#1C1A17] border border-line/30 rounded-2xl p-6 sm:p-8 max-w-sm mx-4 text-center relative overflow-hidden"
          >
            {/* Decorative background */}
            <div className="absolute inset-0 bg-gradient-to-br from-champagne/[0.04] via-transparent to-stone/[0.03] pointer-events-none" />

            <div className="relative z-10">
              {phase === "offer" && lastPurchase && (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.1 }}
                    className="text-4xl mb-4"
                  >
                    🎲
                  </motion.div>
                  <h3 className="text-lg font-serif text-sand mb-2">
                    {locale === "zh" ? "双倍或归零" : "Double or Nothing"}
                  </h3>
                  <p className="text-xs text-ash/70 mb-4 leading-relaxed">
                    {locale === "zh"
                      ? `赌一把！赢了免费再送一个「${lastPurchase.product.title}」，输了退掉这次购买。`
                      : `Feeling lucky? Win and get a free "${lastPurchase.product.title}". Lose and your last purchase is refunded.`}
                  </p>
                  <div className="text-sm font-serif text-champagne mb-6 tabular-nums">
                    {formatCurrency(lastPurchase.product.price)}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDecline}
                      className="flex-1 py-2.5 rounded-xl text-xs font-medium text-ash/60 bg-surface-bright/10 hover:bg-surface-bright/20 border border-line/20 transition-colors"
                    >
                      {locale === "zh" ? "算了" : "No Thanks"}
                    </button>
                    <motion.button
                      onClick={handleGamble}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-[#1C1A17] bg-gradient-to-r from-champagne to-stone-light hover:brightness-110 transition-all"
                    >
                      {locale === "zh" ? "🎲 赌一把！" : "🎲 Let's Go!"}
                    </motion.button>
                  </div>
                </>
              )}

              {phase === "flipping" && (
                <div className="py-8">
                  <motion.div
                    animate={{
                      rotateY: [0, 180, 360, 540, 720, 900, 1080],
                      scale: [1, 1.3, 1, 1.3, 1, 1.2, 1],
                    }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    className="text-5xl inline-block"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    🪙
                  </motion.div>
                  <div className="text-xs text-ash/50 mt-4 font-mono uppercase tracking-wider">
                    {locale === "zh" ? "命运转动中..." : "Flipping..."}
                  </div>
                </div>
              )}

              {phase === "result" && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="py-6"
                >
                  <div className="text-5xl mb-3">{won ? "🎉" : "💀"}</div>
                  <h3
                    className={`text-xl font-serif mb-2 ${
                      won ? "text-sage" : "text-[#9B6B6B]"
                    }`}
                  >
                    {won
                      ? locale === "zh" ? "赢了！" : "You Won!"
                      : locale === "zh" ? "输了！" : "You Lost!"}
                  </h3>
                  <p className="text-xs text-ash/60 leading-relaxed">
                    {won
                      ? locale === "zh"
                        ? "恭喜！免费获得一个副本！"
                        : "Congrats! You got a free duplicate!"
                      : locale === "zh"
                        ? "购买已退回，钱回来了。"
                        : "Your last purchase was refunded."}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
    </AnimatePresence>
  );
}
