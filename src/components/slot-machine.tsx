"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { catalogItems, CatalogItem } from "@/data/catalog";
import { useCartStore, selectRemaining } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";
import { formatCurrency, generateId } from "@/lib/format";
import { applyWealthDna } from "@/lib/wealth-dna";
import { ParsedProduct } from "@/lib/types";
import { playSparkle } from "@/lib/sounds";

/**
 * SpendingSlotMachine — 3-reel slot machine.
 * Each reel shows a catalog item emoji. Pull the lever, reels spin
 * with staggered stop, and the center item gets auto-purchased.
 */

const REEL_SIZE = 8; // visible items cycling per reel
const SPIN_DURATION = [1200, 1800, 2400]; // stagger stop times (ms)

function getAffordableItems(remaining: number): CatalogItem[] {
  return catalogItems.filter((item) => item.price <= remaining && item.price > 0);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildReelItems(pool: CatalogItem[], count: number): CatalogItem[] {
  const items: CatalogItem[] = [];
  for (let i = 0; i < count; i++) {
    items.push(pickRandom(pool));
  }
  return items;
}

interface ReelProps {
  items: CatalogItem[];
  finalItem: CatalogItem;
  spinning: boolean;
  stopDelay: number;
  stopped: boolean;
  locale: string;
}

function Reel({ items, finalItem, spinning, stopDelay, stopped, locale }: ReelProps) {
  const allItems = useMemo(() => {
    // Build a strip: random items, then the final item at the end
    return [...items, finalItem];
  }, [items, finalItem]);

  return (
    <div className="relative w-full h-20 overflow-hidden rounded-xl bg-surface-dim/60 border border-line/30">
      <AnimatePresence mode="wait">
        {spinning && !stopped ? (
          <motion.div
            key="spinning"
            className="absolute inset-0 flex flex-col items-center justify-center"
            animate={{
              y: [0, -40, 0, -20, 0],
            }}
            transition={{
              duration: 0.3,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {allItems.slice(-3).map((item, i) => (
              <div key={`spin-${i}`} className="flex items-center gap-1.5 py-1">
                <span className="text-lg">{item.emoji}</span>
                <span className="text-[10px] text-ash/50 truncate max-w-[60px]">
                  {locale === "zh" ? item.nameZh : item.name}
                </span>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key={`final-${finalItem.id}`}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="flex flex-col items-center justify-center h-full"
          >
            <span className="text-2xl mb-1">{finalItem.emoji}</span>
            <span className="text-[10px] text-sand font-medium text-center px-2 truncate max-w-full">
              {locale === "zh" ? finalItem.nameZh : finalItem.name}
            </span>
            <span className="text-[9px] text-champagne/70 font-mono">
              {formatCurrency(finalItem.price)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sheen effect on stop */}
      {stopped && (
        <motion.div
          initial={{ opacity: 0.6, x: "-100%" }}
          animate={{ opacity: 0, x: "100%" }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-champagne/10 to-transparent pointer-events-none"
        />
      )}
    </div>
  );
}

export function SpendingSlotMachine() {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const remaining = useCartStore(selectRemaining);
  const addPurchase = useCartStore((s) => s.addPurchase);
  const soundEnabled = useCartStore((s) => s.soundEnabled);
  const purchases = useCartStore((s) => s.purchases);
  const locale = useLocale((s) => s.locale);

  const [spinning, setSpinning] = useState(false);
  const [stopped, setStopped] = useState([false, false, false]);
  const [reelItems, setReelItems] = useState<CatalogItem[][]>([[], [], []]);
  const [finalItems, setFinalItems] = useState<CatalogItem[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [lastWin, setLastWin] = useState<{ item: CatalogItem; multiplier: number } | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const affordableItems = useMemo(() => getAffordableItems(remaining), [remaining]);

  const handlePull = useCallback(() => {
    if (spinning || cooldown || affordableItems.length < 3 || !selectedBillionaire) return;

    // Build reel strips + pick final items
    const rItems = [
      buildReelItems(affordableItems, REEL_SIZE),
      buildReelItems(affordableItems, REEL_SIZE),
      buildReelItems(affordableItems, REEL_SIZE),
    ];
    const finals = [
      pickRandom(affordableItems),
      pickRandom(affordableItems),
      pickRandom(affordableItems),
    ];

    setReelItems(rItems);
    setFinalItems(finals);
    setSpinning(true);
    setStopped([false, false, false]);
    setShowResult(false);
    setLastWin(null);

    // Clear old timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    // Staggered stops
    SPIN_DURATION.forEach((delay, i) => {
      const t = setTimeout(() => {
        setStopped((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, delay);
      timersRef.current.push(t);
    });

    // Final result after all reels stop
    const finalTimer = setTimeout(() => {
      setSpinning(false);

      // Check for matches
      const allSame = finals[0].id === finals[1].id && finals[1].id === finals[2].id;
      const twoSame = finals[0].id === finals[1].id || finals[1].id === finals[2].id || finals[0].id === finals[2].id;
      const multiplier = allSame ? 3 : twoSame ? 2 : 1;

      // Always buy the center reel item
      const winItem = finals[1];
      setLastWin({ item: winItem, multiplier });
      setShowResult(true);

      // Auto-purchase
      const product: ParsedProduct = {
        title: winItem.name,
        price: winItem.price,
        imageUrl: null,
        description: winItem.description,
        sourceUrl: `catalog://${winItem.id}`,
        assetClass: winItem.assetClass,
        monthlyOverhead: winItem.monthlyOverhead,
      };

      const dna = applyWealthDna(product, selectedBillionaire);
      const finalPrice = dna.isFree ? 0 : dna.adjustedPrice;

      for (let q = 0; q < multiplier; q++) {
        addPurchase({
          id: generateId(),
          product: { ...product, price: finalPrice },
          billionaireId: selectedBillionaire.id,
          timestamp: Date.now(),
        });
      }

      if (soundEnabled) playSparkle();

      // Cooldown
      setCooldown(true);
      const cdTimer = setTimeout(() => setCooldown(false), 2000);
      timersRef.current.push(cdTimer);
    }, SPIN_DURATION[2] + 400);
    timersRef.current.push(finalTimer);
  }, [spinning, cooldown, affordableItems, selectedBillionaire, addPurchase, soundEnabled]);

  // Cleanup
  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  // Only show after selecting a billionaire with enough items
  if (!selectedBillionaire || purchases.length < 1 || affordableItems.length < 3) return null;

  // Default display items when not spinning
  const displayItems = finalItems.length === 3
    ? finalItems
    : [affordableItems[0], affordableItems[1] || affordableItems[0], affordableItems[2] || affordableItems[0]];

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">🎰</span>
        <h2 className="section-label !mb-0">
          {locale === "zh" ? "消费老虎机" : "Spending Slots"}
        </h2>
      </div>

      <p className="text-[11px] text-ash/55 mb-4">
        {locale === "zh"
          ? "拉下拉杆，随机购买一件商品。两个相同 = 2倍，三个相同 = 3倍！"
          : "Pull the lever for a random purchase. Two matching = 2×, three = 3×!"}
      </p>

      {/* Reels */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
        {[0, 1, 2].map((i) => (
          <Reel
            key={i}
            items={reelItems[i].length > 0 ? reelItems[i] : buildReelItems(affordableItems, REEL_SIZE)}
            finalItem={displayItems[i]}
            spinning={spinning}
            stopDelay={SPIN_DURATION[i]}
            stopped={stopped[i]}
            locale={locale}
          />
        ))}
      </div>

      {/* Lever / Pull button */}
      <button
        onClick={handlePull}
        disabled={spinning || cooldown}
        className={`w-full py-3 rounded-xl text-sm font-medium transition-all border ${
          spinning
            ? "bg-champagne/5 border-champagne/20 text-champagne/50 cursor-wait"
            : cooldown
            ? "bg-surface-dim/40 border-line/30 text-ash/40 cursor-not-allowed"
            : "bg-stone/15 hover:bg-stone/25 border-stone/30 text-sand hover:scale-[1.01] active:scale-[0.98]"
        }`}
      >
        {spinning
          ? (locale === "zh" ? "旋转中..." : "Spinning...")
          : cooldown
          ? (locale === "zh" ? "冷却中..." : "Cooling down...")
          : (locale === "zh" ? "🎰 拉下拉杆" : "🎰 Pull the Lever")}
      </button>

      {/* Result */}
      <AnimatePresence>
        {showResult && lastWin && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 p-3 rounded-xl bg-surface-dim/50 border border-line/30 text-center"
          >
            {lastWin.multiplier >= 3 ? (
              <div className="text-champagne/90 font-medium text-sm mb-1">
                🎉 {locale === "zh" ? "三连中！" : "TRIPLE MATCH!"} ×{lastWin.multiplier}
              </div>
            ) : lastWin.multiplier === 2 ? (
              <div className="text-stone/80 font-medium text-sm mb-1">
                ✨ {locale === "zh" ? "双连中！" : "DOUBLE MATCH!"} ×{lastWin.multiplier}
              </div>
            ) : null}
            <div className="text-xs text-ash/70">
              {locale === "zh" ? "购买了" : "Bought"}{" "}
              <span className="text-sand font-medium">
                {lastWin.multiplier > 1 ? `${lastWin.multiplier}× ` : ""}
                {locale === "zh" ? lastWin.item.nameZh : lastWin.item.name}
              </span>
              {" "}
              {locale === "zh" ? "花费" : "for"}{" "}
              <span className="text-champagne/80 font-mono">
                {formatCurrency(lastWin.item.price * lastWin.multiplier)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
