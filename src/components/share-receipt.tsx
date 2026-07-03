"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectMonthlyBurn, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";

export function ShareReceipt() {
  const [isOpen, setIsOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const billionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const achievements = useCartStore((s) => s.achievements);
  const netWorth = useCartStore(selectNetWorth);
  const totalSpent = useCartStore(selectTotalSpent);
  const monthlyBurn = useCartStore(selectMonthlyBurn);

  const unlockedAchievements = achievements.filter((a) => a.unlocked);

  const generateText = useCallback(() => {
    if (!billionaire) return "";
    const lines = [
      `💳 BILLIONAIRE CART RECEIPT`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `Identity: ${billionaire.name}`,
      `Net Worth: ${formatCurrency(netWorth, true)}`,
      `Spent: ${formatCurrency(totalSpent, true)}`,
      `Remaining: ${formatCurrency(netWorth - totalSpent, true)}`,
      `Monthly Burn: ${formatCurrency(monthlyBurn, true)}`,
      ``,
      `─── Acquisitions ───`,
      ...purchases.slice(0, 10).map(
        (p, i) =>
          `${i + 1}. ${p.product.title} — ${formatCurrency(p.product.price)}`
      ),
      purchases.length > 10 ? `... and ${purchases.length - 10} more` : "",
      ``,
      unlockedAchievements.length > 0
        ? `🏆 ${unlockedAchievements.map((a) => `${a.icon} ${a.name}`).join(" · ")}`
        : "",
      ``,
      `billionairecart.app`,
    ];
    return lines.filter(Boolean).join("\n");
  }, [billionaire, netWorth, totalSpent, monthlyBurn, purchases, unlockedAchievements]);

  const copyText = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(generateText());
      setTimeout(() => setCopying(false), 2000);
    } catch {
      setCopying(false);
    }
  };

  const downloadImage = async () => {
    if (!receiptRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: "#0C0C0E",
        scale: 2,
        width: 540,
        height: 960,
      });
      const link = document.createElement("a");
      link.download = `billionaire-cart-${billionaire?.id || "receipt"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      // Fallback: copy text
      copyText();
    }
  };

  if (!billionaire || purchases.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-[10px] uppercase tracking-[0.2em] text-stone/40 hover:text-stone/70 transition-colors"
      >
        Share Receipt
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-sm w-full space-y-4"
            >
              {/* Receipt preview */}
              <div
                ref={receiptRef}
                className="
                  w-[540px] h-[960px] mx-auto p-8
                  bg-base text-sand
                  rounded-2xl border border-stone/20
                  overflow-hidden
                  scale-[0.6] origin-top sm:scale-75
                "
              >
                {/* Header */}
                <div className="border-b border-stone/20 pb-4 mb-6">
                  <div className="text-champagne text-lg font-serif tracking-wider">
                    BILLIONAIRE CART
                  </div>
                  <div className="text-[10px] text-ash/30 uppercase tracking-[0.3em] mt-1">
                    Transaction Receipt
                  </div>
                </div>

                {/* Identity */}
                <div className="mb-6">
                  <div className="text-sand/80 text-base font-medium">
                    {billionaire.emoji} {billionaire.name}
                  </div>
                  <div className="text-ash/50 text-xs">{billionaire.company}</div>
                </div>

                {/* Financials */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="text-[9px] text-ash/30 uppercase">Net Worth</div>
                    <div className="text-champagne font-serif text-sm">
                      {formatCurrency(netWorth, true)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-ash/30 uppercase">Deployed</div>
                    <div className="text-sand/70 font-serif text-sm">
                      {formatCurrency(totalSpent, true)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-ash/30 uppercase">Remaining</div>
                    <div className="text-ash/80 font-serif text-sm">
                      {formatCurrency(netWorth - totalSpent, true)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-ash/30 uppercase">Burn / Mo</div>
                    <div className="text-[#9B6B6B]/70 font-serif text-sm">
                      -{formatCurrency(monthlyBurn, true)}
                    </div>
                  </div>
                </div>

                {/* Top purchases */}
                <div className="border-t border-line/30 pt-4 mb-6">
                  <div className="text-[9px] text-ash/30 uppercase mb-3">
                    Top Acquisitions
                  </div>
                  {[...purchases]
                    .sort((a, b) => b.product.price - a.product.price)
                    .slice(0, 6)
                    .map((p, i) => (
                      <div
                        key={p.id}
                        className="flex justify-between items-center py-1.5 border-b border-line/10"
                      >
                        <span className="text-xs text-ash/80 truncate max-w-[300px]">
                          {i + 1}. {p.product.title}
                        </span>
                        <span className="text-xs font-serif text-champagne/70 shrink-0 ml-2">
                          {formatCurrency(p.product.price, true)}
                        </span>
                      </div>
                    ))}
                </div>

                {/* Achievements */}
                {unlockedAchievements.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {unlockedAchievements.map((a) => (
                      <span
                        key={a.id}
                        className="text-sm"
                        title={a.name}
                      >
                        {a.icon}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-center">
                <button
                  onClick={downloadImage}
                  className="px-4 py-2 rounded-lg bg-stone/20 text-stone text-xs hover:bg-stone/30 transition-colors"
                >
                  📥 Download PNG
                </button>
                <button
                  onClick={copyText}
                  className="px-4 py-2 rounded-lg bg-surface-bright text-ash/80 text-xs hover:text-sand/70 transition-colors"
                >
                  {copying ? "✓ Copied!" : "📋 Copy Text"}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-lg bg-surface-bright text-ash/50 text-xs hover:text-ash/80 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
