"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth, selectRemaining } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";
import { milestones, Milestone } from "@/data/milestones";

/**
 * FloatingHud — a compact persistent pill that shows remaining balance,
 * spending progress, and the latest milestone. Appears when the balance
 * section scrolls out of view and hides near the top of the page.
 *
 * Positioned bottom-left to avoid collision with the scroll-to-top button
 * (which sits bottom-right).
 */
function FloatingHudInner() {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);
  const remaining = useCartStore(selectRemaining);
  const locale = useLocale((s) => s.locale);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lastMilestone, setLastMilestone] = useState<Milestone | null>(null);
  const [milestoneFlash, setMilestoneFlash] = useState(false);
  const prevPercentRef = useRef(0);

  const spentPercent = netWorth > 0 ? totalSpent / netWorth : 0;

  // Check milestones on spending changes
  useEffect(() => {
    if (!selectedBillionaire) return;
    const prev = prevPercentRef.current;
    const cur = spentPercent;
    prevPercentRef.current = cur;

    // Find the highest reached milestone
    const reached = milestones.filter((m) => cur >= m.threshold);
    if (reached.length > 0) {
      const latest = reached[reached.length - 1];
      // Only flash if we just crossed it
      if (prev < latest.threshold && cur >= latest.threshold) {
        setMilestoneFlash(true);
        setTimeout(() => setMilestoneFlash(false), 1500);
      }
      setLastMilestone(latest);
    }
  }, [spentPercent, selectedBillionaire]);

  // Show/hide based on scroll position
  useEffect(() => {
    if (!selectedBillionaire) return;

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setVisible(window.scrollY > 500);
        ticking = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [selectedBillionaire]);

  const handleClick = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleScrollToBalance = useCallback(() => {
    const balanceEl = document.querySelector('[aria-label*="Balance"], [aria-label*="余额"]');
    if (balanceEl) {
      balanceEl.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setExpanded(false);
  }, []);

  if (!selectedBillionaire) return null;

  const displayPercent = (spentPercent * 100).toFixed(
    spentPercent < 0.001 ? 4 : spentPercent < 0.01 ? 3 : spentPercent < 0.1 ? 2 : 1
  );
  const reachedCount = milestones.filter((m) => spentPercent >= m.threshold).length;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`
            fixed bottom-6 left-6 z-40
            bg-surface/95 backdrop-blur-xl
            border border-line/50
            rounded-2xl shadow-stone
            transition-all duration-300
            ${milestoneFlash ? "hud-milestone-flash" : ""}
          `}
        >
          {/* Compact pill */}
          <button
            onClick={handleClick}
            className="flex items-center gap-2.5 px-3.5 py-2.5 w-full text-left"
            aria-label={locale === "zh" ? "余额面板" : "Balance panel"}
          >
            {/* Billionaire emoji */}
            <span className="text-base shrink-0">{selectedBillionaire.emoji}</span>

            {/* Balance + progress */}
            <div className="min-w-0">
              <div className="text-xs font-serif text-sand/90 tabular-nums truncate">
                {formatCurrency(remaining, true)}
              </div>
              {/* Mini progress bar */}
              <div className="w-20 h-1 rounded-full bg-surface-dim/80 mt-1 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      spentPercent > 0.5
                        ? "linear-gradient(90deg, #8C7A65, #9B6B6B)"
                        : "linear-gradient(90deg, #5A8A68, #A68530)",
                  }}
                  animate={{ width: `${Math.min(spentPercent * 100, 100)}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Percentage badge */}
            <span className="text-[10px] font-mono text-ash/65 tabular-nums shrink-0">
              {displayPercent}%
            </span>

            {/* Latest milestone badge */}
            {lastMilestone && (
              <span className="text-sm shrink-0" title={locale === "zh" ? lastMilestone.labelZh : lastMilestone.labelEn}>
                {lastMilestone.emoji}
              </span>
            )}
          </button>

          {/* Expanded panel */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3.5 pb-3 pt-0.5 space-y-2.5 border-t border-line/30">
                  {/* Stats row */}
                  <div className="flex items-center justify-between text-[10px] pt-2">
                    <span className="text-ash/65">
                      {t("hud.spent", locale)}
                    </span>
                    <span className="font-serif text-champagne/80 tabular-nums">
                      {formatCurrency(totalSpent, true)}
                    </span>
                  </div>

                  {/* Milestone progress */}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-ash/65">
                      {t("milestone.progress", locale, { reached: reachedCount, total: milestones.length })}
                    </span>
                  </div>

                  {/* Milestone dots */}
                  <div className="flex items-center gap-1">
                    {milestones.map((m) => {
                      const reached = spentPercent >= m.threshold;
                      return (
                        <div
                          key={m.id}
                          className={`
                            w-5 h-5 rounded-full flex items-center justify-center text-[8px]
                            transition-all duration-300
                            ${reached
                              ? "bg-champagne/15 border border-champagne/30"
                              : "bg-surface-dim/60 border border-line/30 opacity-40"
                            }
                          `}
                          title={`${locale === "zh" ? m.labelZh : m.labelEn} (${(m.threshold * 100).toFixed(m.threshold < 0.01 ? 2 : 0)}%)`}
                        >
                          <span className={reached ? "" : "grayscale opacity-50"}>
                            {m.emoji}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Jump to balance */}
                  <button
                    onClick={handleScrollToBalance}
                    className="w-full py-1.5 text-[10px] text-stone/70 hover:text-stone transition-colors uppercase tracking-wider font-mono text-center"
                  >
                    {locale === "zh" ? "查看详情 ↑" : "View Balance ↑"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const FloatingHud = memo(FloatingHudInner);
