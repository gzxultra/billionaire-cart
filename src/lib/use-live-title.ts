"use client";

import { useEffect, useRef } from "react";
import { useCartStore, selectRemaining, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";

const DEFAULT_TITLE = "Billionaire Cart — Ultimate Spending Simulation";

/**
 * useLiveTitle — updates browser tab title with live balance info.
 * Shows billionaire emoji + remaining balance, or bankrupt state.
 * Ticks every ~1s to reflect live earnings.
 */
export function useLiveTitle() {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);
  const remaining = useCartStore(selectRemaining);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(Date.now());
  const baseRemainingRef = useRef(remaining);

  // Reset baseline when purchases or billionaire change
  useEffect(() => {
    startRef.current = Date.now();
    baseRemainingRef.current = remaining;
  }, [remaining]);

  useEffect(() => {
    if (!selectedBillionaire) {
      document.title = DEFAULT_TITLE;
      return;
    }

    const eps = selectedBillionaire.earningsPerSecond ?? 0;
    const isBankrupt = remaining <= 0;

    const update = () => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const liveRemaining = baseRemainingRef.current + elapsed * eps;

      if (isBankrupt) {
        document.title = `💀 BANKRUPT | ${selectedBillionaire.name} | Billionaire Cart`;
      } else {
        const displayBal = formatCurrency(liveRemaining, true);
        document.title = `${selectedBillionaire.emoji} ${displayBal} | ${selectedBillionaire.name}`;
      }

      rafRef.current = window.setTimeout(update, 1000);
    };

    update();
    return () => clearTimeout(rafRef.current);
  }, [selectedBillionaire, remaining]);

  // Restore default on unmount
  useEffect(() => {
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, []);
}
