"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { EasterEgg } from "@/data/easter-eggs";

interface EasterEggOverlayProps {
  egg: EasterEgg | null;
  onDismiss: () => void;
}

export function EasterEggOverlay({ egg, onDismiss }: EasterEggOverlayProps) {
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");

  useEffect(() => {
    if (!egg) return;
    setPhase("enter");
    const t1 = setTimeout(() => setPhase("show"), 300);
    const t2 = setTimeout(() => {
      setPhase("exit");
      setTimeout(onDismiss, 500);
    }, 3500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [egg, onDismiss]);

  if (!egg) return null;

  const effectStyles: Record<string, string> = {
    shake: "animate-[shake_0.5s_ease-in-out_3]",
    rainbow:
      "bg-gradient-to-r from-stone/10 via-champagne/10 to-stone/10",
    gold_rain: "bg-gradient-to-b from-champagne/12 to-transparent",
    explosion: "bg-stone/20",
    matrix: "bg-sage/10",
    fire: "bg-gradient-to-t from-stone/15 via-champagne/8 to-transparent",
  };

  return (
    <AnimatePresence>
      {phase !== "exit" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[90] pointer-events-none flex items-center justify-center ${
            effectStyles[egg.effect] || ""
          }`}
        >
          {/* Central badge */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="pointer-events-auto"
          >
            <div className="relative px-8 py-6 rounded-2xl bg-surface/95 border-2 border-stone/50 backdrop-blur-xl shadow-stone-lg text-center">
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-2xl border border-stone/30 animate-pulse" />

              <div className="text-5xl mb-3">{egg.emoji}</div>
              <div className="text-[10px] uppercase tracking-[0.4em] text-stone/85 mb-1">
                Easter Egg Discovered
              </div>
              <div className="text-lg font-serif text-stone">{egg.name}</div>
              <div className="text-xs text-ash/60 mt-1.5 max-w-[200px]">
                {egg.description}
              </div>
            </div>
          </motion.div>

          {/* Floating emoji burst */}
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: 0,
                y: 0,
                scale: 0,
                opacity: 1,
              }}
              animate={{
                x: (Math.random() - 0.5) * 400,
                y: (Math.random() - 0.5) * 400,
                scale: 1 + Math.random(),
                opacity: 0,
              }}
              transition={{
                duration: 1.5 + Math.random(),
                delay: Math.random() * 0.3,
                ease: "easeOut",
              }}
              className="absolute text-3xl pointer-events-none"
            >
              {egg.emoji}
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
