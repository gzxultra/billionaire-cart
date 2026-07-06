"use client";

import { memo, useMemo, useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectRemaining, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { acquirableCompanies, AcquirableCompany } from "@/data/companies";
import { playAuthorize, playSparkle } from "@/lib/sounds";
import { toast } from "@/lib/use-toast";

type SortMode = "affordable" | "marketCap" | "name";

function EmpireAcquisitionsInner() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const addPurchase = useCartStore((s) => s.addPurchase);
  const soundEnabled = useCartStore((s) => s.soundEnabled);
  const remaining = useCartStore(selectRemaining);
  const netWorth = useCartStore(selectNetWorth);
  const purchases = useCartStore((s) => s.purchases);
  const [sortMode, setSortMode] = useState<SortMode>("affordable");
  const [acquiredIds, setAcquiredIds] = useState<Set<string>>(new Set());
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Track which companies have been purchased via the store
  const acquiredFromStore = useMemo(() => {
    const ids = new Set<string>();
    for (const p of purchases) {
      const match = p.product.sourceUrl.match(/^empire:\/\/(.+)$/);
      if (match) ids.add(match[1]);
    }
    return ids;
  }, [purchases]);

  const allAcquired = useMemo(() => {
    const merged = new Set<string>();
    acquiredIds.forEach((id) => merged.add(id));
    acquiredFromStore.forEach((id) => merged.add(id));
    return merged;
  }, [acquiredIds, acquiredFromStore]);

  const sorted = useMemo(() => {
    const list = [...acquirableCompanies];
    switch (sortMode) {
      case "affordable":
        list.sort((a, b) => a.marketCapB - b.marketCapB);
        break;
      case "marketCap":
        list.sort((a, b) => b.marketCapB - a.marketCapB);
        break;
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return list;
  }, [sortMode]);

  const displayList = showAll ? sorted : sorted.slice(0, 8);

  const affordableCount = useMemo(() => {
    return acquirableCompanies.filter(
      (c) => c.marketCapB * 1_000_000_000 <= remaining && !allAcquired.has(c.id)
    ).length;
  }, [remaining, allAcquired]);

  const totalAcquiredValue = useMemo(() => {
    let total = 0;
    for (const c of acquirableCompanies) {
      if (allAcquired.has(c.id)) total += c.marketCapB;
    }
    return total;
  }, [allAcquired]);

  const handleAcquire = useCallback(
    (company: AcquirableCompany) => {
      if (!selectedBillionaire) return;
      const costUsd = company.marketCapB * 1_000_000_000;
      if (costUsd > remaining) {
        toast(
          locale === "zh"
            ? `💸 余额不足以收购 ${company.nameZh}`
            : `💸 Not enough to acquire ${company.name}`
        );
        return;
      }

      setAnimatingId(company.id);
      if (soundEnabled) playAuthorize();

      setTimeout(() => {
        const newlyUnlocked = addPurchase({
          id: `empire-${company.id}-${Date.now()}`,
          product: {
            title: `🏢 Acquired: ${company.name}`,
            price: costUsd,
            imageUrl: null,
            description: `Hostile takeover of ${company.name} (${company.ticker})`,
            sourceUrl: `empire://${company.id}`,
            assetClass: "commercial_tech",
            monthlyOverhead: 0,
          },
          billionaireId: selectedBillionaire.id,
          timestamp: Date.now(),
        });

        setAcquiredIds((prev) => new Set(prev).add(company.id));
        setAnimatingId(null);

        if (soundEnabled) playSparkle();
        toast(
          locale === "zh"
            ? `🏛️ 成功收购 ${company.nameZh}！你现在是 ${company.ticker} 的老板`
            : `🏛️ ${company.name} acquired! You now own ${company.ticker}`
        );
        if (newlyUnlocked.length > 0) {
          toast(`🏆 ${newlyUnlocked.join(", ")}`);
        }
      }, 800);
    },
    [selectedBillionaire, remaining, addPurchase, soundEnabled, locale]
  );

  if (!selectedBillionaire) return null;

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="text-base">🏛️</span>
          <div>
            <h2 className="text-xs uppercase tracking-[0.2em] text-stone/75 font-medium">
              {locale === "zh" ? "帝国收购" : "Empire Acquisitions"}
            </h2>
            <p className="text-[9px] text-ash/50 mt-0.5">
              {locale === "zh"
                ? `${affordableCount} 家公司可收购 · 已拥有 ${allAcquired.size} 家`
                : `${affordableCount} affordable · ${allAcquired.size} acquired`}
            </p>
          </div>
        </div>
        {/* Sort control */}
        <div className="flex items-center gap-1.5">
          {(["affordable", "marketCap", "name"] as SortMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              className={`text-[9px] px-2 py-1 rounded-full transition-all font-mono ${
                sortMode === mode
                  ? "bg-stone/15 text-stone"
                  : "text-ash/40 hover:text-ash/60"
              }`}
            >
              {mode === "affordable"
                ? locale === "zh" ? "可买" : "💰"
                : mode === "marketCap"
                ? locale === "zh" ? "市值" : "📊"
                : locale === "zh" ? "名称" : "A-Z"}
            </button>
          ))}
        </div>
      </div>

      {/* Empire stats bar */}
      {allAcquired.size > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-5 p-3 rounded-lg bg-champagne-dim/60 border border-champagne/10"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-champagne font-mono uppercase tracking-wider">
              {locale === "zh" ? "你的帝国" : "Your Empire"}
            </span>
            <span className="text-xs font-serif text-champagne tabular-nums">
              ${totalAcquiredValue >= 1000
                ? `${(totalAcquiredValue / 1000).toFixed(1)}T`
                : `${totalAcquiredValue.toFixed(0)}B`}
            </span>
          </div>
          {/* Acquired company pills */}
          <div className="flex flex-wrap gap-1 mt-2">
            {acquirableCompanies
              .filter((c) => allAcquired.has(c.id))
              .map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-champagne/10 text-champagne/80"
                >
                  {c.emoji} {c.ticker}
                </span>
              ))}
          </div>
        </motion.div>
      )}

      {/* Companies grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {displayList.map((company, i) => {
            const costUsd = company.marketCapB * 1_000_000_000;
            const canAfford = costUsd <= remaining;
            const isAcquired = allAcquired.has(company.id);
            const isAnimating = animatingId === company.id;
            const percentOfWealth = netWorth > 0
              ? ((costUsd / netWorth) * 100).toFixed(1)
              : "0";
            const howMany = costUsd > 0 ? Math.floor(remaining / costUsd) : 0;

            return (
              <motion.div
                key={company.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                className={`relative group rounded-xl border p-4 transition-all duration-300 ${
                  isAcquired
                    ? "bg-champagne-dim/40 border-champagne/20"
                    : canAfford
                    ? "bg-surface border-line/50 hover:border-stone/40 hover:shadow-stone-sm cursor-pointer"
                    : "bg-surface-dim/50 border-line/30 opacity-60"
                }`}
                onClick={() => !isAcquired && canAfford && !isAnimating && handleAcquire(company)}
              >
                {/* Acquisition animation overlay */}
                <AnimatePresence>
                  {isAnimating && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-10 rounded-xl bg-champagne/10 flex items-center justify-center"
                    >
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
                        transition={{ duration: 0.6 }}
                        className="text-2xl"
                      >
                        🤝
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-xl flex-shrink-0 mt-0.5">{company.emoji}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-serif text-sand truncate">
                          {locale === "zh" ? company.nameZh : company.name}
                        </span>
                        {isAcquired && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-champagne/15 text-champagne font-mono uppercase tracking-wider flex-shrink-0">
                            {locale === "zh" ? "已收购" : "OWNED"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-mono text-stone/60">
                          {company.ticker}
                        </span>
                        <span className="text-[9px] text-ash/40">
                          {locale === "zh" ? company.sectorZh : company.sector}
                        </span>
                      </div>
                      <p className="text-[9px] text-ash/40 mt-1 italic">
                        {locale === "zh" ? company.taglineZh : company.tagline}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-serif text-sand tabular-nums">
                      ${company.marketCapB >= 1000
                        ? `${(company.marketCapB / 1000).toFixed(1)}T`
                        : `${company.marketCapB}B`}
                    </div>
                    <div className="text-[9px] text-ash/45 font-mono tabular-nums mt-0.5">
                      {percentOfWealth}%
                      <span className="text-ash/30 ml-0.5">
                        {locale === "zh" ? "身家" : "wealth"}
                      </span>
                    </div>
                    {canAfford && !isAcquired && howMany > 1 && (
                      <div className="text-[8px] text-champagne/60 font-mono mt-0.5">
                        ×{howMany.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Affordability bar */}
                {!isAcquired && (
                  <div className="mt-3 h-1 rounded-full bg-surface-dim/80 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: canAfford
                          ? "rgba(90,138,104,0.5)"
                          : "rgba(155,107,107,0.4)",
                      }}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min((remaining / costUsd) * 100, 100)}%`,
                      }}
                      transition={{ duration: 0.6, delay: i * 0.04 }}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Show more/less */}
      {sorted.length > 8 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-4 w-full text-[10px] text-stone/60 hover:text-stone py-2 font-mono uppercase tracking-wider transition-colors"
        >
          {showAll
            ? locale === "zh" ? "收起" : "Show less"
            : locale === "zh"
            ? `查看全部 ${sorted.length} 家公司`
            : `View all ${sorted.length} companies`}
        </button>
      )}
    </section>
  );
}

export const EmpireAcquisitions = memo(EmpireAcquisitionsInner);
