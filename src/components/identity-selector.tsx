"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { formatNetWorth } from "@/lib/format";
import { initAudio } from "@/lib/sounds";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";
import { useLiveData, initLiveData } from "@/lib/use-live-data";
import { useCurrency, initRates, CURRENCY_OPTIONS } from "@/lib/use-currency";

// ─── Sector grouping for filter chips ──────────────────────────────
interface SectorGroup {
  key: string;
  labelEn: string;
  labelZh: string;
  emoji: string;
  matchers: string[];
}

const SECTOR_GROUPS: SectorGroup[] = [
  { key: "tech", labelEn: "Tech", labelZh: "科技", emoji: "💻", matchers: ["tech", "search", "social", "enterprise", "cloud", "semiconductor", "ai"] },
  { key: "luxury", labelEn: "Luxury", labelZh: "奢侈", emoji: "👜", matchers: ["luxury"] },
  { key: "finance", labelEn: "Finance", labelZh: "金融", emoji: "💰", matchers: ["finance", "investing"] },
  { key: "commerce", labelEn: "Commerce", labelZh: "商业", emoji: "📦", matchers: ["commerce", "conglomerate", "beverages", "space"] },
];

function matchSectorGroup(sector: string, group: SectorGroup): boolean {
  const low = sector.toLowerCase();
  return group.matchers.some((m) => low.includes(m));
}

type SortKey = "default" | "worth-desc" | "worth-asc" | "name";

