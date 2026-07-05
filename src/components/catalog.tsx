"use client";

import { useState, useCallback, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { useCartStore, selectRemaining } from "@/lib/store";
import { catalogItems, CatalogItem } from "@/data/catalog";
import { generateId } from "@/lib/format";
import { playAuthorize, playSparkle } from "@/lib/sounds";
import { toast } from "@/lib/use-toast";
import { ParticleBurst } from "./particle-burst";
import { useLocale } from "@/lib/use-locale";
import { t, tierLabel } from "@/lib/i18n";
import { applyWealthDna } from "@/lib/wealth-dna";
import { CatalogItemCard } from "./catalog-item-card";

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

  const purchases = useCartStore((s) => s.purchases);

  const [activeTier, setActiveTier] = useState<CatalogItem["tier"] | "all">(
    "everyday"
  );
  const [showBurst, setShowBurst] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("default");

  // Filtered + sorted items
  const displayItems = useMemo(() => {
    let items = catalogItems;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.nameZh.includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.descriptionZh.includes(q) ||
          item.emoji.includes(q)
      );
    } else if (activeTier !== "all") {
      items = items.filter((item) => item.tier === activeTier);
    }

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

  // Count how many of each catalog item has been purchased
  const purchaseCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of purchases) {
      const match = p.product.sourceUrl.match(/^catalog:\/\/(.+)$/);
      if (match) {
        map.set(match[1], (map.get(match[1]) || 0) + 1);
      }
    }
    return map;
  }, [purchases]);

  // Pre-compute DNA data for each visible item
  const itemDnaMap = useMemo(() => {
    const map = new Map<
      string,
      { effectivePrice: number; isFree: boolean; modifier: number | null | undefined }
    >();
    for (const item of displayItems) {
      const dna = applyWealthDna(
        { title: item.name, price: item.price, assetClass: item.assetClass },
        selectedBillionaire
      );
      map.set(item.id, {
        effectivePrice: dna.adjustedPrice,
        isFree: dna.isFree,
        modifier: dna.modifier,
      });
    }
    return map;
  }, [displayItems, selectedBillionaire]);

  const handleBuy = useCallback(
    (item: CatalogItem, qty: number = 1) => {
      if (!selectedBillionaire) return;

      const dna = applyWealthDna(
        { title: item.name, price: item.price, assetClass: item.assetClass },
        selectedBillionaire
      );
      const effectivePrice = dna.adjustedPrice;
      const actualQty = Math.max(1, qty);
      const totalCost = effectivePrice * actualQty;

      if (soundEnabled) {
        playAuthorize();
        playSparkle();
      }
      setShowBurst(true);
      setTimeout(() => setShowBurst(false), 1500);

      // Batch add purchases
      let lastUnlocked: string[] = [];
      for (let i = 0; i < actualQty; i++) {
        lastUnlocked = addPurchase({
          id: generateId(),
          product: {
            title: item.name,
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
      }

      onPurchase?.(totalCost);

      if (lastUnlocked.length > 0) {
        toast(`🏆 ${lastUnlocked.join(", ")}`, 4000);
      } else if (actualQty > 1) {
        toast(`✓ ${actualQty.toLocaleString()}× ${item.name}`);
      }
    },
    [selectedBillionaire, soundEnabled, addPurchase, onPurchase]
  );

  const tiers: Array<CatalogItem["tier"] | "all"> = [
    "all",
    "everyday",
    "aspirational",
    "luxury",
    "ultra",
    "absurd",
  ];

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { all: catalogItems.length };
    for (const item of catalogItems) {
      counts[item.tier] = (counts[item.tier] || 0) + 1;
    }
    return counts;
  }, []);

  if (!selectedBillionaire) return null;

  return (
    <div className="w-full">
      <h2 className="section-label mb-4">{t("catalog.title", locale)}</h2>

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

      {/* Tier tabs with item counts */}
      <div
        className="flex gap-1 mb-4 overflow-x-auto scrollbar-hide pb-1 tier-tabs"
        role="tablist"
        aria-label={locale === "zh" ? "商品分类" : "Product categories"}
      >
        {tiers.map((tier) => (
          <button
            key={tier}
            onClick={() => {
              setActiveTier(tier);
              if (tier !== "all") setSearchQuery("");
            }}
            role="tab"
            aria-selected={activeTier === tier}
            aria-controls="catalog-grid"
            className={`
              px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all flex items-center gap-1.5
              ${
                activeTier === tier
                  ? "bg-stone/20 text-stone border border-stone/30"
                  : "bg-surface/55 text-ash/70 border border-line/50 hover:text-ash/80"
              }
            `}
          >
            {tier === "all"
              ? t("catalog.all", locale)
              : tierLabel(tier, locale)}
            <span
              className={`text-[9px] font-mono ${
                activeTier === tier ? "text-stone/60" : "text-ash/50"
              }`}
            >
              {tierCounts[tier] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Item grid */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 gap-2"
        id="catalog-grid"
        role="tabpanel"
      >
        <AnimatePresence mode="popLayout">
          {displayItems.map((item) => {
            const dnaData = itemDnaMap.get(item.id);
            const effectivePrice = dnaData?.effectivePrice ?? item.price;
            const isFree = dnaData?.isFree ?? false;
            const canAfford = effectivePrice <= remaining || isFree;

            return (
              <CatalogItemCard
                key={item.id}
                item={item}
                effectivePrice={effectivePrice}
                isFree={isFree}
                modifier={dnaData?.modifier}
                canAfford={canAfford}
                remaining={remaining}
                onBuy={handleBuy}
                purchaseCount={purchaseCountMap.get(item.id) || 0}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty search state */}
      {displayItems.length === 0 && (
        <div className="text-center py-8">
          <div className="text-2xl mb-2 opacity-30">🔍</div>
          <div className="text-xs text-ash/65">
            {t("catalog.noResults", locale)}
          </div>
        </div>
      )}

      {showBurst && <ParticleBurst />}
    </div>
  );
}
