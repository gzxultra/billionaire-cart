"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { ParsedProduct } from "@/lib/types";
import { formatCurrency, assetLabel, proxyImage } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";
import { useCartStore, selectRemaining } from "@/lib/store";
import { applyWealthDna, formatModifier } from "@/lib/wealth-dna";

interface ProductCardProps {
  product: ParsedProduct;
  onAuthorize: (qty: number) => void;
  autoFocusBuy?: boolean;
}

const SWIPE_THRESHOLD = 120;
const QTY_PRESETS = [1, 10, 100, 1000] as const;

export function ProductCard({ product, onAuthorize, autoFocusBuy }: ProductCardProps) {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const remaining = useCartStore(selectRemaining);
  const dna = applyWealthDna(product, selectedBillionaire);
  const [swiped, setSwiped] = useState(false);
  const [qty, setQty] = useState(1);
  const buyRef = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 0.4]);
  const iconScale = useTransform(x, [0, SWIPE_THRESHOLD], [0.5, 1.2]);
  const iconOpacity = useTransform(x, [0, 60, SWIPE_THRESHOLD], [0, 0.6, 1]);

  const effectivePrice = dna.isFree ? 0 : dna.adjustedPrice;

  // How many can you afford?
  const canAffordCount = useMemo(() => {
    if (dna.isFree) return Infinity;
    if (effectivePrice <= 0) return 0;
    return Math.floor(remaining / effectivePrice);
  }, [remaining, effectivePrice, dna.isFree]);

  // Earnings context — how fast does the billionaire earn this?
  const earningsContext = useMemo(() => {
    if (!selectedBillionaire || effectivePrice <= 0 || dna.isFree) return null;
    const eps = selectedBillionaire.earningsPerSecond;
    if (eps <= 0) return null;

    const perSecCount = eps / effectivePrice;
    if (perSecCount >= 1) {
      return { type: "perSec" as const, count: Math.floor(perSecCount) };
    }
    const seconds = effectivePrice / eps;
    let timeStr: string;
    if (seconds < 1) {
      timeStr = locale === "zh" ? `${(seconds * 1000).toFixed(0)}毫秒` : `${(seconds * 1000).toFixed(0)}ms`;
    } else if (seconds < 60) {
      timeStr = locale === "zh" ? `${seconds.toFixed(1)}秒` : `${seconds.toFixed(1)}s`;
    } else if (seconds < 3600) {
      timeStr = locale === "zh" ? `${(seconds / 60).toFixed(1)}分钟` : `${(seconds / 60).toFixed(1)} min`;
    } else if (seconds < 86400) {
      timeStr = locale === "zh" ? `${(seconds / 3600).toFixed(1)}小时` : `${(seconds / 3600).toFixed(1)} hrs`;
    } else if (seconds < 86400 * 365) {
      timeStr = locale === "zh" ? `${(seconds / 86400).toFixed(1)}天` : `${(seconds / 86400).toFixed(1)} days`;
    } else {
      timeStr = locale === "zh" ? `${(seconds / (86400 * 365)).toFixed(1)}年` : `${(seconds / (86400 * 365)).toFixed(1)} yrs`;
    }
    return { type: "earnBack" as const, time: timeStr };
  }, [selectedBillionaire, effectivePrice, dna.isFree, locale]);

  const totalPrice = effectivePrice * qty;
  const maxQty = canAffordCount === Infinity ? 999999 : canAffordCount;

  // Reset qty when product changes
  useEffect(() => { setQty(1); }, [product.sourceUrl]);

  useEffect(() => {
    if (autoFocusBuy && buyRef.current) {
      buyRef.current.focus();
    }
  }, [autoFocusBuy]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x > SWIPE_THRESHOLD) {
        setSwiped(true);
        setTimeout(() => onAuthorize(qty), 200);
      }
    },
    [onAuthorize, qty]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onAuthorize(qty);
      }
    },
    [onAuthorize, qty]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.97 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl overflow-hidden bg-surface/70 border border-line/40 backdrop-blur-xl"
      role="article"
      aria-label={`${product.title} — ${formatCurrency(dna.isFree ? 0 : dna.adjustedPrice)}`}
    >
      {/* Swipe-to-buy background layer */}
      <motion.div
        className="absolute inset-0 bg-sage/20 flex items-center pl-6 pointer-events-none z-0"
        style={{ opacity: bgOpacity }}
      >
        <motion.span className="text-3xl" style={{ scale: iconScale, opacity: iconOpacity }}>✓</motion.span>
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
        <div className="relative w-full aspect-[2/1] bg-surface-bright/80 overflow-hidden">
          {product.imageUrl ? (
            <img
              src={proxyImage(product.imageUrl) || ""}
              alt={product.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-surface-bright/40 via-surface/20 to-transparent">
              <div className="text-4xl opacity-25">
                {assetLabel(product.assetClass, locale).split(" ")[0] || "📦"}
              </div>
              {product.sourceDomain && (
                <span className="text-[10px] text-ash/70 font-mono tracking-wider">{product.sourceDomain}</span>
              )}
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-base/90 via-base/20 to-transparent" />

          {/* Price tag */}
          <div className="absolute bottom-4 right-4">
            <div className="px-4 py-2 rounded-xl bg-base/85 backdrop-blur-xl border border-champagne/40 shadow-champagne-sm">
              {dna.isFree ? (
                <>
                  <span className="text-xl font-serif text-sage tracking-tight">FREE</span>
                  <span className="block text-[10px] text-ash/70 font-mono text-right mt-0.5 line-through">{formatCurrency(product.price)}</span>
                </>
              ) : dna.modifier != null ? (
                <>
                  <span className="text-xl font-serif text-champagne tracking-tight">{formatCurrency(dna.adjustedPrice)}</span>
                  <span className="block text-[10px] text-ash/70 font-mono text-right mt-0.5 line-through">{formatCurrency(product.price)}</span>
                </>
              ) : (
                <span className="text-xl font-serif text-champagne tracking-tight">{formatCurrency(product.price)}</span>
              )}
              {product.originalPrice != null && product.originalCurrency && !dna.isFree && dna.modifier == null && (
                <span className="block text-[10px] text-ash/70 font-mono text-right mt-0.5">
                  {product.originalCurrency === "CNY" ? "¥" : product.originalCurrency}
                  {product.originalPrice.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* DNA modifier badge */}
          {(dna.isFree || dna.modifier != null) && selectedBillionaire && (
            <div className="absolute bottom-4 left-3">
              <span className={`text-[10px] px-2 py-1 rounded-full backdrop-blur-md font-medium border shadow-sm ${
                dna.isFree
                  ? "bg-sage/15 text-sage border-sage/25"
                  : dna.modifier! < 0
                  ? "bg-sage/15 text-sage/80 border-sage/20"
                  : "bg-[#9B6B6B]/15 text-[#9B6B6B] border-[#9B6B6B]/20"
              }`}>
                {dna.isFree
                  ? t("dna.free", locale, { item: dna.matchedFreeItem || "" })
                  : `${selectedBillionaire.name.split(" ")[0]} ${formatModifier(dna.modifier!)} ${assetLabel(product.assetClass, locale)}`}
              </span>
            </div>
          )}

          {/* Category badge */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-base/60 backdrop-blur-md text-sand/85 font-mono border border-line/45 shadow-sm">
              {assetLabel(product.assetClass, locale)}
            </span>
          </div>

          {/* Swipe hint */}
          <div className="absolute top-3 right-3">
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-base/40 backdrop-blur-md text-ash/70 font-mono border border-line/50">
              {t("product.swipeHint", locale)}
            </span>
          </div>
        </div>

        {/* Product info section */}
        <div className="p-5 space-y-3">
          {/* Source + title */}
          <div className="flex items-start gap-3">
            {product.favicon && product.sourceDomain && (
              <div className="w-8 h-8 rounded-lg bg-surface-bright/80 border border-line/40 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
                <img src={product.favicon} alt="" className="w-5 h-5 rounded-sm"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-medium text-sand leading-snug line-clamp-2">{product.title}</h3>
              {product.sourceDomain && (
                <span className="text-[11px] text-ash/70 mt-1 block">{product.sourceDomain}</span>
              )}
            </div>
          </div>

          {/* Description */}
          {product.description && product.description !== "Manually entered item" && (
            <p className="text-xs text-ash/65 line-clamp-2 leading-relaxed">{product.description}</p>
          )}

          {/* Affordability + earnings context badges */}
          {!dna.isFree && effectivePrice > 0 && selectedBillionaire && (
            <div className="flex items-center gap-2 flex-wrap text-[10px]">
              {canAffordCount > 0 && canAffordCount < Infinity && (
                <span className="px-2 py-0.5 rounded-full bg-sage/8 text-sage/80 border border-sage/15 font-medium tabular-nums">
                  {locale === "zh"
                    ? `可购 ${canAffordCount.toLocaleString()} 个`
                    : `Can buy ${canAffordCount.toLocaleString()}`}
                </span>
              )}
              {earningsContext && (
                <span className="text-ash/55 flex items-center gap-1">
                  <span>⏱️</span>
                  {earningsContext.type === "perSec"
                    ? (locale === "zh"
                      ? `${selectedBillionaire.name.split(" ")[0]} 每秒赚够买 ${earningsContext.count.toLocaleString()} 个`
                      : `${selectedBillionaire.name.split(" ")[0]} earns ${earningsContext.count.toLocaleString()}/s of these`)
                    : (locale === "zh"
                      ? `${selectedBillionaire.name.split(" ")[0]} ${earningsContext.time}赚回来`
                      : `${selectedBillionaire.name.split(" ")[0]} earns this in ${earningsContext.time}`)}
                </span>
              )}
            </div>
          )}

          {/* Cost breakdown */}
          <div className="flex items-center gap-3 flex-wrap">
            {product.monthlyOverhead > 0 && (
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9B6B6B]/50" />
                <span className="text-[#9B6B6B]/60 font-mono">
                  +{formatCurrency(product.monthlyOverhead)}{t("bankrupt.monthly", locale)}
                </span>
                <span className="text-ash/65">{t("product.hiddenCosts", locale)}</span>
              </div>
            )}
          </div>

          {/* Quantity selector — visible when can afford > 1 */}
          {!dna.isFree && effectivePrice > 0 && canAffordCount > 1 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {QTY_PRESETS.map((q) => {
                  if (q > canAffordCount) return null;
                  return (
                    <button
                      key={q}
                      onClick={() => setQty(q)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                        qty === q
                          ? "bg-stone/20 text-stone border border-stone/30"
                          : "bg-surface-bright/80 text-ash/65 border border-transparent hover:text-ash/80 hover:border-line/40"
                      }`}
                    >
                      ×{q.toLocaleString()}
                    </button>
                  );
                })}
                {canAffordCount > 1 && (
                  <button
                    onClick={() => setQty(maxQty)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                      qty === maxQty
                        ? "bg-[#9B6B6B]/15 text-[#9B6B6B] border border-[#9B6B6B]/25"
                        : "bg-surface-bright/80 text-ash/65 border border-transparent hover:text-[#9B6B6B]/60 hover:border-[#9B6B6B]/20"
                    }`}
                  >
                    MAX
                  </button>
                )}
              </div>
              {qty > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[11px] text-champagne font-serif font-medium"
                >
                  {locale === "zh" ? "总计" : "Total"}: {formatCurrency(totalPrice, totalPrice >= 1_000_000)}
                </motion.div>
              )}
            </div>
          )}

          {/* Authorize button */}
          <motion.button
            ref={buyRef}
            onClick={() => onAuthorize(qty)}
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
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="relative z-10">
              {qty > 1
                ? (locale === "zh"
                  ? `授权 ×${qty.toLocaleString()} — ${formatCurrency(totalPrice, totalPrice >= 1_000_000)}`
                  : `Authorize ×${qty.toLocaleString()} — ${formatCurrency(totalPrice, totalPrice >= 1_000_000)}`)
                : t("product.authorize", locale)}
            </span>
          </motion.button>

          {/* Quick buy hint */}
          <div className="text-center">
            <span className="text-[9px] text-ash/72 font-mono">{t("product.enterHint", locale)}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
