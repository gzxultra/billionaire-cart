"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";
import {
  useSalaryStore,
  toYourMoney,
  relatableItem,
  formatYourMoney,
} from "@/lib/use-salary";
import { formatCurrency } from "@/lib/format";

// ─── Salary presets for quick selection ──────────────────────────────
const SALARY_PRESETS = [
  { label: "$30K", labelZh: "3万", value: 30000 },
  { label: "$60K", labelZh: "6万", value: 60000 },
  { label: "$100K", labelZh: "10万", value: 100000 },
  { label: "$200K", labelZh: "20万", value: 200000 },
  { label: "$500K", labelZh: "50万", value: 500000 },
] as const;

// ─── Relatable comparisons for total spending ───────────────────────
function SpendingComparison({
  totalSpent,
  netWorth,
  salary,
}: {
  totalSpent: number;
  netWorth: number;
  salary: number;
}) {
  const locale = useLocale((s) => s.locale);
  const yourEquiv = toYourMoney(totalSpent, netWorth, salary);
  const item = relatableItem(yourEquiv, locale);

  if (totalSpent <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-4 rounded-xl bg-surface-bright/60 border border-line/30"
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-ash/50 mb-2">
        {locale === "zh" ? "你花的总额相当于" : "Your total spending equals"}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-3xl">{item?.emoji || "💸"}</div>
        <div>
          <div className="text-lg font-serif text-champagne tabular-nums">
            {formatYourMoney(yourEquiv)}
          </div>
          {item && (
            <div className="text-xs text-ash/60 mt-0.5">
              {locale === "zh"
                ? `≈ ${item.label}`
                : `≈ ${item.label}`}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Recent purchases in "your money" ───────────────────────────────
function RecentInYourMoney({
  salary,
  netWorth,
}: {
  salary: number;
  netWorth: number;
}) {
  const locale = useLocale((s) => s.locale);
  const purchases = useCartStore((s) => s.purchases);
  const recent = useMemo(
    () => [...purchases].reverse().slice(0, 5),
    [purchases]
  );

  if (recent.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <div className="text-[10px] uppercase tracking-[0.2em] text-ash/50">
        {locale === "zh" ? "最近购买" : "Recent Purchases"}
      </div>
      {recent.map((p) => {
        const yourPrice = toYourMoney(p.product.price, netWorth, salary);
        const item = relatableItem(yourPrice, locale);
        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between py-2 border-b border-line/20 last:border-0"
          >
            <div className="min-w-0 flex-1">
              <div className="text-xs text-sand/90 truncate">
                {p.product.title}
              </div>
              <div className="text-[10px] text-ash/50 font-mono">
                {formatCurrency(p.product.price)}
              </div>
            </div>
            <div className="text-right ml-3 shrink-0">
              <div className="text-xs font-serif text-champagne tabular-nums">
                {formatYourMoney(yourPrice)}
              </div>
              {item && (
                <div className="text-[9px] text-ash/45">
                  {item.emoji} {item.label}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Animated counter ───────────────────────────────────────────────
function AnimatedSalary({ target }: { target: number }) {
  const [display, setDisplay] = useState(target);
  const frameRef = useRef(0);

  useEffect(() => {
    const duration = 600;
    const start = display;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (target - start) * eased));
      if (p < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return <span className="tabular-nums">${display.toLocaleString()}</span>;
}

// ─── Main Component ─────────────────────────────────────────────────
export function WealthRelativity() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);

  const { salary, enabled, setSalary, setEnabled } = useSalaryStore();
  const [inputValue, setInputValue] = useState(salary.toString());
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // The billionaire-to-you ratio
  const ratio = useMemo(() => {
    if (!selectedBillionaire || salary <= 0) return 0;
    const yourNetWorth = salary * 10;
    return selectedBillionaire.netWorthB * 1_000_000_000 / yourNetWorth;
  }, [selectedBillionaire, salary]);

  const handleSalarySubmit = useCallback(() => {
    const parsed = parseInt(inputValue.replace(/[^0-9]/g, ""), 10);
    if (parsed > 0) {
      setSalary(parsed);
      setEnabled(true);
    }
    setIsEditing(false);
  }, [inputValue, setSalary, setEnabled]);

  if (!selectedBillionaire) return null;

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🪞</span>
          <h2 className="text-xs uppercase tracking-[0.2em] text-stone/75 font-medium">
            {locale === "zh" ? "财富相对论" : "Wealth Relativity"}
          </h2>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border ${
            enabled
              ? "bg-champagne/10 text-champagne border-champagne/30"
              : "bg-surface-bright/80 text-ash/60 border-line/30 hover:border-stone/30"
          }`}
        >
          {enabled
            ? locale === "zh"
              ? "✨ 已开启"
              : "✨ Active"
            : locale === "zh"
            ? "开启"
            : "Enable"}
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-ash/60 mb-4 leading-relaxed">
        {locale === "zh"
          ? `输入你的年薪，看看${selectedBillionaire.name.split(" ")[0]}花钱对你来说意味着什么。`
          : `Enter your salary to see what ${selectedBillionaire.name.split(" ")[0]}'s spending means in your money.`}
      </p>

      {/* Salary Input */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="text-[10px] uppercase tracking-wider text-ash/50 shrink-0">
            {locale === "zh" ? "你的年薪" : "Your Salary"}
          </div>
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={handleSalarySubmit}
                onKeyDown={(e) => e.key === "Enter" && handleSalarySubmit()}
                className="flex-1 px-3 py-1.5 rounded-lg bg-surface-bright/80 border border-stone/30 text-sm text-sand font-mono focus:outline-none focus:ring-1 focus:ring-champagne/40"
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={() => {
                setIsEditing(true);
                setInputValue(salary.toString());
              }}
              className="px-3 py-1.5 rounded-lg bg-surface-bright/80 border border-line/30 hover:border-stone/30 transition-all text-sm font-serif text-champagne"
            >
              <AnimatedSalary target={salary} />
              <span className="text-ash/40 text-[10px] ml-1.5">/yr</span>
            </button>
          )}
        </div>

        {/* Quick presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {SALARY_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => {
                setSalary(p.value);
                setEnabled(true);
                setInputValue(p.value.toString());
              }}
              className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all border ${
                salary === p.value && enabled
                  ? "bg-stone/15 text-stone border-stone/30"
                  : "bg-surface-bright/60 text-ash/55 border-transparent hover:border-line/30"
              }`}
            >
              {locale === "zh" ? `$${p.labelZh}` : p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results — visible when enabled */}
      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Ratio display */}
            <div className="mt-5 p-4 rounded-xl bg-gradient-to-br from-surface-bright/40 to-transparent border border-line/20">
              <div className="text-[10px] uppercase tracking-[0.2em] text-ash/50 mb-2">
                {locale === "zh" ? "财富倍数" : "Wealth Multiplier"}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-serif text-champagne tabular-nums">
                  {ratio >= 1_000_000
                    ? `${(ratio / 1_000_000).toFixed(1)}M`
                    : ratio >= 1000
                    ? `${(ratio / 1000).toFixed(0)}K`
                    : ratio.toFixed(0)}×
                </span>
                <span className="text-xs text-ash/55">
                  {locale === "zh"
                    ? `${selectedBillionaire.name} 比你富`
                    : `richer than you`}
                </span>
              </div>
              <div className="text-[10px] text-ash/40 mt-1 font-mono">
                {locale === "zh"
                  ? `他的 $1 ≈ 你的 ${formatYourMoney(1 / ratio)}`
                  : `Their $1 ≈ Your ${formatYourMoney(1 / ratio)}`}
              </div>
            </div>

            {/* Key comparisons */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                {
                  price: 1000,
                  labelEn: "$1,000 purchase",
                  labelZh: "花 $1,000",
                },
                {
                  price: 1_000_000,
                  labelEn: "$1M purchase",
                  labelZh: "花 $1M",
                },
                {
                  price: 1_000_000_000,
                  labelEn: "$1B purchase",
                  labelZh: "花 $1B",
                },
                {
                  price: selectedBillionaire.netWorthB * 1_000_000_000 * 0.01,
                  labelEn: "1% of fortune",
                  labelZh: "花掉 1% 财富",
                },
              ].map(({ price, labelEn, labelZh }) => {
                const yourPrice = toYourMoney(
                  price,
                  netWorth,
                  salary
                );
                const item = relatableItem(yourPrice, locale);
                return (
                  <div
                    key={labelEn}
                    className="p-3 rounded-xl bg-surface-bright/40 border border-line/15"
                  >
                    <div className="text-[9px] text-ash/45 uppercase tracking-wider mb-1">
                      {locale === "zh" ? labelZh : labelEn}
                    </div>
                    <div className="text-sm font-serif text-champagne tabular-nums">
                      {formatYourMoney(yourPrice)}
                    </div>
                    {item && (
                      <div className="text-[9px] text-ash/40 mt-0.5">
                        {item.emoji} {item.label}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total spending comparison */}
            <SpendingComparison
              totalSpent={totalSpent}
              netWorth={netWorth}
              salary={salary}
            />

            {/* Recent purchases in your money */}
            <RecentInYourMoney salary={salary} netWorth={netWorth} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
