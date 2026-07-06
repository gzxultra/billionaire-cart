"use client";

import { memo, useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { useLiveData } from "@/lib/use-live-data";
import { formatNetWorth } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

function QuickSwitcherInner() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const selectBillionaire = useCartStore((s) => s.selectBillionaire);
  const liveLoaded = useLiveData((s) => s.loaded);
  const getMerged = useLiveData((s) => s.getMerged);

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleSelect = useCallback(
    (id: string) => {
      selectBillionaire(id);
      setOpen(false);
    },
    [selectBillionaire]
  );

  if (!selectedBillionaire) return null;

  const allBillionaires = liveLoaded ? getMerged() : [];

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-bright/80 border border-line/40 hover:border-stone/35 transition-all text-[11px]"
        aria-label={
          locale === "zh"
            ? `切换富豪：当前 ${selectedBillionaire.name}`
            : `Switch billionaire: current ${selectedBillionaire.name}`
        }
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="text-sm leading-none">{selectedBillionaire.emoji}</span>
        <span className="font-medium text-stone/85 hidden sm:inline">
          {selectedBillionaire.initials}
        </span>
        <svg
          className={`w-3 h-3 text-ash/50 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && allBillionaires.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full right-0 mt-2 w-56 max-h-72 overflow-y-auto rounded-xl bg-base/95 backdrop-blur-xl border border-line/40 shadow-xl z-50"
            role="listbox"
            aria-label={locale === "zh" ? "选择富豪" : "Select billionaire"}
          >
            <div className="p-1.5">
              {allBillionaires.map((b) => {
                const isActive = b.id === selectedBillionaire.id;
                return (
                  <button
                    key={b.id}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelect(b.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                      isActive
                        ? "bg-surface-bright/90 border border-line/30"
                        : "hover:bg-surface-bright/50"
                    }`}
                  >
                    <span className="text-base flex-shrink-0">{b.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[11px] font-medium truncate ${isActive ? "text-sand" : "text-stone/80"}`}>
                        {b.name}
                      </div>
                      <div className="text-[9px] text-ash/50 font-mono">
                        {formatNetWorth(b.netWorthB)}
                      </div>
                    </div>
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-champagne flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const QuickSwitcher = memo(QuickSwitcherInner);
