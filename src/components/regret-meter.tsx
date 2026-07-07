"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";

/**
 * RegretMeter — a visual "buyer's remorse" meter that escalates
 * through phases as spending percentage increases, with humorous
 * commentary, shaking, and color shifts.
 */

interface RegretPhase {
  threshold: number; // spending % threshold
  labelEn: string;
  labelZh: string;
  emoji: string;
  color: string; // tailwind text color
  bgColor: string;
  borderColor: string;
  quoteEn: string;
  quoteZh: string;
  shake: boolean;
}

const REGRET_PHASES: RegretPhase[] = [
  {
    threshold: 0,
    labelEn: "No Regrets",
    labelZh: "毫无悔意",
    emoji: "😎",
    color: "text-sage",
    bgColor: "bg-sage/8",
    borderColor: "border-sage/20",
    quoteEn: "Money well spent. Probably.",
    quoteZh: "花得值。大概吧。",
    shake: false,
  },
  {
    threshold: 0.5,
    labelEn: "Mild Concern",
    labelZh: "有点心虚",
    emoji: "😅",
    color: "text-stone-light",
    bgColor: "bg-stone/8",
    borderColor: "border-stone/20",
    quoteEn: "The accountant is starting to sweat...",
    quoteZh: "会计开始冒冷汗了...",
    shake: false,
  },
  {
    threshold: 2,
    labelEn: "Buyer's Anxiety",
    labelZh: "购物焦虑",
    emoji: "😰",
    color: "text-champagne",
    bgColor: "bg-champagne/8",
    borderColor: "border-champagne/25",
    quoteEn: "Maybe we should... slow down a little?",
    quoteZh: "也许我们该...稍微慢一点？",
    shake: false,
  },
  {
    threshold: 5,
    labelEn: "Deep Regret",
    labelZh: "深深后悔",
    emoji: "😨",
    color: "text-[#D97706]",
    bgColor: "bg-[#D97706]/8",
    borderColor: "border-[#D97706]/20",
    quoteEn: "This is fine. Everything is fine. *nervous laughter*",
    quoteZh: "没事的。一切都好。*紧张的笑声*",
    shake: true,
  },
  {
    threshold: 15,
    labelEn: "Existential Crisis",
    labelZh: "存在主义危机",
    emoji: "🫠",
    color: "text-[#EF4444]",
    bgColor: "bg-[#EF4444]/8",
    borderColor: "border-[#EF4444]/20",
    quoteEn: "Money is an illusion. We are all dust in the cosmic wind.",
    quoteZh: "钱是虚幻的。我们都是宇宙尘埃。",
    shake: true,
  },
  {
    threshold: 50,
    labelEn: "TOTAL MELTDOWN",
    labelZh: "彻底崩溃",
    emoji: "💀",
    color: "text-[#DC2626]",
    bgColor: "bg-[#DC2626]/10",
    borderColor: "border-[#DC2626]/25",
    quoteEn: "The fortune... it's... mostly gone. What have we done.",
    quoteZh: "钱...基本...花完了。我们都做了些什么。",
    shake: true,
  },
];

function getPhase(pct: number): RegretPhase {
  let best = REGRET_PHASES[0];
  for (const phase of REGRET_PHASES) {
    if (pct >= phase.threshold) best = phase;
  }
  return best;
}

export function RegretMeter() {
  const locale = useLocale((s) => s.locale);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);
  const purchases = useCartStore((s) => s.purchases);
  const billionaire = useCartStore((s) => s.selectedBillionaire);

  const pct = useMemo(() => (netWorth > 0 ? (totalSpent / netWorth) * 100 : 0), [totalSpent, netWorth]);
  const phase = useMemo(() => getPhase(pct), [pct]);

  if (!billionaire || purchases.length < 2) return null;

  // Meter fill (cap at 100%)
  const fillPct = Math.min(pct, 100);
  // Gradient color based on phase
  const gradientStop = pct < 5 ? "#5A8A68" : pct < 15 ? "#C5A572" : pct < 50 ? "#D97706" : "#DC2626";

  return (
    <motion.div
      animate={phase.shake ? { x: [0, -1, 1, -1, 0] } : undefined}
      transition={phase.shake ? { duration: 0.3, repeat: Infinity, repeatDelay: 2 } : undefined}
      className={`rounded-xl ${phase.bgColor} border ${phase.borderColor} p-4 transition-colors duration-500`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <motion.span
            key={phase.emoji}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="text-lg"
          >
            {phase.emoji}
          </motion.span>
          <div>
            <div className={`text-[10px] uppercase tracking-[0.2em] font-medium ${phase.color}`}>
              {locale === "zh" ? phase.labelZh : phase.labelEn}
            </div>
          </div>
        </div>
        <div className="text-[10px] text-ash/50 font-mono tabular-nums">
          {pct.toFixed(pct < 1 ? 3 : 1)}%
        </div>
      </div>

      {/* Meter bar */}
      <div className="h-2 rounded-full bg-surface-dim/40 overflow-hidden mb-2">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${fillPct}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
          style={{
            background: `linear-gradient(90deg, #5A8A68 0%, ${gradientStop} 100%)`,
          }}
        />
      </div>

      {/* Quote */}
      <motion.p
        key={phase.quoteEn}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-[10px] text-ash/60 italic"
      >
        {locale === "zh" ? phase.quoteZh : phase.quoteEn}
      </motion.p>
    </motion.div>
  );
}
