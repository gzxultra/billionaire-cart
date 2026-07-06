"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectRemaining } from "@/lib/store";
import { catalogItems, CatalogItem } from "@/data/catalog";
import { billionaires } from "@/data/billionaires";
import { generateId, formatCurrency } from "@/lib/format";
import { playAuthorize, playSparkle, playGambleWin, playGambleLose } from "@/lib/sounds";
import { toast } from "@/lib/use-toast";
import { useLocale } from "@/lib/use-locale";

type BidPhase = "idle" | "bidding" | "sold" | "lost";

interface AiBidder {
  name: string;
  emoji: string;
  aggression: number; // 0-1, higher = more aggressive
  folded: boolean;
  lastBid: number;
}

export function AuctionHouse() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const addPurchase = useCartStore((s) => s.addPurchase);
  const soundEnabled = useCartStore((s) => s.soundEnabled);
  const remaining = useCartStore(selectRemaining);

  const [phase, setPhase] = useState<BidPhase>("idle");
  const [lot, setLot] = useState<CatalogItem | null>(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [userBid, setUserBid] = useState(0);
  const [bidders, setBidders] = useState<AiBidder[]>([]);
  const [bidHistory, setBidHistory] = useState<Array<{ name: string; amount: number; emoji: string }>>([]);
  const [winner, setWinner] = useState<string>("");
  const [finalPrice, setFinalPrice] = useState(0);
  const [aiThinking, setAiThinking] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Pick 2 random AI bidders from billionaires (excluding selected)
  const availableBidders = useMemo(() => {
    return billionaires.filter((b) => b.id !== selectedBillionaire?.id);
  }, [selectedBillionaire]);

  const startAuction = useCallback(() => {
    // Pick random catalog item with price > $100
    const eligible = catalogItems.filter((i) => i.price >= 100 && i.price <= remaining * 2);
    if (eligible.length === 0) return;
    const item = eligible[Math.floor(Math.random() * eligible.length)];

    // Pick 2 random AI bidders
    const shuffled = [...availableBidders].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 2).map((b) => ({
      name: b.name,
      emoji: b.emoji,
      aggression: 0.3 + Math.random() * 0.5,
      folded: false,
      lastBid: 0,
    }));

    const startPrice = Math.round(item.price * 0.7);
    setLot(item);
    setCurrentBid(startPrice);
    setUserBid(0);
    setBidders(picked);
    setBidHistory([{ name: locale === "zh" ? "拍卖师" : "Auctioneer", amount: startPrice, emoji: "🔨" }]);
    setPhase("bidding");
    setWinner("");
    setFinalPrice(0);
    setAiThinking(false);

    if (soundEnabled) playAuthorize();
  }, [availableBidders, remaining, soundEnabled, locale]);

  const placeBid = useCallback(() => {
    if (!lot || phase !== "bidding" || aiThinking) return;

    const increment = Math.round(currentBid * (0.1 + Math.random() * 0.05));
    const newBid = currentBid + increment;

    if (newBid > remaining) {
      toast(locale === "zh" ? "余额不够加价了！" : "Can't afford to bid higher!");
      return;
    }

    setUserBid(newBid);
    setCurrentBid(newBid);
    setBidHistory((h) => [...h, { name: locale === "zh" ? "你" : "You", amount: newBid, emoji: "🫵" }]);

    if (soundEnabled) playSparkle();

    // AI response after delay
    setAiThinking(true);
    timerRef.current = setTimeout(() => {
      setBidders((prev) => {
        const updated = prev.map((bidder) => {
          if (bidder.folded) return bidder;

          // Decide whether to counter-bid based on aggression + price vs retail
          const priceRatio = newBid / lot.price;
          const foldChance = priceRatio > 1.2 ? 0.7 : priceRatio > 1 ? 0.4 : 0.15;
          const adjustedFold = foldChance * (1 - bidder.aggression);

          if (Math.random() < adjustedFold) {
            return { ...bidder, folded: true };
          }

          const aiIncrement = Math.round(newBid * (0.08 + Math.random() * 0.07));
          const aiBid = newBid + aiIncrement;
          return { ...bidder, lastBid: aiBid };
        });

        // Find highest AI bid that didn't fold
        const activeBidders = updated.filter((b) => !b.folded && b.lastBid > newBid);
        if (activeBidders.length > 0) {
          const highest = activeBidders.reduce((a, b) => (a.lastBid > b.lastBid ? a : b));
          setCurrentBid(highest.lastBid);
          setBidHistory((h) => [...h, { name: highest.name, amount: highest.lastBid, emoji: highest.emoji }]);
        }

        // Check if all folded
        const allFolded = updated.every((b) => b.folded);
        if (allFolded) {
          // User wins!
          setPhase("sold");
          setWinner(locale === "zh" ? "你" : "You");
          setFinalPrice(newBid);

          addPurchase({
            id: generateId(),
            product: {
              title: `⚔️ ${lot.name} (Auction Win)`,
              price: newBid,
              imageUrl: null,
              description: locale === "zh"
                ? `拍卖赢得！零售价 ${formatCurrency(lot.price)}`
                : `Won at auction! Retail: ${formatCurrency(lot.price)}`,
              sourceUrl: `auction://win/${Date.now()}`,
              assetClass: lot.assetClass,
              monthlyOverhead: lot.monthlyOverhead,
            },
            billionaireId: selectedBillionaire?.id || "",
            timestamp: Date.now(),
          });

          if (soundEnabled) playGambleWin();
          toast(locale === "zh"
            ? `⚔️ 拍卖成交！${formatCurrency(newBid)} 拍下 ${lot.nameZh}`
            : `⚔️ SOLD! Won ${lot.name} for ${formatCurrency(newBid)}`);
        }

        setAiThinking(false);
        return updated;
      });
    }, 800 + Math.random() * 600);
  }, [lot, phase, currentBid, remaining, addPurchase, selectedBillionaire, soundEnabled, locale, aiThinking]);

  const foldUser = useCallback(() => {
    if (!lot || phase !== "bidding") return;

    // AI wins at current bid
    const activeBidders = bidders.filter((b) => !b.folded);
    const winnerBidder = activeBidders.length > 0
      ? activeBidders[Math.floor(Math.random() * activeBidders.length)]
      : null;

    setPhase("lost");
    setWinner(winnerBidder?.name || "?");
    setFinalPrice(currentBid);
    if (soundEnabled) playGambleLose();
  }, [lot, phase, bidders, currentBid, soundEnabled]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!selectedBillionaire) return null;

  return (
    <section className="card-panel p-5 sm:p-8">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-base">⚔️</span>
        <h2 className="text-xs uppercase tracking-[0.2em] text-stone/75 font-medium">
          {locale === "zh" ? "拍卖行" : "Auction House"}
        </h2>
        <span className="text-[10px] text-ash/50 ml-auto font-mono">
          {locale === "zh" ? "竞价对决" : "Competitive bidding"}
        </span>
      </div>

      {phase === "idle" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-6"
        >
          <div className="text-3xl mb-3">🔨</div>
          <p className="text-[11px] text-ash/60 mb-4">
            {locale === "zh"
              ? "与 AI 竞争对手展开竞价之战"
              : "Compete against AI bidders for catalog items"}
          </p>
          <button
            onClick={startAuction}
            className="px-5 py-2.5 rounded-xl text-xs font-medium text-sand bg-stone-gradient shadow-stone-sm hover:shadow-stone transition-all"
          >
            {locale === "zh" ? "开始拍卖" : "Start Auction"}
          </button>
        </motion.div>
      )}

      {phase !== "idle" && lot && (
        <div className="space-y-4">
          {/* Lot display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-bright/60 rounded-xl p-4 border border-line/30 text-center"
          >
            <div className="text-[10px] uppercase tracking-widest text-stone/50 mb-1 font-mono">
              {locale === "zh" ? "当前拍品" : "Current Lot"}
            </div>
            <div className="text-3xl mb-2">{lot.emoji}</div>
            <h3 className="text-sm font-serif text-sand">
              {locale === "zh" ? lot.nameZh : lot.name}
            </h3>
            <p className="text-[10px] text-ash/50 mt-1">
              {locale === "zh" ? "零售价" : "Retail"}: {formatCurrency(lot.price)}
            </p>
          </motion.div>

          {/* Bidders */}
          <div className="flex justify-center gap-4">
            {bidders.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i === 0 ? -20 : 20 }}
                animate={{ opacity: b.folded ? 0.4 : 1, x: 0 }}
                className={`text-center px-3 py-2 rounded-lg ${
                  b.folded
                    ? "bg-surface-dim/40"
                    : "bg-surface-bright/60 border border-line/30"
                }`}
              >
                <div className="text-lg">{b.emoji}</div>
                <div className="text-[10px] text-ash/70 truncate max-w-[80px]">{b.name.split(" ")[0]}</div>
                {b.folded && (
                  <div className="text-[9px] text-[#9B6B6B] font-mono mt-0.5">
                    {locale === "zh" ? "退出" : "FOLD"}
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Current bid */}
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-widest text-stone/50 font-mono mb-1">
              {locale === "zh" ? "当前最高出价" : "Current Bid"}
            </div>
            <motion.div
              key={currentBid}
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              className="text-xl font-serif text-champagne"
            >
              {formatCurrency(currentBid)}
            </motion.div>
            {lot.price > 0 && (
              <div className={`text-[10px] font-mono mt-1 ${
                currentBid > lot.price ? "text-[#9B6B6B]" : "text-sage/70"
              }`}>
                {currentBid > lot.price
                  ? (locale === "zh" ? "已超过零售价！" : "Above retail!")
                  : `${Math.round((1 - currentBid / lot.price) * 100)}% ${locale === "zh" ? "折扣" : "off"}`}
              </div>
            )}
          </div>

          {/* Bid history (last 4) */}
          <div className="space-y-1.5 max-h-28 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {bidHistory.slice(-4).map((entry, i) => (
                <motion.div
                  key={`${entry.name}-${entry.amount}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-[11px] bg-surface-bright/40 rounded-lg px-3 py-1.5"
                >
                  <span>{entry.emoji}</span>
                  <span className="text-ash/70">{entry.name}:</span>
                  <span className="text-sand font-mono ml-auto">{formatCurrency(entry.amount)}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Action buttons */}
          {phase === "bidding" && (
            <div className="flex gap-3">
              <button
                onClick={foldUser}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium text-ash/70 bg-surface-bright/80 border border-line/40 hover:border-stone/30 transition-all"
              >
                {locale === "zh" ? "放弃竞拍" : "Fold"}
              </button>
              <button
                onClick={placeBid}
                disabled={aiThinking}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium text-sand bg-stone-gradient shadow-stone-sm hover:shadow-stone transition-all disabled:opacity-50"
              >
                {aiThinking
                  ? (locale === "zh" ? "对手出价中..." : "Bidding...")
                  : (locale === "zh" ? "加价！" : "Raise Bid!")}
              </button>
            </div>
          )}

          {/* Sold result */}
          {(phase === "sold" || phase === "lost") && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="text-center py-4"
            >
              {phase === "sold" ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="text-4xl mb-2"
                  >
                    🎉
                  </motion.div>
                  <h3 className="text-lg font-serif text-champagne mb-1">
                    {locale === "zh" ? "成交！" : "SOLD!"}
                  </h3>
                  <p className="text-[11px] text-ash/60">
                    {locale === "zh"
                      ? `以 ${formatCurrency(finalPrice)} 拍下`
                      : `Won for ${formatCurrency(finalPrice)}`}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-2">😤</div>
                  <h3 className="text-base font-serif text-[#9B6B6B] mb-1">
                    {locale === "zh" ? "被抢走了！" : "Outbid!"}
                  </h3>
                  <p className="text-[11px] text-ash/60">
                    {winner} {locale === "zh" ? "赢得了拍品" : "won the lot"}
                  </p>
                </>
              )}
              <button
                onClick={() => { setPhase("idle"); startAuction(); }}
                className="mt-4 px-5 py-2 rounded-xl text-xs font-medium text-sand bg-stone-gradient shadow-stone-sm hover:shadow-stone transition-all"
              >
                {locale === "zh" ? "下一场拍卖" : "Next Auction"}
              </button>
            </motion.div>
          )}
        </div>
      )}
    </section>
  );
}
