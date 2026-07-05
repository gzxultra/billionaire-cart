"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";
import { milestones, checkMilestones, Milestone } from "@/data/milestones";
import { toast } from "@/lib/use-toast";
import { playSparkle } from "@/lib/sounds";

interface MilestoneCelebrationProps {
  /** Callback to trigger confetti — pass triggerId setter */
  onConfetti: () => void;
}

/**
 * MilestoneCelebration — invisible tracker that watches spending progress,
 * detects milestone crossings, and fires celebrations (toasts + confetti).
 * Does not render any visible UI — the FloatingHud handles the display.
 */
function MilestoneCelebrationInner({ onConfetti }: MilestoneCelebrationProps) {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);
  const soundEnabled = useCartStore((s) => s.soundEnabled);
  const locale = useLocale((s) => s.locale);
  const prevPercentRef = useRef(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!selectedBillionaire || netWorth <= 0) {
      prevPercentRef.current = 0;
      initializedRef.current = false;
      return;
    }

    const currentPercent = totalSpent / netWorth;

    // Skip celebration on first render / page load (don't re-celebrate stored progress)
    if (!initializedRef.current) {
      prevPercentRef.current = currentPercent;
      initializedRef.current = true;
      return;
    }

    const crossed = checkMilestones(prevPercentRef.current, currentPercent);
    prevPercentRef.current = currentPercent;

    if (crossed.length === 0) return;

    // Celebrate each crossed milestone (usually just 1, but handle multiple)
    crossed.forEach((m, i) => {
      setTimeout(() => {
        // Toast
        const label = locale === "zh" ? m.labelZh : m.labelEn;
        const message = locale === "zh" ? m.messageZh : m.messageEn;
        toast(`${m.emoji} ${label}\n${message}`, 5000);

        // Sound
        if (soundEnabled) {
          playSparkle();
        }

        // Confetti for big milestones
        if (m.confetti) {
          onConfetti();
        }
      }, i * 800); // Stagger if multiple
    });
  }, [totalSpent, netWorth, selectedBillionaire, locale, soundEnabled, onConfetti]);

  return null; // Invisible tracker
}

export const MilestoneCelebration = memo(MilestoneCelebrationInner);
