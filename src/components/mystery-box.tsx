"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectRemaining } from "@/lib/store";
import { catalogItems, CatalogItem } from "@/data/catalog";
import { generateId, formatCurrency } from "@/lib/format";
import { applyWealthDna } from "@/lib/wealth-dna";
import { playAuthorize, playSparkle } from "@/lib/sounds";
import { toast } from "@/lib/use-toast";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

type BoxTier = "bronze" | "silver" | "gold" | "diamond";

interface BoxConfig {
  tier: BoxTier;
  label: string;
  labelZh: string;
  emoji: string;
  minPrice: number;
  maxPrice: number;
  cost: number;
  gradient: string;
  glow: string;
}

const BOX_TIERS: BoxConfig[] = [
  {
    tier: "bronze",
    label: "Bronze Box",
    labelZh: "青铜宝箱",
    emoji: "📦",
    minPrice: 0,
    maxPrice: 1_000,
    cost: 500,
    gradient: "from-amber-800/20 via-amber-700/10 to-amber-900/20",
    glow: "rgba(180, 120, 60, 0.3)",
  },
  {
    tier: "silver",
    label: "Silver Box",
    labelZh: "白银宝箱",
    emoji: "🪄",
    minPrice: 1_000,
    maxPrice: 100_000,
    cost: 50_000,
    gradient: "from-slate-400/20 via-slate-300/10 to-slate-500/20",
    glow: "rgba(160, 170, 190, 0.3)",
  },
  {
    tier: "gold",
    label: "Gold Box",
    labelZh: "黄金宝箱",
    emoji: "✨",
    minPrice: 100_000,
    maxPrice: 10_000_000,
    cost: 5_000_000,
    gradient: "from-yellow-600/20 via-amber-400/10 to-yellow-700/20",
    glow: "rgba(210, 170, 50, 0.35)",
  },
  {
    tier: "diamond",
    label: "Diamond Box",
    labelZh: "钻石宝箱",
    emoji: "💎",
    minPrice: 10_000_000,
    maxPrice: Infinity,
    cost: 100_000_000,
    gradient: "from-cyan-400/20 via-purple-400/10 to-blue-500/20",
    glow: "rgba(130, 160, 255, 0.35)",
  },
];

