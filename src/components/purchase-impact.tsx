"use client";

import { useEffect, useState, useRef, memo, useCallback } from "react";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";

interface MoneyPiece {
  id: number;
  x: number;
  emoji: string;
  delay: number;
  duration: number;
}

const MONEY_EMOJIS = ["💵", "💰", "💸", "🤑", "💎", "💲"];
const BIG_PURCHASE_EMOJIS = ["🔥", "💀", "🚀", "⚡", "💥", "🏆", "💎", "👑"];

function generateMoneyPieces(count: number, isMega: boolean): MoneyPiece[] {
  const emojis = isMega ? [...MONEY_EMOJIS, ...BIG_PURCHASE_EMOJIS] : MONEY_EMOJIS;
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 5 + Math.random() * 90,
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    delay: Math.random() * 0.6,
    duration: 1.5 + Math.random() * 1.5,
  }));
}

type ImpactTier = "none" | "small" | "medium" | "large" | "mega";

function getImpactTier(pctOfWorth: number): ImpactTier {
  if (pctOfWorth < 0.0001) return "none";      // < 0.01%
  if (pctOfWorth < 0.001) return "small";       // 0.01% - 0.1%
  if (pctOfWorth < 0.01) return "medium";       // 0.1% - 1%
  if (pctOfWorth < 0.05) return "large";        // 1% - 5%
  return "mega";                                 // > 5%
}

function getFlashColor(tier: ImpactTier): string {
  switch (tier) {
    case "small": return "rgba(90,138,104,0.08)";
    case "medium": return "rgba(166,133,48,0.1)";
    case "large": return "rgba(155,107,107,0.12)";
    case "mega": return "rgba(180,60,60,0.15)";
    default: return "transparent";
  }
}

function PurchaseImpactInner() {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const netWorth = useCartStore(selectNetWorth);
  const [pieces, setPieces] = useState<MoneyPiece[]>([]);
  const [visible, setVisible] = useState(false);
  const [flashColor, setFlashColor] = useState("transparent");
  const [showFlash, setShowFlash] = useState(false);
  const prevCountRef = useRef(0);

  // Detect new purchase and fire effect
  useEffect(() => {
    if (!selectedBillionaire) return;
    if (purchases.length <= prevCountRef.current || prevCountRef.current === 0) {
      prevCountRef.current = purchases.length;
      return;
    }
    prevCountRef.current = purchases.length;

    const lastPurchase = purchases[purchases.length - 1];
    const price = lastPurchase.product.price;
    const pctOfWorth = netWorth > 0 ? price / netWorth : 0;
    const tier = getImpactTier(pctOfWorth);

    if (tier === "none") return;

    // Flash effect
    setFlashColor(getFlashColor(tier));
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 400);

    // Money rain for medium+ purchases
    if (tier === "medium" || tier === "large" || tier === "mega") {
      const count = tier === "mega" ? 30 : tier === "large" ? 18 : 8;
      setPieces(generateMoneyPieces(count, tier === "mega"));
      setVisible(true);
      setTimeout(() => {
        setVisible(false);
        setPieces([]);
      }, 3000);
    }
  }, [purchases, selectedBillionaire, netWorth]);

  return (
    <>
      {/* Screen flash */}
      {showFlash && (
        <div
          className="purchase-flash-overlay"
          style={{ backgroundColor: flashColor }}
        />
      )}

      {/* Money rain */}
      {visible && pieces.length > 0 && (
        <>
          {pieces.map((p) => (
            <span
              key={p.id}
              className="money-rain-piece"
              style={{
                left: `${p.x}%`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
              }}
            >
              {p.emoji}
            </span>
          ))}
        </>
      )}
    </>
  );
}

export const PurchaseImpact = memo(PurchaseImpactInner);
