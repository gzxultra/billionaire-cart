"use client";

import { motion } from "framer-motion";
import { useCartStore } from "@/lib/store";

export function Achievements() {
  const achievements = useCartStore((s) => s.achievements);
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-label">
          Achievements
        </h2>
        <span className="text-[10px] text-ash/30">
          {unlocked.length}/{achievements.length}
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {unlocked.map((a) => (
          <motion.div
            key={a.id}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="
              flex flex-col items-center gap-1 p-3 rounded-lg
              bg-stone/10 border border-stone/20
              shadow-stone-sm
            "
            title={`${a.name}: ${a.description}`}
          >
            <span className="text-2xl">{a.icon}</span>
            <span className="text-[9px] text-stone text-center leading-tight">
              {a.name}
            </span>
            <span
              className={`
                text-[8px] uppercase tracking-wider
                ${
                  a.rarity === "legendary"
                    ? "text-champagne"
                    : a.rarity === "rare"
                    ? "text-slate-300"
                    : "text-stone/60"
                }
              `}
            >
              {a.rarity}
            </span>
          </motion.div>
        ))}

        {locked.map((a) => (
          <div
            key={a.id}
            className="
              flex flex-col items-center gap-1 p-3 rounded-lg
              bg-surface/30 border border-line/10
              opacity-40
            "
            title={a.description}
          >
            <span className="text-2xl grayscale">🔒</span>
            <span className="text-[9px] text-ash/30 text-center">???</span>
          </div>
        ))}
      </div>
    </div>
  );
}
