"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ParsedProduct, Billionaire } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { playAuthorize, playSparkle } from "@/lib/sounds";
import { useCartStore } from "@/lib/store";
import { ParticleBurst } from "@/components/particle-burst";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";
import { applyWealthDna, formatModifier } from "@/lib/wealth-dna";

interface CheckoutAnimationProps {
  product: ParsedProduct;
  billionaire: Billionaire;
  onComplete: () => void;
  qty?: number;
}

export function CheckoutAnimation({
  product,
  billionaire,
  onComplete,
  qty = 1,
}: CheckoutAnimationProps) {
  const [phase, setPhase] = useState<
    "swipe" | "scanning" | "authorize" | "done"
  >("swipe");
  const soundEnabled = useCartStore((s) => s.soundEnabled);
  const locale = useLocale((s) => s.locale);
  const dna = applyWealthDna(product, billionaire);

  useEffect(() => {
    // Phase 1: Card swipes in from right (0→0.6s)
    const t1 = setTimeout(() => setPhase("scanning"), 600);

    // Phase 2: Scanning line sweeps the card (0.6s→1.6s)
    const t2 = setTimeout(() => {
      setPhase("authorize");
      if (soundEnabled) playAuthorize();
    }, 1600);

    // Phase 3: Authorized + particle burst (1.8s)
    const t3 = setTimeout(() => {
      setPhase("done");
      if (soundEnabled) playSparkle();
    }, 1800);

    // Phase 4: Dismiss (2.8s)
    const t4 = setTimeout(onComplete, 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete, soundEnabled]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      {/* Holographic shimmer keyframes */}
      <style>{`
        @keyframes holo-shimmer {
          0% { background-position: 100% 0; }
          50% { background-position: 0% 0; }
          100% { background-position: 100% 0; }
        }
      `}</style>

      {/* The Black Card — dark gradient matching BlackCard */}
      <motion.div
        initial={{ x: 300, rotateY: -25, opacity: 0 }}
        animate={{ x: 0, rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="
          relative w-80 sm:w-96 aspect-[1.586/1] rounded-2xl overflow-hidden
          bg-gradient-to-br from-[#151518] via-[#101014] to-[#1C1C22]
        "
        style={{
          perspective: 1000,
          boxShadow:
            "0 12px 50px rgba(0,0,0,0.6), 0 2px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* Metallic edge emboss highlight */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(255,255,255,0.03), inset 1px 0 0 rgba(255,255,255,0.04), inset -1px 0 0 rgba(255,255,255,0.04)",
          }}
        />

        {/* Holographic shimmer overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(105deg, transparent 20%, rgba(166,133,48,0.06) 30%, rgba(120,160,200,0.04) 40%, rgba(166,133,48,0.08) 50%, rgba(180,140,200,0.04) 60%, transparent 80%)",
            backgroundSize: "300% 100%",
            animation: "holo-shimmer 3s ease-in-out infinite",
          }}
        />

        {/* Top metallic edge line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent pointer-events-none" />

        {/* Chip — golden metallic */}
        <div className="absolute top-8 left-8">
          <div
            className="w-10 h-7 rounded"
            style={{
              background:
                "linear-gradient(135deg, #C5A572 0%, #8B7A60 50%, #A89279 100%)",
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-px p-px opacity-40">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-black/20 rounded-[1px]" />
              ))}
            </div>
          </div>
        </div>

        {/* Card label */}
        <div className="absolute top-8 right-8">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-sans">
            {t("card.brand", locale)}
          </div>
        </div>

        {/* Amount */}
        <div className="absolute top-1/2 left-8 -translate-y-1/2">
          <div className="text-[10px] uppercase tracking-[0.15em] text-white/25 mb-1">
            {t("checkout.amount", locale)}
            {qty > 1 && <span className="ml-1.5 text-[#C5A572]/50">×{qty.toLocaleString()}</span>}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {dna.isFree ? (
              <>
                <div className="text-2xl font-serif text-emerald-400">FREE</div>
                <div className="text-[10px] text-white/30 line-through mt-0.5">
                  {formatCurrency(product.price)}
                </div>
              </>
            ) : dna.modifier != null ? (
              <>
                <div className="text-2xl font-serif text-[#C5A572]">
                  {formatCurrency(dna.adjustedPrice * qty)}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-white/30 line-through">
                    {formatCurrency(product.price * qty)}
                  </span>
                  <span
                    className={`text-[10px] font-medium ${
                      dna.modifier < 0
                        ? "text-emerald-400/80"
                        : "text-red-400/80"
                    }`}
                  >
                    {formatModifier(dna.modifier)}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-2xl font-serif text-[#C5A572]">
                {formatCurrency(product.price * qty)}
              </div>
            )}
          </motion.div>
        </div>

        {/* Cardholder */}
        <div className="absolute bottom-8 left-8">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/35">
            {billionaire.name}
          </div>
        </div>

        {/* Scanning line — sweeps across card horizontally */}
        {phase === "scanning" && (
          <motion.div
            initial={{ left: "-10%" }}
            animate={{ left: "110%" }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
            className="absolute top-0 bottom-0 w-[2px] pointer-events-none z-10"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, rgba(166,133,48,0.6) 30%, rgba(197,165,114,0.9) 50%, rgba(166,133,48,0.6) 70%, transparent 100%)",
              boxShadow: "0 0 12px 4px rgba(166,133,48,0.25)",
            }}
          />
        )}

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
              ${phase === "done" ? "text-emerald-400" : "text-[#C5A572]/70"}
            `}
          >
            {phase === "done"
              ? t("checkout.authorized", locale)
              : t("checkout.authorizing", locale)}
          </motion.div>
        </div>

        {/* Authorization flash */}
        {(phase === "authorize" || phase === "done") && (
          <motion.div
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                phase === "done"
                  ? "radial-gradient(ellipse at center, rgba(90,200,130,0.15) 0%, transparent 70%)"
                  : "radial-gradient(ellipse at center, rgba(166,133,48,0.15) 0%, transparent 70%)",
            }}
          />
        )}
      </motion.div>

      {/* Particle burst on done */}
      {phase === "done" && <ParticleBurst />}
    </motion.div>
  );
}
