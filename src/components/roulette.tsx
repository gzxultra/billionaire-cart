"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CatalogItem } from "@/data/catalog";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

interface RouletteProps {
  items: CatalogItem[];
  remaining: number;
  onBuy: (item: CatalogItem, qty: number) => void;
}

export function Roulette({ items, remaining, onBuy }: RouletteProps) {
  const locale = useLocale((s) => s.locale);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<CatalogItem | null>(null);
  const [displayItem, setDisplayItem] = useState<CatalogItem | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const affordableItems = useMemo(
    () => items.filter((item) => item.price <= remaining && item.price > 0),
    [items, remaining]
  );

  const spin = useCallback(() => {
    if (spinning || cooldown || affordableItems.length === 0) return;

    setSpinning(true);
    setResult(null);

    let tick = 0;
    const maxTicks = 20;

    intervalRef.current = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * affordableItems.length);
      setDisplayItem(affordableItems[randomIdx]);
      tick++;

      if (tick >= maxTicks) {
        if (intervalRef.current) clearInterval(intervalRef.current);

        // Pick the final winner
        const winnerIdx = Math.floor(Math.random() * affordableItems.length);
        const winner = affordableItems[winnerIdx];
        setDisplayItem(winner);
        setResult(winner);
        setSpinning(false);

        // Auto-purchase
        onBuy(winner, 1);

        // Cooldown
        setCooldown(true);
        timeoutRef.current = setTimeout(() => {
          setCooldown(false);
          setResult(null);
          setDisplayItem(null);
        }, 3000);
      }
    }, 100);
  }, [spinning, cooldown, affordableItems, onBuy]);

  if (affordableItems.length === 0) return null;

  return (
    <div className="mb-3">
      <AnimatePresence mode="wait">
        {!spinning && !result ? (
          <motion.button
            key="btn"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            onClick={spin}
            disabled={cooldown}
            className={`
              w-full py-2 rounded-xl text-xs font-medium tracking-wide transition-all
              border border-stone/20
              ${cooldown
                ? "bg-surface/50 text-ash/40 cursor-not-allowed"
                : "bg-stone/[0.06] text-stone hover:bg-stone/[0.1] active:scale-[0.98]"
              }
            `}
          >
            {cooldown ? t("roulette.cooldown", locale) : t("roulette.button", locale)}
          </motion.button>
        ) : (
          <motion.div
            key="spin"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`
              w-full py-2.5 px-4 rounded-xl text-center border transition-all
              ${result
                ? "bg-champagne/[0.08] border-champagne/25"
                : "bg-stone/[0.06] border-stone/20"
              }
            `}
          >
            {displayItem && (
              <motion.div
                key={displayItem.id + (result ? "-final" : "")}
                initial={{ opacity: 0, y: result ? 0 : -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: result ? 0.3 : 0.08 }}
                className="flex items-center justify-center gap-2"
              >
                <span className="text-lg">{displayItem.emoji}</span>
                <span className={`text-xs font-medium ${result ? "text-champagne" : "text-stone"}`}>
                  {result
                    ? t("roulette.youGot", locale, {
                        item: locale === "zh" ? displayItem.nameZh : displayItem.name,
                      })
                    : (locale === "zh" ? displayItem.nameZh : displayItem.name)}
                </span>
                {result && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.3, 1] }}
                    transition={{ duration: 0.4 }}
                    className="text-sm"
                  >
                    🎉
                  </motion.span>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
