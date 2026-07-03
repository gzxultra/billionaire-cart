"use client";

import { useEffect, useRef, useState } from "react";
import { useCartStore, selectTotalSpent, selectMonthlyBurn, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";

export function BalanceDisplay() {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const netWorth = useCartStore(selectNetWorth);
  const totalSpent = useCartStore(selectTotalSpent);
  const monthlyBurn = useCartStore(selectMonthlyBurn);
  const purchaseCount = useCartStore((s) => s.purchases.length);
  const remaining = netWorth - totalSpent;

  // Market drift simulation
  const [drift, setDrift] = useState(0);
  const driftRef = useRef(0);

  useEffect(() => {
    if (!selectedBillionaire) return;

    const interval = setInterval(() => {
      // Random ±0.01-0.05% drift
      const change = (Math.random() - 0.5) * 0.001 * netWorth;
      driftRef.current += change;
      setDrift(driftRef.current);
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, [selectedBillionaire, netWorth]);

  if (!selectedBillionaire) return null;

  const displayBalance = remaining + drift;

  return (
    <div className="w-full">
      <div className="text-xs uppercase tracking-[0.3em] text-copper/60 mb-2 font-sans">
        Available Balance
      </div>
      <AnimatedNumber value={displayBalance} className="text-4xl sm:text-5xl lg:text-6xl font-serif text-white/95 tracking-tight" />

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/25 mb-1">Spent</div>
          <div className="text-sm font-serif text-copper">
            {formatCurrency(totalSpent, true)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/25 mb-1">Burn / Mo</div>
          <div className="text-sm font-serif text-red-400/80">
            {monthlyBurn > 0 ? `-${formatCurrency(monthlyBurn, true)}` : "$0"}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/25 mb-1">Items</div>
          <div className="text-sm font-serif text-white/60">
            {purchaseCount}
          </div>
        </div>
      </div>
    </div>
  );
}

// Animated number display that smoothly transitions
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const animRef = useRef<number>(0);
  const prevValue = useRef(value);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const duration = 600;
    const startTime = performance.now();
    prevValue.current = value;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(start + (end - start) * eased);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [value]);

  return (
    <span className={className}>
      {formatCurrency(displayValue, true)}
    </span>
  );
}
