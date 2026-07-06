"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { catalogItems } from "@/data/catalog";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { playSparkle } from "@/lib/sounds";

type GameState = "idle" | "guessing" | "result";

interface RoundResult {
  item: typeof catalogItems[number];
  guess: number;
  actual: number;
  accuracy: number; // 0–100
}

function getAccuracy(guess: number, actual: number): number {
  if (actual === 0) return 0;
  const ratio = guess / actual;
  // Perfect = 100, off by 2x = 50, off by 10x = 10
  const distance = Math.abs(Math.log10(ratio));
  return Math.max(0, Math.round(100 * Math.exp(-distance * 2)));
}

function getVerdict(accuracy: number, locale: string): { text: string; emoji: string; color: string } {
  const isZh = locale === "zh";
  if (accuracy >= 90)
    return { text: isZh ? "完美！" : "Perfect!", emoji: "🎯", color: "text-sage" };
  if (accuracy >= 70)
    return { text: isZh ? "很接近！" : "So close!", emoji: "🔥", color: "text-champagne" };
  if (accuracy >= 50)
    return { text: isZh ? "还行" : "Not bad", emoji: "👀", color: "text-ash" };
  if (accuracy >= 30)
    return { text: isZh ? "差远了" : "Way off", emoji: "😅", color: "text-[#9B6B6B]" };
  return { text: isZh ? "离谱！" : "Absurd!", emoji: "💀", color: "text-[#9B6B6B]" };
}

