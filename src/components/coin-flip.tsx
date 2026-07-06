"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectRemaining } from "@/lib/store";
import { generateId, formatCurrency } from "@/lib/format";
import { playSparkle, playGambleLose, playGambleWin } from "@/lib/sounds";
import { toast } from "@/lib/use-toast";
import { useLocale } from "@/lib/use-locale";

/**
 * CoinFlip — After a catalog purchase, offer a double-or-nothing gamble.
 * Win (50/50) → get a free duplicate item added to purchases.
 * Lose → lose the same amount again from balance (no item).
 * Animated 3D coin flip with suspense.
 */

interface CoinFlipProps {
  /** The item name that was just purchased */
  itemName: string;
  /** The price of the item */
  price: number;
  /** Asset class for the purchase record */
  assetClass: string;
  /** Billionaire ID */
  billionaireId: string;
  /** Called when the gamble resolves (win or lose) */
  onComplete: () => void;
  /** Trigger ID — changes trigger a new offer */
  triggerId: number;
}

type Phase = "offer" | "flipping" | "result";

export function CoinFlip({
  itemName,
  price,
  assetClass,
  billionaireId,
  onComplete,
  triggerId,
}: CoinFlipProps) {
  const locale = useLocale((s) => s.locale);
  const addPurchase = useCartStore((s) => s.addPurchase);
  const remaining = useCartStore(selectRemaining);
  const soundEnabled = useCartStore((s) => s.soundEnabled);

  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>("offer");
  const [won, setWon] = useState(false);
  const [flipRotation, setFlipRotation] = useState(0);
  const prevTriggerId = useRef(0);
  const dismissTimer = useRef<NodeJS.Timeout | null>(null);

  // Show offer when triggerId changes and price > 0
  useEffect(() => {
    if (triggerId > prevTriggerId.current && price > 0) {
      setVisible(true);
      setPhase("offer");
      setWon(false);
      setFlipRotation(0);
    }
    prevTriggerId.current = triggerId;
  }, [triggerId, price]);

  const handleDecline = useCallback(() => {
    setVisible(false);
    onComplete();
  }, [onComplete]);

  const handleGamble = useCallback(() => {
    if (phase !== "offer") return;

    // Can't gamble if you can't afford to lose
    if (remaining < price) {
      toast(locale === "zh" ? "余额不够赌！" : "Not enough balance to gamble!");
      return;
    }

    setPhase("flipping");

    // Determine outcome (50/50)
    const isWin = Math.random() < 0.5;
    setWon(isWin);

    // Animate coin: 1440° (4 full rotations) + extra 180° if tails (lose)
    const totalRotation = 1440 + (isWin ? 0 : 180);
    setFlipRotation(totalRotation);

    // Resolve after animation
    setTimeout(() => {
      setPhase("result");

      if (isWin) {
        // Add free duplicate purchase
        addPurchase({
          id: generateId(),
          product: {
            title: `🎰 ${itemName} (Gamble Win!)`,
            price: 0, // Free duplicate
            imageUrl: null,
            description: locale === "zh" ? "双倍快乐！赌赢的免费商品" : "Double or nothing WIN — free duplicate!",
            sourceUrl: `gamble://win/${Date.now()}`,
            assetClass: assetClass as import("@/lib/types").AssetClass,
            monthlyOverhead: 0,
          },
          billionaireId,
          timestamp: Date.now(),
        });
        if (soundEnabled) playGambleWin();
        toast(locale === "zh" ? `🎰 赢了！免费获得 ${itemName}！` : `🎰 WIN! Free ${itemName}!`);
      } else {
        // Lose: add a "loss" purchase that costs the same amount
        addPurchase({
          id: generateId(),
          product: {
            title: locale === "zh" ? `🎰 赌输了 — ${itemName}` : `🎰 Gamble Loss — ${itemName}`,
            price: price,
            imageUrl: null,
            description: locale === "zh" ? "双倍痛苦…赌输了" : "Double or nothing LOSS — money gone!",
            sourceUrl: `gamble://loss/${Date.now()}`,
            assetClass: "other",
            monthlyOverhead: 0,
          },
          billionaireId,
          timestamp: Date.now(),
        });
        if (soundEnabled) playGambleLose();
        toast(locale === "zh" ? `🎰 输了！白白损失 ${formatCurrency(price)}` : `🎰 LOSS! Lost ${formatCurrency(price)} for nothing!`);
      }

      // Auto-dismiss after 3s
      dismissTimer.current = setTimeout(() => {
        setVisible(false);
        onComplete();
      }, 3000);
    }, 2000);
  }, [phase, remaining, price, itemName, assetClass, billionaireId, addPurchase, soundEnabled, locale, onComplete]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  if (!visible || price <= 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={phase === "offer" ? handleDecline : undefined}
      >
        <motion.div
          initial={{ scale: 0.8, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 30 }}
          className="bg-surface rounded-2xl p-6 sm:p-8 max-w-sm mx-4 border border-line/50 shadow-2xl text-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Coin */}
          <div className="relative w-24 h-24 mx-auto mb-4" style={{ perspective: 800 }}>
            <motion.div
              animate={{ rotateX: flipRotation }}
              transition={
                phase === "flipping"
                  ? { duration: 2, ease: [0.22, 1, 0.36, 1] }
                  : { duration: 0 }
              }
              className="w-full h-full relative"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Heads (win) */}
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center text-4xl border-4 border-champagne/40"
                style={{
                  backfaceVisibility: "hidden",
                  background: "linear-gradient(135deg, #C5A572 0%, #8B7A60 50%, #A89279 100%)",
                  boxShadow: "0 4px 20px rgba(166,133,48,0.3)",
                }}
              >
                💰
              </div>
              {/* Tails (lose) */}
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center text-4xl border-4 border-[#9B6B6B]/40"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateX(180deg)",
                  background: "linear-gradient(135deg, #6B4B4B 0%, #4A3535 50%, #5A4040 100%)",
                  boxShadow: "0 4px 20px rgba(155,107,107,0.3)",
                }}
              >
                💀
              </div>
            </motion.div>
          </div>

          {/* Phase-dependent content */}
          {phase === "offer" && (
            <>
              <h3 className="text-sm font-serif text-sand mb-1">
                {locale === "zh" ? "🎰 双倍或清零？" : "🎰 Double or Nothing?"}
              </h3>
              <p className="text-[11px] text-ash/65 mb-4">
                {locale === "zh"
                  ? `赢了免费再得一个 ${itemName}，输了白亏 ${formatCurrency(price)}`
                  : `Win: free ${itemName}. Lose: forfeit ${formatCurrency(price)}`}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDecline}
                  className="flex-1 py-2.5 rounded-xl text-xs font-medium text-ash/70 bg-surface-bright/80 border border-line/40 hover:border-stone/30 transition-all"
                >
                  {locale === "zh" ? "算了" : "No thanks"}
                </button>
                <button
                  onClick={handleGamble}
                  className="flex-1 py-2.5 rounded-xl text-xs font-medium text-sand bg-stone-gradient shadow-stone-sm hover:shadow-stone transition-all"
                >
                  {locale === "zh" ? "赌一把！" : "Flip it!"}
                </button>
              </div>
            </>
          )}

          {phase === "flipping" && (
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-sm text-champagne font-serif"
            >
              {locale === "zh" ? "命运的硬币在旋转..." : "Flipping the coin of fate..."}
            </motion.p>
          )}

          {phase === "result" && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              {won ? (
                <>
                  <h3 className="text-lg font-serif text-sage mb-1">
                    {locale === "zh" ? "🎉 赢了！" : "🎉 YOU WIN!"}
                  </h3>
                  <p className="text-[11px] text-ash/65">
                    {locale === "zh"
                      ? `免费获得 ${itemName}！`
                      : `Free ${itemName} added to your cart!`}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-serif text-[#9B6B6B] mb-1">
                    {locale === "zh" ? "💀 输了..." : "💀 YOU LOSE!"}
                  </h3>
                  <p className="text-[11px] text-ash/65">
                    {locale === "zh"
                      ? `白白损失 ${formatCurrency(price)}...`
                      : `Lost ${formatCurrency(price)} for nothing...`}
                  </p>
                </>
              )}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
