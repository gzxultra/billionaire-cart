"use client";

import { motion } from "framer-motion";
import { useCartStore, selectTotalSpent, selectMonthlyBurn, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

export function BlackCard() {
  const billionaire = useCartStore((s) => s.selectedBillionaire);
  const netWorth = useCartStore(selectNetWorth);
  const totalSpent = useCartStore(selectTotalSpent);
  const monthlyBurn = useCartStore(selectMonthlyBurn);
  const purchases = useCartStore((s) => s.purchases);
  const locale = useLocale((s) => s.locale);

  if (!billionaire) return null;

  const remaining = netWorth - totalSpent;
  const spentPercent = netWorth > 0 ? (totalSpent / netWorth) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="
        relative w-full aspect-[1.586/1] max-w-md mx-auto rounded-2xl overflow-hidden
        bg-gradient-to-br from-surface-dim via-base to-surface
      "
      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(155,139,122,0.06)" }}
      whileHover={{ scale: 1.005 }}
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
    >
      {/* Subtle warm border */}
      <div className="absolute inset-0 rounded-2xl border border-stone/8 pointer-events-none" />
      {/* Very subtle gradient sheen — top edge only */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-stone/15 to-transparent pointer-events-none" />

      {/* Top row: chip + brand */}
      <div className="absolute top-6 left-6 right-6 flex items-start justify-between">
        {/* Chip */}
        <div className="w-10 h-7 rounded bg-gradient-to-br from-stone-light/50 to-stone/30 border border-stone/20">
          <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-px p-px opacity-40">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-stone/30 rounded-[1px]" />
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[8px] uppercase tracking-[0.4em] text-stone/40 font-mono">
            {t("card.brand", locale)}
          </div>
          <div className="text-[7px] uppercase tracking-[0.2em] text-ash/35 mt-0.5 font-mono">
            {t("card.type", locale)}
          </div>
        </div>
      </div>

      {/* Balance */}
      <div className="absolute top-1/2 left-6 -translate-y-1/2">
        <div className="text-[8px] uppercase tracking-[0.2em] text-ash/42 mb-0.5 font-mono">
          {t("card.remaining", locale)}
        </div>
        <div className="text-xl sm:text-2xl font-serif text-sand">
          {formatCurrency(remaining, true)}
        </div>
        {/* Progress bar */}
        <div className="w-40 h-0.5 bg-surface-bright/45 rounded-full mt-2">
          <div
            className="h-full bg-stone/60 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(spentPercent, 100)}%` }}
          />
        </div>
        <div className="text-[7px] text-ash/35 mt-1 font-mono">
          {spentPercent.toFixed(4)}% {t("card.depleted", locale)}
        </div>
      </div>

      {/* Bottom row */}
      <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
        <div>
          <div className="text-[9px] uppercase tracking-[0.25em] text-ash/50">
            {billionaire.name}
          </div>
          <div className="text-[7px] text-ash/35 mt-0.5 font-mono">
            {billionaire.company}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[8px] text-ash/35 font-mono">
            {purchases.length} {t("card.items", locale)}
          </div>
          {monthlyBurn > 0 && (
            <div className="text-[8px] text-[#9B6B6B]/40 font-mono">
              -{formatCurrency(monthlyBurn, true)}{t("bankrupt.monthly", locale)}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
