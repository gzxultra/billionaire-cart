"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectRemaining } from "@/lib/store";
import { catalogItems, CatalogItem } from "@/data/catalog";
import { generateId, formatCurrency } from "@/lib/format";
import { playAuthorize, playSparkle, playGambleWin, playGambleLose } from "@/lib/sounds";
import { toast } from "@/lib/use-toast";
import { useLocale } from "@/lib/use-locale";

type NegPhase = "idle" | "round1" | "round2" | "round3" | "round4" | "deal" | "walkaway";

interface ChatBubble {
  sender: "seller" | "you";
  text: string;
  price?: number;
}

const SELLER_REACTIONS_EN = [
  "Hmm, that's quite low... but I appreciate your enthusiasm.",
  "You drive a hard bargain! Let me think...",
  "My accountant would kill me, but...",
  "I like your style. How about this:",
  "Bold move! Counter-offer:",
];

const SELLER_REACTIONS_ZH = [
  "嗯，这有点低了…但我欣赏你的胆量。",
  "你可真会砍价！让我想想…",
  "我的会计会杀了我的，但是…",
  "我喜欢你的风格。这样如何：",
  "好大胆！我的还价是：",
];

const DEAL_LINES_EN = [
  "You know what? DEAL! 🤝",
  "Fine, you win this round! DEAL!",
  "My heart says no but my wallet says DEAL!",
  "Alright, alright... DEAL! You're good.",
];

const DEAL_LINES_ZH = [
  "行吧！成交！🤝",
  "好吧，这轮你赢了！成交！",
  "我的心在滴血，但是…成交！",
  "好好好…成交！你真厉害。",
];

const WALKAWAY_EN = [
  "Sorry, I can't go that low. Deal's off! 🚶",
  "That's my final offer and you didn't take it. Bye!",
  "I'd rather keep it than sell at that price. Later!",
];

const WALKAWAY_ZH = [
  "抱歉，这个价我卖不了。交易取消！🚶",
  "这是我的底价了，你不要拉倒！",
  "与其这个价卖，我还不如自己留着。再见！",
];

