"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";
import { formatCurrency, generateId } from "@/lib/format";
import { catalogItems, CatalogItem } from "@/data/catalog";
import { billionaires } from "@/data/billionaires";
import { Billionaire, ParsedProduct } from "@/lib/types";
import { applyWealthDna } from "@/lib/wealth-dna";
import { playSparkle } from "@/lib/sounds";

/**
 * BillionaireGiftExchange — Buy gifts for other billionaires.
 * Pick a recipient, pick or spin for an item, see their "reaction."
 * Reactions based on wealth DNA personality match.
 */

interface GiftReaction {
  emoji: string;
  text: string;
  textZh: string;
  sentiment: "love" | "meh" | "hate";
}

function getReaction(recipient: Billionaire, item: CatalogItem): GiftReaction {
  // Check if the item matches their DNA preferences
  const mockProduct: ParsedProduct = {
    title: item.name,
    price: item.price,
    imageUrl: null,
    description: item.description,
    sourceUrl: "",
    assetClass: item.assetClass,
    monthlyOverhead: 0,
  };
  const dna = applyWealthDna(mockProduct, recipient);

  if (dna.isFree) {
    return {
      emoji: "😒",
      text: `"I already get ${item.name} for free..."`,
      textZh: `"我已经可以免费拿到${item.nameZh}了……"`,
      sentiment: "meh",
    };
  }

  if (dna.modifier != null && dna.modifier < -0.1) {
    return {
      emoji: "😍",
      text: `"Wow, I love ${item.name}! Great taste!"`,
      textZh: `"哇，我超爱${item.nameZh}！品味很好！"`,
      sentiment: "love",
    };
  }

  if (dna.modifier != null && dna.modifier > 0.15) {
    return {
      emoji: "😬",
      text: `"Uh... ${item.name}? Not really my thing."`,
      textZh: `"呃……${item.nameZh}？不太是我的风格。"`,
      sentiment: "hate",
    };
  }

  // Personality-specific neutral reactions
  const reactions: GiftReaction[] = [
    { emoji: "🤔", text: `"Interesting choice... a ${item.name}."`, textZh: `"有意思……${item.nameZh}。"`, sentiment: "meh" },
    { emoji: "😊", text: `"Thanks for the ${item.name}! Very thoughtful."`, textZh: `"谢谢你的${item.nameZh}！很贴心。"`, sentiment: "love" },
    { emoji: "🙂", text: `"A ${item.name}? Sure, I'll take it."`, textZh: `"${item.nameZh}？好的，我收下了。"`, sentiment: "meh" },
  ];

  return reactions[Math.floor(Math.random() * reactions.length)];
}

interface GiftRecord {
  id: string;
  recipientId: string;
  recipientName: string;
  item: CatalogItem;
  reaction: GiftReaction;
  timestamp: number;
}

