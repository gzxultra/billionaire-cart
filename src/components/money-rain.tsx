"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent } from "@/lib/store";

/**
 * MoneyRain — animated dollar bills / money emojis rain down the screen
 * when a large purchase is made. Intensity scales with purchase size.
 */

interface RainDrop {
  id: number;
  emoji: string;
  x: number; // 0-100 viewport %
  delay: number;
  duration: number;
  size: number;
  rotation: number;
}

const MONEY_EMOJIS = ["💵", "💴", "💶", "💷", "💰", "🤑", "💎", "👑"];
const BILLION_EMOJIS = ["🏦", "💎", "👑", "🤑", "💰", "🏰", "✨", "🌟", "💫"];

function generateDrops(price: number): RainDrop[] {
  const drops: RainDrop[] = [];
  let count: number;
  let emojis: string[];

  if (price >= 1_000_000_000) {
    count = 40; // absurd rain
    emojis = BILLION_EMOJIS;
  } else if (price >= 100_000_000) {
    count = 30;
    emojis = MONEY_EMOJIS;
  } else if (price >= 10_000_000) {
    count = 20;
    emojis = MONEY_EMOJIS;
  } else if (price >= 1_000_000) {
    count = 12;
    emojis = MONEY_EMOJIS;
  } else {
    return []; // no rain for small purchases
  }

  for (let i = 0; i < count; i++) {
    drops.push({
      id: i,
      emoji: emojis[i % emojis.length],
      x: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 1.5 + Math.random() * 1.5,
      size: price >= 1_000_000_000 ? 24 + Math.random() * 16 : 16 + Math.random() * 12,
      rotation: -30 + Math.random() * 60,
    });
  }

  return drops;
}

export function MoneyRain() {
  const [drops, setDrops] = useState<RainDrop[]>([]);
  const [active, setActive] = useState(false);
  const purchases = useCartStore((s) => s.purchases);
  const lastCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (purchases.length <= lastCountRef.current) {
      lastCountRef.current = purchases.length;
      return;
    }
    lastCountRef.current = purchases.length;

    const lastPurchase = purchases[purchases.length - 1];
    if (!lastPurchase) return;

    const price = lastPurchase.product.price;
    const newDrops = generateDrops(price);

    if (newDrops.length > 0) {
      setDrops(newDrops);
      setActive(true);

      // Clean up after animation
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setActive(false);
        setDrops([]);
      }, 3500);
    }
  }, [purchases.length, purchases]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!active || drops.length === 0) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[55] overflow-hidden"
      aria-hidden="true"
    >
      <AnimatePresence>
        {drops.map((drop) => (
          <motion.div
            key={drop.id}
            initial={{
              y: -60,
              x: `${drop.x}vw`,
              opacity: 0.9,
              rotate: drop.rotation,
              scale: 0.5,
            }}
            animate={{
              y: "110vh",
              opacity: [0.9, 0.9, 0.6, 0],
              rotate: drop.rotation + 180,
              scale: 1,
            }}
            transition={{
              duration: drop.duration,
              delay: drop.delay,
              ease: "easeIn",
            }}
            className="absolute top-0"
            style={{ fontSize: drop.size }}
          >
            {drop.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
