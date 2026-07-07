"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

/**
 * BlindBuyReveal — dramatic price reveal overlay when buying in blind mode.
 * Listens for new purchases while blindMode is on, then shows a theatrical
 * "scratching" reveal of the true price with a reaction.
 */

interface RevealData {
  title: string;
  price: number;
  netWorth: number;
  id: string;
}

function getReaction(price: number, netWorth: number, locale: "en" | "zh"): { emoji: string; text: string } {
  const pct = netWorth > 0 ? (price / netWorth) * 100 : 0;
  if (pct > 10) {
    return locale === "zh"
      ? { emoji: "💀", text: "这价格... 你可能后悔了" }
      : { emoji: "💀", text: "Oh no... you might regret this" };
  }
  if (pct > 1) {
    return locale === "zh"
      ? { emoji: "😱", text: "这可不便宜！" }
      : { emoji: "😱", text: "That's not cheap!" };
  }
  if (price > 1_000_000_000) {
    return locale === "zh"
      ? { emoji: "🤯", text: "十亿级别的盲买！疯了！" }
      : { emoji: "🤯", text: "A blind billion-dollar buy! Insane!" };
  }
  if (price > 1_000_000) {
    return locale === "zh"
      ? { emoji: "😳", text: "百万级盲买，胆子够大" }
      : { emoji: "😳", text: "Millions spent blindly. Bold move." };
  }
  if (price > 10_000) {
    return locale === "zh"
      ? { emoji: "😅", text: "还行... 吧？" }
      : { emoji: "😅", text: "Could be worse... right?" };
  }
  if (price < 10) {
    return locale === "zh"
      ? { emoji: "😂", text: "就这？零花钱而已" }
      : { emoji: "😂", text: "That's it? Pocket change!" };
  }
  return locale === "zh"
    ? { emoji: "🎯", text: "还不错的盲选" }
    : { emoji: "🎯", text: "Not bad for a blind pick" };
}

export function BlindBuyReveal() {
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [phase, setPhase] = useState<"suspense" | "reveal" | "reaction">("suspense");
  const purchases = useCartStore((s) => s.purchases);
  const blindMode = useCartStore((s) => s.blindMode);
  const netWorth = useCartStore((s) =>
    s.selectedBillionaire ? s.selectedBillionaire.netWorthB * 1_000_000_000 : 0
  );
  const locale = useLocale((s) => s.locale);

  const lastCountRef = useCallback(() => purchases.length, [purchases.length]);

  useEffect(() => {
    if (!blindMode || purchases.length === 0) return;
    // Check for new purchase
    const last = purchases[purchases.length - 1];
    if (reveal && reveal.id === last.id) return;

    setReveal({
      title: last.product.title,
      price: last.product.price,
      netWorth,
      id: last.id,
    });
    setPhase("suspense");

    const t1 = setTimeout(() => setPhase("reveal"), 1200);
    const t2 = setTimeout(() => setPhase("reaction"), 2000);
    const t3 = setTimeout(() => setReveal(null), 4000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchases.length, blindMode]);

  if (!reveal) return null;

  const reaction = getReaction(reveal.price, reveal.netWorth, locale);

  return (
    <AnimatePresence>
      <motion.div
        key={reveal.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="text-center space-y-4 px-6"
        >
          {/* Item name */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs uppercase tracking-[0.3em] text-white/50 font-mono"
          >
            {locale === "zh" ? "🙈 盲买揭晓" : "🙈 Blind Buy Reveal"}
          </motion.div>

          <motion.div className="text-sm text-white/80 font-medium max-w-xs truncate mx-auto">
            {reveal.title}
          </motion.div>

          {/* Price reveal */}
          <div className="relative h-16 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {phase === "suspense" && (
                <motion.div
                  key="suspense"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  exit={{ opacity: 0, scale: 1.5 }}
                  transition={{ opacity: { duration: 0.8, repeat: Infinity } }}
                  className="text-4xl font-serif text-white/60 tracking-widest"
                >
                  ???
                </motion.div>
              )}
              {(phase === "reveal" || phase === "reaction") && (
                <motion.div
                  key="price"
                  initial={{ opacity: 0, scale: 2, rotateX: -90 }}
                  animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="text-4xl font-serif text-[#C5A572]"
                >
                  {formatCurrency(reveal.price, reveal.price >= 1_000_000)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Reaction */}
          <AnimatePresence>
            {phase === "reaction" && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.5 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className="space-y-1"
              >
                <div className="text-3xl">{reaction.emoji}</div>
                <div className="text-xs text-white/60 italic">
                  {reaction.text}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