export function IdentitySelector() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const selectBillionaire = useCartStore((s) => s.selectBillionaire);
  const mergedBillionaires = useLiveData((s) => s.mergedBillionaires);
  const liveLoaded = useLiveData((s) => s.loaded);
  const getEnriched = useLiveData((s) => s.getEnriched);
  const currency = useCurrency((s) => s.currency);
  const setCurrency = useCurrency((s) => s.setCurrency);
  const ratesLoaded = useCurrency((s) => s.ratesLoaded);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("default");

  useEffect(() => {
    initLiveData();
    initRates();
  }, []);

  const handleSelect = (id: string) => {
    initAudio();
    selectBillionaire(id);
  };

  const handleImgError = useCallback((id: string) => {
    setImgErrors((prev) => new Set(prev).add(id));
  }, []);

  const filteredBillionaires = useMemo(() => {
    let list = [...mergedBillionaires];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.company.toLowerCase().includes(q) ||
          b.sector.toLowerCase().includes(q)
      );
    }

    if (activeSector) {
      const group = SECTOR_GROUPS.find((g) => g.key === activeSector);
      if (group) {
        list = list.filter((b) => matchSectorGroup(b.sector, group));
      }
    }

    switch (sortKey) {
      case "worth-desc":
        list.sort((a, b) => b.netWorthB - a.netWorthB);
        break;
      case "worth-asc":
        list.sort((a, b) => a.netWorthB - b.netWorthB);
        break;
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return list;
  }, [mergedBillionaires, search, activeSector, sortKey]);

  const sectorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const group of SECTOR_GROUPS) {
      counts[group.key] = mergedBillionaires.filter((b) =>
        matchSectorGroup(b.sector, group)
      ).length;
    }
    return counts;
  }, [mergedBillionaires]);

  const handleSectorToggle = useCallback((key: string) => {
    setActiveSector((prev) => (prev === key ? null : key));
  }, []);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-label" id="identity-heading">
          {t("identity.title", locale)}
        </h2>
        <div className="flex items-center gap-2">
          {liveLoaded && (
            <span className="flex items-center gap-1 text-[9px] text-sage/85 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />
              {t("identity.live", locale)}
            </span>
          )}
          {ratesLoaded && (
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="px-1.5 py-0.5 rounded text-[10px] bg-surface border border-line/60 text-sand focus:outline-none focus:border-stone/40 cursor-pointer"
              aria-label={t("identity.currency", locale)}
            >
              {CURRENCY_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="space-y-2.5 mb-4">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ash/45 pointer-events-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("identity.searchPlaceholder", locale)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-surface-dim/80 border border-line/40 text-xs text-sand placeholder:text-ash/50 focus:outline-none focus:border-stone/40 transition-colors"
            aria-label={t("identity.searchPlaceholder", locale)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ash/40 hover:text-ash/70 transition-colors"
              aria-label="Clear search"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          <button
            onClick={() => setActiveSector(null)}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border ${
              activeSector === null
                ? "bg-stone/15 text-stone border-stone/30"
                : "bg-surface-dim/60 text-ash/60 border-line/30 hover:border-stone/20 hover:text-ash/80"
            }`}
          >
            {t("identity.filterAll", locale)}
            <span className="ml-1 text-[9px] opacity-60">{mergedBillionaires.length}</span>
          </button>

          {SECTOR_GROUPS.map((group) => (
            <button
              key={group.key}
              onClick={() => handleSectorToggle(group.key)}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border flex items-center gap-1 ${
                activeSector === group.key
                  ? "bg-stone/15 text-stone border-stone/30"
                  : "bg-surface-dim/60 text-ash/60 border-line/30 hover:border-stone/20 hover:text-ash/80"
              }`}
            >
              <span className="text-[10px]">{group.emoji}</span>
              {locale === "zh" ? group.labelZh : group.labelEn}
              <span className="text-[9px] opacity-60">{sectorCounts[group.key]}</span>
            </button>
          ))}

          <div className="flex-1 min-w-[8px]" />

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="shrink-0 px-1.5 py-1 rounded-lg text-[10px] bg-surface-dim/60 border border-line/30 text-ash/70 focus:outline-none cursor-pointer"
            aria-label={t("identity.sort", locale)}
          >
            <option value="default">{t("identity.sortDefault", locale)}</option>
            <option value="worth-desc">{t("identity.sortWorthDesc", locale)}</option>
            <option value="worth-asc">{t("identity.sortWorthAsc", locale)}</option>
            <option value="name">{t("identity.sortName", locale)}</option>
          </select>
        </div>
      </div>

      {(search || activeSector) && (
        <div className="text-[10px] text-ash/55 mb-3">
          {filteredBillionaires.length === 0
            ? t("identity.noResults", locale)
            : t("identity.resultCount", locale, { count: filteredBillionaires.length })}
        </div>
      )}

      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        role="radiogroup"
        aria-labelledby="identity-heading"
      >
        <AnimatePresence mode="popLayout">
          {filteredBillionaires.map((b) => {
            const isSelected = selectedBillionaire?.id === b.id;
            const enriched = getEnriched(b.id);
            const hasPhoto = enriched?.photoUrl && !imgErrors.has(b.id);

            return (
              <motion.button
                key={b.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleSelect(b.id)}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                role="radio"
                aria-checked={isSelected}
                aria-label={`${b.name}, ${b.company}, ${formatNetWorth(b.netWorthB)}`}
                className={`
                  flex items-center gap-3.5 p-3.5 rounded-xl text-left transition-all duration-200
                  ${
                    isSelected
                      ? "bg-stone/15 border-2 border-stone/50 shadow-stone ring-2 ring-stone/10"
                      : "bg-surface-dim/80 border border-line/50 hover:border-stone/35 hover:bg-surface/70"
                  }
                `}
              >
                <div
                  className={`
                    w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden
                    ${
                      isSelected
                        ? hasPhoto
                          ? ""
                          : "bg-stone-gradient text-white shadow-stone-sm"
                        : hasPhoto
                        ? ""
                        : "bg-stone/12 text-stone/80 border border-stone/20"
                    }
                  `}
                >
                  {hasPhoto ? (
                    <img
                      src={enriched!.photoUrl!}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={() => handleImgError(b.id)}
                      loading="lazy"
                    />
                  ) : (
                    b.initials
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {enriched?.isLive && enriched.rank > 0 && (
                      <span className="text-[9px] text-ash/70 font-mono">
                        #{enriched.rank}
                      </span>
                    )}
                    <span className="text-[13px] font-semibold text-sand truncate">
                      {b.name}
                    </span>
                    <span className="text-xs">{b.emoji}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <div className="min-w-0">
                      <span className="text-[11px] text-ash truncate block">
                        {b.company}
                      </span>
                      <span className="text-[9px] text-ash/45 mt-0.5 block">
                        {b.sector}
                      </span>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[12px] font-serif text-champagne font-medium">
                        {formatNetWorth(b.netWorthB)}
                      </span>
                      {currency !== "USD" && ratesLoaded && (
                        <CurrencyAmount usd={b.netWorthB * 1e9} />
                      )}
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Tiny inline component showing converted currency amount */
function CurrencyAmount({ usd }: { usd: number }) {
  const formatConverted = useCurrency((s) => s.formatConverted);
  const converted = formatConverted(usd, true);
  if (!converted) return null;
  return (
    <span className="text-[9px] text-ash/60 font-mono">
      ≈ {converted}
    </span>
  );
}
