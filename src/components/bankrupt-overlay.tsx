"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

export function BankruptOverlay() {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);
  const purchases = useCartStore((s) => s.purchases);
  const achievements = useCartStore((s) => s.achievements);
  const reset = useCartStore((s) => s.reset);
  const locale = useLocale((s) => s.locale);

  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const remaining = netWorth - totalSpent;
  const isBankrupt = remaining <= 0 && purchases.length > 0;
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  useEffect(() => {
    if (isBankrupt && !dismissed) {
      setShow(true);
    }
  }, [isBankrupt, dismissed]);

  // Reset dismissed state when billionaire changes
  useEffect(() => {
    setDismissed(false);
    setShow(false);
  }, [selectedBillionaire?.id]);

  if (!show || !selectedBillionaire) return null;

  const topPurchase = [...purchases].sort(
    (a, b) => b.product.price - a.product.price
  )[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-lg"
      >
        {/* Cracked card background effect */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Red pulse */}
          <motion.div
            className="absolute inset-0"
            animate={{
              background: [
                "radial-gradient(circle at 50% 50%, rgba(239,68,68,0.1) 0%, transparent 70%)",
                "radial-gradient(circle at 50% 50%, rgba(239,68,68,0.05) 0%, transparent 70%)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
          />

          {/* Crack lines */}
          <svg
            className="absolute inset-0 w-full h-full opacity-10"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <motion.path
              d="M50 0 L48 25 L52 30 L45 50 L55 55 L50 70 L48 100"
              stroke="#ef4444"
              strokeWidth="0.3"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
            <motion.path
              d="M50 50 L30 52 L25 55 L10 50"
              stroke="#ef4444"
              strokeWidth="0.2"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
            />
            <motion.path
              d="M50 50 L70 48 L78 52 L95 48"
              stroke="#ef4444"
              strokeWidth="0.2"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 0.7 }}
            />
          </svg>
        </div>

        {/* Content */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className="relative max-w-sm w-full mx-4 text-center space-y-6"
        >
          {/* BANKRUPT label */}
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="text-[#9B6B6B]/80 text-[10px] uppercase tracking-[0.5em] mb-2">
              {t("bankrupt.status", locale)}
            </div>
            <h2 className="text-4xl sm:text-5xl font-serif text-[#9B6B6B]/90 tracking-tight">
              {t("bankrupt.depleted", locale)}
            </h2>
          </motion.div>

          {/* The broken card */}
          <motion.div
            initial={{ rotateX: -20, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="w-full aspect-[1.586/1] max-w-xs mx-auto rounded-2xl overflow-hidden border-2 border-[#9B6B6B]/15 relative"
            style={{
              background:
                "linear-gradient(145deg, #161618 0%, #0C0C0E 50%, #161618 100%)",
            }}
          >
            {/* Red overlay */}
            <div className="absolute inset-0 bg-[#9B6B6B]/5" />

            {/* Card content */}
            <div className="absolute top-6 left-6">
              <div className="text-[8px] uppercase tracking-[0.3em] text-[#9B6B6B]/40">
                {t("card.brand", locale)}
              </div>
              <div className="text-[7px] uppercase tracking-[0.2em] text-[#9B6B6B]/20 mt-0.5">
                {t("bankrupt.cancelled", locale)}
              </div>
            </div>

            <div className="absolute top-1/2 left-6 -translate-y-1/2">
              <div className="text-xl font-serif text-[#9B6B6B]/60">
                {formatCurrency(remaining)}
              </div>
            </div>

            <div className="absolute bottom-6 left-6">
              <div className="text-[9px] uppercase tracking-[0.2em] text-[#9B6B6B]/30 line-through">
                {selectedBillionaire.name}
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="grid grid-cols-3 gap-3 text-center"
          >
            <div>
              <div className="text-[9px] text-ash/30 uppercase">
                {t("bankrupt.fortune", locale)}
              </div>
              <div className="text-xs font-serif text-ash/60">
                {formatCurrency(netWorth, true)}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-ash/30 uppercase">{t("bankrupt.items", locale)}</div>
              <div className="text-xs font-serif text-ash/60">
                {purchases.length}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-ash/30 uppercase">
                {t("bankrupt.trophies", locale)}
              </div>
              <div className="text-xs font-serif text-ash/60">
                {unlockedCount}/{achievements.length}
              </div>
            </div>
          </motion.div>

          {/* Most expensive */}
          {topPurchase && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-[10px] text-ash/30"
            >
              {t("bankrupt.mostExpensive", locale)}:{" "}
              <span className="text-stone/50">
                {topPurchase.product.title} (
                {formatCurrency(topPurchase.product.price, true)})
              </span>
            </motion.div>
          )}

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8 }}
            className="flex gap-3 justify-center pt-2"
          >
            <button
              onClick={() => {
                setDismissed(true);
                setShow(false);
              }}
              className="px-4 py-2 rounded-lg bg-surface-bright/50 text-ash/50 text-xs hover:text-ash/80 transition-colors"
            >
              {t("bankrupt.keepGoing", locale)}
            </button>
            <button
              onClick={() => {
                setDismissed(true);
                setShow(false);
                reset();
              }}
              className="px-4 py-2 rounded-lg bg-stone/15 text-stone text-xs hover:bg-stone/25 transition-colors"
            >
              {t("bankrupt.newIdentity", locale)}
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
