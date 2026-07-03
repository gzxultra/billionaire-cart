"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useCartStore } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

function formatEarnBackTime(seconds: number, locale: string): string {
  if (locale === "zh") {
    if (seconds < 60) return `${Math.ceil(seconds)} 秒`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)} 分钟`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} 小时`;
    return `${(seconds / 86400).toFixed(1)} 天`;
  }
  if (seconds < 60) return `${Math.ceil(seconds)} seconds`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} minutes`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} hours`;
  return `${(seconds / 86400).toFixed(1)} days`;
}

export function EarningsTicker() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);

  const [earnedSinceStart, setEarnedSinceStart] = useState(0);
  const [earnBackRemaining, setEarnBackRemaining] = useState<number | null>(null);
  const [earnedBack, setEarnedBack] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const lastPurchaseRef = useRef<number>(purchases.length);
  const earnBackStartRef = useRef<number | null>(null);
  const earnBackTotalRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = Date.now();
    setEarnedSinceStart(0);
    setEarnBackRemaining(null);
    setEarnedBack(false);
    lastPurchaseRef.current = 0;
    earnBackStartRef.current = null;
  }, [selectedBillionaire?.id]);

  useEffect(() => {
    if (purchases.length > lastPurchaseRef.current && purchases.length > 0) {
      const lastPurchase = purchases[purchases.length - 1];
      const price = lastPurchase.product.price;
      const eps = selectedBillionaire?.earningsPerSecond ?? 0;
      if (eps > 0) {
        const earnBackSeconds = price / eps;
        earnBackTotalRef.current = earnBackSeconds;
        earnBackStartRef.current = Date.now();
        setEarnBackRemaining(earnBackSeconds);
        setEarnedBack(false);
      }
    }
    lastPurchaseRef.current = purchases.length;
  }, [purchases, selectedBillionaire]);

  const animate = useCallback(() => {
    if (!selectedBillionaire) return;

    const eps = selectedBillionaire.earningsPerSecond;
    const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
    setEarnedSinceStart(elapsedSec * eps);

    if (earnBackStartRef.current !== null) {
      const earnBackElapsed = (Date.now() - earnBackStartRef.current) / 1000;
      const remaining = earnBackTotalRef.current - earnBackElapsed;
      if (remaining <= 0) {
        setEarnBackRemaining(0);
        setEarnedBack(true);
        setTimeout(() => {
          earnBackStartRef.current = null;
          setEarnBackRemaining(null);
          setEarnedBack(false);
        }, 3000);
        earnBackStartRef.current = null;
      } else {
        setEarnBackRemaining(remaining);
      }
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [selectedBillionaire]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  if (!selectedBillionaire) return null;

  const eps = selectedBillionaire.earningsPerSecond;

  return (
    <div className="w-full space-y-4">
      <div className="section-label">
        {t("earnings.title", locale)}
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/25 mb-1">
          {t("earnings.rate", locale)}
        </div>
        <div className="text-lg font-serif text-gold tabular-nums">
          {formatCurrency(eps)}<span className="text-[10px] text-white/25 ml-1">{t("speed.perSec", locale)}</span>
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/25 mb-1">
          {t("earnings.since", locale)}
        </div>
        <div className="text-2xl font-serif text-gold tabular-nums">
          {formatCurrency(earnedSinceStart, earnedSinceStart >= 1_000_000)}
        </div>
      </div>

      {earnBackRemaining !== null && (
        <div className={`rounded-xl px-4 py-3 transition-colors duration-300 ${
          earnedBack
            ? "bg-emerald-500/10 border border-emerald-500/20"
            : "bg-accent/5 border border-accent/10"
        }`}>
          {earnedBack ? (
            <div className="text-emerald-400 text-sm font-medium animate-pulse">
              ✓ {t("earnings.earnedBack", locale)}
            </div>
          ) : (
            <>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/25 mb-1">
                ⏱ {t("earnings.earnBack", locale)}
              </div>
              <div className="text-lg font-serif text-gold tabular-nums">
                {formatEarnBackTime(earnBackRemaining, locale)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
