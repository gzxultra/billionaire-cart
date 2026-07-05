"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { catalogItems, CatalogItem } from "@/data/catalog";
import { formatCurrency, generateId } from "@/lib/format";
import { toast } from "@/lib/use-toast";
import { useLocale } from "@/lib/use-locale";
import { applyWealthDna } from "@/lib/wealth-dna";

type Difficulty = "easy" | "medium" | "hard";

interface ChallengeState {
  target: number;
  timeLimit: number; // seconds
  difficulty: Difficulty;
  items: CatalogItem[]; // available items for this challenge
}

interface ChallengeResult {
  target: number;
  spent: number;
  diff: number;
  accuracy: number; // 0-100
  timeUsed: number;
  itemsBought: number;
  grade: "S" | "A" | "B" | "C" | "F";
}

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; labelZh: string; timeLimit: number; tierPool: CatalogItem["tier"][] }> = {
  easy: { label: "Easy", labelZh: "简单", timeLimit: 60, tierPool: ["everyday", "aspirational"] },
  medium: { label: "Medium", labelZh: "中等", timeLimit: 45, tierPool: ["everyday", "aspirational", "luxury"] },
  hard: { label: "Hard", labelZh: "困难", timeLimit: 30, tierPool: ["everyday", "aspirational", "luxury", "ultra", "absurd"] },
};

function generateTarget(difficulty: Difficulty): number {
  const ranges: Record<Difficulty, [number, number]> = {
    easy: [500, 50_000],
    medium: [10_000, 5_000_000],
    hard: [100_000, 50_000_000_000],
  };
  const [min, max] = ranges[difficulty];
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  const logVal = logMin + Math.random() * (logMax - logMin);
  // Round to nice numbers
  const raw = Math.pow(10, logVal);
  if (raw < 1000) return Math.round(raw / 10) * 10;
  if (raw < 100_000) return Math.round(raw / 100) * 100;
  if (raw < 10_000_000) return Math.round(raw / 1000) * 1000;
  return Math.round(raw / 100_000) * 100_000;
}

function gradeResult(accuracy: number): ChallengeResult["grade"] {
  if (accuracy >= 99) return "S";
  if (accuracy >= 95) return "A";
  if (accuracy >= 85) return "B";
  if (accuracy >= 70) return "C";
  return "F";
}

const GRADE_COLORS: Record<string, string> = {
  S: "text-yellow-500",
  A: "text-emerald-500",
  B: "text-blue-400",
  C: "text-stone/70",
  F: "text-red-400/70",
};

const GRADE_MESSAGES: Record<string, { en: string; zh: string }> = {
  S: { en: "Perfect! Wall Street material.", zh: "完美！华尔街级别。" },
  A: { en: "Impressive precision spending.", zh: "精准消费，令人印象深刻。" },
  B: { en: "Not bad, keep practicing.", zh: "不错，继续加油。" },
  C: { en: "Could be tighter.", zh: "还可以更精确。" },
  F: { en: "Your accountant is crying.", zh: "你的会计在哭泣。" },
};

/**
 * BudgetChallenge — mini-game where you try to spend as close to a target as possible.
 * Pick items from the catalog to hit the budget target within a time limit.
 */
