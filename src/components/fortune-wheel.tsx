"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectRemaining } from "@/lib/store";
import { catalogItems, CatalogItem } from "@/data/catalog";
import { formatCurrency, generateId } from "@/lib/format";
import { applyWealthDna } from "@/lib/wealth-dna";
import { playTieredPurchase, playSparkle } from "@/lib/sounds";
import { toast } from "@/lib/use-toast";
import { useLocale } from "@/lib/use-locale";

// Wheel segments — each segment picks from a different tier/strategy
interface WheelSegment {
  id: string;
  labelEn: string;
  labelZh: string;
  emoji: string;
  color: string;
  pick: (items: CatalogItem[], remaining: number) => { item: CatalogItem; qty: number } | null;
}

const SEGMENTS: WheelSegment[] = [
  {
    id: "everyday-100",
    labelEn: "100× Everyday",
    labelZh: "100× 日常",
    emoji: "☕",
    color: "#8B7355",
    pick: (items, rem) => {
      const pool = items.filter(i => i.tier === "everyday" && i.price * 100 <= rem);
      if (!pool.length) return null;
      const item = pool[Math.floor(Math.random() * pool.length)];
      return { item, qty: 100 };
    },
  },
  {
    id: "luxury-1",
    labelEn: "1× Luxury",
    labelZh: "1× 奢华",
    emoji: "💎",
    color: "#A68530",
    pick: (items, rem) => {
      const pool = items.filter(i => i.tier === "luxury" && i.price <= rem);
      if (!pool.length) return null;
      return { item: pool[Math.floor(Math.random() * pool.length)], qty: 1 };
    },
  },
  {
    id: "absurd-1",
    labelEn: "1× Absurd",
    labelZh: "1× 荒诞",
    emoji: "🤯",
    color: "#9B6B6B",
    pick: (items, rem) => {
      const pool = items.filter(i => i.tier === "absurd" && i.price <= rem);
      if (!pool.length) return null;
      return { item: pool[Math.floor(Math.random() * pool.length)], qty: 1 };
    },
  },
  {
    id: "cheapest-1000",
    labelEn: "1000× Cheapest",
    labelZh: "1000× 最便宜",
    emoji: "🔥",
    color: "#6B8B6B",
    pick: (items, rem) => {
      const sorted = [...items].sort((a, b) => a.price - b.price);
      const cheapest = sorted[0];
      if (!cheapest || cheapest.price * 1000 > rem) return null;
      return { item: cheapest, qty: 1000 };
    },
  },
  {
    id: "ultra-1",
    labelEn: "1× Ultra",
    labelZh: "1× 超豪华",
    emoji: "🏰",
    color: "#6B6B8B",
    pick: (items, rem) => {
      const pool = items.filter(i => i.tier === "ultra" && i.price <= rem);
      if (!pool.length) return null;
      return { item: pool[Math.floor(Math.random() * pool.length)], qty: 1 };
    },
  },
  {
    id: "random-random",
    labelEn: "?× Random",
    labelZh: "?× 随机",
    emoji: "🎲",
    color: "#8B6B8B",
    pick: (items, rem) => {
      const affordable = items.filter(i => i.price <= rem && i.price > 0);
      if (!affordable.length) return null;
      const item = affordable[Math.floor(Math.random() * affordable.length)];
      const maxQty = Math.min(50, Math.floor(rem / item.price));
      const qty = Math.max(1, Math.floor(Math.random() * maxQty) + 1);
      return { item, qty };
    },
  },
  {
    id: "aspirational-10",
    labelEn: "10× Aspirational",
    labelZh: "10× 梦想",
    emoji: "✨",
    color: "#7B8B6B",
    pick: (items, rem) => {
      const pool = items.filter(i => i.tier === "aspirational" && i.price * 10 <= rem);
      if (!pool.length) return null;
      return { item: pool[Math.floor(Math.random() * pool.length)], qty: 10 };
    },
  },
  {
    id: "jackpot",
    labelEn: "JACKPOT",
    labelZh: "头奖",
    emoji: "🎰",
    color: "#C5A572",
    pick: (items, rem) => {
      // Buy the most expensive thing you can afford
      const sorted = [...items].sort((a, b) => b.price - a.price);
      const item = sorted.find(i => i.price <= rem);
      if (!item) return null;
      return { item, qty: 1 };
    },
  },
];

