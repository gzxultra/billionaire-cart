"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useCartStore, selectRemaining } from "@/lib/store";
import { catalogItems, CatalogItem } from "@/data/catalog";
import { formatCurrency, generateId } from "@/lib/format";
import { applyWealthDna } from "@/lib/wealth-dna";
import { playTieredPurchase, playGambleWin, playGambleLose } from "@/lib/sounds";
import { toast } from "@/lib/use-toast";
import { useLocale } from "@/lib/use-locale";
import { triggerHaptic } from "@/lib/haptics";

const GAME_DURATION_MS = 30_000;
const SWIPE_THRESHOLD = 100;

type GamePhase = "idle" | "countdown" | "playing" | "results";

interface GameResult {
  bought: CatalogItem[];
  skipped: CatalogItem[];
  totalSpent: number;
  elapsed: number;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function SwipeCard({
  item,
  locale,
  onSwipe,
  isTop,
}: {
  item: CatalogItem;
  locale: "en" | "zh";
  onSwipe: (dir: "left" | "right") => void;
  isTop: boolean;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-18, 0, 18]);
  const buyOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const skipOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x > SWIPE_THRESHOLD) {
        onSwipe("right");
      } else if (info.offset.x < -SWIPE_THRESHOLD) {
        onSwipe("left");
      }
    },
    [onSwipe]
  );

  if (!isTop) {
    return (
      <motion.div
        className="absolute inset-0 rounded-2xl bg-surface/60 border border-line/30 backdrop-blur-sm"
        style={{ scale: 0.95, y: 8 }}
      />
    );
  }

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.3}
      onDragEnd={handleDragEnd}
      style={{ x, rotate }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ x: 300, opacity: 0, rotate: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      <div className="relative w-full h-full rounded-2xl overflow-hidden bg-surface border border-line/50 shadow-lg">
        {/* Buy overlay */}
        <motion.div
          style={{ opacity: buyOpacity }}
          className="absolute inset-0 bg-sage/10 z-10 flex items-center justify-center pointer-events-none"
        >
          <span className="text-5xl font-bold text-sage px-6 py-3 rounded-2xl border-4 border-sage/50 rotate-[-15deg]">
            BUY
          </span>
        </motion.div>

        {/* Skip overlay */}
        <motion.div
          style={{ opacity: skipOpacity }}
          className="absolute inset-0 bg-[#9B6B6B]/10 z-10 flex items-center justify-center pointer-events-none"
        >
          <span className="text-5xl font-bold text-[#9B6B6B] px-6 py-3 rounded-2xl border-4 border-[#9B6B6B]/50 rotate-[15deg]">
            SKIP
          </span>
        </motion.div>

        {/* Card content */}
        <div className="relative z-5 flex flex-col items-center justify-center h-full p-6 text-center gap-4">
          <span className="text-6xl">{item.emoji}</span>
          <div>
            <h3 className="text-lg font-medium text-sand">
              {locale === "zh" ? item.nameZh : item.name}
            </h3>
            <p className="text-xs text-ash/60 mt-1 line-clamp-2">
              {locale === "zh" ? item.descriptionZh : item.description}
            </p>
          </div>
          <div className="text-2xl font-serif text-champagne">
            {formatCurrency(item.price, item.price >= 1_000_000)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function SpeedShop() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const addPurchase = useCartStore((s) => s.addPurchase);
  const soundEnabled = useCartStore((s) => s.soundEnabled);
  const remaining = useCartStore(selectRemaining);

  const [phase, setPhase] = useState<GamePhase>("idle");
  const [countdown, setCountdown] = useState(3);
  const [deck, setDeck] = useState<CatalogItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [bought, setBought] = useState<CatalogItem[]>([]);
  const [skipped, setSkipped] = useState<CatalogItem[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_MS);

  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const startGame = useCallback(() => {
    const shuffled = shuffleArray(catalogItems);
    setDeck(shuffled);
    setCurrentIdx(0);
    setBought([]);
    setSkipped([]);
    setTotalSpent(0);
    setTimeLeft(GAME_DURATION_MS);
    setCountdown(3);
    setPhase("countdown");

    let c = 3;
    const cdInterval = setInterval(() => {
      c--;
      if (c <= 0) {
        clearInterval(cdInterval);
        setPhase("playing");
        startTimeRef.current = Date.now();

        // Start game timer
        timerRef.current = setInterval(() => {
          const elapsed = Date.now() - startTimeRef.current;
          const left = Math.max(0, GAME_DURATION_MS - elapsed);
          setTimeLeft(left);
          if (left <= 0) {
            clearInterval(timerRef.current);
            setPhase("results");
          }
        }, 50);
      } else {
        setCountdown(c);
      }
    }, 800);
  }, []);

  const handleSwipe = useCallback(
    (dir: "left" | "right") => {
      if (phase !== "playing" || currentIdx >= deck.length) return;

      const item = deck[currentIdx];

      if (dir === "right" && selectedBillionaire) {
        // Buy
        const dna = applyWealthDna(
          { title: item.name, price: item.price, assetClass: item.assetClass },
          selectedBillionaire
        );
        addPurchase({
          id: generateId(),
          product: {
            title: item.name,
            price: dna.adjustedPrice,
            imageUrl: null,
            description: item.description,
            sourceUrl: `catalog://${item.id}`,
            assetClass: item.assetClass,
            monthlyOverhead: item.monthlyOverhead,
          },
          billionaireId: selectedBillionaire.id,
          timestamp: Date.now(),
        });
        setBought((prev) => [...prev, item]);
        setTotalSpent((prev) => prev + dna.adjustedPrice);
        triggerHaptic("medium");
        if (soundEnabled) playTieredPurchase(item.price);
      } else {
        // Skip
        setSkipped((prev) => [...prev, item]);
        triggerHaptic("light");
      }

      const nextIdx = currentIdx + 1;
      if (nextIdx >= deck.length) {
        // Ran out of cards
        if (timerRef.current) clearInterval(timerRef.current);
        setPhase("results");
      } else {
        setCurrentIdx(nextIdx);
      }
    },
    [phase, currentIdx, deck, selectedBillionaire, addPurchase, soundEnabled]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!selectedBillionaire) return null;

  const timerPct = (timeLeft / GAME_DURATION_MS) * 100;
  const currentItem = deck[currentIdx];
  const nextItem = deck[currentIdx + 1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-panel p-5 sm:p-6 stagger-section"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">⚡</span>
          <h2 className="section-label">
            {locale === "zh" ? "极速购物" : "Speed Shopping"}
          </h2>
        </div>
        {phase === "idle" && (
          <button
            onClick={startGame}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone/20 text-stone hover:bg-stone/30 transition-colors"
          >
            {locale === "zh" ? "🎮 开始挑战" : "🎮 Start Challenge"}
          </button>
        )}
        {phase === "results" && (
          <button
            onClick={startGame}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone/20 text-stone hover:bg-stone/30 transition-colors"
          >
            {locale === "zh" ? "🔄 再来一局" : "🔄 Play Again"}
          </button>
        )}
      </div>

      {/* Idle state */}
      {phase === "idle" && (
        <div className="text-center py-6 space-y-3">
          <div className="text-4xl">🛒💨</div>
          <p className="text-sm text-ash/70">
            {locale === "zh"
              ? "30秒内尽可能多地购买！左滑跳过，右滑购买"
              : "Buy as much as you can in 30 seconds! Swipe left to skip, right to buy"}
          </p>
          <div className="flex items-center justify-center gap-4 text-[10px] text-ash/50 font-mono">
            <span>← {locale === "zh" ? "跳过" : "SKIP"}</span>
            <span>{locale === "zh" ? "购买" : "BUY"} →</span>
          </div>
        </div>
      )}

      {/* Countdown */}
      <AnimatePresence>
        {phase === "countdown" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-12"
          >
            <motion.span
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-6xl font-serif text-champagne"
            >
              {countdown}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playing */}
      {phase === "playing" && currentItem && (
        <div className="space-y-4">
          {/* Timer bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-ash/60">
              <span>
                {bought.length} {locale === "zh" ? "已买" : "bought"}
              </span>
              <span>
                {Math.ceil(timeLeft / 1000)}s
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-dim/60 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  width: `${timerPct}%`,
                  backgroundColor:
                    timerPct > 50
                      ? "rgba(125, 155, 138, 0.6)"
                      : timerPct > 20
                      ? "rgba(197, 165, 114, 0.7)"
                      : "rgba(180, 60, 60, 0.7)",
                }}
              />
            </div>
          </div>

          {/* Card stack */}
          <div className="relative w-full aspect-[3/4] max-w-xs mx-auto">
            {/* Background card */}
            {nextItem && (
              <div className="absolute inset-0 rounded-2xl bg-surface/40 border border-line/20 scale-[0.93] translate-y-2" />
            )}

            {/* Active card */}
            <AnimatePresence mode="popLayout">
              <SwipeCard
                key={currentItem.id + "-" + currentIdx}
                item={currentItem}
                locale={locale}
                onSwipe={handleSwipe}
                isTop={true}
              />
            </AnimatePresence>
          </div>

          {/* Quick action buttons for non-swipers */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => handleSwipe("left")}
              className="w-14 h-14 rounded-full bg-[#9B6B6B]/15 border border-[#9B6B6B]/25 flex items-center justify-center text-2xl hover:bg-[#9B6B6B]/25 transition-colors active:scale-90"
              aria-label={locale === "zh" ? "跳过" : "Skip"}
            >
              ✕
            </button>
            <button
              onClick={() => handleSwipe("right")}
              className="w-14 h-14 rounded-full bg-sage/15 border border-sage/25 flex items-center justify-center text-2xl hover:bg-sage/25 transition-colors active:scale-90"
              aria-label={locale === "zh" ? "购买" : "Buy"}
            >
              ✓
            </button>
          </div>

          {/* Running total */}
          <div className="text-center">
            <span className="text-[10px] text-ash/50 font-mono">
              {locale === "zh" ? "已花费" : "Spent"}: {formatCurrency(totalSpent, totalSpent >= 1_000_000)}
            </span>
          </div>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {phase === "results" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 py-2"
          >
            {/* Score header */}
            <div className="text-center space-y-2">
              <div className="text-4xl">
                {bought.length >= 20
                  ? "🏆"
                  : bought.length >= 10
                  ? "🥇"
                  : bought.length >= 5
                  ? "🥈"
                  : "🥉"}
              </div>
              <div className="text-xl font-serif text-sand">
                {bought.length} {locale === "zh" ? "件商品" : "items bought"}
              </div>
              <div className="text-sm font-serif text-champagne">
                {formatCurrency(totalSpent, true)}{" "}
                {locale === "zh" ? "总花费" : "total spent"}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl bg-sage/5 border border-sage/15">
                <div className="text-lg font-serif text-sage">{bought.length}</div>
                <div className="text-[9px] text-ash/50 uppercase tracking-wider mt-1">
                  {locale === "zh" ? "已买" : "Bought"}
                </div>
              </div>
              <div className="text-center p-3 rounded-xl bg-[#9B6B6B]/5 border border-[#9B6B6B]/15">
                <div className="text-lg font-serif text-[#9B6B6B]">{skipped.length}</div>
                <div className="text-[9px] text-ash/50 uppercase tracking-wider mt-1">
                  {locale === "zh" ? "跳过" : "Skipped"}
                </div>
              </div>
              <div className="text-center p-3 rounded-xl bg-champagne/5 border border-champagne/15">
                <div className="text-lg font-serif text-champagne">
                  {bought.length > 0
                    ? `${((bought.length / (bought.length + skipped.length)) * 100).toFixed(0)}%`
                    : "0%"}
                </div>
                <div className="text-[9px] text-ash/50 uppercase tracking-wider mt-1">
                  {locale === "zh" ? "购买率" : "Buy Rate"}
                </div>
              </div>
            </div>

            {/* Spender title */}
            <div className="text-center">
              <span className="text-xs text-ash/60">
                {bought.length >= 20
                  ? (locale === "zh" ? "👑 传说级购物狂" : "👑 Legendary Shopper")
                  : bought.length >= 15
                  ? (locale === "zh" ? "⚡ 闪电买手" : "⚡ Lightning Buyer")
                  : bought.length >= 10
                  ? (locale === "zh" ? "🔥 疯狂购物者" : "🔥 Shopping Maniac")
                  : bought.length >= 5
                  ? (locale === "zh" ? "🛒 快速买家" : "🛒 Quick Shopper")
                  : (locale === "zh" ? "🐌 犹豫症患者" : "🐌 Hesitant Spender")}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
