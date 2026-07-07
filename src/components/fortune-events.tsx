"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectNetWorth, selectTotalSpent } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";
import { formatCurrency } from "@/lib/format";

// ─── Fortune Event types ────────────────────────────────────────────
interface FortuneEvent {
  id: string;
  emoji: string;
  titleEn: string;
  titleZh: string;
  descEn: string;
  descZh: string;
  /** Multiplier to net worth change (positive = gain, negative = loss) */
  impactPct: number;
  type: "gain" | "loss" | "neutral";
  rarity: "common" | "rare" | "legendary";
}

const FORTUNE_EVENTS: FortuneEvent[] = [
  // Gains
  {
    id: "stock-surge",
    emoji: "📈",
    titleEn: "Stock Surge!",
    titleZh: "股价暴涨！",
    descEn: "Your primary stock jumped 8% after hours",
    descZh: "你的主要股票盘后大涨 8%",
    impactPct: 0.08,
    type: "gain",
    rarity: "common",
  },
  {
    id: "acquisition-news",
    emoji: "🤝",
    titleEn: "Acquisition Rumor",
    titleZh: "收购传闻",
    descEn: "Analysts say your company might acquire a hot startup. Stock up 3%.",
    descZh: "分析师称你的公司可能收购一家热门创业公司，股价涨 3%",
    impactPct: 0.03,
    type: "gain",
    rarity: "common",
  },
  {
    id: "art-appreciation",
    emoji: "🎨",
    titleEn: "Art Appreciation",
    titleZh: "艺术品升值",
    descEn: "That Basquiat you forgot about just sold for 5× what you paid",
    descZh: "你忘了的那幅巴斯奎特刚以5倍价格成交",
    impactPct: 0.01,
    type: "gain",
    rarity: "rare",
  },
  {
    id: "crypto-pump",
    emoji: "₿",
    titleEn: "Crypto Moon!",
    titleZh: "加密货币暴涨！",
    descEn: "Your forgotten crypto wallet just 10×'d overnight",
    descZh: "你遗忘的加密钱包一夜涨了10倍",
    impactPct: 0.02,
    type: "gain",
    rarity: "rare",
  },
  {
    id: "dividend-season",
    emoji: "💰",
    titleEn: "Dividend Season",
    titleZh: "分红季",
    descEn: "Your holdings just paid out $500M in dividends",
    descZh: "你的持股刚派发了5亿美元股息",
    impactPct: 0.005,
    type: "gain",
    rarity: "common",
  },
  {
    id: "found-yacht",
    emoji: "🛥️",
    titleEn: "Surprise Yacht!",
    titleZh: "意外发现游艇！",
    descEn: "You forgot you owned a $200M yacht. Found it in Monaco.",
    descZh: "你忘了自己有一艘2亿美元的游艇，在摩纳哥找到了",
    impactPct: 0.002,
    type: "gain",
    rarity: "legendary",
  },

  // Losses
  {
    id: "market-dip",
    emoji: "📉",
    titleEn: "Market Dip",
    titleZh: "市场回调",
    descEn: "Broad market selloff dragged your portfolio down 5%",
    descZh: "大盘抛售拖累你的投资组合下跌 5%",
    impactPct: -0.05,
    type: "loss",
    rarity: "common",
  },
  {
    id: "lawsuit",
    emoji: "⚖️",
    titleEn: "Lawsuit Filed!",
    titleZh: "被起诉了！",
    descEn: "Class action lawsuit announced. Shares dip 3%.",
    descZh: "集体诉讼公告，股价下跌 3%",
    impactPct: -0.03,
    type: "loss",
    rarity: "common",
  },
  {
    id: "regulation",
    emoji: "🏛️",
    titleEn: "New Regulation",
    titleZh: "新监管政策",
    descEn: "Government announces new rules targeting your sector",
    descZh: "政府宣布针对你所在行业的新规",
    impactPct: -0.04,
    type: "loss",
    rarity: "common",
  },
  {
    id: "yacht-sank",
    emoji: "🌊",
    titleEn: "Yacht Emergency!",
    titleZh: "游艇事故！",
    descEn: "Your superyacht hit something near Sardinia. -$150M in repairs.",
    descZh: "你的超级游艇在撒丁岛附近撞了东西，修理费1.5亿",
    impactPct: -0.002,
    type: "loss",
    rarity: "rare",
  },
  {
    id: "ceo-tweet",
    emoji: "🐦",
    titleEn: "CEO Tweeted Again",
    titleZh: "CEO 又发推了",
    descEn: "Your controversial tweet just wiped 2% off the stock",
    descZh: "你的争议推文让股价跌了 2%",
    impactPct: -0.02,
    type: "loss",
    rarity: "rare",
  },
  {
    id: "tax-bill",
    emoji: "🧾",
    titleEn: "Tax Season",
    titleZh: "税季来了",
    descEn: "IRS says you owe $2.1B. Your accountant is having a bad day.",
    descZh: "国税局说你欠21亿，你的会计今天不太好",
    impactPct: -0.015,
    type: "loss",
    rarity: "common",
  },

  // Neutral / fun
  {
    id: "paparazzi",
    emoji: "📸",
    titleEn: "Paparazzi Spotted You",
    titleZh: "被狗仔拍到了",
    descEn: "TMZ has photos of you buying groceries. Stock unchanged.",
    descZh: "TMZ 拍到你去超市买菜，股价没变",
    impactPct: 0,
    type: "neutral",
    rarity: "common",
  },
  {
    id: "space-launch",
    emoji: "🚀",
    titleEn: "Successful Launch!",
    titleZh: "发射成功！",
    descEn: "Your rocket company just nailed another landing. Investors love it.",
    descZh: "你的火箭公司又成功着陆了，投资者很高兴",
    impactPct: 0.06,
    type: "gain",
    rarity: "legendary",
  },
];

