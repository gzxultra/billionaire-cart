"use client";

import { memo, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { catalogItems, CatalogItem } from "@/data/catalog";

/**
 * WhatElseCould — after purchasing, shows what else you could have bought
 * for the same price from the catalog. "Instead of a yacht, you could have
 * bought 10,000 iPhones."
 */

interface Alternative {
  item: CatalogItem;
  qty: number;
  totalCost: number;
}

function WhatElseCouldInner() {
  const locale = useLocale((s) => s.locale);
  const zh = locale === "zh";
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const lastPurchase = purchases.length > 0 ? purchases[purchases.length - 1] : null;

  const alternatives: Alternative[] = useMemo(() => {
    if (!lastPurchase) return [];
    const price = lastPurchase.product.price;
    if (price <= 0) return [];

    // Find catalog items cheaper than this purchase where you could buy multiple
    const candidates: Alternative[] = [];
    for (const item of catalogItems) {
      if (item.price <= 0 || item.price >= price * 0.8) continue;
      const qty = Math.floor(price / item.price);
      if (qty >= 2) {
        candidates.push({ item, qty, totalCost: qty * item.price });
      }
    }

    // Sort by most interesting: highest quantity, but prefer diverse tiers
    candidates.sort((a, b) => b.qty - a.qty);

    // Pick 4 diverse alternatives: 1 everyday, 1 aspirational, 1 luxury, 1 wildcard
    const result: Alternative[] = [];
    const usedTiers = new Set<string>();

    for (const c of candidates) {
      if (result.length >= 4) break;
      if (!usedTiers.has(c.item.tier)) {
        result.push(c);
        usedTiers.add(c.item.tier);
      }
    }

    // Fill remaining slots
    for (const c of candidates) {
      if (result.length >= 4) break;
      if (!result.includes(c)) {
        result.push(c);
      }
    }

    return result;
  }, [lastPurchase]);

  if (!selectedBillionaire || !lastPurchase || alternatives.length === 0) return null;
  if (dismissed === lastPurchase.id) return null;

  const purchaseName = lastPurchase.product.title;
  const purchasePrice = lastPurchase.product.price;

  return (
    <AnimatePresence>
      <motion.section
        key={lastPurchase.id}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="card-panel p-5 sm:p-8 stagger-section overflow-hidden"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">🤔</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-stone/75 font-medium">
              {zh ? "你也可以买…" : "What Else Could You Buy?"}
            </span>
          </div>
          <button
            onClick={() => setDismissed(lastPurchase.id)}
            className="text-[10px] text-ash/40 hover:text-ash/60 transition-colors"
          >
            ✕
          </button>
        </div>

        <p className="text-[11px] text-ash/60 mb-3">
          {zh
            ? `花 ${formatCurrency(purchasePrice, true)} 买了「${purchaseName}」，同样的钱还能买：`
            : `For the price of "${purchaseName}" (${formatCurrency(purchasePrice, true)}), you could also get:`}
        </p>

        <div className="grid grid-cols-2 gap-2">
          {alternatives.map((alt, i) => (
            <motion.div
              key={alt.item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-surface-dim/60 border border-line/30 hover:border-stone/20 transition-all"
            >
              <span className="text-xl shrink-0">{alt.item.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-sand font-medium truncate">
                  {zh ? alt.item.nameZh : alt.item.name}
                </div>
                <div className="text-[13px] font-mono text-champagne/80 font-semibold">
                  ×{alt.qty.toLocaleString()}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </AnimatePresence>
  );
}

export const WhatElseCould = memo(WhatElseCouldInner);
