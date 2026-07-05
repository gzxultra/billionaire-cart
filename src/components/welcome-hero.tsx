"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/lib/use-locale";
import { useLiveData } from "@/lib/use-live-data";
import { billionaires } from "@/data/billionaires";

/**
 * WelcomeHero — cinematic intro banner above the identity selector.
 * Shows animated total combined wealth of all billionaires,
 * atmospheric tagline, and a subtle scroll prompt.
 * Collapses when a billionaire is selected.
 */

function AnimatedWealth({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const duration = 2200;
    const t0 = performance.now();

    const tick = (now: number) => {
      const elapsed = now - t0;
      const progress = Math.min(elapsed / duration, 1);
      // ease out expo
      const eased = 1 - Math.pow(2, -10 * progress);
      setDisplay(Math.round(target * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
      }
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target]);

  // Format as "$X.XX Trillion"
  const formatted = useMemo(() => {
    if (display >= 1_000) {
      return `$${(display / 1_000).toFixed(2)} Trillion`;
    }
    return `$${display.toLocaleString()} Billion`;
  }, [display]);

  return (
    <span className="tabular-nums font-serif text-sand/95 tracking-tight">
      {formatted}
    </span>
  );
}

export function WelcomeHero() {
  const locale = useLocale((s) => s.locale);
  const mergedBillionaires = useLiveData((s) => s.mergedBillionaires);

  // Calculate total combined wealth
  const totalWealthB = useMemo(() => {
    const list = mergedBillionaires.length > 0 ? mergedBillionaires : billionaires;
    return list.reduce((sum, b) => sum + b.netWorthB, 0);
  }, [mergedBillionaires]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: mounted ? 1 : 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl"
      >
        {/* Gradient background */}
        <div className="relative px-6 sm:px-10 py-10 sm:py-14">
          {/* Decorative grid pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(140,122,101,0.3) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(140,122,101,0.3) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />

          {/* Floating accent orbs */}
          <div className="absolute top-1/4 right-1/4 w-40 h-40 rounded-full bg-champagne/[0.04] blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/6 w-32 h-32 rounded-full bg-stone/[0.06] blur-3xl pointer-events-none" />

          <div className="relative z-10 text-center space-y-5">
            {/* Subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <span className="text-[10px] uppercase tracking-[0.3em] text-stone/60 font-mono">
                {locale === "zh" ? "终极消费模拟" : "The Ultimate Spending Simulation"}
              </span>
            </motion.div>

            {/* Tagline */}
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-xl sm:text-2xl font-serif text-sand/90 leading-snug max-w-md mx-auto text-balance"
            >
              {locale === "zh"
                ? "选一个身份，看你多快能花光他们的钱"
                : "Choose a billionaire. Spend their fortune."}
            </motion.h2>

            {/* Animated wealth counter */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="space-y-1"
            >
              <div className="text-[10px] uppercase tracking-[0.2em] text-ash/55 font-mono">
                {locale === "zh" ? "可用总财富" : "Combined Net Worth"}
              </div>
              <div className="text-3xl sm:text-4xl">
                <AnimatedWealth target={totalWealthB} />
              </div>
            </motion.div>

            {/* Scroll prompt */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.5 }}
              className="pt-3"
            >
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="flex flex-col items-center gap-1"
              >
                <span className="text-[9px] text-ash/40 uppercase tracking-wider font-mono">
                  {locale === "zh" ? "选择身份" : "Select below"}
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="text-ash/30"
                >
                  <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
                </svg>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