// Pick a weighted random event (rares less likely)
function pickEvent(usedIds: Set<string>): FortuneEvent {
  const available = FORTUNE_EVENTS.filter((e) => !usedIds.has(e.id));
  const pool = available.length > 0 ? available : FORTUNE_EVENTS;

  const weighted = pool.flatMap((e) => {
    const copies =
      e.rarity === "common" ? 4 : e.rarity === "rare" ? 2 : 1;
    return Array(copies).fill(e) as FortuneEvent[];
  });
  return weighted[Math.floor(Math.random() * weighted.length)];
}

// ─── Event Card ─────────────────────────────────────────────────────
function EventCard({
  event,
  netWorth,
  onDismiss,
}: {
  event: FortuneEvent;
  netWorth: number;
  onDismiss: () => void;
}) {
  const locale = useLocale((s) => s.locale);
  const impactUsd = Math.abs(event.impactPct * netWorth);

  const borderColor =
    event.type === "gain"
      ? "border-sage/40"
      : event.type === "loss"
      ? "border-[#9B6B6B]/40"
      : "border-stone/30";

  const bgColor =
    event.type === "gain"
      ? "from-sage/[0.05]"
      : event.type === "loss"
      ? "from-[#9B6B6B]/[0.05]"
      : "from-stone/[0.03]";

  const impactColor =
    event.type === "gain"
      ? "text-sage"
      : event.type === "loss"
      ? "text-[#9B6B6B]"
      : "text-ash/50";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`p-4 rounded-xl border ${borderColor} bg-gradient-to-br ${bgColor} to-transparent backdrop-blur-sm cursor-pointer`}
      onClick={onDismiss}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl shrink-0 mt-0.5">{event.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-sand">
              {locale === "zh" ? event.titleZh : event.titleEn}
            </h3>
            {event.rarity === "legendary" && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-champagne/15 text-champagne border border-champagne/25 uppercase tracking-wider font-medium">
                {locale === "zh" ? "传说" : "Legendary"}
              </span>
            )}
          </div>
          <p className="text-[11px] text-ash/60 leading-relaxed">
            {locale === "zh" ? event.descZh : event.descEn}
          </p>
          {event.impactPct !== 0 && (
            <div className={`mt-2 text-xs font-serif font-medium ${impactColor} tabular-nums`}>
              {event.type === "gain" ? "+" : "−"}
              {formatCurrency(impactUsd, true)}
              <span className="text-[10px] text-ash/40 ml-1.5">
                ({event.type === "gain" ? "+" : ""}
                {(event.impactPct * 100).toFixed(1)}%)
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="text-[9px] text-ash/35 text-right mt-2 font-mono">
        {locale === "zh" ? "点击关闭" : "tap to dismiss"}
      </div>
    </motion.div>
  );
}

// ─── Event History Log ──────────────────────────────────────────────
interface EventRecord {
  event: FortuneEvent;
  timestamp: number;
}

