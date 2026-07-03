"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectMonthlyBurn } from "@/lib/store";
import { formatCurrency, timeAgo, ASSET_LABELS } from "@/lib/format";

export function Vault() {
  const purchases = useCartStore((s) => s.purchases);
  const removePurchase = useCartStore((s) => s.removePurchase);
  const totalSpent = useCartStore(selectTotalSpent);
  const monthlyBurn = useCartStore(selectMonthlyBurn);

  if (purchases.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3 opacity-30">🔒</div>
        <div className="text-xs text-white/20 uppercase tracking-[0.2em]">
          The Vault is Empty
        </div>
        <div className="text-xs text-white/10 mt-1">
          Paste a URL above to make your first acquisition
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs uppercase tracking-[0.3em] text-copper/60 font-sans">
          The Vault
        </h2>
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.15em]">
          <span className="text-white/30">
            Deployed: <span className="text-copper">{formatCurrency(totalSpent, true)}</span>
          </span>
          {monthlyBurn > 0 && (
            <span className="text-white/30">
              Burn: <span className="text-red-400/70">-{formatCurrency(monthlyBurn, true)}/mo</span>
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
                bg-charcoal-800/30 border border-charcoal-600/10
                hover:bg-charcoal-800/50 hover:border-charcoal-600/20
                transition-colors
              "
            >
              {/* Thumbnail */}
              <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 bg-charcoal-700">
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
                  <div className="w-full h-full bg-copper-gradient opacity-20 flex items-center justify-center text-sm">
                    📦
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white/80 truncate">
                  {purchase.product.title}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-serif text-copper">
                    {formatCurrency(purchase.product.price)}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-charcoal-600/30 text-white/25">
                    {ASSET_LABELS[purchase.product.assetClass] || purchase.product.assetClass}
                  </span>
                  {purchase.product.monthlyOverhead > 0 && (
                    <span className="text-[9px] text-red-400/50">
                      -{formatCurrency(purchase.product.monthlyOverhead)}/mo
                    </span>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <span className="text-[9px] text-white/15 shrink-0">
                {timeAgo(purchase.timestamp)}
              </span>

              {/* Remove button */}
              <button
                onClick={() => removePurchase(purchase.id)}
                className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400/60 transition-all text-xs"
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
