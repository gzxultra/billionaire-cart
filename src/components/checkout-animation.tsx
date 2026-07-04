"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ParsedProduct, Billionaire } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { playAuthorize, playSparkle } from "@/lib/sounds";
import { useCartStore } from "@/lib/store";
import { ParticleBurst } from "@/components/particle-burst";

interface CheckoutAnimationProps {
  product: ParsedProduct;
  billionaire: Billionaire;
  onComplete: () => void;
}

export function CheckoutAnimation({
  product,
  billionaire,
  onComplete,
}: CheckoutAnimationProps) {
  const [phase, setPhase] = useState<"card" | "authorize" | "done">("card");
  const soundEnabled = useCartStore((s) => s.soundEnabled);

  useEffect(() => {
    // Phase 1: Show card (0.4s)
    const t1 = setTimeout(() => {
      setPhase("authorize");
      if (soundEnabled) {
        playAuthorize();
        playSparkle();
      }
    }, 400);

    // Phase 2: Show authorized (0.9s after start)
    const t2 = setTimeout(() => setPhase("done"), 1300);

    // Phase 3: Dismiss (0.7s after done)
    const t3 = setTimeout(onComplete, 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete, soundEnabled]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      {/* The Black Card */}
      <motion.div
        initial={{ scale: 0.8, rotateY: -90, opacity: 0 }}
        animate={{
          scale: 1,
          rotateY: 0,
          opacity: 1,
        }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="
          relative w-80 sm:w-96 aspect-[1.586/1] rounded-2xl overflow-hidden
          bg-gradient-to-br from-surface-dim via-base to-surface
        "
        style={{ perspective: 1000, boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(155,139,122,0.06)" }}
      >
        {/* Subtle warm border */}
        <div className="absolute inset-0 rounded-2xl border border-stone/8 pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-stone/12 to-transparent pointer-events-none" />

        {/* Chip */}
        <div className="absolute top-8 left-8">
          <div className="w-10 h-7 rounded bg-gradient-to-br from-stone-light/60 to-stone/40 border border-stone/30">
            <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-px p-px opacity-50">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-stone/30 rounded-[1px]" />
              ))}
            </div>
          </div>
        </div>

        {/* Card label */}
        <div className="absolute top-8 right-8">
          <div className="text-[10px] uppercase tracking-[0.3em] text-stone/50 font-sans">
            Billionaire Cart
          </div>
        </div>

        {/* Amount */}
        <div className="absolute top-1/2 left-8 -translate-y-1/2">
          <div className="text-[10px] uppercase tracking-[0.15em] text-ash/30 mb-1">
            Amount
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-serif text-champagne"
          >
            {formatCurrency(product.price)}
          </motion.div>
        </div>

        {/* Cardholder */}
        <div className="absolute bottom-8 left-8">
          <div className="text-[10px] uppercase tracking-[0.3em] text-ash/40">
            {billionaire.name}
          </div>
        </div>

        {/* Authorization status */}
        <div className="absolute bottom-8 right-8">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{
              opacity: phase === "authorize" || phase === "done" ? 1 : 0,
              x: phase === "authorize" || phase === "done" ? 0 : 20,
            }}
            transition={{ duration: 0.3 }}
            className={`
              text-xs uppercase tracking-[0.2em] font-medium
              ${phase === "done" ? "text-sage" : "text-stone"}
            `}
          >
            {phase === "done" ? "✓ Authorized" : "Authorizing..."}
          </motion.div>
        </div>

        {/* Flash effect */}
        {phase === "authorize" && (
          <motion.div
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-stone/20"
          />
        )}
      </motion.div>

      {/* Particle burst on authorize */}
      {phase === "authorize" && <ParticleBurst />}
    </motion.div>
  );
}
