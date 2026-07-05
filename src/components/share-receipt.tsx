"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectMonthlyBurn, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";
import { milestones } from "@/data/milestones";

// ─── Spending equivalences — makes the absurdity tangible ──────────
interface SpendingEquivalence {
  emoji: string;
  unitPrice: number;
  labelEn: string;
  labelZh: string;
}

const EQUIVALENCES: SpendingEquivalence[] = [
  { emoji: "☕", unitPrice: 6, labelEn: "lattes", labelZh: "杯拿铁" },
  { emoji: "🍕", unitPrice: 18, labelEn: "pizzas", labelZh: "个披萨" },
  { emoji: "📱", unitPrice: 1199, labelEn: "iPhones", labelZh: "部iPhone" },
  { emoji: "🚗", unitPrice: 45000, labelEn: "Toyota Camrys", labelZh: "辆凯美瑞" },
  { emoji: "🏠", unitPrice: 400000, labelEn: "US median homes", labelZh: "套美国中位数住宅" },
  { emoji: "🏫", unitPrice: 80000, labelEn: "college tuitions", labelZh: "年大学学费" },
  { emoji: "💍", unitPrice: 6000, labelEn: "engagement rings", labelZh: "枚钻戒" },
  { emoji: "🌍", unitPrice: 5000, labelEn: "round-the-world trips", labelZh: "次环球旅行" },
];

function getTopEquivalences(spent: number, locale: "en" | "zh"): { emoji: string; count: string; label: string }[] {
  if (spent < 1) return [];
  // Pick 3 most interesting comparisons (where count is >= 1 but not too huge)
  const mapped = EQUIVALENCES
    .map((eq) => ({
      emoji: eq.emoji,
      count: Math.floor(spent / eq.unitPrice),
      label: locale === "zh" ? eq.labelZh : eq.labelEn,
    }))
    .filter((e) => e.count >= 1);

  // Sort by "interestingness" — prefer counts that are impressive but readable
  const sorted = mapped.sort((a, b) => {
    const scoreA = a.count >= 10 && a.count <= 1_000_000 ? 2 : a.count > 1_000_000 ? 1 : 0;
    const scoreB = b.count >= 10 && b.count <= 1_000_000 ? 2 : b.count > 1_000_000 ? 1 : 0;
    return scoreB - scoreA || b.count - a.count;
  });

  return sorted.slice(0, 3).map((e) => ({
    ...e,
    count: e.count >= 1_000_000_000
      ? `${(e.count / 1_000_000_000).toFixed(1)}B`
      : e.count >= 1_000_000
      ? `${(e.count / 1_000_000).toFixed(1)}M`
      : e.count >= 1_000
      ? `${(e.count / 1_000).toFixed(1)}K`
      : e.count.toLocaleString(),
  }));
}

