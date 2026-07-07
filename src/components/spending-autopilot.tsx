"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectRemaining } from "@/lib/store";
import { catalogItems } from "@/data/catalog";
import { generateId, formatCurrency } from "@/lib/format";
import { applyWealthDna } from "@/lib/wealth-dna";
import { playTieredPurchase } from "@/lib/sounds";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

type Speed = 1 | 5 | 10 | 50;
const SPEEDS: { value: Speed; label: string; labelZh: string }[] = [
  { value: 1, label: "1/sec", labelZh: "1/秒" },
  { value: 5, label: "5/sec", labelZh: "5/秒" },
  { value: 10, label: "10/sec", labelZh: "10/秒" },
  { value: 50, label: "MAX", labelZh: "极速" },
];

export function SpendingAutopilot() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const addPurchase = useCartStore((s) => s.addPurchase);
  const soundEnabled = useCartStore((s) => s.soundEnabled);
  const remaining = useCartStore(selectRemaining);

  const [active, setActive] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [autoBought, setAutoBought] = useState(0);
  const [autoSpent, setAutoSpent] = useState(0);
  const [lastItem, setLastItem] = useState<string>("");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(false);

  // Affordable catalog items
  const affordableItems = useMemo(() => {
    if (!selectedBillionaire) return [];
    return catalogItems
      .filter((item) => {
        const dna = applyWealthDna(
          { title: item.name, price: item.price, assetClass: item.assetClass },
          selectedBillionaire
        );
        return dna.adjustedPrice <= remaining && dna.adjustedPrice > 0;
      })
      .map((item) => {
        const dna = applyWealthDna(
          { title: item.name, price: item.price, assetClass: item.assetClass },
          selectedBillionaire
        );
        return { item, price: dna.adjustedPrice };
      });
  }, [selectedBillionaire, remaining]);

  const buyRandomItem = useCallback(() => {
    if (!selectedBillionaire || affordableItems.length === 0) return;

    const idx = Math.floor(Math.random() * affordableItems.length);
    const { item, price } = affordableItems[idx];

    addPurchase({
      id: generateId(),
      product: {
        title: item.name,
        price,
        imageUrl: null,
        description: item.description,
        sourceUrl: `catalog://${item.id}`,
        assetClass: item.assetClass,
        monthlyOverhead: item.monthlyOverhead,
      },
      billionaireId: selectedBillionaire.id,
      timestamp: Date.now(),
    });

    if (soundEnabled && Math.random() < 0.15) {
      playTieredPurchase(price);
    }

    setAutoBought((c) => c + 1);
    setAutoSpent((s) => s + price);
    setLastItem(`${item.emoji} ${locale === "zh" ? item.nameZh : item.name}`);
  }, [selectedBillionaire, affordableItems, addPurchase, soundEnabled, locale]);

  // Start/stop autopilot
  useEffect(() => {
    if (active && selectedBillionaire) {
      activeRef.current = true;
      const ms = Math.max(1000 / speed, 20);
      intervalRef.current = setInterval(() => {
        if (!activeRef.current) return;
        buyRandomItem();
      }, ms);
    } else {
      activeRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active, speed, selectedBillionaire, buyRandomItem]);

  // Stop if broke
  useEffect(() => {
    if (active && remaining <= 0) {
      setActive(false);
    }
  }, [active, remaining]);

  // Reset on billionaire change
  useEffect(() => {
    setActive(false);
    setAutoBought(0);
    setAutoSpent(0);
    setLastItem("");
  }, [selectedBillionaire?.id]);

  if (!selectedBillionaire) return null;

  return (
    <div className="w-full">
      <h2 className="section-label mb-3">
        {t("autopilot.title", locale)}
      </h2>

      <div className="space-y-3">
        {/* Main toggle + speed */}
        <div className="flex items-center gap-3 flex-wrap">
          <motion.button
            onClick={() => {
              if (!active) {
                setAutoBought(0);
                setAutoSpent(0);
              }
              setActive(!active);
            }}
            whileTap={{ scale: 0.95 }}
            className={`
              relative px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider
              transition-all duration-300 overflow-hidden
              ${
                active
                  ? "bg-[#9B6B6B]/15 text-[#9B6B6B] border border-[#9B6B6B]/25"
                  : "bg-stone/20 text-stone border border-stone/20 hover:bg-stone/25"
              }
            `}
          >
            {active && (
              <motion.div
                className="absolute inset-0 bg-[#9B6B6B]/10"
                animate={{ opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {active ? "⏹" : "🤖"}
              {active
                ? (locale === "zh" ? "停止" : "Stop")
                : t("autopilot.start", locale)}
            </span>
          </motion.button>

          {/* Speed pills */}
          <div className="flex items-center gap-1">
            {SPEEDS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSpeed(s.value)}
                className={`
                  px-2 py-1 rounded-lg text-[10px] font-medium transition-all
                  ${
                    speed === s.value
                      ? "bg-stone/20 text-stone border border-stone/30"
                      : "bg-surface-bright/80 text-ash/65 hover:text-ash/80"
                  }
                `}
              >
                {locale === "zh" ? s.labelZh : s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live stats */}
        <AnimatePresence>
          {(active || autoBought > 0) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-surface/60 border border-line/30">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-ash/55 mb-0.5">
                    {locale === "zh" ? "已购" : "Bought"}
                  </div>
                  <div className="text-lg font-serif text-stone tabular-nums">
                    {autoBought.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-ash/55 mb-0.5">
                    {locale === "zh" ? "已花" : "Spent"}
                  </div>
                  <div className="text-sm font-serif text-champagne tabular-nums">
                    {formatCurrency(autoSpent, true)}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-ash/55 mb-0.5">
                    {locale === "zh" ? "最近" : "Latest"}
                  </div>
                  <div className="text-xs text-sand/80 truncate">
                    {lastItem || "—"}
                  </div>
                </div>
              </div>

              {/* Activity indicator */}
              {active && (
                <div className="flex items-center gap-2 mt-2 px-1">
                  <div className="flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 h-3 rounded-full bg-stone/40"
                        animate={{ scaleY: [0.4, 1, 0.4] }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-ash/55 font-mono">
                    {locale === "zh"
                      ? `自动购买中 · ${speed}/秒`
                      : `Autopilot active · ${speed}/sec`}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
