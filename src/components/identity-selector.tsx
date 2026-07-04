"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { formatNetWorth } from "@/lib/format";
import { initAudio } from "@/lib/sounds";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";
import { useLiveData, initLiveData } from "@/lib/use-live-data";
import { useCurrency, initRates, CURRENCY_OPTIONS } from "@/lib/use-currency";

export function IdentitySelector() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const selectBillionaire = useCartStore((s) => s.selectBillionaire);
  const mergedBillionaires = useLiveData((s) => s.getMerged());
  const liveLoaded = useLiveData((s) => s.loaded);
  const getEnriched = useLiveData((s) => s.getEnriched);
  const currency = useCurrency((s) => s.currency);
  const setCurrency = useCurrency((s) => s.setCurrency);
  const ratesLoaded = useCurrency((s) => s.ratesLoaded);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  // Init live data + rates on mount
  useEffect(() => {
    initLiveData();
    initRates();
  }, []);

  const handleSelect = (id: string) => {
    initAudio();
    selectBillionaire(id);
  };

  const handleImgError = (id: string) => {
    setImgErrors((prev) => new Set(prev).add(id));
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="section-label" id="identity-heading">
          {t("identity.title", locale)}
        </h2>
        <div className="flex items-center gap-2">
          {/* Live indicator */}
          {liveLoaded && (
            <span className="flex items-center gap-1 text-[9px] text-sage/60 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />
              {t("identity.live", locale)}
            </span>
          )}
          {/* Currency selector */}
          {ratesLoaded && (
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="px-1.5 py-0.5 rounded text-[10px] bg-surface/60 border border-line/20 text-ash/80 focus:outline-none focus:border-stone/40 cursor-pointer"
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
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        role="radiogroup"
        aria-labelledby="identity-heading"
      >
        {mergedBillionaires.map((b) => {
          const isSelected = selectedBillionaire?.id === b.id;
          const enriched = getEnriched(b.id);
          const hasPhoto = enriched?.photoUrl && !imgErrors.has(b.id);

          return (
            <motion.button
              key={b.id}
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
                    ? "bg-stone/10 border border-stone/30 shadow-stone-sm ring-1 ring-stone/10"
                    : "bg-surface-dim/50 border border-line/10 hover:border-stone/15 hover:bg-surface/40"
                }
              `}
            >
              {/* Avatar: photo or initials */}
              <div
                className={`
                  w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden
                  ${
                    isSelected
                      ? hasPhoto
                        ? ""
                        : "bg-stone-gradient text-sand shadow-stone-sm"
                      : hasPhoto
                      ? ""
                      : "bg-surface-bright text-ash/80"
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
                    <span className="text-[9px] text-ash/30 font-mono">
                      #{enriched.rank}
                    </span>
                  )}
                  <span className="text-[13px] font-semibold text-sand/90 truncate">
                    {b.name}
                  </span>
                  <span className="text-xs">{b.emoji}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-[11px] text-sand/35 truncate">
                    {b.company}
                  </span>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[12px] font-serif text-champagne/80 font-medium">
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
    <span className="text-[9px] text-ash/40 font-mono">
      ≈ {converted}
    </span>
  );
}
