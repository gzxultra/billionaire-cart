"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { Purchase } from "@/lib/types";

/**
 * SpendingReplay — "Rewatch your spending spree" button that replays
 * all purchases in fast-forward with running balance animation.
 * Great for entertainment and screen-recording/sharing.
 */

interface ReplayFrame {
  index: number;
  title: string;
  price: number;
  cumulative: number;
  emoji: string;
  remaining: number;
}

function getAssetEmoji(assetClass: string): string {
  const map: Record<string, string> = {
    supercar: "🏎️",
    yacht: "🛥️",
    aircraft: "✈️",
    real_estate: "🏠",
    rv_trailer: "🚐",
    commercial_tech: "💻",
    luxury_fashion: "👗",
    jewelry: "💎",
    coffee_equipment: "☕",
    custom_keyboard: "⌨️",
    industrial_equipment: "🏭",
    art: "🎨",
    electronics: "📱",
  };
  return map[assetClass] || "🛍️";
}

const REPLAY_SPEED_MS = 400; // ms per frame

export function SpendingReplay() {
  const locale = useLocale((s) => s.locale);
  const purchases = useCartStore((s) => s.purchases);
  const netWorth = useCartStore(selectNetWorth);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(-1);
  const [replayDone, setReplayDone] = useState(false);

  const frames: ReplayFrame[] = useMemo(() => {
    let cumulative = 0;
    return purchases.map((p, i) => {
      cumulative += p.product.price;
      return {
        index: i,
        title: p.product.title,
        price: p.product.price,
        cumulative,
        emoji: getAssetEmoji(p.product.assetClass),
        remaining: netWorth - cumulative,
      };
    });
  }, [purchases, netWorth]);

  const startReplay = useCallback(() => {
    if (frames.length === 0) return;
    setIsPlaying(true);
    setReplayDone(false);
    setCurrentFrame(0);

    let frame = 0;
    const interval = setInterval(() => {
      frame += 1;
      if (frame >= frames.length) {
        clearInterval(interval);
        setReplayDone(true);
        // Auto-dismiss after showing final state
        setTimeout(() => {
          setIsPlaying(false);
          setCurrentFrame(-1);
          setReplayDone(false);
        }, 3000);
      } else {
        setCurrentFrame(frame);
      }
    }, REPLAY_SPEED_MS);

    return () => clearInterval(interval);
  }, [frames]);

  if (!selectedBillionaire || purchases.length < 3) return null;

  const activeFrame = currentFrame >= 0 && currentFrame < frames.length ? frames[currentFrame] : null;
  const pctSpent = activeFrame ? (activeFrame.cumulative / netWorth) * 100 : 0;

  return (
    <>
      {/* Replay trigger button */}
      {!isPlaying && (
        <section className="stagger-section">
          <button
            onClick={startReplay}
            className="w-full py-3 px-5 rounded-xl bg-surface/70 border border-line/45 hover:border-stone/35 transition-all group text-center"
          >
            <span className="text-xs text-ash/70 group-hover:text-stone/80 transition-colors flex items-center justify-center gap-2">
              <span className="text-base">▶️</span>
              {locale === "zh"
                ? `回放消费记录 (${purchases.length} 笔)`
                : `Replay Spending Spree (${purchases.length} purchases)`}
            </span>
          </button>
        </section>
      )}

      {/* Replay overlay */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center"
            onClick={() => {
              setIsPlaying(false);
              setCurrentFrame(-1);
            }}
          >
            <div
              className="w-full max-w-sm mx-4 space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono mb-1">
                  {locale === "zh" ? "消费回放" : "Spending Replay"}
                </div>
                <div className="text-[10px] text-white/30 font-mono tabular-nums">
                  {activeFrame ? `${activeFrame.index + 1}/${frames.length}` : ""}
                </div>
              </div>

              {/* Current item card */}
              <AnimatePresence mode="wait">
                {activeFrame && (
                  <motion.div
                    key={activeFrame.index}
                    initial={{ scale: 0.8, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.8, opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="text-center space-y-2"
                  >
                    <div className="text-4xl">{activeFrame.emoji}</div>
                    <div className="text-sm text-white/85 font-medium truncate px-4">
                      {activeFrame.title}
                    </div>
                    <motion.div
                      initial={{ scale: 1.3 }}
                      animate={{ scale: 1 }}
                      className="text-xl font-serif text-[#C5A572]"
                    >
                      -{formatCurrency(activeFrame.price)}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Running balance */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono text-white/50">
                  <span>{locale === "zh" ? "已花" : "Spent"}</span>
                  <span className="text-[#C5A572]/80 tabular-nums">
                    {activeFrame ? formatCurrency(activeFrame.cumulative, true) : "$0"}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background:
                        pctSpent > 50
                          ? "linear-gradient(90deg, #9B6B6B, #B83C3C)"
                          : "linear-gradient(90deg, #5A8A68, #A68530)",
                    }}
                    animate={{ width: `${Math.min(pctSpent, 100)}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                <div className="flex justify-between text-[10px] font-mono text-white/40">
                  <span>{pctSpent.toFixed(2)}%</span>
                  <span>
                    {locale === "zh" ? "剩余" : "Left"}:{" "}
                    {activeFrame ? formatCurrency(Math.max(activeFrame.remaining, 0), true) : ""}
                  </span>
                </div>
              </div>

              {/* Done state */}
              <AnimatePresence>
                {replayDone && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-1"
                  >
                    <div className="text-2xl">🎬</div>
                    <div className="text-xs text-white/60">
                      {locale === "zh"
                        ? `总计 ${frames.length} 笔，花费 ${formatCurrency(frames[frames.length - 1]?.cumulative ?? 0, true)}`
                        : `${frames.length} purchases, ${formatCurrency(frames[frames.length - 1]?.cumulative ?? 0, true)} spent`}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Close hint */}
              <div className="text-center">
                <span className="text-[9px] text-white/25 font-mono">
                  {locale === "zh" ? "点击背景关闭" : "Tap backdrop to close"}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
