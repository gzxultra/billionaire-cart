"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

export function SpendingSpeed() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);

  const [spendRate, setSpendRate] = useState(0);
  const [totalThisMinute, setTotalThisMinute] = useState(0);
  const purchaseTimestamps = useRef<{ time: number; amount: number }[]>([]);

  useEffect(() => {
    if (purchases.length === 0) return;
    const last = purchases[purchases.length - 1];
    purchaseTimestamps.current.push({
      time: last.timestamp,
      amount: last.product.price,
    });
  }, [purchases]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const window60s = purchaseTimestamps.current.filter(
        (p) => now - p.time < 60000
      );
      const sumInWindow = window60s.reduce((s, p) => s + p.amount, 0);
      setSpendRate(sumInWindow / 60);
      setTotalThisMinute(sumInWindow);

      purchaseTimestamps.current = purchaseTimestamps.current.filter(
        (p) => now - p.time < 120000
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!selectedBillionaire || purchases.length < 2) return null;

  const eps = selectedBillionaire.earningsPerSecond;
  const ratio = eps > 0 ? spendRate / eps : 0;

  let verdict = "";
  let verdictColor = "";
  if (spendRate === 0) {
    verdict = t("speed.idle", locale);
    verdictColor = "text-white/20";
  } else if (ratio < 0.5) {
    verdict = t("speed.barelyDent", locale);
    verdictColor = "text-emerald-400/60";
  } else if (ratio < 1) {
    verdict = t("speed.spendingFast", locale);
    verdictColor = "text-yellow-400/60";
  } else if (ratio < 5) {
    verdict = t("speed.outpacing", locale);
    verdictColor = "text-orange-400/70";
  } else if (ratio < 50) {
    verdict = t("speed.onFire", locale);
    verdictColor = "text-red-400/80";
  } else {
    verdict = t("speed.carnage", locale);
    verdictColor = "text-red-500";
  }

  const remaining = netWorth - totalSpent;
  const timeToBankrupt =
    spendRate > eps
      ? remaining / (spendRate - eps)
      : null;

  function formatTime(seconds: number): string {
    if (locale === "zh") {
      if (seconds < 60) return `${Math.ceil(seconds)}秒`;
      if (seconds < 3600) return `${Math.ceil(seconds / 60)}分钟`;
      if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}小时`;
      return `${(seconds / 86400).toFixed(1)}天`;
    }
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
    return `${(seconds / 86400).toFixed(1)}d`;
  }

  return (
    <div className="w-full space-y-3">
      <h2 className="text-xs uppercase tracking-[0.3em] text-copper/60 font-sans">
        {t("speed.title", locale)}
      </h2>

      {/* Speed gauge */}
      <div className="flex items-end gap-4">
        <div>
          <div className="text-2xl font-serif text-copper tabular-nums">
            {formatCurrency(spendRate)}
            <span className="text-[10px] text-white/25 ml-1">{t("speed.perSec", locale)}</span>
          </div>
          <div className={`text-xs mt-1 ${verdictColor}`}>{verdict}</div>
        </div>

        {/* Visual bar gauge */}
        <div className="flex-1 flex items-end gap-px h-8">
          {Array.from({ length: 20 }).map((_, i) => {
            const threshold = i / 20;
            const filled = ratio > threshold;
            return (
              <motion.div
                key={i}
                className="flex-1 rounded-sm"
                initial={{ height: 4 }}
                animate={{
                  height: 4 + (i / 20) * 28,
                  backgroundColor: filled
                    ? i < 8
                      ? "rgba(52, 211, 153, 0.4)"
                      : i < 14
                      ? "rgba(251, 191, 36, 0.4)"
                      : "rgba(239, 68, 68, 0.5)"
                    : "rgba(36, 36, 41, 0.3)",
                }}
                transition={{ duration: 0.3 }}
              />
            );
          })}
        </div>
      </div>

      {/* Context row */}
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-white/20">
          {t("speed.last60", locale)}:{" "}
          <span className="text-white/40">
            {formatCurrency(totalThisMinute, true)}
          </span>
        </span>
        {eps > 0 && (
          <span className="text-white/20">
            {t("speed.vsEarnings", locale)}:{" "}
            <span
              className={ratio > 1 ? "text-red-400/60" : "text-emerald-400/60"}
            >
              {ratio.toFixed(1)}× {ratio > 1 ? t("speed.faster", locale) : t("speed.slower", locale)}
            </span>
          </span>
        )}
      </div>

      {/* Time to bankruptcy */}
      {timeToBankrupt && timeToBankrupt > 0 && remaining > 0 && (
        <div className="text-[10px] text-red-400/40 pt-1 border-t border-charcoal-600/10">
          ⚠ {t("speed.bankruptIn", locale)}{" "}
          <span className="text-red-400/60">{formatTime(timeToBankrupt)}</span>
        </div>
      )}
    </div>
  );
}