export function ShareReceipt() {
  const [isOpen, setIsOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const locale = useLocale((s) => s.locale);

  const billionaire = useCartStore((s) => s.selectedBillionaire);
  const purchases = useCartStore((s) => s.purchases);
  const achievements = useCartStore((s) => s.achievements);
  const netWorth = useCartStore(selectNetWorth);
  const totalSpent = useCartStore(selectTotalSpent);
  const monthlyBurn = useCartStore(selectMonthlyBurn);

  const unlockedAchievements = achievements.filter((a) => a.unlocked);
  const spentPercent = netWorth > 0 ? totalSpent / netWorth : 0;
  const reachedMilestones = milestones.filter((m) => spentPercent >= m.threshold);

  const equivalences = useMemo(
    () => getTopEquivalences(totalSpent, locale),
    [totalSpent, locale]
  );

  const remaining = netWorth - totalSpent;

  const generateText = useCallback(() => {
    if (!billionaire) return "";
    const pct = (spentPercent * 100).toFixed(2);
    const lines = [
      `💳 BILLIONAIRE CART RECEIPT`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `Identity: ${billionaire.name} ${billionaire.emoji}`,
      `Net Worth: ${formatCurrency(netWorth, true)}`,
      `Spent: ${formatCurrency(totalSpent, true)} (${pct}%)`,
      `Remaining: ${formatCurrency(remaining, true)}`,
      `Monthly Burn: ${formatCurrency(monthlyBurn, true)}`,
      `Items: ${purchases.length}`,
      ``,
    ];
    if (equivalences.length > 0) {
      lines.push(`─── That's equivalent to ───`);
      for (const eq of equivalences) {
        lines.push(`${eq.emoji} ${eq.count} ${eq.label}`);
      }
      lines.push(``);
    }
    lines.push(
      `─── Top Acquisitions ───`,
      ...[...purchases]
        .sort((a, b) => b.product.price - a.product.price)
        .slice(0, 8)
        .map(
          (p, i) =>
            `${i + 1}. ${p.product.title} — ${formatCurrency(p.product.price)}`
        ),
      purchases.length > 8 ? `... and ${purchases.length - 8} more` : "",
      ``,
      unlockedAchievements.length > 0
        ? `🏆 ${unlockedAchievements.map((a) => `${a.icon} ${a.name}`).join(" · ")}`
        : "",
      ``,
      `billionaire-cart.pages.dev`,
    );
    return lines.filter(Boolean).join("\n");
  }, [billionaire, netWorth, totalSpent, remaining, monthlyBurn, purchases, equivalences, unlockedAchievements, spentPercent]);

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
        backgroundColor: "#F8F5F0",
        scale: 2,
        width: 540,
        height: 960,
      });
      const link = document.createElement("a");
      link.download = `billionaire-cart-${billionaire?.id || "receipt"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      copyText();
    }
  };

  if (!billionaire || purchases.length === 0) return null;

  const displayPercent = (spentPercent * 100).toFixed(
    spentPercent < 0.01 ? 3 : spentPercent < 0.1 ? 2 : 1
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-[10px] uppercase tracking-[0.2em] text-stone/40 hover:text-stone/70 transition-colors"
        aria-label={t("share.button", locale)}
      >
        {t("share.button", locale)}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-sm w-full space-y-4"
            >
              {/* Receipt preview — Quiet Luxury light theme */}
              <div
                ref={receiptRef}
                className="
                  w-[540px] h-[960px] mx-auto p-8
                  rounded-2xl overflow-hidden
                  scale-[0.6] origin-top sm:scale-75
                "
                style={{
                  backgroundColor: "#F8F5F0",
                  color: "#2A2520",
                  border: "1px solid #E2D9CE",
                }}
              >
                {/* Header with subtle gradient accent */}
                <div className="border-b pb-5 mb-5" style={{ borderColor: "#E2D9CE" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg tracking-wider" style={{ fontFamily: "Playfair Display, Georgia, serif", color: "#8B6F18" }}>
                        BILLIONAIRE CART
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.3em] mt-1" style={{ color: "#8C7A65", opacity: 0.6 }}>
                        {locale === "zh" ? "消费凭证" : "Transaction Receipt"}
                      </div>
                    </div>
                    <div className="text-3xl">{billionaire.emoji}</div>
                  </div>
                </div>

                {/* Identity + net worth */}
                <div className="mb-5">
                  <div className="text-base font-semibold" style={{ color: "#2A2520" }}>
                    {billionaire.name}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "#635C54" }}>{billionaire.company}</div>
                </div>

                {/* Financial summary — 2×2 grid */}
                <div className="grid grid-cols-2 gap-4 mb-5 p-4 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2D9CE" }}>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "#8C7A65" }}>
                      {locale === "zh" ? "净资产" : "Net Worth"}
                    </div>
                    <div className="text-sm font-semibold" style={{ fontFamily: "Playfair Display, Georgia, serif", color: "#8B6F18" }}>
                      {formatCurrency(netWorth, true)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "#8C7A65" }}>
                      {locale === "zh" ? "已花费" : "Spent"}
                    </div>
                    <div className="text-sm font-semibold" style={{ fontFamily: "Playfair Display, Georgia, serif", color: "#2A2520" }}>
                      {formatCurrency(totalSpent, true)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "#8C7A65" }}>
                      {locale === "zh" ? "已消耗" : "Consumed"}
                    </div>
                    <div className="text-sm font-semibold" style={{ fontFamily: "Playfair Display, Georgia, serif", color: "#8C7A65" }}>
                      {displayPercent}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "#8C7A65" }}>
                      {locale === "zh" ? "购买数" : "Items"}
                    </div>
                    <div className="text-sm font-semibold" style={{ fontFamily: "Playfair Display, Georgia, serif", color: "#2A2520" }}>
                      {purchases.length}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-5">
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#E2D9CE" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(spentPercent * 100, 100)}%`,
                        background: spentPercent > 0.5
                          ? "linear-gradient(90deg, #8C7A65, #9B6B6B)"
                          : "linear-gradient(90deg, #5A8A68, #8B6F18)",
                      }}
                    />
                  </div>
                  {/* Milestone emojis */}
                  {reachedMilestones.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      {reachedMilestones.map((m) => (
                        <span key={m.id} className="text-sm">{m.emoji}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Spending equivalences — the fun part */}
                {equivalences.length > 0 && (
                  <div className="mb-5 p-3.5 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2D9CE" }}>
                    <div className="text-[9px] uppercase tracking-wider mb-2.5" style={{ color: "#8C7A65" }}>
                      {locale === "zh" ? "这些钱相当于" : "That's equivalent to"}
                    </div>
                    <div className="space-y-2">
                      {equivalences.map((eq, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-base">{eq.emoji}</span>
                          <span className="text-xs" style={{ color: "#2A2520" }}>
                            <span className="font-semibold" style={{ fontFamily: "Playfair Display, Georgia, serif", color: "#8B6F18" }}>
                              {eq.count}
                            </span>
                            {" "}
                            {eq.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top purchases */}
                <div className="mb-4" style={{ borderTop: "1px solid #E2D9CE", paddingTop: "12px" }}>
                  <div className="text-[9px] uppercase tracking-wider mb-2.5" style={{ color: "#8C7A65" }}>
                    {locale === "zh" ? "最贵购买" : "Top Acquisitions"}
                  </div>
                  {[...purchases]
                    .sort((a, b) => b.product.price - a.product.price)
                    .slice(0, 5)
                    .map((p, i) => (
                      <div
                        key={p.id}
                        className="flex justify-between items-center py-1.5"
                        style={{ borderBottom: "1px solid rgba(226,217,206,0.5)" }}
                      >
                        <span className="text-[11px] truncate max-w-[300px]" style={{ color: "#635C54" }}>
                          {i + 1}. {p.product.title}
                        </span>
                        <span className="text-[11px] shrink-0 ml-2" style={{ fontFamily: "Playfair Display, Georgia, serif", color: "#8B6F18" }}>
                          {formatCurrency(p.product.price, true)}
                        </span>
                      </div>
                    ))}
                </div>

                {/* Achievements */}
                {unlockedAchievements.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {unlockedAchievements.slice(0, 8).map((a) => (
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

                {/* Footer */}
                <div className="text-center pt-3" style={{ borderTop: "1px solid #E2D9CE" }}>
                  <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color: "#8C7A65", opacity: 0.5 }}>
                    billionaire-cart.pages.dev
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-center">
                <button
                  onClick={downloadImage}
                  className="px-4 py-2.5 rounded-xl bg-stone/20 text-stone text-xs font-medium hover:bg-stone/30 transition-colors"
                >
                  📥 {t("share.download", locale)}
                </button>
                <button
                  onClick={copyText}
                  className="px-4 py-2.5 rounded-xl bg-surface-bright text-ash/80 text-xs font-medium hover:text-sand/70 transition-colors border border-line/40"
                >
                  {copying ? `✓ ${t("share.copied", locale)}` : `📋 ${t("share.copy", locale)}`}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-surface-bright text-ash/50 text-xs hover:text-ash/80 transition-colors border border-line/40"
                >
                  {t("share.close", locale)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
