"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectRemaining } from "@/lib/store";
import { catalogItems, CatalogItem, TIER_LABELS } from "@/data/catalog";
import { formatCurrency, generateId } from "@/lib/format";
import { playAuthorize, playSparkle } from "@/lib/sounds";
import { ParticleBurst } from "./particle-burst";
import { useLocale } from "@/lib/use-locale";
import { t, tierLabel } from "@/lib/i18n";
import { applyWealthDna, formatModifier } from "@/lib/wealth-dna";

const QUANTITY_OPTIONS = [1, 10, 100, 1000, "MAX"] as const;
type QuantityOption = (typeof QUANTITY_OPTIONS)[number];

type SortMode = "default" | "priceAsc" | "priceDesc" | "name";

// ─── Animated Price Counter ───────────────────────────────────────
// Smoothly counts up/down when the total price changes
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
    const duration = 280; // ms
    const t0 = performance.now();

    const tick = (now: number) => {
      const elapsed = now - t0;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startRef.current + (targetRef.current - startRef.current) * eased;
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

interface CatalogProps {
  onPurchase?: (totalPrice: number) => void;
}

export function Catalog({ onPurchase }: CatalogProps) {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const addPurchase = useCartStore((s) => s.addPurchase);
  const soundEnabled = useCartStore((s) => s.soundEnabled);
  const remaining = useCartStore(selectRemaining);

  const [activeTier, setActiveTier] = useState<CatalogItem["tier"] | "all">("everyday");
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number | "MAX">>({});
  const [toast, setToast] = useState<string | null>(null);
  const [showBurst, setShowBurst] = useState(false);

  // Search + sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("default");

  const getQty = (id: string, price: number) => {
    const q = quantities[id] || 1;
    if (q === "MAX") {
      return Math.max(1, Math.floor(remaining / price));
    }
    return typeof q === "number" ? q : 1;
  };

  const setQty = useCallback((id: string, qty: number | "MAX") => {
    setQuantities((prev) => ({ ...prev, [id]: qty }));
  }, []);

  // Filtered + sorted items
  const displayItems = useMemo(() => {
    let items = catalogItems;

    // If searching, search across ALL tiers
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.emoji.includes(q)
      );
    } else if (activeTier !== "all") {
      items = items.filter((item) => item.tier === activeTier);
    }

    // Sort
    switch (sortMode) {
      case "priceAsc":
        items = [...items].sort((a, b) => a.price - b.price);
        break;
      case "priceDesc":
        items = [...items].sort((a, b) => b.price - a.price);
        break;
      case "name":
        items = [...items].sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    return items;
  }, [searchQuery, activeTier, sortMode]);

  const handleBuy = useCallback(
    (item: CatalogItem) => {
      if (!selectedBillionaire) return;

      // Apply Wealth DNA modifier
      const dna = applyWealthDna(
        { title: item.name, price: item.price, assetClass: item.assetClass },
        selectedBillionaire
      );
      const effectivePrice = dna.adjustedPrice;
      const qty = getQty(item.id, effectivePrice > 0 ? effectivePrice : item.price);

      setBuyingId(item.id);
      if (soundEnabled) {
        playAuthorize();
        playSparkle();
      }
      setShowBurst(true);
      setTimeout(() => setShowBurst(false), 1500);

      const totalPrice = effectivePrice * qty;

      // Add purchases
      let newlyUnlockedAll: string[] = [];
      for (let i = 0; i < qty; i++) {
        const unlocked = addPurchase({
          id: generateId() + `-${i}`,
          product: {
            title: qty > 1 ? `${item.name} (${i + 1}/${qty})` : item.name,
            price: effectivePrice,
            imageUrl: null,
            description: item.description,
            sourceUrl: `catalog://${item.id}`,
            assetClass: item.assetClass,
            monthlyOverhead: item.monthlyOverhead,
          },
          billionaireId: selectedBillionaire.id,
          timestamp: Date.now(),
        });
        newlyUnlockedAll = [...newlyUnlockedAll, ...unlocked];
      }

      onPurchase?.(totalPrice);

      if (newlyUnlockedAll.length > 0) {
        const unique = Array.from(new Set(newlyUnlockedAll));
        setToast(`🏆 ${unique.join(", ")}`);
        setTimeout(() => setToast(null), 4000);
      }

      setTimeout(() => setBuyingId(null), 600);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedBillionaire, soundEnabled, addPurchase, quantities, remaining, onPurchase]
  );

  if (!selectedBillionaire) return null;

  const tiers: Array<CatalogItem["tier"] | "all"> = ["all", "everyday", "aspirational", "luxury", "ultra", "absurd"];

  return (
    <div className="w-full">
      <h2 className="section-label mb-4">
        {t("catalog.title", locale)}
      </h2>

      {/* Search + Sort bar */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim()) setActiveTier("all");
            }}
            placeholder={t("catalog.search", locale)}
            className="w-full px-3 py-2 pl-8 rounded-lg bg-surface/70 border border-line/45 text-sand placeholder:text-ash/72 text-xs focus:outline-none focus:border-stone/40 transition-colors"
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ash/65"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ash/65 hover:text-ash/80 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort select */}
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="px-2 py-2 rounded-lg bg-surface/70 border border-line/45 text-ash/80 text-xs focus:outline-none focus:border-stone/40 cursor-pointer"
        >
          <option value="default">{t("catalog.sort.default", locale)}</option>
          <option value="priceAsc">{t("catalog.sort.priceAsc", locale)}</option>
          <option value="priceDesc">{t("catalog.sort.priceDesc", locale)}</option>
          <option value="name">{t("catalog.sort.name", locale)}</option>
        </select>
      </div>

      {/* Tier tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {tiers.map((tier) => (
          <button
            key={tier}
            onClick={() => {
              setActiveTier(tier);
              if (tier !== "all") setSearchQuery("");
            }}
            className={`
              px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all
              ${
                activeTier === tier
                  ? "bg-stone/20 text-stone border border-stone/30"
                  : "bg-surface/55 text-ash/70 border border-line/50 hover:text-ash/80"
              }
            `}
          >
            {tier === "all" ? t("catalog.all", locale) : tierLabel(tier, locale)}
          </button>
        ))}
      </div>

      {/* Item grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <AnimatePresence mode="popLayout">
          {displayItems.map((item) => {
            const itemDna = applyWealthDna(
              { title: item.name, price: item.price, assetClass: item.assetClass },
              selectedBillionaire
            );
            const effectivePrice = itemDna.adjustedPrice;
            const qty = getQty(item.id, effectivePrice > 0 ? effectivePrice : item.price);
            const totalPrice = effectivePrice * qty;
            const canAfford = effectivePrice <= remaining || itemDna.isFree;
            const isBuying = buyingId === item.id;
            const currentQtySelection = quantities[item.id] || 1;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`
                  relative p-3 rounded-xl border transition-all duration-200 overflow-hidden
                  ${
                    isBuying
                      ? "bg-stone/20 border-champagne/60 scale-[0.97]"
                      : canAfford
                      ? "bg-surface/70 border-line/40 hover:border-stone/35 hover:bg-surface/70"
                      : "bg-surface/40 border-line/5 opacity-40"
                  }
                `}
                style={
                  isBuying
                    ? {
                        boxShadow: "0 0 16px rgba(166,133,48,0.15), 0 0 4px rgba(166,133,48,0.1)",
                      }
                    : undefined
                }
              >
                {/* Purchase success flash overlay */}
                {isBuying && (
                  <motion.div
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 pointer-events-none z-10"
                    style={{
                      background: "radial-gradient(ellipse at center, rgba(166,133,48,0.12) 0%, transparent 70%)",
                    }}
                  />
                )}

                {/* Success checkmark overlay */}
                {isBuying && (
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
                )}
                {/* Emoji + Name */}
                <div className="text-2xl mb-1">{item.emoji}</div>
                <div className="text-xs text-sand font-medium truncate">
                  {item.name}
                </div>
                <div className="text-[10px] text-ash/70 mt-0.5 truncate">
                  {item.description}
                </div>

                {/* Price + DNA modifier */}
                <div className="mt-2">
                  {itemDna.isFree ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-serif text-sage font-medium">FREE</span>
                      <span className="text-[10px] text-ash/60 line-through">{formatCurrency(item.price)}</span>
                    </div>
                  ) : itemDna.modifier != null ? (
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-serif text-stone">{formatCurrency(effectivePrice)}</span>
                        <span className="text-[10px] text-ash/60 line-through">{formatCurrency(item.price)}</span>
                      </div>
                      <span className={`text-[9px] font-medium ${itemDna.modifier < 0 ? "text-sage/85" : "text-[#9B6B6B]/70"}`}>
                        {formatModifier(itemDna.modifier)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm font-serif text-stone">{formatCurrency(item.price)}</span>
                  )}
                </div>

                {/* Quantity selector */}
                <div className="flex gap-1 mt-2 flex-wrap">
                  {QUANTITY_OPTIONS.map((q) => {
                    if (q === "MAX") {
                      if (!canAfford || itemDna.isFree) return null;
                      const maxQty = Math.floor(remaining / effectivePrice);
                      if (maxQty <= 1) return null;
                      return (
                        <motion.button
                          key="MAX"
                          onClick={() => setQty(item.id, "MAX")}
                          animate={
                            currentQtySelection === "MAX"
                              ? { scale: [1, 1.08, 1] }
                              : { scale: 1 }
                          }
                          transition={{ duration: 0.25 }}
                          className={`
                            px-1.5 py-0.5 rounded text-[9px] transition-colors
                            ${
                              currentQtySelection === "MAX"
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
                        onClick={() => setQty(item.id, q)}
                        animate={
                          currentQtySelection === q
                            ? { scale: [1, 1.1, 1] }
                            : { scale: 1 }
                        }
                        transition={{ duration: 0.2, type: "spring", stiffness: 400, damping: 15 }}
                        className={`
                          px-1.5 py-0.5 rounded text-[9px] transition-colors
                          ${
                            currentQtySelection === q
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
                  onClick={() => handleBuy(item)}
                  disabled={!canAfford || isBuying}
                  whileTap={canAfford && !isBuying ? { scale: 0.94 } : undefined}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  className={`
                    relative w-full mt-2 py-1.5 rounded-lg text-[10px] font-medium uppercase tracking-wider transition-all overflow-hidden
                    ${
                      canAfford
                        ? currentQtySelection === "MAX"
                          ? "bg-[#9B6B6B]/10 text-[#9B6B6B] hover:bg-[#9B6B6B]/15 border border-[#9B6B6B]/15"
                          : "bg-stone/20 text-stone hover:bg-stone/20"
                        : "bg-surface-bright/65 text-ash/72 cursor-not-allowed"
                    }
                  `}
                >
                  {isBuying
                    ? "✓"
                    : currentQtySelection === "MAX"
                    ? <>{t("catalog.buyMax", locale)} ({qty.toLocaleString()}) — <AnimatedPrice value={totalPrice} compact /></>
                    : qty > 1
                    ? <>{t("catalog.buy", locale)} {qty} — <AnimatedPrice value={totalPrice} compact={totalPrice >= 1000000} /></>
                    : t("catalog.buy", locale)}
                </motion.button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty search state */}
      {displayItems.length === 0 && (
        <div className="text-center py-8">
          <div className="text-2xl mb-2 opacity-30">🔍</div>
          <div className="text-xs text-ash/65">{t("catalog.noResults", locale)}</div>
        </div>
      )}

      {/* Particle burst */}
      {showBurst && <ParticleBurst />}

      {/* Achievement toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl bg-stone/20 border border-stone/40 text-stone text-sm backdrop-blur-md z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
