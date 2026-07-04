"use client";

import { motion } from "framer-motion";
import { ParsedProduct } from "@/lib/types";
import { formatCurrency, ASSET_LABELS } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

interface ProductCardProps {
  product: ParsedProduct;
  onAuthorize: () => void;
}

export function ProductCard({ product, onAuthorize }: ProductCardProps) {
  const locale = useLocale((s) => s.locale);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="
        rounded-xl overflow-hidden
        bg-surface/60 border border-line/20
        backdrop-blur-md
      "
    >
      {/* Large product image */}
      <div className="relative w-full aspect-[16/9] bg-surface-bright/30 overflow-hidden">
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
          <div className="w-full h-full bg-stone-gradient opacity-20 flex items-center justify-center text-4xl">
            📦
          </div>
        )}
        {/* Price overlay */}
        <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-base/80 backdrop-blur-md border border-line/20">
          <span className="text-lg font-serif text-champagne">
            {formatCurrency(product.price)}
          </span>
        </div>
        {/* Asset class badge */}
        <div className="absolute top-3 left-3">
          <span className="text-[10px] px-2 py-1 rounded-full bg-base/70 backdrop-blur-md text-ash/70 font-mono border border-line/15">
            {ASSET_LABELS[product.assetClass] || product.assetClass}
          </span>
        </div>
      </div>

      {/* Product info */}
      <div className="p-4 space-y-2">
        <div className="flex items-start gap-2">
          {/* Source favicon */}
          {product.favicon && product.sourceDomain && (
            <img
              src={product.favicon}
              alt=""
              className="w-4 h-4 rounded-sm shrink-0 mt-0.5"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-sand/90 line-clamp-2 leading-snug">
              {product.title}
            </h3>
            {product.sourceDomain && (
              <span className="text-[10px] text-ash/40 mt-0.5 block">
                {product.sourceDomain}
              </span>
            )}
          </div>
        </div>

        {product.description && product.description !== "Manually entered item" && (
          <p className="text-xs text-ash/50 line-clamp-2">
            {product.description}
          </p>
        )}

        {product.monthlyOverhead > 0 && (
          <div className="text-[10px] text-[#9B6B6B]/60 font-mono">
            + {formatCurrency(product.monthlyOverhead)}{t("bankrupt.monthly", locale)} {t("product.hiddenCosts", locale)}
          </div>
        )}

        {/* Authorize button */}
        <motion.button
          onClick={onAuthorize}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="
            w-full mt-1 py-3 rounded-lg
            bg-stone-gradient text-sand font-semibold text-sm
            hover:shadow-stone-lg transition-shadow
          "
        >
          {t("product.authorize", locale)}
        </motion.button>
      </div>
    </motion.div>
  );
}
