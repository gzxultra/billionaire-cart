"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";

interface Reaction {
  emoji: string;
  mood: string;
  color: string;
}

interface BillionaireQuote {
  threshold: number; // percent spent
  quote: string;
}

const BILLIONAIRE_QUOTES: Record<string, BillionaireQuote[]> = {
  "elon-musk": [
    { threshold: 0, quote: "Let's build the future." },
    { threshold: 2, quote: "Pocket change for Mars." },
    { threshold: 10, quote: "Hmm, that's a few rockets." },
    { threshold: 25, quote: "Maybe we should slow down on X purchases..." },
    { threshold: 40, quote: "The Cybertruck fund is looking thin." },
    { threshold: 60, quote: "SpaceX board is going to call." },
    { threshold: 80, quote: "I'll have to sell more Tesla stock..." },
    { threshold: 95, quote: "To Mars... as a refugee." },
  ],
  "jeff-bezos": [
    { threshold: 0, quote: "It's always Day 1." },
    { threshold: 2, quote: "That was Prime-speed spending." },
    { threshold: 10, quote: "Still cheaper than Blue Origin launches." },
    { threshold: 25, quote: "Are you... one-clicking everything?" },
    { threshold: 40, quote: "Even Alexa is worried." },
    { threshold: 60, quote: "Maybe I should return to being CEO..." },
    { threshold: 80, quote: "The yacht is NOT for sale." },
    { threshold: 95, quote: "Should've stayed at the hedge fund." },
  ],
  "mark-zuckerberg": [
    { threshold: 0, quote: "Move fast and buy things." },
    { threshold: 2, quote: "This is fine. It's a metaverse investment." },
    { threshold: 10, quote: "That's a lot of VR headsets." },
    { threshold: 25, quote: "My AI assistant would not approve." },
    { threshold: 40, quote: "Even my Hawaiian ranch cost less." },
    { threshold: 60, quote: "Threading.Threads.panic();" },
    { threshold: 80, quote: "Should I pivot to... saving money?" },
    { threshold: 95, quote: "Poke. Please stop." },
  ],
  "bernard-arnault": [
    { threshold: 0, quote: "Luxury is in the details." },
    { threshold: 2, quote: "A modest acquisition." },
    { threshold: 10, quote: "Mon Dieu, the LVMH board sees this." },
    { threshold: 25, quote: "This is NOT how luxury works." },
    { threshold: 40, quote: "Even Hermès has limits." },
    { threshold: 60, quote: "My champagne is losing its fizz." },
    { threshold: 80, quote: "C'est catastrophique!" },
    { threshold: 95, quote: "Sacré bleu..." },
  ],
  "warren-buffett": [
    { threshold: 0, quote: "Rule #1: Never lose money." },
    { threshold: 2, quote: "This breaks Rule #1." },
    { threshold: 10, quote: "I still drive a '14 Cadillac for a reason." },
    { threshold: 25, quote: "The Oracle of Omaha disapproves." },
    { threshold: 40, quote: "Be fearful when others are greedy..." },
    { threshold: 60, quote: "Charlie would be rolling in his grave." },
    { threshold: 80, quote: "Should've stuck to Coca-Cola stock." },
    { threshold: 95, quote: "At least I still have my McMuffin money." },
  ],
  "bill-gates": [
    { threshold: 0, quote: "Let me analyze the ROI on this." },
    { threshold: 2, quote: "I've given away more than this." },
    { threshold: 10, quote: "This could've funded 10 vaccine programs." },
    { threshold: 25, quote: "Ctrl+Z. Ctrl+Z!" },
    { threshold: 40, quote: "Even Windows Vista was a better investment." },
    { threshold: 60, quote: "Melinda was right about the spending." },
    { threshold: 80, quote: "Blue Screen of Financial Death." },
    { threshold: 95, quote: "404: Net Worth Not Found." },
  ],
  "larry-ellison": [
    { threshold: 0, quote: "My island is bigger than your island." },
    { threshold: 2, quote: "That's Oracle cloud credits to me." },
    { threshold: 10, quote: "I've lost more than this in a yacht race." },
    { threshold: 25, quote: "Maybe I should sell a Hawaiian island." },
    { threshold: 40, quote: "The America's Cup can wait." },
    { threshold: 60, quote: "Even Larry Page spends less!" },
    { threshold: 80, quote: "Should've stuck to database licensing." },
    { threshold: 95, quote: "SELECT * FROM wealth WHERE balance > 0; — 0 rows" },
  ],
  "jensen-huang": [
    { threshold: 0, quote: "The more you buy, the more you save." },
    { threshold: 2, quote: "It's like buying GPUs — you always want more." },
    { threshold: 10, quote: "That's a lot of leather jackets." },
    { threshold: 25, quote: "CUDA can't compute a way out of this." },
    { threshold: 40, quote: "Even H100 sales can't keep up." },
    { threshold: 60, quote: "My leather jacket is sweating." },
    { threshold: 80, quote: "NVIDIA stock price: 📉" },
    { threshold: 95, quote: "Should've stayed at Denny's." },
  ],
};

