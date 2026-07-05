// ─── Bulk Purchase Fun Facts ──────────────────────────────────────
// Contextual comparisons shown when buying items in bulk (qty ≥ 10).
// Adds personality to the shopping spree with scale-appropriate humor.

import type { Locale } from "./i18n";

interface FunFact {
  en: string;
  zh: string;
}

// ─── Quantity-based facts ─────────────────────────────────────────
const qtyFacts: { min: number; facts: FunFact[] }[] = [
  {
    min: 10,
    facts: [
      { en: "Enough for a dinner party 🍽️", zh: "够办一桌酒席了 🍽️" },
      { en: "A small squad's worth", zh: "够装备一个小队了" },
      { en: "That's a nice round number", zh: "凑个整挺好" },
    ],
  },
  {
    min: 50,
    facts: [
      { en: "One for every state 🇺🇸", zh: "美国每个州一个 🇺🇸" },
      { en: "A classroom full", zh: "够一个班级分了" },
      { en: "The start of a collection 🏛️", zh: "收藏家起步了 🏛️" },
    ],
  },
  {
    min: 100,
    facts: [
      { en: "A fleet. A hoard. A legend. 🏆", zh: "已成舰队规模 🏆" },
      { en: "One for every seat in a lecture hall", zh: "大教室人手一个" },
      { en: "Triple digits of chaos", zh: "三位数的任性" },
    ],
  },
  {
    min: 500,
    facts: [
      { en: "A warehouse wouldn't hold them all 📦", zh: "一个仓库都放不下 📦" },
      { en: "Half a thousand. Respect.", zh: "五百个。致敬。" },
    ],
  },
  {
    min: 1000,
    facts: [
      { en: "A small town's supply 🏘️", zh: "够一个小镇用了 🏘️" },
      { en: "Officially hoarding", zh: "正式进入囤货模式" },
      { en: "Four digits. No regrets.", zh: "四位数，零后悔。" },
    ],
  },
  {
    min: 10000,
    facts: [
      { en: "A stadium full of these 🏟️", zh: "能填满一个体育场 🏟️" },
      { en: "Supply chain is sweating", zh: "供应链在颤抖" },
    ],
  },
  {
    min: 100000,
    facts: [
      { en: "This is economic warfare 💣", zh: "这是经济战争 💣" },
      { en: "You might crash the market", zh: "市场可能要崩了" },
    ],
  },
];

// ─── Price-based facts (total spend) ──────────────────────────────
const priceFacts: { min: number; facts: FunFact[] }[] = [
  {
    min: 1_000,
    facts: [
      { en: "That's a month of rent in Kansas", zh: "够付堪萨斯一个月房租" },
      { en: "167 cups of Starbucks ☕", zh: "相当于167杯星巴克 ☕" },
    ],
  },
  {
    min: 10_000,
    facts: [
      { en: "A semester of state college 🎓", zh: "够交一学期公立大学学费 🎓" },
      { en: "A decent used car 🚗", zh: "能买一辆不错的二手车 🚗" },
    ],
  },
  {
    min: 100_000,
    facts: [
      { en: "A house in the Midwest 🏠", zh: "够在中西部买套房 🏠" },
      { en: "2 years of median US salary", zh: "相当于美国人两年工资" },
    ],
  },
  {
    min: 1_000_000,
    facts: [
      { en: "A Manhattan studio apartment 🗽", zh: "能在曼哈顿买个单间 🗽" },
      { en: "20 Teslas. Or 1 nice yacht.", zh: "20辆特斯拉，或1艘游艇。" },
      { en: "Lifetime earnings for most people", zh: "大多数人一辈子的收入" },
    ],
  },
  {
    min: 10_000_000,
    facts: [
      { en: "A private island 🏝️", zh: "能买座私人岛屿 🏝️" },
      { en: "A small neighborhood of mansions", zh: "够买一个小豪宅社区" },
    ],
  },
  {
    min: 100_000_000,
    facts: [
      { en: "A professional sports team 🏀", zh: "能买支职业球队 🏀" },
      { en: "Fund a Mars mission 🚀", zh: "够资助一次火星任务 🚀" },
    ],
  },
  {
    min: 1_000_000_000,
    facts: [
      { en: "Bigger than the GDP of some countries 🌍", zh: "超过了一些国家的GDP 🌍" },
      { en: "Approaching Bond villain territory 🦹", zh: "邦德反派级别的挥霍 🦹" },
    ],
  },
  {
    min: 10_000_000_000,
    facts: [
      { en: "You just built a Death Star 🌑", zh: "你刚造了一座死星 🌑" },
      { en: "Reshaping the global economy", zh: "全球经济在重塑" },
    ],
  },
];

// Simple pseudo-random pick based on qty + price (deterministic per combo)
function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

/**
 * Generate a fun-fact string for a bulk purchase.
 * Returns null for qty < 10 (not bulk enough to be interesting).
 */
export function getBulkPurchaseFact(
  itemName: string,
  qty: number,
  totalPrice: number,
  locale: Locale
): string | null {
  if (qty < 10) return null;

  const seed = itemName.length * 7 + qty * 13 + Math.round(totalPrice / 100);

  // Find the highest matching tier for qty and price
  const qtyTier = [...qtyFacts].reverse().find((t) => qty >= t.min);
  const priceTier = [...priceFacts].reverse().find((t) => totalPrice >= t.min);

  // Prefer price fact for expensive totals, qty fact otherwise
  // Mix it up by alternating based on seed
  const usePriceFact = priceTier && (seed % 3 !== 0 || !qtyTier);
  const useQtyFact = qtyTier && !usePriceFact;

  if (usePriceFact && priceTier) {
    const fact = pick(priceTier.facts, seed);
    return fact[locale] || fact.en;
  }

  if (useQtyFact && qtyTier) {
    const fact = pick(qtyTier.facts, seed);
    return fact[locale] || fact.en;
  }

  return null;
}