export function PriceNegotiator() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const addPurchase = useCartStore((s) => s.addPurchase);
  const soundEnabled = useCartStore((s) => s.soundEnabled);
  const remaining = useCartStore(selectRemaining);

  const [phase, setPhase] = useState<NegPhase>("idle");
  const [item, setItem] = useState<CatalogItem | null>(null);
  const [chat, setChat] = useState<ChatBubble[]>([]);
  const [sellerAsk, setSellerAsk] = useState(0);
  const [userOffer, setUserOffer] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const startNegotiation = useCallback(() => {
    const eligible = catalogItems.filter((i) => i.price >= 50 && i.price <= remaining * 1.5);
    if (eligible.length === 0) return;

    const picked = eligible[Math.floor(Math.random() * eligible.length)];
    setItem(picked);
    setSellerAsk(picked.price);
    setUserOffer(0);
    setFinalPrice(0);
    setChat([
      {
        sender: "seller",
        text: locale === "zh"
          ? `${picked.nameZh}，我要 ${formatCurrency(picked.price)}。有兴趣吗？`
          : `${picked.name} — I'm asking ${formatCurrency(picked.price)}. Interested?`,
        price: picked.price,
      },
    ]);
    setPhase("round1");
    setTyping(false);

    if (soundEnabled) playAuthorize();
  }, [remaining, soundEnabled, locale]);

  const doCounter = useCallback((round: number) => {
    if (!item || typing) return;

    let counterOffer: number;
    let nextPhase: NegPhase;

    if (round === 1) {
      // User counters at 50-60% of asking
      counterOffer = Math.round(sellerAsk * (0.5 + Math.random() * 0.1));
      nextPhase = "round2";
    } else if (round === 3) {
      // User counters at 65-75%
      counterOffer = Math.round(sellerAsk * (0.65 + Math.random() * 0.1));
      nextPhase = "round4";
    } else {
      return;
    }

    setUserOffer(counterOffer);
    setChat((prev) => [
      ...prev,
      {
        sender: "you",
        text: locale === "zh"
          ? `我出 ${formatCurrency(counterOffer)}。`
          : `I'll offer ${formatCurrency(counterOffer)}.`,
        price: counterOffer,
      },
    ]);

    // Seller responds after delay
    setTyping(true);
    setTimeout(() => {
      if (round === 1) {
        // Seller comes down to 80-90%
        const newAsk = Math.round(item.price * (0.8 + Math.random() * 0.1));
        setSellerAsk(newAsk);

        const reaction = locale === "zh" ? pick(SELLER_REACTIONS_ZH) : pick(SELLER_REACTIONS_EN);
        setChat((prev) => [
          ...prev,
          {
            sender: "seller",
            text: `${reaction} ${formatCurrency(newAsk)}`,
            price: newAsk,
          },
        ]);
        setPhase("round3");
      } else if (round === 3) {
        // Final round: 70% chance deal, 30% walkaway
        const dealSuccess = Math.random() < 0.7;

        if (dealSuccess) {
          const deal = Math.round((counterOffer + sellerAsk) / 2);
          setFinalPrice(deal);

          const dealLine = locale === "zh" ? pick(DEAL_LINES_ZH) : pick(DEAL_LINES_EN);
          setChat((prev) => [
            ...prev,
            {
              sender: "seller",
              text: `${dealLine} ${formatCurrency(deal)}`,
              price: deal,
            },
          ]);
          setPhase("deal");

          // Add purchase
          addPurchase({
            id: generateId(),
            product: {
              title: `🤝 ${item.name} (Negotiated)`,
              price: deal,
              imageUrl: null,
              description: locale === "zh"
                ? `砍价成功！原价 ${formatCurrency(item.price)}，省了 ${formatCurrency(item.price - deal)}`
                : `Haggled down from ${formatCurrency(item.price)}! Saved ${formatCurrency(item.price - deal)}`,
              sourceUrl: `negotiate://${item.id}/${Date.now()}`,
              assetClass: item.assetClass,
              monthlyOverhead: item.monthlyOverhead,
            },
            billionaireId: selectedBillionaire?.id || "",
            timestamp: Date.now(),
          });

          if (soundEnabled) playGambleWin();
          toast(
            locale === "zh"
              ? `🤝 成交！${item.nameZh} 只花了 ${formatCurrency(deal)}`
              : `🤝 DEAL! Got ${item.name} for ${formatCurrency(deal)}`
          );
        } else {
          const walkLine = locale === "zh" ? pick(WALKAWAY_ZH) : pick(WALKAWAY_EN);
          setChat((prev) => [
            ...prev,
            { sender: "seller", text: walkLine },
          ]);
          setPhase("walkaway");
          if (soundEnabled) playGambleLose();
        }
      }

      setTyping(false);
    }, 1000 + Math.random() * 500);
  }, [item, sellerAsk, addPurchase, selectedBillionaire, soundEnabled, locale, typing]);

  if (!selectedBillionaire) return null;

  return (
    <section className="card-panel p-5 sm:p-8">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-base">🤝</span>
        <h2 className="text-xs uppercase tracking-[0.2em] text-stone/75 font-medium">
          {locale === "zh" ? "砍价" : "Negotiate"}
        </h2>
        <span className="text-[10px] text-ash/50 ml-auto font-mono">
          {locale === "zh" ? "讨价还价" : "Haggle for deals"}
        </span>
      </div>

      {phase === "idle" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-6"
        >
          <div className="text-3xl mb-3">💬</div>
          <p className="text-[11px] text-ash/60 mb-4">
            {locale === "zh"
              ? "跟卖家砍价，最多能省 30%"
              : "Haggle with the seller for up to 30% off"}
          </p>
          <button
            onClick={startNegotiation}
            className="px-5 py-2.5 rounded-xl text-xs font-medium text-sand bg-stone-gradient shadow-stone-sm hover:shadow-stone transition-all"
          >
            {locale === "zh" ? "开始砍价" : "Start Haggling"}
          </button>
        </motion.div>
      )}

      {phase !== "idle" && item && (
        <div className="space-y-4">
          {/* Item being negotiated */}
          <div className="flex items-center gap-3 bg-surface-bright/60 rounded-xl px-3 py-2 border border-line/30">
            <span className="text-2xl">{item.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-sand truncate">
                {locale === "zh" ? item.nameZh : item.name}
              </div>
              <div className="text-[10px] text-ash/50 font-mono">
                {locale === "zh" ? "零售价" : "Retail"}: {formatCurrency(item.price)}
              </div>
            </div>
          </div>

          {/* Chat bubbles */}
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            <AnimatePresence mode="popLayout">
              {chat.map((bubble, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${bubble.sender === "you" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[11px] ${
                      bubble.sender === "you"
                        ? "bg-stone/15 text-sand rounded-br-md"
                        : "bg-surface-bright/80 text-ash/80 border border-line/30 rounded-bl-md"
                    }`}
                  >
                    <div className="text-[9px] text-ash/40 mb-0.5 font-mono uppercase">
                      {bubble.sender === "you"
                        ? (locale === "zh" ? "你" : "You")
                        : (locale === "zh" ? "卖家" : "Seller")}
                    </div>
                    {bubble.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {typing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-surface-bright/80 border border-line/30 rounded-2xl rounded-bl-md px-3.5 py-2">
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-[11px] text-ash/50"
                  >
                    {locale === "zh" ? "卖家正在输入..." : "Seller typing..."}
                  </motion.span>
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Action buttons */}
          {(phase === "round1" || phase === "round3") && !typing && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <button
                onClick={() => { setPhase("walkaway"); setChat((c) => [...c, { sender: "you", text: locale === "zh" ? "算了，不买了" : "Nah, I'll pass" }]); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium text-ash/70 bg-surface-bright/80 border border-line/40 hover:border-stone/30 transition-all"
              >
                {locale === "zh" ? "放弃" : "Walk Away"}
              </button>
              <button
                onClick={() => doCounter(phase === "round1" ? 1 : 3)}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium text-sand bg-stone-gradient shadow-stone-sm hover:shadow-stone transition-all"
              >
                {locale === "zh" ? "还价！" : "Counter!"}
              </button>
            </motion.div>
          )}

          {/* Deal result */}
          {phase === "deal" && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="text-center py-3"
            >
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="text-4xl mb-2"
              >
                🤝
              </motion.div>
              <h3 className="text-base font-serif text-champagne mb-1">
                {locale === "zh" ? "成交！" : "DEAL!"}
              </h3>
              <p className="text-[11px] text-sage">
                {locale === "zh"
                  ? `省了 ${formatCurrency(item.price - finalPrice)} (${Math.round((1 - finalPrice / item.price) * 100)}% off)`
                  : `Saved ${formatCurrency(item.price - finalPrice)} (${Math.round((1 - finalPrice / item.price) * 100)}% off)`}
              </p>
              <button
                onClick={() => { setPhase("idle"); startNegotiation(); }}
                className="mt-3 px-5 py-2 rounded-xl text-xs font-medium text-sand bg-stone-gradient shadow-stone-sm hover:shadow-stone transition-all"
              >
                {locale === "zh" ? "再砍一个" : "Haggle Again"}
              </button>
            </motion.div>
          )}

          {/* Walk away */}
          {phase === "walkaway" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-3"
            >
              <div className="text-3xl mb-2">🚶</div>
              <h3 className="text-sm font-serif text-[#9B6B6B] mb-1">
                {locale === "zh" ? "交易告吹" : "No Deal"}
              </h3>
              <button
                onClick={() => { setPhase("idle"); startNegotiation(); }}
                className="mt-3 px-5 py-2 rounded-xl text-xs font-medium text-sand bg-stone-gradient shadow-stone-sm hover:shadow-stone transition-all"
              >
                {locale === "zh" ? "换一个砍" : "Try Another"}
              </button>
            </motion.div>
          )}
        </div>
      )}
    </section>
  );
}
