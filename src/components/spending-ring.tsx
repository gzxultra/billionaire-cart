"use client";

import { memo, useRef, useEffect, useState } from "react";
import { useCartStore, selectTotalSpent, selectNetWorth, selectRemaining } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

/**
 * SpendingRing — a compact circular progress indicator for the header.
 * Shows spending % as a ring + remaining balance tooltip on hover.
 * Only visible after a billionaire is selected and at least one purchase is made.
 */
function SpendingRingInner() {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);
  const remaining = useCartStore(selectRemaining);
  const purchaseCount = useCartStore((s) => s.purchases.length);
  const locale = useLocale((s) => s.locale);
  const [showTooltip, setShowTooltip] = useState(false);

  // Animated progress
  const [displayPercent, setDisplayPercent] = useState(0);
  const animRef = useRef<number>(0);

  const targetPercent = netWorth > 0 ? Math.min((totalSpent / netWorth) * 100, 100) : 0;

  useEffect(() => {
    const start = displayPercent;
    const end = targetPercent;
    const duration = 600;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayPercent(start + (end - start) * eased);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetPercent]);

  if (!selectedBillionaire || purchaseCount === 0) return null;

  const size = 28;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayPercent / 100) * circumference;

  // Color transitions based on spending
  const ringColor =
    displayPercent < 25
      ? "rgba(90,138,104,0.7)"  // sage
      : displayPercent < 50
      ? "rgba(166,133,48,0.7)"  // champagne
      : displayPercent < 75
      ? "rgba(140,122,101,0.8)" // stone
      : "rgba(155,107,107,0.8)"; // rose/warning

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-bright/80 transition-colors"
        onClick={() => {
          const balanceEl = document.querySelector('[role="region"][aria-label*="Balance"], [role="region"][aria-label*="余额"]');
          if (balanceEl) {
            balanceEl.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }}
        aria-label={
          locale === "zh"
            ? `已花费 ${displayPercent.toFixed(1)}%`
            : `${displayPercent.toFixed(1)}% spent`
        }
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(226,217,206,0.4)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke 0.5s ease",
              filter: displayPercent > 50 ? `drop-shadow(0 0 3px ${ringColor})` : undefined,
            }}
          />
        </svg>
        {/* Center text */}
        <span
          className="absolute text-[7px] font-mono tabular-nums leading-none"
          style={{ color: ringColor }}
        >
          {displayPercent < 10
            ? displayPercent.toFixed(1)
            : Math.round(displayPercent)}
        </span>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-full right-0 mt-2 px-3 py-2 rounded-lg bg-ink/90 backdrop-blur-sm text-white text-[10px] whitespace-nowrap shadow-lg z-50 pointer-events-none">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-white/50 uppercase tracking-wider text-[8px] mb-0.5">
                {locale === "zh" ? "已花" : "Spent"}
              </div>
              <div className="font-serif text-champagne-light text-[11px]">
                {formatCurrency(totalSpent, true)}
              </div>
            </div>
            <div className="w-px h-6 bg-white/15" />
            <div>
              <div className="text-white/50 uppercase tracking-wider text-[8px] mb-0.5">
                {locale === "zh" ? "剩余" : "Left"}
              </div>
              <div className="font-serif text-sage text-[11px]">
                {formatCurrency(remaining, true)}
              </div>
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute -top-1 right-3 w-2 h-2 bg-ink/90 rotate-45" />
        </div>
      )}
    </div>
  );
}

export const SpendingRing = memo(SpendingRingInner);
