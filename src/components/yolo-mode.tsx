"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectRemaining } from "@/lib/store";
import { catalogItems } from "@/data/catalog";
import { generateId, formatCurrency } from "@/lib/format";
import { playAuthorize } from "@/lib/sounds";
import { applyWealthDna } from "@/lib/wealth-dna";
import { useLocale } from "@/lib/use-locale";

const YOLO_INTERVAL_MS = 800; // buy every 0.8s

export function YoloMode({ onPurchase }: { onPurchase?: (price: number) => void }) {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const addPurchase = useCartStore((s) => s.addPurchase);
  const soundEnabled = useCartStore((s) => s.soundEnabled);
  const remaining = useCartStore(selectRemaining);

  const [active, setActive] = useState(false);
  const [yoloStats, setYoloStats] = useState({ count: 0, total: 0 });
  const [lastItem, setLastItem] = useState<string | null>(null);
  const [showExplosion, setShowExplosion] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statsRef = useRef({ count: 0, total: 0 });

  const buyRandom = useCallback(() => {
    if (!selectedBillionaire) return;
    const currentRemaining = useCartStore.getState().purchases.reduce(
      (acc, p) => acc - p.product.price, selectedBillionaire.netWorthB * 1_000_000_000
    );
    if (currentRemaining <= 0) {
      setActive(false);
      return;
    }

    // Pick random affordable item
    const affordable = catalogItems.filter((item) => {
      const dna = applyWealthDna(
        { title: item.name, price: item.price, assetClass: item.assetClass },
        selectedBillionaire
      );
      return dna.adjustedPrice <= currentRemaining;
    });

    if (affordable.length === 0) {
      setActive(false);
      return;
    }

    const item = affordable[Math.floor(Math.random() * affordable.length)];
    const dna = applyWealthDna(
      { title: item.name, price: item.price, assetClass: item.assetClass },
      selectedBillionaire
    );
    const finalPrice = dna.adjustedPrice;

    addPurchase({
      id: generateId(),
      product: {
        title: item.name,
        price: finalPrice,
        imageUrl: null,
        description: item.description,
        sourceUrl: `catalog://${item.id}`,
        assetClass: item.assetClass,
        monthlyOverhead: item.monthlyOverhead,
      },
      billionaireId: selectedBillionaire.id,
      timestamp: Date.now(),
    });

    if (soundEnabled) playAuthorize();
    onPurchase?.(finalPrice);

    statsRef.current = {
      count: statsRef.current.count + 1,
      total: statsRef.current.total + finalPrice,
    };
    setYoloStats({ ...statsRef.current });
    setLastItem(`${item.emoji} ${locale === "zh" ? item.nameZh : item.name}`);
    setShowExplosion((e) => e + 1);
  }, [selectedBillionaire, addPurchase, soundEnabled, onPurchase, locale]);

  useEffect(() => {
    if (active) {
      intervalRef.current = setInterval(buyRandom, YOLO_INTERVAL_MS);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, buyRandom]);

  // Reset on billionaire change
  useEffect(() => {
    setActive(false);
    statsRef.current = { count: 0, total: 0 };
    setYoloStats({ count: 0, total: 0 });
    setLastItem(null);
  }, [selectedBillionaire?.id]);

  if (!selectedBillionaire) return null;

  const earningsPerSecond = selectedBillionaire.earningsPerSecond;
  const secondsToEarn = earningsPerSecond > 0 ? yoloStats.total / earningsPerSecond : 0;

  return (
    <section className="card-panel p-5 sm:p-8 relative overflow-hidden">
      {/* Background pulse when active */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.03, 0.06, 0.03] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 bg-gradient-to-br from-champagne/20 to-transparent pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className="relative z-10">
        <h2 className="section-label mb-3">
          {locale === "zh" ? "🎰 YOLO 模式" : "🎰 YOLO Mode"}
        </h2>
        <p className="text-xs text-ash/60 mb-4">
          {locale === "zh"
            ? "启动自动购物——每 0.8 秒随机买一样东西，感受真正的花钱如流水"
            : "Auto-buy a random item every 0.8s. Feel what it's like to spend like there's no tomorrow."}
        </p>

        {/* Toggle button */}
        <button
          onClick={() => {
            if (!active) {
              statsRef.current = { count: 0, total: 0 };
              setYoloStats({ count: 0, total: 0 });
            }
            setActive(!active);
          }}
          className={`w-full py-3 px-6 rounded-xl font-serif text-sm tracking-wide transition-all duration-300 ${
            active
              ? "bg-[#9B6B6B]/20 text-[#9B6B6B] border border-[#9B6B6B]/30 hover:bg-[#9B6B6B]/30"
              : "bg-champagne/10 text-champagne border border-champagne/20 hover:bg-champagne/20"
          }`}
        >
          {active
            ? locale === "zh" ? "⏸ 停止 YOLO" : "⏸ Stop YOLO"
            : locale === "zh" ? "🚀 启动 YOLO 模式" : "🚀 Activate YOLO Mode"}
        </button>

        {/* Live stats */}
        <AnimatePresence>
          {(yoloStats.count > 0 || active) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-3"
            >
              {/* Running counter */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-ash/70 mb-0.5">
                    {locale === "zh" ? "已购" : "Bought"}
                  </div>
                  <motion.div
                    key={yoloStats.count}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="text-lg font-serif text-stone tabular-nums"
                  >
                    {yoloStats.count}
                  </motion.div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-ash/70 mb-0.5">
                    {locale === "zh" ? "总花费" : "Spent"}
                  </div>
                  <div className="text-lg font-serif text-champagne tabular-nums">
                    {formatCurrency(yoloStats.total, true)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-ash/70 mb-0.5">
                    {locale === "zh" ? "赚回时间" : "Earned in"}
                  </div>
                  <div className="text-lg font-serif text-sage tabular-nums">
                    {secondsToEarn < 60
                      ? `${secondsToEarn.toFixed(1)}s`
                      : secondsToEarn < 3600
                      ? `${(secondsToEarn / 60).toFixed(1)}m`
                      : `${(secondsToEarn / 3600).toFixed(1)}h`}
                  </div>
                </div>
              </div>

              {/* Last bought item */}
              <AnimatePresence mode="wait">
                {lastItem && (
                  <motion.div
                    key={showExplosion}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs text-ash/60 font-mono truncate"
                  >
                    {locale === "zh" ? "刚买了" : "Just bought"}: {lastItem}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Speed indicator */}
              {active && (
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-sage"
                  />
                  <span className="text-[10px] text-sage/80 font-mono uppercase tracking-wider">
                    {locale === "zh" ? "自动购物中..." : "Auto-buying..."}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
