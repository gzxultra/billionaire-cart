"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectMonthlyBurn } from "@/lib/store";
import { formatCurrency, timeAgo, assetLabel } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

export function Vault() {
  const locale = useLocale((s) => s.locale);
  const purchases = useCartStore((s) => s.purchases);
  const removePurchase = useCartStore((s) => s.removePurchase);
  const totalSpent = useCartStore(selectTotalSpent);
  const monthlyBurn = useCartStore(selectMonthlyBurn);

  if (purchases.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3 opacity-30">🔒</div>
        <div className="text-xs text-ash/42 uppercase tracking-[0.2em]">
          {t("vault.empty", locale)}
        </div>
        <div className="text-xs text-ash/15 mt-1">
          {t("vault.emptyHint", locale)}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="section-label">
          {t("vault.title", locale)}
        </h2>
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.15em]">
          <span className="text-ash/50">
            {t("vault.deployed", locale)}: <span className="text-champagne">{formatCurrency(totalSpent, true)}</span>
          </span>
          {monthlyBurn > 0 && (
            <span className="text-ash/50">
              {t("vault.burn", locale)}: <span className="text-[#9B6B6B]/70">-{formatCurrency(monthlyBurn, true)}/mo</span>
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <AnimatePresence initial={false}>
          {[...purchases].reverse().map((purchase) => (
            <motion.div
              key={purchase.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="
                group flex items-center gap-3 p-3 rounded-lg
                bg-surface/30 border border-line/18
                hover:bg-surface/50 hover:border-line/25
                transition-colors
              "
            >
              {/* Thumbnail */}
              <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 bg-surface-bright">
                {purchase.product.imageUrl ? (
                  <img
                    src={purchase.product.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-stone-gradient opacity-20 flex items-center justify-center text-sm">
                    📦
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-sand truncate">
                  {purchase.product.title}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs font-serif text-champagne">
                    {formatCurrency(purchase.product.price)}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-bright/45 text-ash/50">
                    {assetLabel(purchase.product.assetClass, locale)}
                  </span>
                  {purchase.product.monthlyOverhead > 0 && (
                    <span className="text-[9px] text-[#9B6B6B]/50">
                      -{formatCurrency(purchase.product.monthlyOverhead)}/mo
                    </span>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <span className="text-[9px] text-ash/35 shrink-0 hidden sm:block">
                {timeAgo(purchase.timestamp, locale)}
              </span>

              {/* Remove button */}
              <button
                onClick={() => removePurchase(purchase.id)}
                className="opacity-0 group-hover:opacity-100 text-ash/42 hover:text-[#9B6B6B]/60 transition-all text-xs"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
