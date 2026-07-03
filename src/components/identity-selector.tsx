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
      <h2 className="text-xs uppercase tracking-[0.3em] text-copper/60 mb-4 font-sans">
        {t("identity.title", locale)}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {billionaires.map((b) => {
          const isSelected = selectedBillionaire?.id === b.id;
          return (
            <motion.button
              key={b.id}
              onClick={() => handleSelect(b.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-300
                ${
                  isSelected
                    ? "bg-copper/10 border border-copper/40 shadow-copper-sm"
                    : "bg-charcoal-800/50 border border-charcoal-600/20 hover:border-copper/20 hover:bg-charcoal-700/50"
                }
              `}
            >
              {/* Initials avatar */}
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0
                  ${
                    isSelected
                      ? "bg-copper-gradient text-vanta"
                      : "bg-charcoal-600 text-copper/70"
                  }
                `}
              >
                {b.initials}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-white/90 truncate">
                    {b.name}
                  </span>
                  <span className="text-xs">{b.emoji}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-white/30 truncate">
                    {b.company}
                  </span>
                  <span className="text-xs font-serif text-copper shrink-0">
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