export function MysteryBox() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const addPurchase = useCartStore((s) => s.addPurchase);
  const soundEnabled = useCartStore((s) => s.soundEnabled);
  const remaining = useCartStore(selectRemaining);

  const [opening, setOpening] = useState(false);
  const [revealedItem, setRevealedItem] = useState<CatalogItem | null>(null);
  const [activeTier, setActiveTier] = useState<BoxTier | null>(null);
  const [shimmerPhase, setShimmerPhase] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Animate shimmer while opening
  useEffect(() => {
    if (!opening) return;
    const iv = setInterval(() => setShimmerPhase((p) => p + 1), 100);
    return () => clearInterval(iv);
  }, [opening]);

  // Filtered items per tier
  const tierItems = useMemo(() => {
    const map = new Map<BoxTier, CatalogItem[]>();
    for (const tier of BOX_TIERS) {
      map.set(
        tier.tier,
        catalogItems.filter(
          (i) => i.price >= tier.minPrice && i.price < tier.maxPrice && i.price > 0
        )
      );
    }
    return map;
  }, []);

  const openBox = useCallback(
    (config: BoxConfig) => {
      if (!selectedBillionaire || opening) return;
      const items = tierItems.get(config.tier) || [];
      if (items.length === 0) return;

      const effectiveCost = config.cost;
      if (remaining < effectiveCost) {
        toast(
          locale === "zh" ? "余额不足开启宝箱" : "Not enough to open this box"
        );
        return;
      }

      setOpening(true);
      setActiveTier(config.tier);
      setRevealedItem(null);

      if (soundEnabled) playAuthorize();

      // Reveal after suspenseful delay
      timerRef.current = setTimeout(() => {
        const picked = items[Math.floor(Math.random() * items.length)];
        setRevealedItem(picked);

        const dna = applyWealthDna(
          { title: picked.name, price: picked.price, assetClass: picked.assetClass },
          selectedBillionaire
        );

        addPurchase({
          id: generateId(),
          product: {
            title: picked.name,
            price: dna.adjustedPrice,
            imageUrl: null,
            description: picked.description,
            sourceUrl: `catalog://${picked.id}`,
            assetClass: picked.assetClass,
            monthlyOverhead: picked.monthlyOverhead,
          },
          billionaireId: selectedBillionaire.id,
          timestamp: Date.now(),
        });

        if (soundEnabled) playSparkle();

        const profit = dna.adjustedPrice - effectiveCost;
        const profitStr =
          profit > 0
            ? locale === "zh"
              ? `赚了 ${formatCurrency(profit)}！`
              : `Profit: ${formatCurrency(profit)}!`
            : profit < 0
              ? locale === "zh"
                ? `亏了 ${formatCurrency(Math.abs(profit))}`
                : `Lost: ${formatCurrency(Math.abs(profit))}`
              : locale === "zh"
                ? "刚好持平"
                : "Break even!";

        toast(
          `${picked.emoji} ${locale === "zh" ? picked.nameZh : picked.name} — ${profitStr}`
        );

        // Auto-close after 3s
        timerRef.current = setTimeout(() => {
          setOpening(false);
          setRevealedItem(null);
          setActiveTier(null);
        }, 3000);
      }, 1800);
    },
    [selectedBillionaire, opening, remaining, addPurchase, soundEnabled, locale, tierItems]
  );

  if (!selectedBillionaire) return null;

  return (
    <section className="card-panel p-5 sm:p-8">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-base">🎁</span>
        <h2 className="text-xs uppercase tracking-[0.2em] text-stone/75 font-medium">
          {locale === "zh" ? "神秘宝箱" : "Mystery Box"}
        </h2>
        <span className="text-[10px] text-ash/50 ml-auto font-mono">
          {locale === "zh" ? "开箱有惊喜" : "Unbox a surprise"}
        </span>
      </div>

      {/* Box grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BOX_TIERS.map((config) => {
          const items = tierItems.get(config.tier) || [];
          const canAfford = remaining >= config.cost;
          const isActive = activeTier === config.tier && opening;

          return (
            <button
              key={config.tier}
              onClick={() => openBox(config)}
              disabled={opening || !canAfford || items.length === 0}
              className={`
                relative group rounded-xl p-4 border transition-all duration-300 text-left
                ${canAfford && !opening
                  ? "border-line/50 hover:border-stone/40 hover:shadow-lg cursor-pointer"
                  : "border-line/30 opacity-50 cursor-not-allowed"
                }
                ${isActive ? "ring-2 ring-stone/30" : ""}
              `}
            >
              {/* Background gradient */}
              <div
                className={`absolute inset-0 rounded-xl bg-gradient-to-br ${config.gradient} pointer-events-none`}
              />

              <div className="relative">
                {/* Box icon */}
                <motion.div
                  className="text-2xl mb-2"
                  animate={
                    isActive
                      ? { scale: [1, 1.2, 1], rotate: [0, -5, 5, 0] }
                      : {}
                  }
                  transition={{ duration: 0.6, repeat: isActive ? Infinity : 0 }}
                >
                  {config.emoji}
                </motion.div>

                {/* Tier name */}
                <div className="text-[11px] font-medium text-sand/90 mb-1">
                  {locale === "zh" ? config.labelZh : config.label}
                </div>

                {/* Cost */}
                <div className="text-[10px] font-mono text-stone/70">
                  {formatCurrency(config.cost, true)}
                </div>

                {/* Item count */}
                <div className="text-[9px] text-ash/50 mt-1">
                  {items.length} {locale === "zh" ? "件可能" : "possible"}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Opening overlay */}
      <AnimatePresence>
        {opening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <div className="relative">
              {/* Shimmer rings */}
              {!revealedItem && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `radial-gradient(circle, ${
                        BOX_TIERS.find((b) => b.tier === activeTier)?.glow || "rgba(200,180,140,0.3)"
                      } 0%, transparent 70%)`,
                      width: 200,
                      height: 200,
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-24 h-24 mx-auto"
                  >
                    <div className="text-6xl text-center leading-[96px]">
                      {BOX_TIERS.find((b) => b.tier === activeTier)?.emoji || "📦"}
                    </div>
                  </motion.div>
                  <motion.p
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="text-center text-white/60 text-sm mt-4 font-mono"
                  >
                    {locale === "zh" ? "正在开箱..." : "Opening..."}
                  </motion.p>
                </>
              )}

              {/* Revealed item */}
              {revealedItem && (
                <motion.div
                  initial={{ scale: 0, rotateY: -180 }}
                  animate={{ scale: 1, rotateY: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="bg-surface rounded-2xl p-8 text-center max-w-xs border border-line/50 shadow-2xl"
                >
                  <div className="text-5xl mb-3">{revealedItem.emoji}</div>
                  <h3 className="text-base font-serif text-sand mb-1">
                    {locale === "zh" ? revealedItem.nameZh : revealedItem.name}
                  </h3>
                  <p className="text-lg font-serif text-champagne mb-2">
                    {formatCurrency(revealedItem.price)}
                  </p>
                  <p className="text-[11px] text-ash/60">
                    {locale === "zh" ? revealedItem.descriptionZh : revealedItem.description}
                  </p>
                  <div className="mt-3 text-[10px] text-stone/50 uppercase tracking-wider font-mono">
                    {locale === "zh" ? "已添加到购物车" : "Added to your cart"}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
