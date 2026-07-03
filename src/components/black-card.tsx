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
        bg-gradient-to-br from-surface-dim via-midnight to-surface
        shadow-2xl
      "
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Metallic noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />
      {/* Accent gradient edge glow */}
      <div className="absolute inset-0 rounded-2xl border border-accent/15 pointer-events-none" />
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-accent/10 via-transparent to-gold/5 pointer-events-none" />

      {/* Top row: chip + brand */}
      <div className="absolute top-6 left-6 right-6 flex items-start justify-between">
        {/* Chip */}
        <div className="w-10 h-7 rounded bg-gradient-to-br from-accent-light/50 to-accent/30 border border-accent/20">
          <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-px p-px opacity-40">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-accent/30 rounded-[1px]" />
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[8px] uppercase tracking-[0.4em] text-accent/40">
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
        <div className="w-40 h-0.5 bg-surface-bright/30 rounded-full mt-2">
          <div
            className="h-full bg-accent/60 rounded-full transition-all duration-500"
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
