"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectRemaining } from "@/lib/store";
import { catalogItems, CatalogItem } from "@/data/catalog";
import { generateId, formatCurrency } from "@/lib/format";
import { playTieredPurchase } from "@/lib/sounds";
import { toast } from "@/lib/use-toast";
import { useLocale } from "@/lib/use-locale";
import { applyWealthDna } from "@/lib/wealth-dna";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Wishlist Store ─────────────────────────────────────────────────
interface WishlistState {
  items: string[]; // catalog item IDs
  add: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (id: string) => {
        if (!get().items.includes(id)) {
          set({ items: [...get().items, id] });
        }
      },
      remove: (id: string) => {
        set({ items: get().items.filter((x) => x !== id) });
      },
      clear: () => set({ items: [] }),
      has: (id: string) => get().items.includes(id),
    }),
    { name: "billionaire-wishlist" }
  )
);

// ─── Main Wishlist Component ────────────────────────────────────────
interface WishlistProps {
  onPurchase?: (totalPrice: number) => void;
}

export function Wishlist({ onPurchase }: WishlistProps) {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const addPurchase = useCartStore((s) => s.addPurchase);
  const soundEnabled = useCartStore((s) => s.soundEnabled);
  const remaining = useCartStore(selectRemaining);
  const { items, remove, clear } = useWishlistStore();
  const [isBuying, setIsBuying] = useState(false);
  const [buyProgress, setBuyProgress] = useState(0);

  // Resolve wishlist items to catalog entries
  const wishlistItems = useMemo(() => {
    return items
      .map((id) => catalogItems.find((c) => c.id === id))
      .filter((x): x is CatalogItem => !!x);
  }, [items]);

  // Calculate totals with DNA modifiers
  const totals = useMemo(() => {
    if (!selectedBillionaire) return { total: 0, items: [] as { item: CatalogItem; effectivePrice: number }[] };
    const resolved = wishlistItems.map((item) => {
      const dna = applyWealthDna(
        { title: item.name, price: item.price, assetClass: item.assetClass },
        selectedBillionaire
      );
      return { item, effectivePrice: dna.isFree ? 0 : dna.adjustedPrice };
    });
    return {
      total: resolved.reduce((sum, r) => sum + r.effectivePrice, 0),
      items: resolved,
    };
  }, [wishlistItems, selectedBillionaire]);

  const canAfford = remaining >= totals.total;

  // Buy all items in wishlist
  const handleBuyAll = useCallback(async () => {
    if (!selectedBillionaire || isBuying || !canAfford) return;
    setIsBuying(true);
    setBuyProgress(0);

    for (let i = 0; i < totals.items.length; i++) {
      const { item, effectivePrice } = totals.items[i];
      const purchase = {
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
      };
      addPurchase(purchase);
      if (soundEnabled) playTieredPurchase(effectivePrice);
      setBuyProgress(((i + 1) / totals.items.length) * 100);
      // Small delay for satisfying cascade effect
      await new Promise((r) => setTimeout(r, 150));
    }

    onPurchase?.(totals.total);
    const toastMsg = locale === "zh"
      ? `🛒 一口气买了 ${totals.items.length} 件，共 ${formatCurrency(totals.total, true)}`
      : `🛒 Bought ${totals.items.length} items for ${formatCurrency(totals.total, true)}`;
    toast(toastMsg);

    clear();
    setIsBuying(false);
    setBuyProgress(0);
  }, [selectedBillionaire, isBuying, canAfford, totals, addPurchase, soundEnabled, onPurchase, locale, clear]);

  if (!selectedBillionaire || wishlistItems.length === 0) return null;

  return (
    <section className="card-panel-champagne p-5 sm:p-8 stagger-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">⭐</span>
          <h2 className="text-xs uppercase tracking-[0.2em] text-stone/75 font-medium">
            {locale === "zh"
              ? `愿望清单 (${wishlistItems.length})`
              : `Wishlist (${wishlistItems.length})`}
          </h2>
        </div>
        <button
          onClick={clear}
          className="text-[10px] text-ash/50 hover:text-[#9B6B6B]/70 transition-colors"
        >
          {locale === "zh" ? "清空" : "Clear"}
        </button>
      </div>

      {/* Items list */}
      <div className="space-y-2 mb-4">
        <AnimatePresence>
          {totals.items.map(({ item, effectivePrice }) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              className="flex items-center gap-3 py-2 border-b border-line/15 last:border-0"
            >
              <span className="text-lg shrink-0">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-sand/90 truncate">
                  {locale === "zh" ? item.nameZh : item.name}
                </div>
                <div className="text-[10px] text-ash/50 font-mono tabular-nums">
                  {formatCurrency(effectivePrice)}
                </div>
              </div>
              <button
                onClick={() => remove(item.id)}
                className="text-ash/40 hover:text-[#9B6B6B]/70 transition-colors text-sm shrink-0"
                title={locale === "zh" ? "移除" : "Remove"}
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Totals */}
      <div className="p-3 rounded-xl bg-surface-bright/40 border border-line/20 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-ash/50">
            {locale === "zh" ? "总计" : "Total"}
          </span>
          <span className="text-base font-serif text-champagne tabular-nums">
            {formatCurrency(totals.total, totals.total >= 1_000_000)}
          </span>
        </div>
        {!canAfford && (
          <div className="text-[10px] text-[#9B6B6B]/70 mt-1 text-right">
            {locale === "zh" ? "余额不足" : "Insufficient balance"}
          </div>
        )}
      </div>

      {/* Buy progress */}
      {isBuying && (
        <div className="mb-4">
          <div className="h-2 rounded-full bg-surface-dim/60 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${buyProgress}%` }}
              className="h-full rounded-full bg-champagne/60"
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            />
          </div>
          <div className="text-[9px] text-ash/40 text-center mt-1 font-mono">
            {locale === "zh" ? "批量购买中..." : "Processing batch..."}
          </div>
        </div>
      )}

      {/* Buy All button */}
      <motion.button
        onClick={handleBuyAll}
        disabled={isBuying || !canAfford}
        whileHover={{ scale: canAfford ? 1.01 : 1 }}
        whileTap={{ scale: canAfford ? 0.98 : 1 }}
        className={`w-full py-3 rounded-xl text-sm font-semibold tracking-wide transition-all ${
          canAfford && !isBuying
            ? "bg-stone-gradient text-sand shadow-stone-sm hover:shadow-stone"
            : "bg-surface-dim/40 text-ash/40 cursor-not-allowed"
        }`}
      >
        {isBuying
          ? locale === "zh"
            ? "购买中..."
            : "Buying..."
          : locale === "zh"
          ? `🛒 一键全买 — ${formatCurrency(totals.total, totals.total >= 1_000_000)}`
          : `🛒 Buy All — ${formatCurrency(totals.total, totals.total >= 1_000_000)}`}
      </motion.button>
    </section>
  );
}
