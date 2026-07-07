"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useCartStore, selectTotalSpent, selectMonthlyBurn, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";
import { useCurrency } from "@/lib/use-currency";

export function BalanceDisplay() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const netWorth = useCartStore(selectNetWorth);
  const totalSpent = useCartStore(selectTotalSpent);
  const monthlyBurn = useCartStore(selectMonthlyBurn);
  const purchaseCount = useCartStore((s) => s.purchases.length);
  const remaining = netWorth - totalSpent;
  const formatConverted = useCurrency((s) => s.formatConverted);
  const currency = useCurrency((s) => s.currency);

  // Market drift simulation
  const [drift, setDrift] = useState(0);
  const driftRef = useRef(0);

  // Purchase impact shake
  const containerRef = useRef<HTMLDivElement>(null);
  const prevPurchaseCount = useRef(purchaseCount);
  const prevTotalSpent = useRef(totalSpent);

  const triggerShake = useCallback((intensity: "light" | "heavy") => {
    const el = containerRef.current;
    if (!el) return;
    const cls = intensity === "heavy" ? "impact-shake-heavy" : "impact-shake";
    el.classList.remove("impact-shake", "impact-shake-heavy");
    // Force reflow to restart animation
    void el.offsetWidth;
    el.classList.add(cls);
    const timer = setTimeout(() => el.classList.remove(cls), 700);
    return () => clearTimeout(timer);
  }, []);

  // Detect new purchases and trigger shake
  useEffect(() => {
    if (purchaseCount > prevPurchaseCount.current && prevPurchaseCount.current > 0) {
      const spentDelta = totalSpent - prevTotalSpent.current;
      const percentOfWorth = netWorth > 0 ? spentDelta / netWorth : 0;
      // Heavy shake for purchases > 0.1% of net worth
      triggerShake(percentOfWorth > 0.001 ? "heavy" : "light");
    }
    prevPurchaseCount.current = purchaseCount;
    prevTotalSpent.current = totalSpent;
  }, [purchaseCount, totalSpent, netWorth, triggerShake]);

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

  // Live earnings accumulator — ticks up at earningsPerSecond
  const [liveEarnings, setLiveEarnings] = useState(0);
  const earningsStartRef = useRef<number>(Date.now());
  const rafRef = useRef<number>(0);

  const eps = selectedBillionaire?.earningsPerSecond ?? 0;

  // Reset earnings counter when billionaire changes
  useEffect(() => {
    earningsStartRef.current = Date.now();
    setLiveEarnings(0);
  }, [selectedBillionaire?.id]);

  // Animate earnings ticking up
  useEffect(() => {
    if (!selectedBillionaire || eps <= 0) return;

    const tick = () => {
      const elapsed = (Date.now() - earningsStartRef.current) / 1000;
      setLiveEarnings(elapsed * eps);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [selectedBillionaire, eps]);

  if (!selectedBillionaire) return null;

  const displayBalance = remaining + drift + liveEarnings;
  const convertedBalance = formatConverted(displayBalance, true);

  return (
    <div ref={containerRef} className="w-full" role="region" aria-label={t("balance.title", locale)}>
      <div className="section-label mb-2">
        {t("balance.title", locale)}
      </div>
      <div className="relative">
        <AnimatedNumber value={displayBalance} className="text-3xl sm:text-5xl lg:text-6xl font-serif text-sand/95 tracking-tight" />
        {/* Purchase ripple effect — fires on each purchase */}
        <PurchaseRipple purchaseCount={purchaseCount} />
      </div>
      {currency !== "USD" && convertedBalance && (
        <div className="text-sm text-ash/70 font-mono mt-1">
          ≈ {convertedBalance}
        </div>
      )}

      {/* Live earnings indicator */}
      {eps > 0 && (
        <div className="flex items-center gap-2 mt-2">
          <div className="live-earnings-dot" />
          <span className="text-[10px] font-mono text-sage/70 tabular-nums">
            +{formatCurrency(eps)}{locale === "zh" ? "/秒" : "/sec"}
          </span>
          {liveEarnings > 1000 && (
            <span className="text-[10px] font-mono text-sage/50 tabular-nums">
              ({locale === "zh" ? "本次已赚" : "earned"} +{formatCurrency(liveEarnings, liveEarnings >= 1_000_000)})
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-ash/70 mb-1">{t("balance.spent", locale)}</div>
          <div className="text-sm font-serif text-champagne">
            {formatCurrency(totalSpent, true)}
          </div>
          {currency !== "USD" && (
            <div className="text-[9px] text-ash/65 font-mono">
              {formatConverted(totalSpent, true)}
            </div>
          )}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-ash/70 mb-1">{t("balance.burn", locale)}</div>
          <div className="text-sm font-serif text-[#9B6B6B]/80">
            {monthlyBurn > 0 ? `-${formatCurrency(monthlyBurn, true)}` : "$0"}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-ash/70 mb-1">{t("balance.items", locale)}</div>
          <div className="text-sm font-serif text-ash">
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
    <span className={className} aria-live="polite" aria-atomic="true">
      {formatCurrency(displayValue, true)}
    </span>
  );
}

// Ripple effect that fires on each purchase
function PurchaseRipple({ purchaseCount }: { purchaseCount: number }) {
  const [rippleKey, setRippleKey] = useState(0);
  const prevCount = useRef(purchaseCount);

  useEffect(() => {
    if (purchaseCount > prevCount.current && prevCount.current > 0) {
      setRippleKey((k) => k + 1);
    }
    prevCount.current = purchaseCount;
  }, [purchaseCount]);

  if (rippleKey === 0) return null;

  return (
    <div
      key={rippleKey}
      className="purchase-ripple"
      onAnimationEnd={(e) => {
        (e.target as HTMLElement).remove();
      }}
    />
  );
}
