"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

/**
 * EarnBackTimer — live countdown showing how long the billionaire needs
 * to earn back everything you've spent. Ticks every second.
 * When it hits zero → shows a celebration.
 */

function formatCountdown(seconds: number): { h: string; m: string; s: string; label: string } {
  if (seconds <= 0) return { h: "00", m: "00", s: "00", label: "" };

  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (d > 365) {
    const yrs = (d / 365).toFixed(1);
    return { h: yrs, m: "", s: "", label: d > 730 ? "years" : "year" };
  }
  if (d > 0) {
    return {
      h: String(d),
      m: String(h).padStart(2, "0"),
      s: String(m).padStart(2, "0"),
      label: "d:h:m",
    };
  }
  return {
    h: String(h).padStart(2, "0"),
    m: String(m).padStart(2, "0"),
    s: String(s).padStart(2, "0"),
    label: "h:m:s",
  };
}

export function EarnBackTimer() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const totalSpent = useCartStore(selectTotalSpent);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(0);
  const [recovered, setRecovered] = useState(false);

  const eps = selectedBillionaire?.earningsPerSecond ?? 0;
  const secondsToRecover = eps > 0 ? totalSpent / eps : 0;
  const remaining = Math.max(secondsToRecover - elapsed, 0);

  // Tick the elapsed counter
  useEffect(() => {
    if (!selectedBillionaire || totalSpent <= 0 || eps <= 0) {
      setElapsed(0);
      setRecovered(false);
      startRef.current = 0;
      return;
    }

    // Reset on new purchase (totalSpent changes)
    startRef.current = Date.now();
    setElapsed(0);
    setRecovered(false);

    const interval = setInterval(() => {
      const now = Date.now();
      const secs = (now - startRef.current) / 1000;
      setElapsed(secs);

      const newRemaining = Math.max(secondsToRecover - secs, 0);
      if (newRemaining <= 0) {
        setRecovered(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBillionaire?.id, totalSpent, eps]);

  if (!selectedBillionaire || totalSpent <= 0 || eps <= 0) return null;

  const countdown = formatCountdown(remaining);
  const pct = secondsToRecover > 0 ? Math.min((elapsed / secondsToRecover) * 100, 100) : 0;
  const earnedSoFar = eps * elapsed;

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section">
      <h2 className="section-label flex items-center gap-2 mb-4">
        <span className="text-base">⏱️</span>
        {locale === "zh" ? "赚回倒计时" : "Earn-Back Timer"}
      </h2>

      {/* Countdown display */}
      <div className="flex items-center justify-center gap-1 mb-4">
        <AnimatePresence mode="popLayout">
          {recovered ? (
            <motion.div
              key="recovered"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className="text-2xl mb-1">🎉</div>
              <div className="text-sm font-serif text-sage font-medium">
                {locale === "zh" ? "已全部赚回！" : "Fully Recovered!"}
              </div>
              <div className="text-[10px] text-ash/60 mt-1">
                {locale === "zh"
                  ? `${selectedBillionaire.name.split(" ")[0]} 赚回了 ${formatCurrency(totalSpent, true)}`
                  : `${selectedBillionaire.name.split(" ")[0]} earned back ${formatCurrency(totalSpent, true)}`}
              </div>
            </motion.div>
          ) : (
            <>
              <CountdownDigit value={countdown.h} />
              {countdown.m && (
                <>
                  <span className="text-xl font-mono text-ash/40 mx-0.5">:</span>
                  <CountdownDigit value={countdown.m} />
                </>
              )}
              {countdown.s && (
                <>
                  <span className="text-xl font-mono text-ash/40 mx-0.5">:</span>
                  <CountdownDigit value={countdown.s} />
                </>
              )}
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      {!recovered && (
        <div className="space-y-2">
          <div className="w-full h-2 rounded-full bg-surface-dim/80 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #5A8A68, #A68530)",
              }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-ash/60 font-mono">
            <span>
              {locale === "zh" ? "已赚回" : "Earned"}: {formatCurrency(Math.min(earnedSoFar, totalSpent), true)}
            </span>
            <span>
              {locale === "zh" ? "需赚回" : "Need"}: {formatCurrency(totalSpent, true)}
            </span>
          </div>
        </div>
      )}

      {/* Context line */}
      {!recovered && (
        <div className="text-[10px] text-ash/55 text-center mt-3">
          {locale === "zh"
            ? `${selectedBillionaire.name.split(" ")[0]} 每秒赚 ${formatCurrency(eps)}`
            : `${selectedBillionaire.name.split(" ")[0]} earns ${formatCurrency(eps)}/sec`}
        </div>
      )}
    </section>
  );
}

function CountdownDigit({ value }: { value: string }) {
  return (
    <motion.div
      key={value}
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 8, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1.5 rounded-lg bg-surface-dim/60 border border-line/40"
    >
      <span className="text-2xl sm:text-3xl font-mono text-sand/90 tabular-nums font-medium">
        {value}
      </span>
    </motion.div>
  );
}