const SEGMENT_COUNT = SEGMENTS.length;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

export function FortuneWheel() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const addPurchase = useCartStore((s) => s.addPurchase);
  const soundEnabled = useCartStore((s) => s.soundEnabled);
  const remaining = useCartStore(selectRemaining);

  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ segment: WheelSegment; item: CatalogItem; qty: number; totalCost: number } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  const spin = useCallback(() => {
    if (spinning || !selectedBillionaire) return;

    // Pick random winning segment
    const idx = Math.floor(Math.random() * SEGMENT_COUNT);
    const segment = SEGMENTS[idx];
    const pick = segment.pick(catalogItems, remaining);

    if (!pick) {
      toast(locale === "zh" ? "💸 余额不足！" : "💸 Can't afford any picks!", 2000);
      return;
    }

    setSpinning(true);
    setResult(null);
    setShowResult(false);

    // Calculate rotation: 5 full spins + land on the winning segment
    // Wheel pointer is at top (12 o'clock). Segment 0 starts at 0°.
    // To land on segment idx, the segment center must align with the pointer.
    const segmentCenterAngle = idx * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    const extraSpins = 5 * 360;
    // We rotate clockwise, so to bring segmentCenter to top (0°):
    const targetRotation = rotation + extraSpins + (360 - segmentCenterAngle) + Math.random() * (SEGMENT_ANGLE * 0.6) - SEGMENT_ANGLE * 0.3;

    setRotation(targetRotation);

    const dna = applyWealthDna(
      { title: pick.item.name, price: pick.item.price, assetClass: pick.item.assetClass },
      selectedBillionaire
    );
    const effectivePrice = dna.adjustedPrice;
    const totalCost = effectivePrice * pick.qty;

    // After spin animation completes
    setTimeout(() => {
      setSpinning(false);
      setResult({ segment, item: pick!.item, qty: pick!.qty, totalCost });
      setShowResult(true);
    }, 4000);
  }, [spinning, selectedBillionaire, remaining, rotation, locale]);

  const confirmPurchase = useCallback(() => {
    if (!result || !selectedBillionaire) return;

    for (let i = 0; i < result.qty; i++) {
      addPurchase({
        id: generateId(),
        product: {
          title: result.item.name,
          price: result.totalCost / result.qty,
          imageUrl: null,
          description: result.item.description,
          sourceUrl: `catalog://${result.item.id}`,
          assetClass: result.item.assetClass,
          monthlyOverhead: result.item.monthlyOverhead,
        },
        billionaireId: selectedBillionaire.id,
        timestamp: Date.now(),
      });
    }

    if (soundEnabled) {
      playTieredPurchase(result.totalCost);
      playSparkle();
    }

    toast(
      locale === "zh"
        ? `🎡 ${result.qty}× ${result.item.nameZh} — ${formatCurrency(result.totalCost, true)}`
        : `🎡 ${result.qty}× ${result.item.name} — ${formatCurrency(result.totalCost, true)}`,
      3000
    );
    setShowResult(false);
    setResult(null);
  }, [result, selectedBillionaire, addPurchase, soundEnabled, locale]);

  if (!selectedBillionaire) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-panel p-5 sm:p-6 stagger-section"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🎡</span>
          <h2 className="section-label">
            {locale === "zh" ? "命运转盘" : "Fortune Wheel"}
          </h2>
        </div>
        <span className="text-[9px] text-ash/45 font-mono uppercase">
          {locale === "zh" ? "转一转，买什么由天定" : "Spin to spend"}
        </span>
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* Wheel */}
        <div className="relative w-56 h-56 sm:w-64 sm:h-64">
          {/* Pointer triangle at top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20">
            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[16px] border-t-champagne drop-shadow-md" />
          </div>

          {/* Spinning wheel */}
          <motion.div
            ref={wheelRef}
            className="w-full h-full rounded-full border-4 border-stone/25 overflow-hidden relative shadow-lg"
            style={{ rotate: rotation }}
            animate={{ rotate: rotation }}
            transition={spinning ? { duration: 4, ease: [0.2, 0.8, 0.3, 1] } : { duration: 0 }}
          >
            {/* SVG wheel segments */}
            <svg viewBox="0 0 200 200" className="w-full h-full">
              {SEGMENTS.map((seg, i) => {
                const startAngle = i * SEGMENT_ANGLE - 90; // -90 to start from top
                const endAngle = startAngle + SEGMENT_ANGLE;
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;
                const midRad = ((startAngle + endAngle) / 2 * Math.PI) / 180;
                const x1 = 100 + 100 * Math.cos(startRad);
                const y1 = 100 + 100 * Math.sin(startRad);
                const x2 = 100 + 100 * Math.cos(endRad);
                const y2 = 100 + 100 * Math.sin(endRad);
                const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0;
                const textX = 100 + 62 * Math.cos(midRad);
                const textY = 100 + 62 * Math.sin(midRad);
                const textAngle = (startAngle + endAngle) / 2 + 90;

                return (
                  <g key={seg.id}>
                    <path
                      d={`M100,100 L${x1},${y1} A100,100 0 ${largeArc},1 ${x2},${y2} Z`}
                      fill={seg.color}
                      fillOpacity={0.75}
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth={0.5}
                    />
                    <text
                      x={textX}
                      y={textY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="14"
                      transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                    >
                      {seg.emoji}
                    </text>
                  </g>
                );
              })}
              {/* Center circle */}
              <circle cx="100" cy="100" r="18" fill="#2A2520" stroke="#C5A572" strokeWidth="2" />
              <text x="100" y="102" textAnchor="middle" dominantBaseline="middle" fontSize="16">
                🎡
              </text>
            </svg>
          </motion.div>
        </div>

        {/* Spin button */}
        <motion.button
          onClick={spin}
          disabled={spinning}
          whileHover={spinning ? {} : { scale: 1.05 }}
          whileTap={spinning ? {} : { scale: 0.95 }}
          className={`px-8 py-3 rounded-xl font-medium text-sm tracking-wide transition-all ${
            spinning
              ? "bg-stone/10 text-ash/50 border border-line/30 cursor-not-allowed"
              : "bg-stone/15 text-stone border border-stone/35 hover:bg-stone/20 active:bg-stone/25"
          }`}
        >
          {spinning
            ? locale === "zh" ? "转动中..." : "Spinning..."
            : locale === "zh" ? "🎡 转动命运" : "🎡 Spin the Wheel"}
        </motion.button>

        {/* Segment legend — compact */}
        <div className="flex flex-wrap justify-center gap-1.5 mt-1">
          {SEGMENTS.map((seg) => (
            <div
              key={seg.id}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-dim/50 border border-line/20"
            >
              <span className="text-[10px]">{seg.emoji}</span>
              <span className="text-[9px] text-ash/60">
                {locale === "zh" ? seg.labelZh : seg.labelEn}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Result modal */}
      <AnimatePresence>
        {showResult && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => { setShowResult(false); setResult(null); }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border border-stone/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="text-center space-y-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="text-4xl"
                >
                  {result.segment.emoji}
                </motion.div>
                <div className="text-xs text-stone/70 uppercase tracking-wider font-medium">
                  {locale === "zh" ? result.segment.labelZh : result.segment.labelEn}
                </div>
                <div className="space-y-1">
                  <div className="text-lg font-serif text-sand font-bold">
                    {result.qty}× {locale === "zh" ? result.item.nameZh : result.item.name}
                  </div>
                  <div className="text-sm font-serif text-champagne">
                    {formatCurrency(result.totalCost, result.totalCost >= 1_000_000)}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => { setShowResult(false); setResult(null); }}
                    className="flex-1 px-4 py-2.5 rounded-xl text-xs font-medium text-ash/70 bg-surface-dim/80 border border-line/40 hover:bg-surface-dim transition-colors"
                  >
                    {locale === "zh" ? "算了" : "Nah"}
                  </button>
                  <button
                    onClick={confirmPurchase}
                    className="flex-1 px-4 py-2.5 rounded-xl text-xs font-medium text-white bg-stone hover:bg-stone/90 transition-colors"
                  >
                    {locale === "zh" ? "💰 买！" : "💰 Buy it!"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
