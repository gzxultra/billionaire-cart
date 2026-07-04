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
        p-4 rounded-xl
        bg-surface/60 border border-line/20
        backdrop-blur-md
      "
    >
      <div className="flex gap-4">
        {/* Product image */}
        <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-surface-bright">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full bg-stone-gradient opacity-30 flex items-center justify-center text-2xl">
              📦
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-sand/90 truncate">
            {product.title}
          </h3>
          {product.description && (
            <p className="text-xs text-ash/50 mt-0.5 line-clamp-2">
              {product.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-lg font-serif text-champagne">
              {formatCurrency(product.price)}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-bright/50 text-ash/60 font-mono">
              {ASSET_LABELS[product.assetClass] || product.assetClass}
            </span>
          </div>
          {product.monthlyOverhead > 0 && (
            <div className="text-[10px] text-[#9B6B6B]/60 mt-1 font-mono">
              + {formatCurrency(product.monthlyOverhead)}{t("bankrupt.monthly", locale)} {t("product.hiddenCosts", locale)}
            </div>
          )}
        </div>
      </div>

      {/* Authorize button */}
      <motion.button
        onClick={onAuthorize}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="
          w-full mt-4 py-3 rounded-lg
          bg-stone-gradient text-sand font-semibold text-sm
          hover:shadow-stone-lg transition-shadow
        "
      >
        {t("product.authorize", locale)}
      </motion.button>
    </motion.div>
  );
}