export function PriceIsRight() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const soundEnabled = useCartStore((s) => s.soundEnabled);

  const [gameState, setGameState] = useState<GameState>("idle");
  const [currentItem, setCurrentItem] = useState<typeof catalogItems[number] | null>(null);
  const [guessInput, setGuessInput] = useState("");
  const [results, setResults] = useState<RoundResult[]>([]);
  const [roundCount, setRoundCount] = useState(0);
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());

  // Pick a random item not yet used
  const pickItem = useCallback(() => {
    const available = catalogItems.filter((item) => !usedIds.has(item.id));
    const pool = available.length > 0 ? available : catalogItems;
    const item = pool[Math.floor(Math.random() * pool.length)];
    if (available.length === 0) setUsedIds(new Set());
    else setUsedIds((prev) => new Set(prev).add(item.id));
    return item;
  }, [usedIds]);

  const startRound = useCallback(() => {
    const item = pickItem();
    setCurrentItem(item);
    setGuessInput("");
    setGameState("guessing");
    setRoundCount((c) => c + 1);
  }, [pickItem]);

  const submitGuess = useCallback(() => {
    if (!currentItem) return;
    const guess = parseFloat(guessInput.replace(/[,$\s]/g, ""));
    if (isNaN(guess) || guess < 0) return;

    const accuracy = getAccuracy(guess, currentItem.price);
    const result: RoundResult = {
      item: currentItem,
      guess,
      actual: currentItem.price,
      accuracy,
    };
    setResults((prev) => [result, ...prev].slice(0, 10));
    setGameState("result");

    if (soundEnabled && accuracy >= 70) playSparkle();
  }, [currentItem, guessInput, soundEnabled]);

  const totalScore = useMemo(
    () => results.reduce((sum, r) => sum + r.accuracy, 0),
    [results],
  );
  const avgScore = results.length > 0 ? Math.round(totalScore / results.length) : 0;

  // Reset on billionaire change
  useEffect(() => {
    setGameState("idle");
    setResults([]);
    setRoundCount(0);
    setUsedIds(new Set());
  }, [selectedBillionaire?.id]);

  if (!selectedBillionaire) return null;

  return (
    <section className="card-panel p-5 sm:p-8">
      <h2 className="section-label mb-2">
        {locale === "zh" ? "💰 猜价格" : "💰 Price Is Right"}
      </h2>
      <p className="text-xs text-ash/60 mb-4">
        {locale === "zh"
          ? "看到商品名，猜测它值多少钱。看看你对物价的感觉有多准！"
          : "See an item, guess its price. How well do you know what things cost?"}
      </p>

      <AnimatePresence mode="wait">
        {gameState === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              onClick={startRound}
              className="w-full py-3 px-6 rounded-xl font-serif text-sm tracking-wide bg-champagne/10 text-champagne border border-champagne/20 hover:bg-champagne/20 transition-all"
            >
              {locale === "zh" ? "🎲 开始猜价格" : "🎲 Start Guessing"}
            </button>

            {/* Past scores */}
            {results.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-ash/70">
                    {locale === "zh" ? "历史记录" : "History"}
                  </span>
                  <span className="text-xs text-ash/60 font-mono">
                    {locale === "zh" ? `平均: ${avgScore}分` : `Avg: ${avgScore}pts`}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {results.slice(0, 5).map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span>{r.item.emoji}</span>
                      <span className="text-ash/70 truncate flex-1">
                        {locale === "zh" ? r.item.nameZh : r.item.name}
                      </span>
                      <span className="text-ash/50 font-mono">{r.accuracy}pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {gameState === "guessing" && currentItem && (
          <motion.div
            key="guessing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Item reveal */}
            <div className="text-center py-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="text-5xl mb-3"
              >
                {currentItem.emoji}
              </motion.div>
              <h3 className="text-lg font-serif text-sand/90">
                {locale === "zh" ? currentItem.nameZh : currentItem.name}
              </h3>
              <p className="text-xs text-ash/50 mt-1">
                {locale === "zh" ? currentItem.descriptionZh : currentItem.description}
              </p>
              <div className="text-[10px] text-ash/40 mt-2 font-mono uppercase">
                Round {roundCount}
              </div>
            </div>

            {/* Guess input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ash/40 text-sm">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitGuess();
                  }}
                  placeholder={locale === "zh" ? "你的猜测..." : "Your guess..."}
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-sand/[0.04] border border-line/10 text-sm font-mono text-sand/90 placeholder:text-ash/30 focus:outline-none focus:border-champagne/30 transition-colors"
                  autoFocus
                />
              </div>
              <button
                onClick={submitGuess}
                disabled={!guessInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-champagne/10 text-champagne text-sm font-serif border border-champagne/20 hover:bg-champagne/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                {locale === "zh" ? "猜！" : "Guess!"}
              </button>
            </div>

            <button
              onClick={() => setGameState("idle")}
              className="w-full text-[10px] text-ash/40 hover:text-ash/60 transition-colors"
            >
              {locale === "zh" ? "取消" : "Cancel"}
            </button>
          </motion.div>
        )}

        {gameState === "result" && currentItem && results[0] && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {(() => {
              const verdict = getVerdict(results[0].accuracy, locale);
              return (
                <div className="text-center py-4">
                  <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 12 }}
                    className="text-4xl mb-2"
                  >
                    {verdict.emoji}
                  </motion.div>
                  <div className={`text-lg font-serif ${verdict.color}`}>
                    {verdict.text}
                  </div>
                  <div className="text-3xl font-serif text-champagne mt-2 tabular-nums">
                    {results[0].accuracy}
                    <span className="text-sm text-ash/50 ml-1">pts</span>
                  </div>
                </div>
              );
            })()}

            {/* Price comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl bg-sand/[0.03] border border-line/5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-ash/60 mb-1">
                  {locale === "zh" ? "你猜的" : "Your Guess"}
                </div>
                <div className="text-sm font-serif text-ash/80 tabular-nums">
                  {formatCurrency(results[0].guess)}
                </div>
              </div>
              <div className="text-center p-3 rounded-xl bg-sand/[0.03] border border-line/5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-ash/60 mb-1">
                  {locale === "zh" ? "实际价格" : "Actual Price"}
                </div>
                <div className="text-sm font-serif text-champagne tabular-nums">
                  {formatCurrency(results[0].actual)}
                </div>
              </div>
            </div>

            {/* How long for the billionaire */}
            {selectedBillionaire && (
              <div className="text-center text-xs text-ash/50">
                {(() => {
                  const secs = selectedBillionaire.earningsPerSecond > 0
                    ? results[0].actual / selectedBillionaire.earningsPerSecond
                    : 0;
                  return locale === "zh"
                    ? `${selectedBillionaire.name} 赚到这笔钱只需 ${secs < 1 ? secs.toFixed(2) + " 秒" : secs < 60 ? secs.toFixed(1) + " 秒" : (secs / 60).toFixed(1) + " 分钟"}`
                    : `${selectedBillionaire.name} earns this in ${secs < 1 ? secs.toFixed(2) + "s" : secs < 60 ? secs.toFixed(1) + "s" : (secs / 60).toFixed(1) + " min"}`;
                })()}
              </div>
            )}

            {/* Next round */}
            <div className="flex gap-2">
              <button
                onClick={startRound}
                className="flex-1 py-2.5 rounded-xl bg-champagne/10 text-champagne text-sm font-serif border border-champagne/20 hover:bg-champagne/20 transition-all"
              >
                {locale === "zh" ? "🎲 下一题" : "🎲 Next Round"}
              </button>
              <button
                onClick={() => setGameState("idle")}
                className="px-4 py-2.5 rounded-xl bg-sand/[0.04] text-ash/60 text-sm border border-line/10 hover:bg-sand/[0.08] transition-all"
              >
                {locale === "zh" ? "结束" : "Done"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
