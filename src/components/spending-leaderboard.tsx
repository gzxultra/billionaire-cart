"use client";

import { useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";

/**
 * SpendingLeaderboard — fake global leaderboard showing "top spenders" with
 * the user's current position highlighted. Creates competitive motivation.
 * Names and amounts are randomly generated but consistent per session.
 */

interface LeaderboardEntry {
  rank: number;
  name: string;
  amount: number;
  country: string;
  flag: string;
  isUser: boolean;
}

const FAKE_NAMES = [
  { name: "Prince Al-Waleed", country: "Saudi Arabia", flag: "🇸🇦" },
  { name: "Lady Victoria R.", country: "United Kingdom", flag: "🇬🇧" },
  { name: "Tanaka Hiroshi", country: "Japan", flag: "🇯🇵" },
  { name: "Carlos M.", country: "Mexico", flag: "🇲🇽" },
  { name: "Dmitri K.", country: "Russia", flag: "🇷🇺" },
  { name: "Sophie L.", country: "France", flag: "🇫🇷" },
  { name: "Chen Wei", country: "China", flag: "🇨🇳" },
  { name: "Oluwaseun A.", country: "Nigeria", flag: "🇳🇬" },
  { name: "Kim Soo-yeon", country: "South Korea", flag: "🇰🇷" },
  { name: "Marco B.", country: "Italy", flag: "🇮🇹" },
  { name: "Priya S.", country: "India", flag: "🇮🇳" },
  { name: "Hans W.", country: "Germany", flag: "🇩🇪" },
  { name: "Isabella F.", country: "Brazil", flag: "🇧🇷" },
  { name: "Ahmed H.", country: "UAE", flag: "🇦🇪" },
  { name: "Anastasia V.", country: "Switzerland", flag: "🇨🇭" },
  { name: "Kwame O.", country: "Ghana", flag: "🇬🇭" },
  { name: "Liam O.", country: "Ireland", flag: "🇮🇪" },
  { name: "Fatima Z.", country: "Morocco", flag: "🇲🇦" },
  { name: "Johan S.", country: "Sweden", flag: "🇸🇪" },
];

// Seeded random for consistent leaderboard per session
function seededRandom(seed: number) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateFakeEntries(netWorth: number, seed: number): Omit<LeaderboardEntry, "rank">[] {
  const entries: Omit<LeaderboardEntry, "rank">[] = [];
  const shuffled = [...FAKE_NAMES].sort(() => seededRandom(seed++) - 0.5);

  // Generate 12 fake spenders with varying amounts
  const count = Math.min(12, shuffled.length);
  for (let i = 0; i < count; i++) {
    const person = shuffled[i];
    // Spend between 1% and 95% of net worth, biased toward middle
    const spendPct = 0.01 + seededRandom(seed + i * 7) * 0.94;
    entries.push({
      name: person.name,
      amount: Math.floor(netWorth * spendPct),
      country: person.country,
      flag: person.flag,
      isUser: false,
    });
  }

  return entries.sort((a, b) => b.amount - a.amount);
}

export function SpendingLeaderboard() {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);
  const purchases = useCartStore((s) => s.purchases);
  const locale = useLocale((s) => s.locale);
  const [expanded, setExpanded] = useState(false);
  const seedRef = useRef(Date.now());

  // Fake entries — stable per session, only regenerated on billionaire change
  const fakeEntries = useMemo(() => {
    if (!selectedBillionaire || netWorth <= 0) return [];
    return generateFakeEntries(netWorth, seedRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBillionaire?.id, netWorth]);

  // Merge user into leaderboard
  const leaderboard = useMemo(() => {
    if (!selectedBillionaire) return [];
    const userEntry: Omit<LeaderboardEntry, "rank"> = {
      name: locale === "zh" ? "你" : "You",
      amount: totalSpent,
      country: "",
      flag: "⭐",
      isUser: true,
    };
    const all = [...fakeEntries, userEntry]
      .sort((a, b) => b.amount - a.amount)
      .map((e, i) => ({ ...e, rank: i + 1 }));
    return all;
  }, [selectedBillionaire, totalSpent, fakeEntries, locale]);

  const userRank = leaderboard.find((e) => e.isUser)?.rank ?? 0;
  const totalPlayers = leaderboard.length;

  // Display: top 3 + entries near user
  const displayEntries = useMemo(() => {
    if (!expanded) {
      const top3 = leaderboard.slice(0, 3);
      const userIdx = leaderboard.findIndex((e) => e.isUser);
      if (userIdx <= 2) return top3.slice(0, 5);
      // Show top 3 + separator + user context
      const nearUser = leaderboard.slice(
        Math.max(3, userIdx - 1),
        Math.min(leaderboard.length, userIdx + 2)
      );
      return [...top3, null, ...nearUser]; // null = separator
    }
    return leaderboard;
  }, [leaderboard, expanded]);

  // Only show after first purchase
  if (!selectedBillionaire || purchases.length === 0) return null;

  const rankEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🏆</span>
          <h2 className="text-xs uppercase tracking-[0.2em] text-stone/75 font-medium">
            {locale === "zh" ? "消费排行榜" : "Spending Leaderboard"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-ash/50 font-mono">
            {locale === "zh" ? `${totalPlayers} 名玩家` : `${totalPlayers} players`}
          </span>
        </div>
      </div>

      {/* User rank highlight */}
      <motion.div
        key={userRank}
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="mb-4 p-3 rounded-xl bg-champagne/[0.06] border border-champagne/15"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{rankEmoji(userRank)}</span>
            <div>
              <div className="text-xs text-sand font-medium">
                {locale === "zh" ? "你的排名" : "Your Rank"}
              </div>
              <div className="text-[10px] text-ash/60">
                {locale === "zh"
                  ? `超过了 ${Math.max(0, Math.round(((totalPlayers - userRank) / (totalPlayers - 1)) * 100))}% 的玩家`
                  : `Top ${Math.max(1, Math.round((userRank / totalPlayers) * 100))}% of all players`}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-serif text-champagne tabular-nums">
              {formatCurrency(totalSpent, totalSpent >= 1_000_000)}
            </div>
            <div className="text-[9px] text-ash/50 font-mono">
              {locale === "zh" ? "已消费" : "spent"}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Leaderboard entries */}
      <div className="space-y-0.5">
        <AnimatePresence mode="popLayout">
          {displayEntries.map((entry, i) => {
            if (entry === null) {
              return (
                <div key={`sep-${i}`} className="flex items-center gap-2 py-1.5 px-2">
                  <span className="text-[9px] text-ash/30 font-mono">• • •</span>
                </div>
              );
            }
            return (
              <motion.div
                key={entry.isUser ? "user" : entry.name}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors ${
                  entry.isUser
                    ? "bg-stone/[0.08] border border-stone/15"
                    : "hover:bg-surface-dim/30"
                }`}
              >
                <span className="text-xs w-8 text-center shrink-0 tabular-nums font-mono text-ash/60">
                  {rankEmoji(entry.rank)}
                </span>
                <span className="text-sm shrink-0">{entry.flag}</span>
                <span
                  className={`text-[11px] flex-1 truncate ${
                    entry.isUser ? "text-champagne font-semibold" : "text-sand/80"
                  }`}
                >
                  {entry.name}
                </span>
                <span className="text-[11px] font-serif text-stone/70 tabular-nums shrink-0">
                  {formatCurrency(entry.amount, entry.amount >= 1_000_000)}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Expand/collapse */}
      {leaderboard.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full text-center text-[10px] text-ash/50 hover:text-stone/70 transition-colors font-mono uppercase tracking-wider"
        >
          {expanded
            ? locale === "zh" ? "收起" : "Show Less"
            : locale === "zh" ? "查看完整排行" : "View Full Leaderboard"}
        </button>
      )}
    </section>
  );
}
