"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { SavedProduct, AssetClass } from "@/lib/types";
import { formatCurrency, assetLabel, timeAgo, proxyImage } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

interface PurchaseFeedProps {
  onRepurchase: (product: SavedProduct) => void;
}

const FILTER_CLASSES: (AssetClass | "all")[] = [
  "all",
  "supercar",
  "yacht",
  "aircraft",
  "real_estate",
  "rv_trailer",
  "luxury_fashion",
  "jewelry",
  "electronics",
  "other",
];

export function PurchaseFeed({ onRepurchase }: PurchaseFeedProps) {
  const savedProducts = useCartStore((s) => s.savedProducts);
  const removeSavedProduct = useCartStore((s) => s.removeSavedProduct);
  const clearAllSavedProducts = useCartStore((s) => s.clearAllSavedProducts);
  const locale = useLocale((s) => s.locale);

  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState<AssetClass | "all">("all");
  const [confirmClear, setConfirmClear] = useState(false);

  // Derive available filter tabs from actual data
  const availableClasses = useMemo(() => {
    const classes = new Set(savedProducts.map((sp) => sp.product.assetClass));
    return FILTER_CLASSES.filter((c) => c === "all" || classes.has(c));
  }, [savedProducts]);

  // Filtered products
  const filtered = useMemo(() => {
    let items = savedProducts;
    if (filterClass !== "all") {
      items = items.filter((sp) => sp.product.assetClass === filterClass);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      items = items.filter(
        (sp) =>
          sp.product.title.toLowerCase().includes(q) ||
          (sp.product.sourceDomain || "").toLowerCase().includes(q) ||
          (sp.product.description || "").toLowerCase().includes(q)
      );
    }
    return items;
  }, [savedProducts, filterClass, search]);

  if (savedProducts.length === 0) return null;

  // Group: recently purchased (purchaseCount > 0) vs just parsed
  const purchased = filtered.filter((sp) => sp.purchaseCount > 0);
  const browsed = filtered.filter((sp) => sp.purchaseCount === 0);

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    clearAllSavedProducts();
    setConfirmClear(false);
    setSearch("");
    setFilterClass("all");
  };

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🛍️</span>
          <h2 className="text-xs uppercase tracking-[0.2em] text-stone/85 font-medium">
            {t("feed.title", locale)}
          </h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone/20 text-stone/85 font-mono">
            {savedProducts.length}
          </span>
        </div>
        {/* Clear all button */}
        <button
          onClick={handleClear}
          className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
            confirmClear
              ? "bg-[#9B6B6B]/15 text-[#9B6B6B]/70 border border-[#9B6B6B]/20"
              : "text-ash/65 hover:text-ash/70"
          }`}
        >
          {confirmClear
            ? t("feed.clearConfirm", locale, { n: savedProducts.length })
            : t("feed.clearAll", locale)}
        </button>
      </div>

      {/* Search + filter bar — shows when 4+ items */}
      {savedProducts.length > 3 && (
        <div className="space-y-2">
          {/* Search input */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ash/72">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("feed.search", locale)}
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-surface/55 border border-line/30 text-sand/85 placeholder:text-ash/70 text-xs focus:outline-none focus:border-stone/30 transition-colors"
            />
          </div>

          {/* Asset class filter pills */}
          {availableClasses.length > 2 && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
              {availableClasses.map((cls) => (
                <button
                  key={cls}
                  onClick={() => setFilterClass(cls)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all border ${
                    filterClass === cls
                      ? "bg-stone/20 text-stone border-stone/35"
                      : "text-ash/72 hover:text-ash/70 border-transparent hover:border-line/40"
                  }`}
                >
                  {cls === "all"
                    ? t("feed.all", locale)
                    : assetLabel(cls, locale).split(" ").slice(0, 2).join(" ")}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No results */}
      {filtered.length === 0 && (search || filterClass !== "all") && (
        <div className="text-center py-4">
          <span className="text-xs text-ash/65">{t("feed.noResults", locale)}</span>
        </div>
      )}

      {/* Purchased items — horizontal scrollable strip */}
      {purchased.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-champagne/70 font-medium px-1">
            {t("feed.purchased", locale)}
          </span>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            <AnimatePresence>
              {purchased.map((sp) => (
                <FeedCard
                  key={sp.id}
                  item={sp}
                  onRepurchase={() => onRepurchase(sp)}
                  onRemove={() => removeSavedProduct(sp.id)}
                  locale={locale}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Browsed / parsed items */}
      {browsed.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-ash/70 font-medium px-1">
            {t("feed.browsed", locale)}
          </span>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            <AnimatePresence>
              {browsed.slice(0, 10).map((sp) => (
                <FeedCard
                  key={sp.id}
                  item={sp}
                  onRepurchase={() => onRepurchase(sp)}
                  onRemove={() => removeSavedProduct(sp.id)}
                  locale={locale}
                  dimmed
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Compact feed card ───────────────────────────────────────────────

interface FeedCardProps {
  item: SavedProduct;
  onRepurchase: () => void;
  onRemove: () => void;
  locale: "en" | "zh";
  dimmed?: boolean;
}

function FeedCard({ item, onRepurchase, onRemove, locale, dimmed }: FeedCardProps) {
  const { product } = item;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`
        shrink-0 w-44 rounded-xl overflow-hidden
        bg-surface/70 border border-line/30
        hover:border-stone/35 hover:bg-surface/70
        transition-all duration-200 group cursor-pointer
        ${dimmed ? "opacity-70 hover:opacity-100" : ""}
      `}
      onClick={onRepurchase}
    >
      {/* Mini image */}
      <div className="relative w-full aspect-[3/2] bg-surface-bright/80 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={proxyImage(product.imageUrl) || ""}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl opacity-20">
            📦
          </div>
        )}

        {/* Purchase count badge */}
        {item.purchaseCount > 0 && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-champagne/90 text-base text-[9px] font-bold">
            ×{item.purchaseCount}
          </div>
        )}

        {/* Remove button — hidden until hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-base/60 backdrop-blur-sm text-ash/70 hover:text-[#9B6B6B]/70 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ✕
        </button>

        {/* Gradient */}
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-surface/80 to-transparent" />
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-1">
        <div className="flex items-center gap-1.5">
          {product.favicon && (
            <img
              src={product.favicon}
              alt=""
              className="w-3 h-3 rounded-sm shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <span className="text-[11px] text-sand truncate font-medium leading-tight">
            {product.title}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-serif text-champagne">
            {formatCurrency(product.price)}
          </span>
          <span className="text-[9px] text-ash/65">{timeAgo(item.parsedAt, locale)}</span>
        </div>
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[9px] text-ash/72 font-mono truncate">
            {assetLabel(product.assetClass, locale).split(" ").slice(0, 2).join(" ")}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone/20 text-stone/85 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
            {t("omni.rebuy", locale)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
