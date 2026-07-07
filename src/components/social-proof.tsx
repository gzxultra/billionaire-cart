"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";
import { formatCurrency } from "@/lib/format";
import { catalogItems } from "@/data/catalog";

/**
 * SocialProof — floating notifications showing fake "other shoppers" activity.
 * Creates a sense of community and engagement. Shows at bottom-left,
 * appears every 8–18 seconds while a billionaire is selected.
 */

const FIRST_NAMES = [
  "Alex", "Sam", "Jordan", "Taylor", "Morgan", "Riley", "Casey", "Drew",
  "Quinn", "Avery", "Blake", "Charlie", "Dakota", "Emery", "Finley", "Harper",
  "Jamie", "Kai", "Logan", "Peyton", "Reese", "Sage", "Tyler", "Wei",
  "Yuki", "Zara", "Aiden", "Bella", "Caleb", "Diana", "Elena", "Felix",
];

const FIRST_NAMES_ZH = [
  "小明", "小红", "小华", "小李", "小王", "小张", "小陈", "小刘",
  "阿杰", "阿伟", "小美", "小芳", "大卫", "小强", "阿豪", "小琳",
  "子轩", "雨桐", "浩然", "思远", "晨曦", "梦瑶", "天佑", "诗涵",
];

const LAST_INITIALS = "ABCDEFGHJKLMNPRSTUVWXYZ";

interface SocialEvent {
  id: number;
  name: string;
  item: string;
  emoji: string;
  price: number;
  action: "bought" | "splurge" | "spree";
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateEvent(locale: "en" | "zh", counter: number): SocialEvent {
  const item = randomPick(catalogItems);
  const qty = Math.random() > 0.7 ? Math.floor(Math.random() * 10) + 2 : 1;
  const price = item.price * qty;

  const name = locale === "zh"
    ? randomPick(FIRST_NAMES_ZH)
    : `${randomPick(FIRST_NAMES)} ${randomPick(LAST_INITIALS.split(""))}.`;

  const itemName = locale === "zh" ? item.nameZh : item.name;

  const actions: SocialEvent["action"][] = ["bought", "splurge", "spree"];
  const action = price > 1_000_000 ? "splurge" : qty > 3 ? "spree" : "bought";

  const displayItem = qty > 1 ? `${qty}× ${itemName}` : itemName;

  return {
    id: counter,
    name,
    item: displayItem,
    emoji: item.emoji,
    price,
    action,
  };
}

function formatAction(action: SocialEvent["action"], locale: "en" | "zh"): string {
  if (locale === "zh") {
    switch (action) {
      case "bought": return "刚买了";
      case "splurge": return "豪掷买了";
      case "spree": return "疯狂扫货";
    }
  }
  switch (action) {
    case "bought": return "just bought";
    case "splurge": return "just dropped";
    case "spree": return "went on a spree:";
  }
}

export function SocialProof() {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const locale = useLocale((s) => s.locale);
  const [events, setEvents] = useState<SocialEvent[]>([]);
  const counterRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const spawnEvent = useCallback(() => {
    counterRef.current++;
    const evt = generateEvent(locale, counterRef.current);
    setEvents((prev) => [...prev.slice(-2), evt]); // keep max 3
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setEvents((prev) => prev.filter((e) => e.id !== evt.id));
    }, 4500);
  }, [locale]);

  useEffect(() => {
    if (!selectedBillionaire) return;

    const scheduleNext = () => {
      const delay = 8000 + Math.random() * 12000; // 8–20 seconds
      timerRef.current = setTimeout(() => {
        spawnEvent();
        scheduleNext();
      }, delay);
    };

    // First event after 5–10 seconds
    timerRef.current = setTimeout(() => {
      spawnEvent();
      scheduleNext();
    }, 5000 + Math.random() * 5000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [selectedBillionaire, spawnEvent]);

  if (!selectedBillionaire) return null;

  return (
    <div className="fixed bottom-20 left-4 z-30 flex flex-col gap-2 pointer-events-none max-w-[280px] sm:max-w-xs">
      <AnimatePresence mode="popLayout">
        {events.map((evt) => (
          <motion.div
            key={evt.id}
            initial={{ opacity: 0, x: -60, scale: 0.85 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="pointer-events-auto bg-surface/90 backdrop-blur-lg border border-line/40 rounded-xl px-3 py-2.5 shadow-lg"
          >
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0 mt-0.5">{evt.emoji}</span>
              <div className="min-w-0">
                <div className="text-[11px] text-sand/90 leading-snug">
                  <span className="font-medium">{evt.name}</span>{" "}
                  <span className="text-ash/70">{formatAction(evt.action, locale)}</span>{" "}
                  <span className="text-sand/80">{evt.item}</span>
                </div>
                <div className="text-[10px] text-champagne/70 font-serif mt-0.5 tabular-nums">
                  {formatCurrency(evt.price, evt.price >= 1_000_000)}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
