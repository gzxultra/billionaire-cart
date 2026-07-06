"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CatalogItem, catalogItems } from "@/data/catalog";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { useCartStore, selectRemaining } from "@/lib/store";
import { applyWealthDna, formatModifier } from "@/lib/wealth-dna";

interface StaffPicksProps {
  onBuy: (item: CatalogItem) => void;
}

interface PickSet {
  titleEn: string;
  titleZh: string;
  emoji: string;
  filter: (items: CatalogItem[]) => CatalogItem[];
}

const PICK_SETS: PickSet[] = [
  {
    titleEn: "Editor's Choice",
    titleZh: "编辑精选",
    emoji: "⭐",
    filter: (items) => {
      // Interesting mid-range items
      const interesting = items.filter((i) => i.price >= 10000 && i.price <= 50_000_000);
      return shuffle(interesting).slice(0, 3);
    },
  },
  {
    titleEn: "Most Absurd",
    titleZh: "最荒诞",
    emoji: "🤯",
    filter: (items) => {
      return items.filter((i) => i.tier === "absurd").slice(0, 3);
    },
  },
  {
    titleEn: "Everyday Flex",
    titleZh: "日常炫富",
    emoji: "💅",
    filter: (items) => {
      return shuffle(items.filter((i) => i.tier === "everyday" || i.tier === "aspirational")).slice(0, 3);
    },
  },
  {
    titleEn: "Luxury Living",
    titleZh: "奢华生活",
    emoji: "👑",
    filter: (items) => {
      return shuffle(items.filter((i) => i.tier === "luxury" || i.tier === "ultra")).slice(0, 3);
    },
  },
];

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function StaffPicks({ onBuy }: StaffPicksProps) {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const remaining = useCartStore(selectRemaining);
  const [activeSetIdx, setActiveSetIdx] = useState(0);
  const [picks, setPicks] = useState<CatalogItem[]>([]);

  // Rotate pick set every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSetIdx((prev) => (prev + 1) % PICK_SETS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Regenerate picks when set changes
  useEffect(() => {
    const set = PICK_SETS[activeSetIdx];
    setPicks(set.filter(catalogItems));
  }, [activeSetIdx]);

  const activeSet = PICK_SETS[activeSetIdx];

  if (!selectedBillionaire || picks.length === 0) return null;

  return (
    <div className="mb-4">
      {/* Header with set indicators */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <AnimatePresence mode="wait">
            <motion.span
              key={activeSetIdx}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="text-sm"
            >
              {activeSet.emoji}
            </motion.span>
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.span
              key={activeSetIdx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="text-[10px] uppercase tracking-[0.15em] text-stone/70 font-medium"
            >
              {locale === "zh" ? activeSet.titleZh : activeSet.titleEn}
            </motion.span>
          </AnimatePresence>
        </div>
        {/* Dots indicator */}
        <div className="flex items-center gap-1">
          {PICK_SETS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveSetIdx(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === activeSetIdx ? "bg-stone/60 w-3" : "bg-ash/25 hover:bg-ash/40"
              }`}
              aria-label={`Pick set ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Horizontal scroll picks */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSetIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1"
        >
          {picks.map((item) => {
            const dna = applyWealthDna(
              {
                title: item.name,
                price: item.price,
                assetClass: item.assetClass,
              },
              selectedBillionaire
            );
            const canAfford = remaining >= (dna.isFree ? 0 : dna.adjustedPrice);

            return (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => canAfford ? onBuy(item) : undefined}
                disabled={!canAfford}
                className={`
                  shrink-0 w-[140px] rounded-xl p-3 text-left transition-all border
                  ${canAfford
                    ? "bg-surface-bright/50 border-line/30 hover:border-stone/30 cursor-pointer"
                    : "bg-surface-dim/40 border-line/20 opacity-50 cursor-not-allowed"
                  }
                `}
              >
                <div className="text-2xl mb-2">{item.emoji}</div>
                <div className="text-[11px] font-medium text-sand truncate">
                  {locale === "zh" ? item.nameZh : item.name}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {dna.isFree ? (
                    <span className="text-[10px] font-serif text-sage font-medium">FREE</span>
                  ) : dna.modifier != null ? (
                    <>
                      <span className="text-[10px] font-serif text-champagne font-medium">
                        {formatCurrency(dna.adjustedPrice, true)}
                      </span>
                      <span className={`text-[8px] ${dna.modifier < 0 ? "text-sage/70" : "text-[#9B6B6B]/70"}`}>
                        {formatModifier(dna.modifier)}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] font-serif text-champagne/80 font-medium">
                      {formatCurrency(item.price, true)}
                    </span>
                  )}
                </div>
                {canAfford && (
                  <div className="mt-2 text-[8px] text-stone/50 uppercase tracking-wider">
                    {locale === "zh" ? "点击购买" : "Tap to buy"}
                  </div>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
