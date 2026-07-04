"use client";

import { motion } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

export function Achievements() {
  const achievements = useCartStore((s) => s.achievements);
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);
  const locale = useLocale((s) => s.locale);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-label">
          {t("achievements.title", locale)}
        </h2>
        <span className="text-[10px] text-ash/30 font-mono tabular-nums">
          {unlocked.length}/{achievements.length}
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {unlocked.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.04 }}
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
                text-[8px] uppercase tracking-wider font-mono
                ${
                  a.rarity === "legendary"
                    ? "text-champagne"
                    : a.rarity === "rare"
                    ? "text-slate-300"
                    : "text-stone/60"
                }
              `}
            >
              {t(`achievements.rarity.${a.rarity}`, locale)}
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
            <span className="text-[9px] text-ash/30 text-center">
              {t("achievements.locked", locale)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
