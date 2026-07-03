"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectRemaining } from "@/lib/store";
import { catalogItems, CatalogItem, TIER_LABELS } from "@/data/catalog";
import { formatCurrency, generateId } from "@/lib/format";
import { playAuthorize, playSparkle } from "@/lib/sounds";
import { ParticleBurst } from "./particle-burst";
import { useLocale } from "@/lib/use-locale";
import { t, tierLabel } from "@/lib/i18n";

const QUANTITY_OPTIONS = [1, 10, 100, 1000, "MAX"] as const;
type QuantityOption = (typeof QUANTITY_OPTIONS)[number];

type SortMode = "default" | "priceAsc" | "priceDesc" | "name";

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
      const qty = getQty(item.id, item.price);

      setBuyingId(item.id);
      if (soundEnabled) {
        playAuthorize();
        playSparkle();
      }
      setShowBurst(true);
      setTimeout(() => setShowBurst(false), 1500);

      const totalPrice = item.price * qty;

      // Add purchases
      let newlyUnlockedAll: string[] = [];
      for (let i = 0; i < qty; i++) {
        const unlocked = addPurchase({
          id: generateId() + `-${i}`,
          product: {
            title: qty > 1 ? `${item.name} (${i + 1}/${qty})` : item.name,
            price: item.price,
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
      <h2 className="text-xs uppercase tracking-[0.3em] text-copper/60 font-sans mb-4">
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
            className="w-full px-3 py-2 pl-8 rounded-lg bg-charcoal-800/60 border border-charcoal-600/20 text-white/80 placeholder:text-white/15 text-xs focus:outline-none focus:border-copper/40 transition-colors"
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20"
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
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort select */}
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="px-2 py-2 rounded-lg bg-charcoal-800/60 border border-charcoal-600/20 text-white/50 text-xs focus:outline-none focus:border-copper/40 cursor-pointer"
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
                  ? "bg-copper/15 text-copper border border-copper/30"
                  : "bg-charcoal-800/40 text-white/30 border border-charcoal-600/10 hover:text-white/50"
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
            const qty = getQty(item.id, item.price);
            const totalPrice = item.price * qty;
            const canAfford = item.price <= remaining;
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
                  relative p-3 rounded-xl border transition-all duration-200
                  ${
                    isBuying
                      ? "bg-copper/10 border-copper/40 scale-95"
                      : canAfford
                      ? "bg-charcoal-800/50 border-charcoal-600/15 hover:border-copper/20 hover:bg-charcoal-800/70"
                      : "bg-charcoal-800/20 border-charcoal-600/5 opacity-40"
                  }
                `}
              >
                {/* Emoji + Name */}
                <div className="text-2xl mb-1">{item.emoji}</div>
                <div className="text-xs text-white/80 font-medium truncate">
                  {item.name}
                </div>
                <div className="text-[10px] text-white/25 mt-0.5 truncate">
                  {item.description}
                </div>

                {/* Price */}
                <div className="text-sm font-serif text-copper mt-2">
                  {formatCurrency(item.price)}
                </div>

                {/* Quantity selector */}
                <div className="flex gap-1 mt-2 flex-wrap">
                  {QUANTITY_OPTIONS.map((q) => {
                    if (q === "MAX") {
                      if (!canAfford) return null;
                      const maxQty = Math.floor(remaining / item.price);
                      if (maxQty <= 1) return null;
                      return (
                        <button
                          key="MAX"
                          onClick={() => setQty(item.id, "MAX")}
                          className={`
                            px-1.5 py-0.5 rounded text-[9px] transition-colors
                            ${
                              currentQtySelection === "MAX"
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : "bg-charcoal-700/50 text-white/20 hover:text-red-400/60"
                            }
                          `}
                        >
                          MAX
                        </button>
                      );
                    }
                    const qTotal = item.price * q;
                    const qAfford = qTotal <= remaining;
                    if (!qAfford && q > 1) return null;
                    return (
                      <button
                        key={q}
                        onClick={() => setQty(item.id, q)}
                        className={`
                          px-1.5 py-0.5 rounded text-[9px] transition-colors
                          ${
                            currentQtySelection === q
                              ? "bg-copper/20 text-copper"
                              : "bg-charcoal-700/50 text-white/20 hover:text-white/40"
                          }
                        `}
                      >
                        ×{q}
                      </button>
                    );
                  })}
                </div>

                {/* Buy button */}
                <button
                  onClick={() => handleBuy(item)}
                  disabled={!canAfford || isBuying}
                  className={`
                    w-full mt-2 py-1.5 rounded-lg text-[10px] font-medium uppercase tracking-wider transition-all
                    ${
                      canAfford
                        ? currentQtySelection === "MAX"
                          ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                          : "bg-copper/10 text-copper hover:bg-copper/20"
                        : "bg-charcoal-700/30 text-white/10 cursor-not-allowed"
                    }
                  `}
                >
                  {isBuying
                    ? "✓"
                    : currentQtySelection === "MAX"
                    ? `${t("catalog.buyMax", locale)} (${qty.toLocaleString()}) — ${formatCurrency(totalPrice, true)}`
                    : qty > 1
                    ? `${t("catalog.buy", locale)} ${qty} — ${formatCurrency(totalPrice, totalPrice >= 1000000)}`
                    : t("catalog.buy", locale)}
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty search state */}
      {displayItems.length === 0 && (
        <div className="text-center py-8">
          <div className="text-2xl mb-2 opacity-30">🔍</div>
          <div className="text-xs text-white/20">{t("catalog.noResults", locale)}</div>
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
            className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl bg-copper/20 border border-copper/40 text-copper text-sm backdrop-blur-md z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
