"use client";

import { motion } from "framer-motion";
import { useCartStore, selectTotalSpent, selectMonthlyBurn, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";

export function BlackCard() {
  const billionaire = useCartStore((s) => s.selectedBillionaire);
  const netWorth = useCartStore(selectNetWorth);
  const totalSpent = useCartStore(selectTotalSpent);
  const monthlyBurn = useCartStore(selectMonthlyBurn);
  const purchases = useCartStore((s) => s.purchases);

  if (!billionaire) return null;

  const remaining = netWorth - totalSpent;
  const spentPercent = netWorth > 0 ? (totalSpent / netWorth) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="
        relative w-full aspect-[1.586/1] max-w-md mx-auto rounded-2xl overflow-hidden
        bg-card-gradient
        shadow-2xl
      "
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Copper border */}
      <div className="absolute inset-0 rounded-2xl border-2 border-copper/25 pointer-events-none" />

      {/* Top row: chip + brand */}
      <div className="absolute top-6 left-6 right-6 flex items-start justify-between">
        {/* Chip */}
        <div className="w-10 h-7 rounded bg-gradient-to-br from-copper-light/50 to-copper-dark/30 border border-copper/20">
          <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-px p-px opacity-40">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-copper/30 rounded-[1px]" />
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[8px] uppercase tracking-[0.4em] text-copper/40">
            Billionaire Cart
          </div>
          <div className="text-[7px] uppercase tracking-[0.2em] text-white/15 mt-0.5">
            Black Card
          </div>
        </div>
      </div>

      {/* Balance */}
      <div className="absolute top-1/2 left-6 -translate-y-1/2">
        <div className="text-[8px] uppercase tracking-[0.2em] text-white/20 mb-0.5">
          Remaining
        </div>
        <div className="text-xl sm:text-2xl font-serif text-white/90">
          {formatCurrency(remaining, true)}
        </div>
        {/* Progress bar */}
        <div className="w-40 h-0.5 bg-charcoal-600/30 rounded-full mt-2">
          <div
            className="h-full bg-copper/60 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(spentPercent, 100)}%` }}
          />
        </div>
        <div className="text-[7px] text-white/15 mt-1">
          {spentPercent.toFixed(4)}% depleted
        </div>
      </div>

      {/* Bottom row */}
      <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
        <div>
          <div className="text-[9px] uppercase tracking-[0.25em] text-white/30">
            {billionaire.name}
          </div>
          <div className="text-[7px] text-white/15 mt-0.5">
            {billionaire.company}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[8px] text-white/15">
            {purchases.length} items
          </div>
          {monthlyBurn > 0 && (
            <div className="text-[8px] text-red-400/40">
              -{formatCurrency(monthlyBurn, true)}/mo
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
