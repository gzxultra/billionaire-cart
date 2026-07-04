"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { SavedProduct } from "@/lib/types";
import { formatCurrency, ASSET_LABELS, timeAgo } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

interface PurchaseFeedProps {
  onRepurchase: (product: SavedProduct) => void;
}

export function PurchaseFeed({ onRepurchase }: PurchaseFeedProps) {
  const savedProducts = useCartStore((s) => s.savedProducts);
  const removeSavedProduct = useCartStore((s) => s.removeSavedProduct);
  const locale = useLocale((s) => s.locale);

  if (savedProducts.length === 0) return null;

  // Group: recently purchased (purchaseCount > 0) vs just parsed
  const purchased = savedProducts.filter((sp) => sp.purchaseCount > 0);
  const browsed = savedProducts.filter((sp) => sp.purchaseCount === 0);

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🛍️</span>
          <h2 className="text-xs uppercase tracking-[0.2em] text-stone/60 font-medium">
            {t("feed.title", locale)}
          </h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone/10 text-stone/50 font-mono">
            {savedProducts.length}
          </span>
        </div>
      </div>

      {/* Purchased items — horizontal scrollable strip */}
      {purchased.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-champagne/50 font-medium px-1">
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
          <span className="text-[10px] uppercase tracking-wider text-ash/40 font-medium px-1">
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
        bg-surface/50 border border-line/12
        hover:border-stone/15 hover:bg-surface/70
        transition-all duration-200 group cursor-pointer
        ${dimmed ? "opacity-70 hover:opacity-100" : ""}
      `}
      onClick={onRepurchase}
    >
      {/* Mini image */}
      <div className="relative w-full aspect-[3/2] bg-surface-bright/20 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
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
          className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-base/60 backdrop-blur-sm text-ash/40 hover:text-[#9B6B6B]/70 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
          <span className="text-[11px] text-sand/80 truncate font-medium leading-tight">
            {product.title}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-serif text-champagne">
            {formatCurrency(product.price)}
          </span>
          <span className="text-[9px] text-ash/30">{timeAgo(item.parsedAt, locale)}</span>
        </div>
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[9px] text-ash/25 font-mono truncate">
            {ASSET_LABELS[product.assetClass]?.split(" ")[0] || "📦"}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone/10 text-stone/50 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
            {t("omni.rebuy", locale)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