function EventLog({ events }: { events: EventRecord[] }) {
  const locale = useLocale((s) => s.locale);
  if (events.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      <div className="text-[9px] uppercase tracking-wider text-ash/40 flex items-center gap-1.5">
        <span>📜</span>
        {locale === "zh" ? "事件记录" : "Event Log"}
      </div>
      {events.slice(0, 8).map((record, i) => (
        <div
          key={`${record.event.id}-${i}`}
          className="flex items-center gap-2 text-[10px] py-1 border-b border-line/10 last:border-0"
        >
          <span>{record.event.emoji}</span>
          <span className="text-ash/55 flex-1 truncate">
            {locale === "zh" ? record.event.titleZh : record.event.titleEn}
          </span>
          <span
            className={`font-mono tabular-nums ${
              record.event.type === "gain"
                ? "text-sage/70"
                : record.event.type === "loss"
                ? "text-[#9B6B6B]/70"
                : "text-ash/40"
            }`}
          >
            {record.event.impactPct !== 0
              ? `${record.event.type === "gain" ? "+" : ""}${(
                  record.event.impactPct * 100
                ).toFixed(1)}%`
              : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export function FortuneEvents() {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const netWorth = useCartStore(selectNetWorth);
  const totalSpent = useCartStore(selectTotalSpent);
  const locale = useLocale((s) => s.locale);

  const [activeEvent, setActiveEvent] = useState<FortuneEvent | null>(null);
  const [eventLog, setEventLog] = useState<EventRecord[]>([]);
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [eventsEnabled, setEventsEnabled] = useState(true);
  const [totalImpactPct, setTotalImpactPct] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trigger events periodically (40-80 seconds)
  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay = 40000 + Math.random() * 40000; // 40-80s
    timerRef.current = setTimeout(() => {
      if (!eventsEnabled) return;
      const event = pickEvent(usedIds);
      setActiveEvent(event);
      setUsedIds((prev) => new Set(prev).add(event.id));
      setEventLog((prev) => [{ event, timestamp: Date.now() }, ...prev].slice(0, 20));
      setTotalImpactPct((prev) => prev + event.impactPct);
    }, delay);
  }, [eventsEnabled, usedIds]);

  // Start scheduling when billionaire selected & has some spending
  useEffect(() => {
    if (selectedBillionaire && totalSpent > 0 && eventsEnabled) {
      scheduleNext();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [selectedBillionaire, totalSpent, eventsEnabled, scheduleNext]);

  // Dismiss and schedule next
  const handleDismiss = useCallback(() => {
    setActiveEvent(null);
    if (eventsEnabled) scheduleNext();
  }, [eventsEnabled, scheduleNext]);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!activeEvent) return;
    const t = setTimeout(handleDismiss, 8000);
    return () => clearTimeout(t);
  }, [activeEvent, handleDismiss]);

  if (!selectedBillionaire || totalSpent <= 0) return null;

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">⚡</span>
          <h2 className="text-xs uppercase tracking-[0.2em] text-stone/75 font-medium">
            {locale === "zh" ? "财富风云" : "Fortune Events"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {totalImpactPct !== 0 && (
            <span
              className={`text-[10px] font-mono tabular-nums ${
                totalImpactPct > 0 ? "text-sage/70" : "text-[#9B6B6B]/70"
              }`}
            >
              {totalImpactPct > 0 ? "+" : ""}
              {(totalImpactPct * 100).toFixed(1)}%
            </span>
          )}
          <button
            onClick={() => setEventsEnabled(!eventsEnabled)}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all border ${
              eventsEnabled
                ? "bg-champagne/10 text-champagne/80 border-champagne/25"
                : "bg-surface-bright/60 text-ash/50 border-line/30"
            }`}
          >
            {eventsEnabled
              ? locale === "zh"
                ? "实时"
                : "Live"
              : locale === "zh"
              ? "暂停"
              : "Paused"}
          </button>
        </div>
      </div>

      {/* Active event card */}
      <AnimatePresence mode="wait">
        {activeEvent && (
          <EventCard
            event={activeEvent}
            netWorth={netWorth}
            onDismiss={handleDismiss}
          />
        )}
      </AnimatePresence>

      {/* Waiting state */}
      {!activeEvent && eventsEnabled && (
        <div className="py-6 text-center">
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-[10px] text-ash/40 uppercase tracking-wider font-mono"
          >
            {locale === "zh"
              ? "⏳ 等待下一个财富事件..."
              : "⏳ Waiting for next fortune event..."}
          </motion.div>
        </div>
      )}

      {/* Event log */}
      <EventLog events={eventLog} />
    </section>
  );
}