// Fallback quotes for billionaires without custom quotes
const DEFAULT_QUOTES: BillionaireQuote[] = [
  { threshold: 0, quote: "Wealth is just a number." },
  { threshold: 2, quote: "A light shopping day." },
  { threshold: 10, quote: "Getting serious now." },
  { threshold: 25, quote: "My accountant is calling." },
  { threshold: 40, quote: "This is getting uncomfortable." },
  { threshold: 60, quote: "I'm starting to sweat." },
  { threshold: 80, quote: "Why did I agree to this?" },
  { threshold: 95, quote: "..." },
];

const REACTIONS: Reaction[] = [
  { emoji: "😎", mood: "Unfazed", color: "text-emerald-400/80" },
  { emoji: "🙂", mood: "Calm", color: "text-emerald-400/60" },
  { emoji: "😏", mood: "Amused", color: "text-emerald-400/40" },
  { emoji: "🤨", mood: "Noticing", color: "text-yellow-400/60" },
  { emoji: "😐", mood: "Concerned", color: "text-yellow-400/70" },
  { emoji: "😰", mood: "Worried", color: "text-orange-400/70" },
  { emoji: "😱", mood: "Panicking", color: "text-orange-400/80" },
  { emoji: "😭", mood: "Desperate", color: "text-red-400/80" },
  { emoji: "💀", mood: "Ruined", color: "text-red-500" },
];

function getReaction(percent: number): Reaction {
  if (percent < 1) return REACTIONS[0];
  if (percent < 5) return REACTIONS[1];
  if (percent < 10) return REACTIONS[2];
  if (percent < 20) return REACTIONS[3];
  if (percent < 35) return REACTIONS[4];
  if (percent < 50) return REACTIONS[5];
  if (percent < 70) return REACTIONS[6];
  if (percent < 90) return REACTIONS[7];
  return REACTIONS[8];
}

function getQuote(billionaireId: string, percent: number): string {
  const quotes = BILLIONAIRE_QUOTES[billionaireId] || DEFAULT_QUOTES;
  let best = quotes[0];
  for (const q of quotes) {
    if (percent >= q.threshold) best = q;
  }
  return best.quote;
}

export function BillionaireReactions() {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);
  const purchases = useCartStore((s) => s.purchases);

  const spentPercent = useMemo(
    () => (netWorth > 0 ? (totalSpent / netWorth) * 100 : 0),
    [totalSpent, netWorth]
  );

  if (!selectedBillionaire || purchases.length === 0) return null;

  const reaction = getReaction(spentPercent);
  const quote = getQuote(selectedBillionaire.id, spentPercent);

  // Stress bar segments
  const stressLevel = Math.min(spentPercent / 100, 1);

  return (
    <div className="w-full">
      <h2 className="section-label mb-4">
        {selectedBillionaire.name}&apos;s Reaction
      </h2>

      <div className="flex items-start gap-4">
        {/* Avatar with reaction */}
        <div className="relative shrink-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={reaction.emoji}
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.5, rotate: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="text-5xl"
            >
              {reaction.emoji}
            </motion.div>
          </AnimatePresence>

          {/* Stress ring */}
          <svg
            className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)]"
            viewBox="0 0 56 56"
          >
            <circle
              cx="28"
              cy="28"
              r="25"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="2"
            />
            <motion.circle
              cx="28"
              cy="28"
              r="25"
              fill="none"
              stroke={
                spentPercent > 70
                  ? "#ef4444"
                  : spentPercent > 40
                  ? "#f59e0b"
                  : "#34d399"
              }
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={`${stressLevel * 157} 157`}
              transform="rotate(-90 28 28)"
              initial={{ strokeDasharray: "0 157" }}
              animate={{ strokeDasharray: `${stressLevel * 157} 157` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ opacity: 0.5 }}
            />
          </svg>
        </div>

        {/* Quote + mood */}
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-medium ${reaction.color} mb-1`}>
            {reaction.mood}
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={quote}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-sm text-white/50 italic leading-relaxed"
            >
              &ldquo;{quote}&rdquo;
            </motion.p>
          </AnimatePresence>

          {/* Stress meter */}
          <div className="flex gap-0.5 mt-3">
            {Array.from({ length: 10 }).map((_, i) => {
              const segmentFilled = spentPercent > i * 10;
              return (
                <motion.div
                  key={i}
                  className="flex-1 h-1.5 rounded-full"
                  animate={{
                    backgroundColor: segmentFilled
                      ? i < 3
                        ? "rgba(52, 211, 153, 0.4)"
                        : i < 5
                        ? "rgba(251, 191, 36, 0.4)"
                        : i < 7
                        ? "rgba(249, 115, 22, 0.5)"
                        : "rgba(239, 68, 68, 0.6)"
                      : "rgba(36, 36, 41, 0.3)",
                  }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                />
              );
            })}
          </div>
          <div className="text-[9px] text-white/15 mt-1">
            Stress Level: {Math.min(spentPercent, 100).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}
