"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CatalogItem } from "@/data/catalog";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { t, tierLabel } from "@/lib/i18n";
import { formatModifier } from "@/lib/wealth-dna";

const QUANTITY_OPTIONS = [1, 10, 100, 1000, "MAX"] as const;
type QuantityOption = (typeof QUANTITY_OPTIONS)[number];

// ─── Animated Price Counter ───────────────────────────────────────
function AnimatedPrice({
  value,
  compact,
}: {
  value: number;
  compact: boolean;
}) {
  const [display, setDisplay] = useState(value);
  const frameRef = useRef<number>(0);
  const startRef = useRef(value);
  const targetRef = useRef(value);

  useEffect(() => {
    if (value === display && value === targetRef.current) return;
    startRef.current = display;
    targetRef.current = value;
    const duration = 280;
    const t0 = performance.now();

    const tick = (now: number) => {
      const elapsed = now - t0;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current =
        startRef.current + (targetRef.current - startRef.current) * eased;
      setDisplay(Math.round(current));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(targetRef.current);
      }
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{formatCurrency(display, compact)}</>;
}

// ─── Tier accent colors ───────────────────────────────────────────
const TIER_ACCENTS: Record<string, { bg: string; border: string; badge: string }> = {
  everyday: {
    bg: "bg-sage/[0.03]",
    border: "border-sage/15",
    badge: "bg-sage/10 text-sage/80 border-sage/20",
  },
  aspirational: {
    bg: "bg-stone/[0.03]",
    border: "border-stone/15",
    badge: "bg-stone/10 text-stone/80 border-stone/20",
  },
  luxury: {
    bg: "bg-champagne/[0.03]",
    border: "border-champagne/15",
    badge: "bg-champagne/10 text-champagne border-champagne/20",
  },
  ultra: {
    bg: "bg-[#8B5CF6]/[0.03]",
    border: "border-[#8B5CF6]/15",
    badge: "bg-[#8B5CF6]/10 text-[#8B5CF6]/80 border-[#8B5CF6]/20",
  },
  absurd: {
    bg: "bg-[#EF4444]/[0.03]",
    border: "border-[#EF4444]/15",
    badge: "bg-[#EF4444]/10 text-[#EF4444]/80 border-[#EF4444]/20",
  },
};

interface CatalogItemCardProps {
  item: CatalogItem;
  effectivePrice: number;
  isFree: boolean;
  modifier: number | null | undefined;
  canAfford: boolean;
  remaining: number;
  onBuy: (item: CatalogItem, qty: number) => void;
}

function CatalogItemCardInner({
  item,
  effectivePrice,
  isFree,
  modifier,
  canAfford,
  remaining,
  onBuy,
}: CatalogItemCardProps) {
  const locale = useLocale((s) => s.locale);
  const [buyingFlash, setBuyingFlash] = useState(false);
  const [currentQty, setCurrentQty] = useState<number | "MAX">(1);

  const getQty = useCallback(
    (price: number) => {
      if (currentQty === "MAX") {
        return Math.max(1, Math.floor(remaining / price));
      }
      return typeof currentQty === "number" ? currentQty : 1;
    },
    [currentQty, remaining]
  );

  const qty = getQty(effectivePrice > 0 ? effectivePrice : item.price);
  const totalPrice = effectivePrice * qty;

  const handleBuyClick = useCallback(() => {
    if (!canAfford && !isFree) return;
    setBuyingFlash(true);
    onBuy(item, qty);
    setTimeout(() => setBuyingFlash(false), 600);
  }, [canAfford, isFree, onBuy, item, qty]);

  const accent = TIER_ACCENTS[item.tier] || TIER_ACCENTS.everyday;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`
        relative p-3 rounded-xl border transition-all duration-200 overflow-hidden
        ${
          buyingFlash
            ? "bg-stone/20 border-champagne/60 scale-[0.97]"
            : canAfford || isFree
            ? `${accent.bg} border-line/40 hover:${accent.border} hover:bg-surface/70`
            : "bg-surface/40 border-line/5 opacity-40"
        }
      `}
      style={
        buyingFlash
          ? {
              boxShadow:
                "0 0 16px rgba(166,133,48,0.15), 0 0 4px rgba(166,133,48,0.1)",
            }
          : undefined
      }
    >
      {/* Purchase flash overlay */}
      <AnimatePresence>
        {buyingFlash && (
          <>
            <motion.div
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(166,133,48,0.12) 0%, transparent 70%)",
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            >
              <motion.span
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="text-3xl"
              >
                ✓
              </motion.span>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Tier badge — subtle top-right indicator */}
      <div className="absolute top-2 right-2">
        <span
          className={`text-[8px] px-1.5 py-0.5 rounded-full border font-medium uppercase tracking-wider ${accent.badge}`}
        >
          {tierLabel(item.tier, locale)}
        </span>
      </div>

      {/* Emoji + Name */}
      <div className="text-2xl mb-1">{item.emoji}</div>
      <div className="text-xs text-sand font-medium truncate pr-14">
        {item.name}
      </div>
      <div className="text-[10px] text-ash/70 mt-0.5 truncate">
        {item.description}
      </div>

      {/* Price + DNA modifier */}
      <div className="mt-2">
        {isFree ? (
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-serif text-sage font-medium">
              FREE
            </span>
            <span className="text-[10px] text-ash/60 line-through">
              {formatCurrency(item.price)}
            </span>
          </div>
        ) : modifier != null ? (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-serif text-stone">
                {formatCurrency(effectivePrice)}
              </span>
              <span className="text-[10px] text-ash/60 line-through">
                {formatCurrency(item.price)}
              </span>
            </div>
            <span
              className={`text-[9px] font-medium ${
                modifier < 0 ? "text-sage/85" : "text-[#9B6B6B]/70"
              }`}
            >
              {formatModifier(modifier)}
            </span>
          </div>
        ) : (
          <span className="text-sm font-serif text-stone">
            {formatCurrency(item.price)}
          </span>
        )}
      </div>

      {/* Quantity selector */}
      <div className="flex gap-1 mt-2 flex-wrap">
        {QUANTITY_OPTIONS.map((q) => {
          if (q === "MAX") {
            if (!canAfford || isFree) return null;
            const maxQty = Math.floor(remaining / effectivePrice);
            if (maxQty <= 1) return null;
            return (
              <motion.button
                key="MAX"
                onClick={() => setCurrentQty("MAX")}
                animate={
                  currentQty === "MAX" ? { scale: [1, 1.08, 1] } : { scale: 1 }
                }
                transition={{ duration: 0.25 }}
                className={`
                  px-1.5 py-0.5 rounded text-[9px] transition-colors
                  ${
                    currentQty === "MAX"
                      ? "bg-[#9B6B6B]/15 text-[#9B6B6B] border border-[#9B6B6B]/25 animate-pulse"
                      : "bg-surface-bright/80 text-ash/65 hover:text-[#9B6B6B]/60"
                  }
                `}
              >
                MAX
              </motion.button>
            );
          }
          const qTotal = effectivePrice * q;
          const qAfford = qTotal <= remaining;
          if (!qAfford && q > 1) return null;
          return (
            <motion.button
              key={q}
              onClick={() => setCurrentQty(q)}
              animate={
                currentQty === q ? { scale: [1, 1.1, 1] } : { scale: 1 }
              }
              transition={{
                duration: 0.2,
                type: "spring",
                stiffness: 400,
                damping: 15,
              }}
              className={`
                px-1.5 py-0.5 rounded text-[9px] transition-colors
                ${
                  currentQty === q
                    ? "bg-stone/20 text-stone"
                    : "bg-surface-bright/80 text-ash/65 hover:text-ash/60"
                }
              `}
            >
              ×{q}
            </motion.button>
          );
        })}
      </div>

      {/* Buy button */}
      <motion.button
        onClick={handleBuyClick}
        disabled={(!canAfford && !isFree) || buyingFlash}
        whileTap={canAfford || isFree ? { scale: 0.94 } : undefined}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        className={`
          relative w-full mt-2 py-1.5 rounded-lg text-[10px] font-medium uppercase tracking-wider transition-all overflow-hidden
          ${
            canAfford || isFree
              ? currentQty === "MAX"
                ? "bg-[#9B6B6B]/10 text-[#9B6B6B] hover:bg-[#9B6B6B]/15 border border-[#9B6B6B]/15"
                : "bg-stone/20 text-stone hover:bg-stone/20"
              : "bg-surface-bright/65 text-ash/72 cursor-not-allowed"
          }
        `}
      >
        {buyingFlash ? (
          "✓"
        ) : currentQty === "MAX" ? (
          <>
            {t("catalog.buyMax", locale)} ({qty.toLocaleString()}) —{" "}
            <AnimatedPrice value={totalPrice} compact />
          </>
        ) : qty > 1 ? (
          <>
            {t("catalog.buy", locale)} {qty} —{" "}
            <AnimatedPrice
              value={totalPrice}
              compact={totalPrice >= 1000000}
            />
          </>
        ) : (
          t("catalog.buy", locale)
        )}
      </motion.button>
    </motion.div>
  );
}

// Memoize to prevent re-renders when parent state changes (purchases, other items' quantities)
export const CatalogItemCard = memo(CatalogItemCardInner, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.effectivePrice === next.effectivePrice &&
    prev.isFree === next.isFree &&
    prev.modifier === next.modifier &&
    prev.canAfford === next.canAfford &&
    prev.remaining === next.remaining
  );
});
