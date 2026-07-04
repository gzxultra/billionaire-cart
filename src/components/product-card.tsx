"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { ParsedProduct } from "@/lib/types";
import { formatCurrency, ASSET_LABELS } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

interface ProductCardProps {
  product: ParsedProduct;
  onAuthorize: () => void;
  autoFocusBuy?: boolean;
}

const SWIPE_THRESHOLD = 120;

export function ProductCard({ product, onAuthorize, autoFocusBuy }: ProductCardProps) {
  const locale = useLocale((s) => s.locale);
  const [swiped, setSwiped] = useState(false);
  const buyRef = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 0.4]);
  const iconScale = useTransform(x, [0, SWIPE_THRESHOLD], [0.5, 1.2]);
  const iconOpacity = useTransform(x, [0, 60, SWIPE_THRESHOLD], [0, 0.6, 1]);

  // Keyboard shortcut: Enter to buy
  useEffect(() => {
    if (autoFocusBuy && buyRef.current) {
      buyRef.current.focus();
    }
  }, [autoFocusBuy]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x > SWIPE_THRESHOLD) {
        setSwiped(true);
        setTimeout(onAuthorize, 200);
      }
    },
    [onAuthorize]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onAuthorize();
      }
    },
    [onAuthorize]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.97 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl overflow-hidden bg-surface/70 border border-line/15 backdrop-blur-xl"
    >
      {/* Swipe-to-buy background layer */}
      <motion.div
        className="absolute inset-0 bg-sage/20 flex items-center pl-6 pointer-events-none z-0"
        style={{ opacity: bgOpacity }}
      >
        <motion.span
          className="text-3xl"
          style={{ scale: iconScale, opacity: iconOpacity }}
        >
          ✓
        </motion.span>
      </motion.div>

      {/* Draggable card content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={`relative z-10 ${swiped ? "pointer-events-none" : ""}`}
      >
        {/* Large hero image */}
        <div className="relative w-full aspect-[2/1] bg-surface-bright/20 overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-5xl opacity-15">📦</div>
            </div>
          )}

          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-base/90 via-base/20 to-transparent" />

          {/* Price tag — prominent floating pill */}
          <div className="absolute bottom-4 right-4">
            <div className="px-4 py-2 rounded-xl bg-base/85 backdrop-blur-xl border border-champagne/20 shadow-champagne-sm">
              <span className="text-xl font-serif text-champagne tracking-tight">
                {formatCurrency(product.price)}
              </span>
            </div>
          </div>

          {/* Category badge — top left */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-base/60 backdrop-blur-md text-sand/70 font-mono border border-line/20 shadow-sm">
              {ASSET_LABELS[product.assetClass] || product.assetClass}
            </span>
          </div>

          {/* Swipe hint — top right */}
          <div className="absolute top-3 right-3">
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-base/40 backdrop-blur-md text-ash/40 font-mono border border-line/10">
              {t("product.swipeHint", locale)}
            </span>
          </div>
        </div>

        {/* Product info section */}
        <div className="p-5 space-y-3">
          {/* Source + title row */}
          <div className="flex items-start gap-3">
            {/* Source favicon — larger */}
            {product.favicon && product.sourceDomain && (
              <div className="w-8 h-8 rounded-lg bg-surface-bright/50 border border-line/15 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
                <img
                  src={product.favicon}
                  alt=""
                  className="w-5 h-5 rounded-sm"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-medium text-sand leading-snug line-clamp-2">
                {product.title}
              </h3>
              {product.sourceDomain && (
                <span className="text-[11px] text-ash/40 mt-1 block">
                  {product.sourceDomain}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {product.description &&
            product.description !== "Manually entered item" && (
              <p className="text-xs text-ash/45 line-clamp-2 leading-relaxed">
                {product.description}
              </p>
            )}

          {/* Cost breakdown row */}
          <div className="flex items-center gap-3 flex-wrap">
            {product.monthlyOverhead > 0 && (
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9B6B6B]/50" />
                <span className="text-[#9B6B6B]/60 font-mono">
                  +{formatCurrency(product.monthlyOverhead)}
                  {t("bankrupt.monthly", locale)}
                </span>
                <span className="text-ash/30">
                  {t("product.hiddenCosts", locale)}
                </span>
              </div>
            )}
          </div>

          {/* Authorize button — full width, premium style */}
          <motion.button
            ref={buyRef}
            onClick={onAuthorize}
            onKeyDown={handleKeyDown}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="
              w-full py-3.5 rounded-xl relative overflow-hidden group
              bg-stone-gradient text-sand font-semibold text-sm tracking-wide
              shadow-stone-sm hover:shadow-stone transition-shadow duration-300
              focus:outline-none focus:ring-2 focus:ring-stone/40 focus:ring-offset-2 focus:ring-offset-base
            "
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="relative z-10">
              {t("product.authorize", locale)}
            </span>
          </motion.button>

          {/* Quick buy hint */}
          <div className="text-center">
            <span className="text-[9px] text-ash/25 font-mono">
              {t("product.enterHint", locale)}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
