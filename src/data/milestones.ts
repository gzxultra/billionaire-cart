// ─── Spending Milestones ──────────────────────────────────────────
// Gamification: celebrate when users cross spending thresholds

export interface Milestone {
  id: string;
  /** Threshold as a fraction of net worth (0.0001 = 0.01%) */
  threshold: number;
  emoji: string;
  labelEn: string;
  labelZh: string;
  messageEn: string;
  messageZh: string;
  /** Show confetti burst for this milestone */
  confetti: boolean;
}

export const milestones: Milestone[] = [
  {
    id: "grain",
    threshold: 0.0001,
    emoji: "🌾",
    labelEn: "A Grain of Sand",
    labelZh: "九牛一毛",
    messageEn: "You've spent 0.01% — barely a rounding error",
    messageZh: "花了 0.01% — 连零头都不到",
    confetti: false,
  },
  {
    id: "pocket",
    threshold: 0.001,
    emoji: "🪙",
    labelEn: "Pocket Change",
    labelZh: "零花钱",
    messageEn: "0.1% gone — that's pocket change for a billionaire",
    messageZh: "花了 0.1% — 对亿万富翁来说不过是零花钱",
    confetti: false,
  },
  {
    id: "dent",
    threshold: 0.01,
    emoji: "🔨",
    labelEn: "Making a Dent",
    labelZh: "初见成效",
    messageEn: "1% spent — now we're getting somewhere!",
    messageZh: "花了 1% — 终于有点进展了！",
    confetti: false,
  },
  {
    id: "serious",
    threshold: 0.05,
    emoji: "🔥",
    labelEn: "Big Spender",
    labelZh: "大手笔",
    messageEn: "5% down — you're officially a big spender",
    messageZh: "花了 5% — 你已经是大手笔了",
    confetti: true,
  },
  {
    id: "tenth",
    threshold: 0.1,
    emoji: "💸",
    labelEn: "A Tenth Gone",
    labelZh: "十分之一",
    messageEn: "10% spent — the fortune is visibly shrinking",
    messageZh: "花了 10% — 财富在肉眼可见地缩水",
    confetti: true,
  },
  {
    id: "quarter",
    threshold: 0.25,
    emoji: "🎰",
    labelEn: "Quarter Depleted",
    labelZh: "四分之一",
    messageEn: "25% gone — a quarter of the fortune has vanished!",
    messageZh: "花了 25% — 四分之一的财富已经蒸发！",
    confetti: true,
  },
  {
    id: "half",
    threshold: 0.5,
    emoji: "⚡",
    labelEn: "Halfway There",
    labelZh: "过半了",
    messageEn: "50% — HALF the fortune is gone. Keep going!",
    messageZh: "50% — 一半的财富都花完了。继续！",
    confetti: true,
  },
  {
    id: "three-quarter",
    threshold: 0.75,
    emoji: "🌋",
    labelEn: "The Home Stretch",
    labelZh: "最后冲刺",
    messageEn: "75% spent — the end is in sight!",
    messageZh: "花了 75% — 终点就在眼前！",
    confetti: true,
  },
  {
    id: "ninety",
    threshold: 0.9,
    emoji: "💀",
    labelEn: "Nearly Bankrupt",
    labelZh: "濒临破产",
    messageEn: "90% gone — scraping the bottom of the vault",
    messageZh: "花了 90% — 金库都快见底了",
    confetti: true,
  },
  {
    id: "wipeout",
    threshold: 0.99,
    emoji: "☠️",
    labelEn: "Total Wipeout",
    labelZh: "倾家荡产",
    messageEn: "99% — there's almost nothing left!",
    messageZh: "99% — 已经几乎一无所有！",
    confetti: true,
  },
];

/**
 * Given old and new spending percentages, return milestones that were just crossed.
 */
export function checkMilestones(
  oldPercent: number,
  newPercent: number
): Milestone[] {
  return milestones.filter(
    (m) => oldPercent < m.threshold && newPercent >= m.threshold
  );
}
