"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";

interface ImpactComparison {
  emoji: string;
  label: string;
  description: string;
  threshold: number; // minimum spend to show
}

// Real-world impact comparisons with actual data
const IMPACT_DATA = {
  medianUSHomePrice: 420_000,
  averageUSSalary: 75_000,
  collegeYearCost: 26_000,
  avgCarPrice: 48_000,
  malariaNetsPerDollar: 1 / 2.50, // ~$2.50 per net
  cleanWaterWellCost: 8_000,
  schoolBuildCost: 50_000,
  mealCost: 3.00,
  treePlantCost: 0.30,
  vaccinePerChild: 20,
};

// GDP data (2024 IMF estimates, USD)
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

function getCountryBeaten(spent: number): { name: string; flag: string } | null {
  let best = null;
  for (const c of COUNTRY_GDPS) {
    if (spent >= c.gdp) best = c;
  }
  return best;
}

function getCountryNext(spent: number): { name: string; flag: string; gdp: number } | null {
  for (const c of COUNTRY_GDPS) {
    if (spent < c.gdp) return c;
  }
  return null;
}

function buildImpactItems(spent: number, netWorth: number): ImpactComparison[] {
  const items: ImpactComparison[] = [];

  // Human impact
  const homes = Math.floor(spent / IMPACT_DATA.medianUSHomePrice);
  if (homes >= 1) {
    items.push({
      emoji: "🏠",
      label: `${homes.toLocaleString()} median US homes`,
      description: "Could house an entire neighborhood",
      threshold: IMPACT_DATA.medianUSHomePrice,
    });
  }

  const salaryYears = Math.floor(spent / IMPACT_DATA.averageUSSalary);
  if (salaryYears >= 1) {
    items.push({
      emoji: "👤",
      label: `${salaryYears.toLocaleString()} years of average salary`,
      description: `${Math.floor(salaryYears / 45)} average lifetimes of work`,
      threshold: IMPACT_DATA.averageUSSalary,
    });
  }

  const meals = Math.floor(spent / IMPACT_DATA.mealCost);
  if (meals >= 1000) {
    items.push({
      emoji: "🍽️",
      label: `${meals.toLocaleString()} meals`,
      description: `Could feed a family of 4 for ${Math.floor(meals / (4 * 3 * 365)).toLocaleString()} years`,
      threshold: 3000,
    });
  }

  const wells = Math.floor(spent / IMPACT_DATA.cleanWaterWellCost);
  if (wells >= 1) {
    items.push({
      emoji: "💧",
      label: `${wells.toLocaleString()} clean water wells`,
      description: `Clean water for ~${(wells * 500).toLocaleString()} people`,
      threshold: IMPACT_DATA.cleanWaterWellCost,
    });
  }

  const schools = Math.floor(spent / IMPACT_DATA.schoolBuildCost);
  if (schools >= 1) {
    items.push({
      emoji: "🏫",
      label: `${schools.toLocaleString()} schools built`,
      description: `Educating ~${(schools * 300).toLocaleString()} students`,
      threshold: IMPACT_DATA.schoolBuildCost,
    });
  }

  const vaccines = Math.floor(spent / IMPACT_DATA.vaccinePerChild);
  if (vaccines >= 100) {
    items.push({
      emoji: "💉",
      label: `${vaccines.toLocaleString()} children vaccinated`,
      description: "Full immunization packages",
      threshold: 2000,
    });
  }

  const trees = Math.floor(spent / IMPACT_DATA.treePlantCost);
  if (trees >= 10000) {
    items.push({
      emoji: "🌳",
      label: `${trees.toLocaleString()} trees planted`,
      description: `~${Math.floor(trees / 1000)} acres of forest`,
      threshold: 3000,
    });
  }

  const malariaNets = Math.floor(spent * IMPACT_DATA.malariaNetsPerDollar);
  if (malariaNets >= 100) {
    items.push({
      emoji: "🦟",
      label: `${malariaNets.toLocaleString()} malaria bed nets`,
      description: `Protecting ~${malariaNets.toLocaleString()} families`,
      threshold: 250,
    });
  }

  const collegeYears = Math.floor(spent / IMPACT_DATA.collegeYearCost);
  if (collegeYears >= 4) {
    items.push({
      emoji: "🎓",
      label: `${Math.floor(collegeYears / 4).toLocaleString()} full college scholarships`,
      description: "4-year degree fully funded",
      threshold: IMPACT_DATA.collegeYearCost * 4,
    });
  }

  return items.filter((i) => spent >= i.threshold).slice(0, 5);
}

export function GuiltMeter() {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);
  const purchases = useCartStore((s) => s.purchases);

  const countryBeaten = useMemo(() => getCountryBeaten(totalSpent), [totalSpent]);
  const countryNext = useMemo(() => getCountryNext(totalSpent), [totalSpent]);
  const impactItems = useMemo(
    () => buildImpactItems(totalSpent, netWorth),
    [totalSpent, netWorth]
  );

  if (!selectedBillionaire || purchases.length === 0) return null;

  // "Guilt level" based on what you could've done instead
  const guiltLevel = Math.min(
    Math.floor(Math.log10(Math.max(totalSpent, 1)) * 1.5),
    10
  );

  return (
    <div className="w-full space-y-4">
      <h2 className="section-label">
        Real-World Impact
      </h2>

      <p className="text-[10px] text-white/20 italic">
        What {formatCurrency(totalSpent, true)} could have done instead…
      </p>

      {/* Impact items */}
      <div className="space-y-2">
        {impactItems.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-start gap-3 p-2.5 rounded-lg bg-surface/30 border border-line/8"
          >
            <span className="text-xl shrink-0">{item.emoji}</span>
            <div className="min-w-0">
              <div className="text-xs text-white/60">{item.label}</div>
              <div className="text-[10px] text-white/25 mt-0.5">
                {item.description}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* GDP comparison */}
      {(countryBeaten || countryNext) && (
        <div className="pt-3 border-t border-line/10 space-y-1.5">
          {countryBeaten && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[11px] text-white/40"
            >
              {countryBeaten.flag} You&apos;ve spent more than the entire GDP of{" "}
              <span className="text-accent/70 font-medium">
                {countryBeaten.name}
              </span>
            </motion.div>
          )}
          {countryNext && (
            <div className="text-[10px] text-white/20">
              {countryNext.flag} Next:{" "}
              <span className="text-white/30">{countryNext.name}</span> —{" "}
              {formatCurrency(countryNext.gdp - totalSpent, true)} to go
            </div>
          )}
        </div>
      )}

      {/* Guilt-o-meter */}
      <div className="pt-3 border-t border-line/10">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-white/20 uppercase tracking-wider">
            Guilt Level
          </span>
          <span className="text-[10px] text-white/30">
            {guiltLevel >= 9
              ? "😈 Beyond Redemption"
              : guiltLevel >= 7
              ? "🫣 Devastating"
              : guiltLevel >= 5
              ? "😬 Uncomfortable"
              : guiltLevel >= 3
              ? "😅 Slight Twinge"
              : "😇 Innocent"}
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
                    ? i < 3
                      ? "rgba(52, 211, 153, 0.3)"
                      : i < 5
                      ? "rgba(251, 191, 36, 0.4)"
                      : i < 7
                      ? "rgba(249, 115, 22, 0.5)"
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
