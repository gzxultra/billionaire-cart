"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

const IMPACT_DATA = {
  medianUSHomePrice: 420_000,
  averageUSSalary: 75_000,
  collegeYearCost: 26_000,
  avgCarPrice: 48_000,
  malariaNetsPerDollar: 1 / 2.50,
  cleanWaterWellCost: 8_000,
  schoolBuildCost: 50_000,
  mealCost: 3.00,
  treePlantCost: 0.30,
  vaccinePerChild: 20,
};

const COUNTRY_GDPS: { name: string; flag: string; gdp: number }[] = [
  { name: "Tuvalu", flag: "🇹🇻", gdp: 60_000_000 },
  { name: "Nauru", flag: "🇳🇷", gdp: 150_000_000 },
  { name: "Palau", flag: "🇵🇼", gdp: 280_000_000 },
  { name: "Marshall Islands", flag: "🇲🇭", gdp: 280_000_000 },
  { name: "Tonga", flag: "🇹🇴", gdp: 500_000_000 },
  { name: "Samoa", flag: "🇼🇸", gdp: 850_000_000 },
  { name: "Belize", flag: "🇧🇿", gdp: 2_400_000_000 },
  { name: "Bhutan", flag: "🇧🇹", gdp: 2_800_000_000 },
  { name: "Maldives", flag: "🇲🇻", gdp: 6_600_000_000 },
  { name: "Montenegro", flag: "🇲🇪", gdp: 7_000_000_000 },
  { name: "Mongolia", flag: "🇲🇳", gdp: 17_000_000_000 },
  { name: "Iceland", flag: "🇮🇸", gdp: 28_000_000_000 },
  { name: "Jamaica", flag: "🇯🇲", gdp: 18_000_000_000 },
  { name: "Cyprus", flag: "🇨🇾", gdp: 32_000_000_000 },
  { name: "Croatia", flag: "🇭🇷", gdp: 71_000_000_000 },
  { name: "New Zealand", flag: "🇳🇿", gdp: 250_000_000_000 },
];

function getCountryBeaten(spent: number) {
  let best = null;
  for (const c of COUNTRY_GDPS) {
    if (spent >= c.gdp) best = c;
  }
  return best;
}

function getCountryNext(spent: number) {
  for (const c of COUNTRY_GDPS) {
    if (spent < c.gdp) return c;
  }
  return null;
}

interface ImpactItem {
  emoji: string;
  labelKey: string;
  descKey: string;
  count: number;
  descVars?: Record<string, string | number>;
  threshold: number;
}

function buildImpactItems(spent: number, netWorth: number): ImpactItem[] {
  const items: ImpactItem[] = [];

  const homes = Math.floor(spent / IMPACT_DATA.medianUSHomePrice);
  if (homes >= 1) {
    items.push({ emoji: "🏠", labelKey: "impact.homes", descKey: "impact.homesDesc", count: homes, threshold: IMPACT_DATA.medianUSHomePrice });
  }

  const salaryYears = Math.floor(spent / IMPACT_DATA.averageUSSalary);
  if (salaryYears >= 1) {
    items.push({ emoji: "👤", labelKey: "impact.salaryYears", descKey: "impact.salaryDesc", count: salaryYears, descVars: { n: Math.floor(salaryYears / 45) }, threshold: IMPACT_DATA.averageUSSalary });
  }

  const meals = Math.floor(spent / IMPACT_DATA.mealCost);
  if (meals >= 1000) {
    items.push({ emoji: "🍽️", labelKey: "impact.meals", descKey: "impact.mealsDesc", count: meals, descVars: { n: Math.floor(meals / (4 * 3 * 365)).toLocaleString() }, threshold: 3000 });
  }

  const wells = Math.floor(spent / IMPACT_DATA.cleanWaterWellCost);
  if (wells >= 1) {
    items.push({ emoji: "💧", labelKey: "impact.wells", descKey: "impact.wellsDesc", count: wells, descVars: { n: (wells * 500).toLocaleString() }, threshold: IMPACT_DATA.cleanWaterWellCost });
  }

  const schools = Math.floor(spent / IMPACT_DATA.schoolBuildCost);
  if (schools >= 1) {
    items.push({ emoji: "🏫", labelKey: "impact.schools", descKey: "impact.schoolsDesc", count: schools, descVars: { n: (schools * 300).toLocaleString() }, threshold: IMPACT_DATA.schoolBuildCost });
  }

  const vaccines = Math.floor(spent / IMPACT_DATA.vaccinePerChild);
  if (vaccines >= 100) {
    items.push({ emoji: "💉", labelKey: "impact.vaccines", descKey: "impact.vaccinesDesc", count: vaccines, threshold: 2000 });
  }

  const trees = Math.floor(spent / IMPACT_DATA.treePlantCost);
  if (trees >= 10000) {
    items.push({ emoji: "🌳", labelKey: "impact.trees", descKey: "impact.treesDesc", count: trees, descVars: { n: Math.floor(trees / 1000) }, threshold: 3000 });
  }

  const malariaNets = Math.floor(spent * IMPACT_DATA.malariaNetsPerDollar);
  if (malariaNets >= 100) {
    items.push({ emoji: "🦟", labelKey: "impact.nets", descKey: "impact.netsDesc", count: malariaNets, descVars: { n: malariaNets.toLocaleString() }, threshold: 250 });
  }

  const collegeYears = Math.floor(spent / IMPACT_DATA.collegeYearCost);
  if (collegeYears >= 4) {
    items.push({ emoji: "🎓", labelKey: "impact.scholarships", descKey: "impact.scholarshipsDesc", count: Math.floor(collegeYears / 4), threshold: IMPACT_DATA.collegeYearCost * 4 });
  }

  return items.filter((i) => spent >= i.threshold).slice(0, 5);
}