export function BillionaireGiftExchange() {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const addPurchase = useCartStore((s) => s.addPurchase);
  const soundEnabled = useCartStore((s) => s.soundEnabled);
  const purchases = useCartStore((s) => s.purchases);
  const locale = useLocale((s) => s.locale);

  const [selectedRecipient, setSelectedRecipient] = useState<Billionaire | null>(null);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [phase, setPhase] = useState<"pick-recipient" | "pick-item" | "sending" | "reaction">("pick-recipient");
  const [giftHistory, setGiftHistory] = useState<GiftRecord[]>([]);
  const [lastReaction, setLastReaction] = useState<GiftReaction | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Available recipients = all billionaires except current
  const recipients = useMemo(
    () => billionaires.filter((b) => b.id !== selectedBillionaire?.id),
    [selectedBillionaire?.id]
  );

  // Quick-pick items: a curated mix across tiers
  const giftItems = useMemo(() => {
    const tiers: Record<string, CatalogItem[]> = {};
    for (const item of catalogItems) {
      if (!tiers[item.tier]) tiers[item.tier] = [];
      tiers[item.tier].push(item);
    }
    // Pick 2 from each tier
    const picks: CatalogItem[] = [];
    for (const tier of ["everyday", "aspirational", "luxury", "ultra", "absurd"]) {
      const pool = tiers[tier] || [];
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      picks.push(...shuffled.slice(0, 2));
    }
    return picks;
  }, []);

  const handleSelectRecipient = useCallback((b: Billionaire) => {
    setSelectedRecipient(b);
    setPhase("pick-item");
  }, []);

  const handleSelectItem = useCallback((item: CatalogItem) => {
    setSelectedItem(item);
    setPhase("sending");

    // Send animation, then show reaction
    setTimeout(() => {
      if (!selectedRecipient || !selectedBillionaire) return;

      const reaction = getReaction(selectedRecipient, item);
      setLastReaction(reaction);

      // Record the purchase
      const product: ParsedProduct = {
        title: `🎁 Gift: ${item.name} → ${selectedRecipient.name}`,
        price: item.price,
        imageUrl: null,
        description: `Gift for ${selectedRecipient.name}`,
        sourceUrl: `gift://${item.id}`,
        assetClass: item.assetClass,
        monthlyOverhead: 0,
      };

      addPurchase({
        id: generateId(),
        product,
        billionaireId: selectedBillionaire.id,
        timestamp: Date.now(),
      });

      // Record gift history
      setGiftHistory((prev) => [
        {
          id: generateId(),
          recipientId: selectedRecipient.id,
          recipientName: selectedRecipient.name,
          item,
          reaction,
          timestamp: Date.now(),
        },
        ...prev,
      ].slice(0, 20));

      if (soundEnabled) playSparkle();
      setPhase("reaction");
    }, 1500);
  }, [selectedRecipient, selectedBillionaire, addPurchase, soundEnabled]);

  const handleReset = useCallback(() => {
    setSelectedRecipient(null);
    setSelectedItem(null);
    setLastReaction(null);
    setPhase("pick-recipient");
  }, []);

  // Only show after some purchases
  if (!selectedBillionaire || purchases.length < 5) return null;

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🎁</span>
          <h2 className="section-label !mb-0">
            {locale === "zh" ? "富豪送礼" : "Billionaire Gifts"}
          </h2>
        </div>
        {giftHistory.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-[10px] text-ash/60 hover:text-stone/70 transition-colors"
          >
            {locale === "zh" ? `已送 ${giftHistory.length} 份` : `${giftHistory.length} sent`}
          </button>
        )}
      </div>

      <p className="text-[11px] text-ash/55 mb-4">
        {locale === "zh"
          ? `用${selectedBillionaire.name}的钱给其他富豪买礼物，看看他们什么反应！`
          : `Use ${selectedBillionaire.name}'s money to buy gifts for other billionaires!`}
      </p>

      <AnimatePresence mode="wait">
        {/* Phase 1: Pick recipient */}
        {phase === "pick-recipient" && (
          <motion.div
            key="recipients"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="text-[10px] uppercase tracking-wider text-ash/50 mb-2 font-mono">
              {locale === "zh" ? "选择收礼人" : "Choose Recipient"}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {recipients.map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleSelectRecipient(b)}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-dim/60 border border-line/30 hover:border-stone/30 hover:bg-surface/60 transition-all text-left"
                >
                  <span className="text-lg">{b.emoji}</span>
                  <div className="min-w-0">
                    <div className="text-[11px] text-sand font-medium truncate">{b.name}</div>
                    <div className="text-[9px] text-ash/50">{b.company}</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Phase 2: Pick item */}
        {phase === "pick-item" && selectedRecipient && (
          <motion.div
            key="items"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <button onClick={handleReset} className="text-ash/50 hover:text-stone/70 transition-colors">
                ←
              </button>
              <span className="text-[11px] text-ash/60">
                {locale === "zh" ? "送给" : "Gift for"}{" "}
                <span className="text-sand font-medium">{selectedRecipient.emoji} {selectedRecipient.name}</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto scrollbar-hide">
              {giftItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-dim/60 border border-line/30 hover:border-stone/30 hover:bg-surface/60 transition-all text-left"
                >
                  <span className="text-lg shrink-0">{item.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-sand truncate">
                      {locale === "zh" ? item.nameZh : item.name}
                    </div>
                    <div className="text-[9px] text-champagne/70 font-mono">
                      {formatCurrency(item.price)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Phase 3: Sending animation */}
        {phase === "sending" && selectedRecipient && selectedItem && (
          <motion.div
            key="sending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-8"
          >
            <motion.div
              animate={{
                x: [0, 80, 160],
                y: [0, -30, 0],
                scale: [1, 1.2, 0.8],
              }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="text-3xl inline-block"
            >
              🎁
            </motion.div>
            <div className="text-xs text-ash/60 mt-3">
              {locale === "zh"
                ? `正在将 ${selectedItem.nameZh} 送给 ${selectedRecipient.name}...`
                : `Sending ${selectedItem.name} to ${selectedRecipient.name}...`}
            </div>
          </motion.div>
        )}

        {/* Phase 4: Reaction */}
        {phase === "reaction" && selectedRecipient && selectedItem && lastReaction && (
          <motion.div
            key="reaction"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-4 space-y-3"
          >
            <div className="text-4xl mb-2">{lastReaction.emoji}</div>
            <div className="text-sm font-medium text-sand">
              {selectedRecipient.name}
            </div>
            <div
              className={`text-xs italic ${
                lastReaction.sentiment === "love" ? "text-emerald-400/80" :
                lastReaction.sentiment === "hate" ? "text-red-400/70" :
                "text-ash/70"
              }`}
            >
              {locale === "zh" ? lastReaction.textZh : lastReaction.text}
            </div>
            <div className="text-[10px] text-ash/50">
              {locale === "zh" ? "花费" : "Cost"}: {formatCurrency(selectedItem.price)}{" "}
              {locale === "zh" ? "来自" : "from"} {selectedBillionaire?.name}
            </div>
            <button
              onClick={handleReset}
              className="mt-3 px-5 py-2 rounded-xl bg-stone/12 hover:bg-stone/20 border border-line/30 text-xs text-sand font-medium transition-all"
            >
              {locale === "zh" ? "再送一份" : "Send Another"} 🎁
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gift history */}
      <AnimatePresence>
        {showHistory && giftHistory.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 overflow-hidden"
          >
            <div className="text-[10px] uppercase tracking-wider text-ash/50 mb-2 font-mono">
              {locale === "zh" ? "送礼记录" : "Gift History"}
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-hide">
              {giftHistory.map((gift) => (
                <div
                  key={gift.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-surface-dim/40 border border-line/20 text-[10px]"
                >
                  <span>{gift.item.emoji}</span>
                  <span className="text-ash/60">→</span>
                  <span className="text-sand">{gift.recipientName}</span>
                  <span className="text-ash/40 ml-auto">{gift.reaction.emoji}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
