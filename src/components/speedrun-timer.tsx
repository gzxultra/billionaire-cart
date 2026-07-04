"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useCartStore,
  selectTotalSpent,
  selectNetWorth,
} from "@/lib/store";
import { formatCurrency } from "@/lib/format";

interface BestTime {
  billionaireId: string;
  time: number; // ms
  purchases: number;
  totalSpent: number;
}

function formatTimer(ms: number): string {
  const totalSec = ms / 1000;
  const min = Math.floor(totalSec / 60);
  const sec = Math.floor(totalSec % 60);
  const centis = Math.floor((ms % 1000) / 10);
  return `${min.toString().padStart(2, "0")}:${sec
    .toString()
    .padStart(2, "0")}.${centis.toString().padStart(2, "0")}`;
}

function getBestTimes(): BestTime[] {
  try {
    const raw = localStorage.getItem("bc-speedrun-best");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBestTime(entry: BestTime) {
  const times = getBestTimes();
  const existing = times.findIndex(
    (t) => t.billionaireId === entry.billionaireId
  );
  if (existing >= 0) {
    if (entry.time < times[existing].time) {
      times[existing] = entry;
    }
  } else {
    times.push(entry);
  }
  localStorage.setItem("bc-speedrun-best", JSON.stringify(times));
}

export function SpeedrunTimer() {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);

  const [active, setActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [finalTime, setFinalTime] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [bestTime, setBestTime] = useState<number | null>(null);

  const startTimeRef = useRef<number>(0);
  const startPurchasesRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const finishedRef = useRef(false);

  // Load best time for current billionaire
  useEffect(() => {
    if (!selectedBillionaire) return;
    const times = getBestTimes();
    const best = times.find(
      (t) => t.billionaireId === selectedBillionaire.id
    );
    setBestTime(best?.time ?? null);
  }, [selectedBillionaire]);

  // Timer animation loop
  const tick = useCallback(() => {
    if (!finishedRef.current) {
      setElapsed(Date.now() - startTimeRef.current);
      rafRef.current = requestAnimationFrame(tick);
    }
  }, []);

  // Start timer
  const startTimer = useCallback(() => {
    const store = useCartStore.getState();
    store.reset();
    // Re-select the same billionaire
    if (selectedBillionaire) {
      store.selectBillionaire(selectedBillionaire.id);
    }

    startTimeRef.current = Date.now();
    startPurchasesRef.current = 0;
    finishedRef.current = false;
    setFinished(false);
    setElapsed(0);
    setActive(true);

    rafRef.current = requestAnimationFrame(tick);
  }, [selectedBillionaire, tick]);

  // Check for bankruptcy
  useEffect(() => {
    if (!active || finishedRef.current) return;
    if (totalSpent >= netWorth && purchases.length > 0) {
      finishedRef.current = true;
      cancelAnimationFrame(rafRef.current);
      const time = Date.now() - startTimeRef.current;
      setFinalTime(time);
      setFinished(true);

      if (selectedBillionaire) {
        const times = getBestTimes();
        const best = times.find(
          (t) => t.billionaireId === selectedBillionaire.id
        );
        const newRecord = !best || time < best.time;
        setIsNewRecord(newRecord);

        saveBestTime({
          billionaireId: selectedBillionaire.id,
          time,
          purchases: purchases.length,
          totalSpent,
        });
        setBestTime(newRecord ? time : best?.time ?? time);
      }
    }
  }, [active, totalSpent, netWorth, purchases, selectedBillionaire]);

  // Cleanup
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Reset when billionaire changes
  useEffect(() => {
    setActive(false);
    setFinished(false);
    finishedRef.current = true;
    cancelAnimationFrame(rafRef.current);
    setElapsed(0);
  }, [selectedBillionaire?.id]);

  if (!selectedBillionaire) return null;

  const remaining = netWorth - totalSpent;
  const spentPct = netWorth > 0 ? (totalSpent / netWorth) * 100 : 0;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="section-label">
          ⚡ Speedrun Mode
        </h2>
        {bestTime !== null && !active && (
          <span className="text-[10px] text-stone/40">
            Best: {formatTimer(bestTime)}
          </span>
        )}
      </div>

      {!active && !finished && (
        <div className="text-center py-3">
          <p className="text-xs text-ash/50 mb-3">
            Bankrupt {selectedBillionaire.name} as fast as you can!
          </p>
          <button
            onClick={startTimer}
            className="px-6 py-2.5 rounded-xl bg-stone/20 text-stone text-sm font-medium hover:bg-stone/30 transition-all border border-stone/20 hover:border-stone/40"
          >
            🏁 Start Speedrun
          </button>
        </div>
      )}

      {active && !finished && (
        <div className="space-y-2">
          {/* Timer display */}
          <div className="text-center">
            <div className="text-3xl font-serif text-stone tabular-nums tracking-wide">
              {formatTimer(elapsed)}
            </div>
            <div className="text-[10px] text-ash/42 mt-1">
              {purchases.length - startPurchasesRef.current} items ·{" "}
              {formatCurrency(totalSpent, true)} spent
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative w-full h-3 bg-surface-bright/60 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background:
                  spentPct >= 90
                    ? "linear-gradient(90deg, #ef4444, #dc2626)"
                    : spentPct >= 50
                    ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                    : "linear-gradient(90deg, #9B8B7A, #B8A898)",
              }}
              animate={{ width: `${Math.min(spentPct, 100)}%` }}
              transition={{ duration: 0.2 }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[8px] text-ash font-medium tabular-nums">
                {spentPct.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Remaining */}
          <div className="flex justify-between text-[10px]">
            <span className="text-ash/42">
              Remaining:{" "}
              <span className={remaining < netWorth * 0.1 ? "text-[#9B6B6B]/60" : "text-ash/60"}>
                {formatCurrency(remaining, true)}
              </span>
            </span>
            <button
              onClick={() => {
                setActive(false);
                finishedRef.current = true;
                cancelAnimationFrame(rafRef.current);
              }}
              className="text-ash/42 hover:text-[#9B6B6B]/60 transition-colors"
            >
              ✕ Abort
            </button>
          </div>
        </div>
      )}

      {/* Completion screen */}
      <AnimatePresence>
        {finished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4 space-y-3"
          >
            <div className="text-4xl mb-2">
              {isNewRecord ? "🏆" : "🏁"}
            </div>
            <div className="text-[10px] uppercase tracking-[0.4em] text-stone/70">
              {isNewRecord ? "New Record!" : "Speedrun Complete"}
            </div>
            <div className="text-3xl font-serif text-stone tabular-nums">
              {formatTimer(finalTime)}
            </div>
            <div className="text-xs text-ash/50">
              {purchases.length} items ·{" "}
              {formatCurrency(totalSpent, true)} spent
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={startTimer}
                className="px-4 py-2 rounded-lg bg-stone/20 text-stone text-xs hover:bg-stone/30 transition-colors"
              >
                🔄 Try Again
              </button>
              <button
                onClick={async () => {
                  const text = `⚡ Billionaire Cart Speedrun\n\n🏁 Bankrupted ${
                    selectedBillionaire.name
                  } in ${formatTimer(finalTime)}!\n📦 ${
                    purchases.length
                  } items\n💰 ${formatCurrency(totalSpent, true)} spent\n\nbillionairecart.app`;
                  try {
                    await navigator.clipboard.writeText(text);
                  } catch {}
                }}
                className="px-4 py-2 rounded-lg bg-surface-bright text-ash/60 text-xs hover:text-ash transition-colors"
              >
                📋 Copy Result
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
