"use client";

import { motion } from "framer-motion";
import { billionaires } from "@/data/billionaires";
import { useCartStore } from "@/lib/store";
import { formatNetWorth } from "@/lib/format";
import { initAudio } from "@/lib/sounds";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

export function IdentitySelector() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const selectBillionaire = useCartStore((s) => s.selectBillionaire);

  const handleSelect = (id: string) => {
    initAudio();
    selectBillionaire(id);
  };

  return (
    <div className="w-full">
      <h2 className="section-label mb-5">
        {t("identity.title", locale)}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {billionaires.map((b) => {
          const isSelected = selectedBillionaire?.id === b.id;
          return (
            <motion.button
              key={b.id}
              onClick={() => handleSelect(b.id)}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              className={`
                flex items-center gap-3.5 p-3.5 rounded-xl text-left transition-all duration-200
                ${
                  isSelected
                    ? "bg-accent/10 border border-accent/30 shadow-accent-sm ring-1 ring-accent/10"
                    : "bg-surface-dim/50 border border-line/10 hover:border-accent/15 hover:bg-surface/40"
                }
              `}
            >
              {/* Initials avatar */}
              <div
                className={`
                  w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0
                  ${
                    isSelected
                      ? "bg-accent-gradient text-white shadow-accent-sm"
                      : "bg-surface-bright text-white/50"
                  }
                `}
              >
                {b.initials}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-semibold text-white/90 truncate">
                    {b.name}
                  </span>
                  <span className="text-xs">{b.emoji}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-[11px] text-white/35 truncate">
                    {b.company}
                  </span>
                  <span className="text-[12px] font-serif text-gold/80 shrink-0 font-medium">
                    {formatNetWorth(b.netWorthB)}
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
