"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth, selectRemaining } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

/**
 * FortuneWeather — a playful "financial weather forecast" that reflects
 * spending velocity and fortune status. Updates dynamically as the user
 * shops, providing an at-a-glance emotional gauge of their spending behavior.
 */

interface WeatherState {
  emoji: string;
  labelEn: string;
  labelZh: string;
  descEn: string;
  descZh: string;
  bg: string;
  severity: number;
}

function getWeather(spentPct: number, velocity: number, purchaseCount: number): WeatherState {
  // velocity = purchases in last 30 seconds
  if (spentPct >= 100) {
    return {
      emoji: "💀",
      labelEn: "Financial Extinction",
      labelZh: "财务毁灭",
      descEn: "The fortune has been completely obliterated",
      descZh: "财富已被完全毁灭",
      bg: "from-[#9B6B6B]/10 to-transparent",
      severity: 6,
    };
  }
  if (spentPct >= 75) {
    return {
      emoji: "🌪️",
      labelEn: "Category 5 Spending Storm",
      labelZh: "五级消费飓风",
      descEn: "Catastrophic wealth destruction in progress",
      descZh: "灾难性财富毁灭进行中",
      bg: "from-red-500/8 to-transparent",
      severity: 5,
    };
  }
  if (spentPct >= 50) {
    return {
      emoji: "⛈️",
      labelEn: "Financial Thunderstorm",
      labelZh: "金融雷暴",
      descEn: "Heavy spending with no signs of slowing",
      descZh: "大额消费，毫无减速迹象",
      bg: "from-amber-500/8 to-transparent",
      severity: 4,
    };
  }
  if (spentPct >= 25 || velocity >= 5) {
    return {
      emoji: "🌧️",
      labelEn: "Heavy Money Showers",
      labelZh: "倾盆金雨",
      descEn: "Sustained high-volume spending detected",
      descZh: "检测到持续大额消费",
      bg: "from-blue-500/6 to-transparent",
      severity: 3,
    };
  }
  if (spentPct >= 10 || velocity >= 3) {
    return {
      emoji: "🌥️",
      labelEn: "Overcast with Spending",
      labelZh: "消费多云",
      descEn: "Moderate outflow, fortune partially obscured",
      descZh: "中度支出，财富部分遮蔽",
      bg: "from-stone/6 to-transparent",
      severity: 2,
    };
  }
  if (spentPct >= 1 || purchaseCount >= 1) {
    return {
      emoji: "🌤️",
      labelEn: "Light Spending Breeze",
      labelZh: "轻微消费微风",
      descEn: "A gentle flow of expenditure",
      descZh: "消费轻微流动",
      bg: "from-emerald-500/5 to-transparent",
      severity: 1,
    };
  }
  return {
    emoji: "☀️",
    labelEn: "Clear Skies",
    labelZh: "晴空万里",
    descEn: "Fortune untouched — perfect financial weather",
    descZh: "财富完好无损——完美的财务天气",
    bg: "from-amber-400/5 to-transparent",
    severity: 0,
  };
}

function getAdvisory(weather: WeatherState, remainingFormatted: string, locale: "en" | "zh"): string {
  switch (weather.severity) {
    case 6:
      return locale === "zh" ? "建议：换一个亿万富翁" : "Advisory: Select a new billionaire";
    case 5:
      return locale === "zh" ? `⚠️ 仅剩 ${remainingFormatted}` : `⚠️ Only ${remainingFormatted} remaining`;
    case 4:
      return locale === "zh" ? "预报：即将破产" : "Forecast: Bankruptcy imminent";
    case 3:
      return locale === "zh" ? "提示：消费速率远超常人" : "Alert: Spending rate far exceeds normal";
    case 2:
      return locale === "zh" ? "状态：稳步消费中" : "Status: Steady outflow detected";
    case 1:
      return locale === "zh" ? "展望：还有很多可以花" : "Outlook: Plenty more to spend";
    default:
      return locale === "zh" ? "展望：无限可能" : "Outlook: Unlimited potential";
  }
}

export function FortuneWeather() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);
  const remaining = useCartStore(selectRemaining);
  const purchases = useCartStore((s) => s.purchases);
  const [velocity, setVelocity] = useState(0);

  // Calculate recent purchase velocity (purchases in last 30s)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const recent = purchases.filter((p) => now - p.timestamp < 30000).length;
      setVelocity(recent);
    }, 2000);
    return () => clearInterval(timer);
  }, [purchases]);

  const spentPct = netWorth > 0 ? (totalSpent / netWorth) * 100 : 0;
  const weather = useMemo(
    () => getWeather(spentPct, velocity, purchases.length),
    [spentPct, velocity, purchases.length]
  );

  const advisory = useMemo(
    () => getAdvisory(weather, formatCurrency(remaining, true), locale),
    [weather, remaining, locale]
  );

  if (!selectedBillionaire) return null;

  // Temperature = spending percentage mapped to a fun scale
  const temp = Math.min(Math.round(spentPct * 2), 200);

  return (
    <section className="card-panel overflow-hidden stagger-section">
      {/* Background gradient based on severity */}
      <div className={`p-5 sm:p-8 bg-gradient-to-r ${weather.bg}`}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">🌡️</span>
          <h2 className="text-xs uppercase tracking-[0.2em] text-stone/75 font-medium">
            {locale === "zh" ? "财富天气" : "Fortune Weather"}
          </h2>
          {velocity > 0 && (
            <span className="ml-auto px-2 py-0.5 rounded-full bg-champagne/10 border border-champagne/20 text-[9px] text-champagne/70 font-mono">
              {velocity} {locale === "zh" ? "笔/30秒" : "txn/30s"}
            </span>
          )}
        </div>

        {/* Main weather display */}
        <div className="flex items-center gap-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={weather.severity}
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="text-5xl sm:text-6xl shrink-0"
            >
              {weather.emoji}
            </motion.div>
          </AnimatePresence>

          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={weather.labelEn}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
              >
                <div className="text-base sm:text-lg font-serif text-sand/90 truncate">
                  {locale === "zh" ? weather.labelZh : weather.labelEn}
                </div>
                <div className="text-[11px] text-ash/55 mt-0.5">
                  {locale === "zh" ? weather.descZh : weather.descEn}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Temperature gauge */}
          <div className="text-right shrink-0">
            <div className="text-2xl font-serif text-sand/80 tabular-nums">
              {temp}°
            </div>
            <div className="text-[9px] text-ash/45 uppercase tracking-wider">
              {locale === "zh" ? "消费指数" : "Spend Index"}
            </div>
          </div>
        </div>

        {/* Advisory line */}
        <div className="mt-4 pt-3 border-t border-line/20">
          <p className="text-[10px] text-ash/50 font-mono tracking-wide">
            {advisory}
          </p>
        </div>
      </div>
    </section>
  );
}