export function GuiltMeter() {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);
  const purchases = useCartStore((s) => s.purchases);
  const locale = useLocale((s) => s.locale);

  const countryBeaten = useMemo(() => getCountryBeaten(totalSpent), [totalSpent]);
  const countryNext = useMemo(() => getCountryNext(totalSpent), [totalSpent]);
  const impactItems = useMemo(() => buildImpactItems(totalSpent, netWorth), [totalSpent, netWorth]);

  if (!selectedBillionaire || purchases.length === 0) return null;

  const guiltLevel = Math.min(Math.floor(Math.log10(Math.max(totalSpent, 1)) * 1.5), 10);

  return (
    <div className="w-full space-y-4">
      <h2 className="section-label">
        {t("guilt.title", locale)}
      </h2>

      <p className="text-[10px] text-ash/30 italic font-mono">
        {t("guilt.couldHave", locale, { amount: formatCurrency(totalSpent, true) })}
      </p>

      {/* Impact items */}
      <div className="space-y-2">
        {impactItems.map((item, i) => (
          <motion.div
            key={item.labelKey}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-start gap-3 p-2.5 rounded-lg bg-surface/30 border border-line/8"
          >
            <span className="text-xl shrink-0">{item.emoji}</span>
            <div className="min-w-0">
              <div className="text-xs text-ash">
                {item.count.toLocaleString()} {t(item.labelKey, locale)}
              </div>
              <div className="text-[10px] text-ash/40 mt-0.5 font-mono">
                {t(item.descKey, locale, item.descVars)}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* GDP comparison */}
      {(countryBeaten || countryNext) && (
        <div className="pt-3 border-t border-line/10 space-y-1.5">
          {countryBeaten && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-ash/60">
              {countryBeaten.flag} {t("guilt.gdpBeaten", locale)}{" "}
              <span className="text-stone/70 font-medium">{countryBeaten.name}</span>
              {t("guilt.gdpBeatSuffix", locale)}
            </motion.div>
          )}
          {countryNext && (
            <div className="text-[10px] text-ash/30 font-mono">
              {countryNext.flag} {t("guilt.gdpNext", locale)}:{" "}
              <span className="text-ash/50">{countryNext.name}</span> —{" "}
              {formatCurrency(countryNext.gdp - totalSpent, true)} to go
            </div>
          )}
        </div>
      )}

      {/* Guilt-o-meter */}
      <div className="pt-3 border-t border-line/10">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-ash/30 uppercase tracking-wider font-mono">
            {t("guilt.guiltLevel", locale)}
          </span>
          <span className="text-[10px] text-ash/50">
            {guiltLevel >= 9
              ? t("guilt.beyondRedemption", locale)
              : guiltLevel >= 7
              ? t("guilt.devastating", locale)
              : guiltLevel >= 5
              ? t("guilt.uncomfortable", locale)
              : guiltLevel >= 3
              ? t("guilt.slightTwinge", locale)
              : t("guilt.innocent", locale)}
          </span>
        </div>
        <div className="flex gap-0.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.div
              key={i}
              className="flex-1 h-2 rounded-full"
              animate={{
                backgroundColor:
                  i < guiltLevel
                    ? i < 3 ? "rgba(125, 155, 138, 0.3)"
                    : i < 5 ? "rgba(251, 191, 36, 0.4)"
                    : i < 7 ? "rgba(249, 115, 22, 0.5)"
                    : "rgba(239, 68, 68, 0.6)"
                    : "rgba(36, 36, 41, 0.25)",
              }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
