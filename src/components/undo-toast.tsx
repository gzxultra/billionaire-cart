"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { Purchase } from "@/lib/types";

const UNDO_DURATION_MS = 5000;

interface UndoEntry {
  id: string;
  purchase: Purchase;
  expiresAt: number;
}

/**
 * UndoToast — shows a floating "Undo" bar after each purchase.
 * 5-second countdown with animated progress, click to refund.
 */
export function UndoToast() {
  const locale = useLocale((s) => s.locale);
  const purchases = useCartStore((s) => s.purchases);
  const removePurchase = useCartStore((s) => s.removePurchase);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const prevLenRef = useRef(purchases.length);
  const timerRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Detect new purchases
  useEffect(() => {
    const prevLen = prevLenRef.current;
    prevLenRef.current = purchases.length;

    if (purchases.length > prevLen) {
      // New purchase(s) added — track the latest
      const newest = purchases[purchases.length - 1];
      if (!newest) return;

      const entry: UndoEntry = {
        id: newest.id,
        purchase: newest,
        expiresAt: Date.now() + UNDO_DURATION_MS,
      };

      setUndoStack((prev) => {
        // Keep max 3 undo entries
        const next = [...prev, entry];
        return next.slice(-3);
      });

      // Auto-dismiss after duration
      const timer = setTimeout(() => {
        setUndoStack((prev) => prev.filter((e) => e.id !== newest.id));
        timerRefs.current.delete(newest.id);
      }, UNDO_DURATION_MS);
      timerRefs.current.set(newest.id, timer);
    }
  }, [purchases]);

  const handleUndo = useCallback(
    (entry: UndoEntry) => {
      removePurchase(entry.id);
      setUndoStack((prev) => prev.filter((e) => e.id !== entry.id));

      // Clear the auto-dismiss timer
      const timer = timerRefs.current.get(entry.id);
      if (timer) {
        clearTimeout(timer);
        timerRefs.current.delete(entry.id);
      }

      // Haptic feedback on mobile
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(30);
      }
    },
    [removePurchase]
  );

  if (undoStack.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 sm:right-6 z-40 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {undoStack.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="pointer-events-auto"
          >
            <button
              onClick={() => handleUndo(entry)}
              className="
                group relative flex items-center gap-3 px-4 py-2.5 rounded-xl
                bg-surface/95 backdrop-blur-md border border-line/50
                shadow-lg hover:shadow-xl transition-shadow
                overflow-hidden cursor-pointer
              "
            >
              {/* Countdown progress bar */}
              <motion.div
                className="absolute bottom-0 left-0 h-[2px] bg-stone/40"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{
                  duration: UNDO_DURATION_MS / 1000,
                  ease: "linear",
                }}
              />

              {/* Refund icon */}
              <span className="text-base">↩️</span>

              {/* Info */}
              <div className="text-left min-w-0">
                <div className="text-[11px] text-sand/80 truncate max-w-[160px]">
                  {entry.purchase.product.title}
                </div>
                <div className="text-[10px] text-champagne/70 font-serif">
                  {formatCurrency(entry.purchase.product.price)}
                </div>
              </div>

              {/* Undo button */}
              <span className="text-[10px] px-2 py-1 rounded-lg bg-stone/15 text-stone/80 group-hover:bg-stone/25 transition-colors font-medium uppercase tracking-wider shrink-0">
                {locale === "zh" ? "撤销" : "Undo"}
              </span>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