export function BudgetChallenge() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const addPurchase = useCartStore((s) => s.addPurchase);

  const [phase, setPhase] = useState<"idle" | "playing" | "result">("idle");
  const [challenge, setChallenge] = useState<ChallengeState | null>(null);
  const [cart, setCart] = useState<{ item: CatalogItem; qty: number }[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef(0);

  const cartTotal = useMemo(
    () => cart.reduce((sum, c) => sum + c.item.price * c.qty, 0),
    [cart]
  );

  const startChallenge = useCallback((diff: Difficulty) => {
    const target = generateTarget(diff);
    const config = DIFFICULTY_CONFIG[diff];
    const items = catalogItems.filter((i) => config.tierPool.includes(i.tier));

    setChallenge({ target, timeLimit: config.timeLimit, difficulty: diff, items });
    setCart([]);
    setTimeLeft(config.timeLimit);
    setResult(null);
    setPhase("playing");
    startTimeRef.current = Date.now();

    // Start countdown
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Force finish via timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Handle time-up
  useEffect(() => {
    if (phase === "playing" && timeLeft <= 0 && challenge) {
      finishChallenge();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  const finishChallenge = useCallback(() => {
    if (!challenge) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const diff = Math.abs(challenge.target - cartTotal);
    const accuracy = Math.max(0, 100 - (diff / challenge.target) * 100);
    const timeUsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    const itemsBought = cart.reduce((sum, c) => sum + c.qty, 0);

    const res: ChallengeResult = {
      target: challenge.target,
      spent: cartTotal,
      diff,
      accuracy,
      timeUsed,
      itemsBought,
      grade: gradeResult(accuracy),
    };

    setResult(res);
    setPhase("result");

    // Actually add the purchases to the main store
    if (selectedBillionaire && cart.length > 0) {
      for (const c of cart) {
        for (let i = 0; i < c.qty; i++) {
          addPurchase({
            id: generateId(),
            product: {
              title: c.item.name,
              price: c.item.price,
              imageUrl: null,
              description: c.item.description,
              sourceUrl: `catalog://${c.item.id}`,
              assetClass: c.item.assetClass,
              monthlyOverhead: c.item.monthlyOverhead,
            },
            billionaireId: selectedBillionaire.id,
            timestamp: Date.now(),
          });
        }
      }
    }
  }, [challenge, cartTotal, cart, selectedBillionaire, addPurchase]);

  const addToCart = useCallback((item: CatalogItem) => {
    // Haptic
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);

    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [...prev, { item, qty: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === itemId);
      if (existing && existing.qty > 1) {
        return prev.map((c) =>
          c.item.id === itemId ? { ...c, qty: c.qty - 1 } : c
        );
      }
      return prev.filter((c) => c.item.id !== itemId);
    });
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!selectedBillionaire) return null;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-base">🎯</span>
        <h2 className="text-xs uppercase tracking-[0.2em] text-stone/75 font-medium">
          {locale === "zh" ? "预算挑战" : "Budget Challenge"}
        </h2>
      </div>

      {/* Idle — difficulty picker */}
      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <p className="text-xs text-ash/65">
              {locale === "zh"
                ? "选个难度，在限时内尽量花到目标金额！"
                : "Pick a difficulty — spend as close to the target as you can!"}
            </p>
            <div className="flex gap-2">
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => {
                const cfg = DIFFICULTY_CONFIG[d];
                return (
                  <button
                    key={d}
                    onClick={() => {
                      setDifficulty(d);
                      startChallenge(d);
                    }}
                    className="
                      flex-1 py-3 px-3 rounded-xl text-center
                      bg-surface/60 border border-line/30
                      hover:border-stone/40 hover:bg-surface/80
                      transition-all group
                    "
                  >
                    <div className="text-sm font-medium text-sand/85">
                      {locale === "zh" ? cfg.labelZh : cfg.label}
                    </div>
                    <div className="text-[10px] text-ash/50 mt-0.5">
                      {cfg.timeLimit}s
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Playing — the game */}
        {phase === "playing" && challenge && (
          <motion.div
            key="playing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {/* Target + Timer + Current */}
            <div className="flex items-center justify-between px-1">
              <div>
                <div className="text-[10px] text-ash/50 uppercase tracking-wider font-mono">
                  {locale === "zh" ? "目标" : "Target"}
                </div>
                <div className="text-lg font-serif text-stone tabular-nums">
                  {formatCurrency(challenge.target, true)}
                </div>
              </div>

              {/* Timer */}
              <div className="text-center">
                <motion.div
                  className={`text-2xl font-mono tabular-nums ${
                    timeLeft <= 10 ? "text-red-400/80" : "text-sand/70"
                  }`}
                  animate={timeLeft <= 5 ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.5, repeat: timeLeft <= 5 ? Infinity : 0 }}
                >
                  {timeLeft}s
                </motion.div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-ash/50 uppercase tracking-wider font-mono">
                  {locale === "zh" ? "已花" : "Spent"}
                </div>
                <div
                  className={`text-lg font-serif tabular-nums ${
                    Math.abs(cartTotal - challenge.target) / challenge.target < 0.05
                      ? "text-emerald-500"
                      : cartTotal > challenge.target
                      ? "text-red-400/80"
                      : "text-champagne"
                  }`}
                >
                  {formatCurrency(cartTotal, true)}
                </div>
              </div>
            </div>

            {/* Difference indicator */}
            <div className="px-1">
              <div className="relative h-2 rounded-full bg-surface-bright/80 overflow-hidden">
                <motion.div
                  className={`absolute top-0 left-0 h-full rounded-full ${
                    cartTotal > challenge.target ? "bg-red-400/50" : "bg-sage/50"
                  }`}
                  animate={{
                    width: `${Math.min(100, (cartTotal / challenge.target) * 100)}%`,
                  }}
                  transition={{ type: "spring", damping: 20 }}
                />
                {/* Target marker */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-stone/60" style={{ left: "100%" }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-ash/45">$0</span>
                <span className="text-[9px] text-ash/45">
                  {locale === "zh" ? "差额: " : "Diff: "}
                  <span className={cartTotal > challenge.target ? "text-red-400/70" : "text-sage/70"}>
                    {cartTotal > challenge.target ? "+" : "-"}
                    {formatCurrency(Math.abs(challenge.target - cartTotal), true)}
                  </span>
                </span>
              </div>
            </div>

            {/* Cart items */}
            {cart.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-1">
                {cart.map((c) => (
                  <button
                    key={c.item.id}
                    onClick={() => removeFromCart(c.item.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-stone/10 text-[10px] text-sand/80 hover:bg-stone/20 transition-colors"
                    title={locale === "zh" ? "点击移除" : "Click to remove"}
                  >
                    <span>{c.item.emoji}</span>
                    {c.qty > 1 && <span className="text-stone/70">×{c.qty}</span>}
                    <span className="text-ash/50 ml-0.5">✕</span>
                  </button>
                ))}
              </div>
            )}

            {/* Available items grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-[280px] overflow-y-auto scrollbar-hide">
              {challenge.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="
                    flex flex-col items-center gap-1 p-2 rounded-xl
                    bg-surface/50 border border-line/25
                    hover:border-stone/30 hover:bg-surface/70
                    active:scale-95 transition-all
                    text-center
                  "
                >
                  <span className="text-lg">{item.emoji}</span>
                  <span className="text-[9px] text-sand/70 truncate w-full">
                    {locale === "zh" ? item.nameZh : item.name}
                  </span>
                  <span className="text-[9px] text-champagne/70 font-serif tabular-nums">
                    {formatCurrency(item.price, item.price >= 1_000_000)}
                  </span>
                </button>
              ))}
            </div>

            {/* Submit button */}
            <button
              onClick={finishChallenge}
              className="
                w-full py-3 rounded-xl text-xs font-semibold uppercase tracking-wider
                bg-stone/20 text-stone hover:bg-stone/30 transition-colors
              "
            >
              {locale === "zh" ? "提交！" : "Submit!"}
            </button>
          </motion.div>
        )}

        {/* Result screen */}
        {phase === "result" && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4 text-center"
          >
            {/* Grade */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12, delay: 0.2 }}
            >
              <span className={`text-5xl font-serif font-bold ${GRADE_COLORS[result.grade]}`}>
                {result.grade}
              </span>
            </motion.div>

            <p className="text-xs text-ash/65">
              {locale === "zh"
                ? GRADE_MESSAGES[result.grade].zh
                : GRADE_MESSAGES[result.grade].en}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-[10px] text-ash/50 uppercase tracking-wider font-mono">
                  {locale === "zh" ? "目标" : "Target"}
                </div>
                <div className="text-sm font-serif text-sand/85 tabular-nums">
                  {formatCurrency(result.target, true)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-ash/50 uppercase tracking-wider font-mono">
                  {locale === "zh" ? "实际" : "Spent"}
                </div>
                <div className="text-sm font-serif text-champagne tabular-nums">
                  {formatCurrency(result.spent, true)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-ash/50 uppercase tracking-wider font-mono">
                  {locale === "zh" ? "精度" : "Accuracy"}
                </div>
                <div className={`text-sm font-serif tabular-nums ${GRADE_COLORS[result.grade]}`}>
                  {result.accuracy.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 text-[10px] text-ash/50">
              <span>⏱ {result.timeUsed}s</span>
              <span>🛒 {result.itemsBought} {locale === "zh" ? "件" : "items"}</span>
              <span>
                {result.diff < result.target * 0.01
                  ? "🎯"
                  : result.diff < result.target * 0.1
                  ? "👍"
                  : "😅"}{" "}
                {locale === "zh" ? "差 " : "off by "}
                {formatCurrency(result.diff, true)}
              </span>
            </div>

            {/* Play again */}
            <div className="flex gap-2">
              <button
                onClick={() => startChallenge(difficulty)}
                className="
                  flex-1 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider
                  bg-stone/20 text-stone hover:bg-stone/30 transition-colors
                "
              >
                {locale === "zh" ? "再来一局" : "Play Again"}
              </button>
              <button
                onClick={() => {
                  setPhase("idle");
                  setResult(null);
                }}
                className="
                  px-4 py-3 rounded-xl text-xs
                  text-ash/60 hover:text-stone/80 transition-colors
                "
              >
                {locale === "zh" ? "返回" : "Back"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
