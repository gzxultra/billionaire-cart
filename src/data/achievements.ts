import { Achievement, Purchase, AssetClass } from "@/lib/types";

function countByClass(purchases: Purchase[], cls: AssetClass): number {
  return purchases.filter((p) => p.product.assetClass === cls).length;
}

function totalSpent(purchases: Purchase[]): number {
  return purchases.reduce((s, p) => s + p.product.price, 0);
}

// Achievement definitions — checkFn determines unlock condition
const achievementDefs: Omit<Achievement, "unlocked">[] = [
  {
    id: "first-swipe",
    name: "First Swipe",
    description: "Make your first purchase",
    icon: "💳",
    rarity: "common",
    checkFn: (p) => p.length >= 1,
  },
  {
    id: "million-gone",
    name: "First Million Gone",
    description: "Spend over $1,000,000",
    icon: "💸",
    rarity: "common",
    checkFn: (p) => totalSpent(p) >= 1_000_000,
  },
  {
    id: "billion-club",
    name: "Billion Dollar Club",
    description: "Spend over $1,000,000,000",
    icon: "🏦",
    rarity: "rare",
    checkFn: (p) => totalSpent(p) >= 1_000_000_000,
  },
  {
    id: "half-fortune",
    name: "Halfway There",
    description: "Spend half the billionaire's net worth",
    icon: "⚖️",
    rarity: "legendary",
    checkFn: (p) => totalSpent(p) >= 50_000_000_000,
  },
  {
    id: "the-architect",
    name: "The Architect",
    description: "Purchase high-end custom equipment (keyboards, CNC, etc.)",
    icon: "⌨️",
    rarity: "rare",
    checkFn: (p) =>
      countByClass(p, "custom_keyboard") + countByClass(p, "industrial_equipment") >= 3,
  },
  {
    id: "compute-oligarch",
    name: "Compute Oligarch",
    description: "Drain $10M+ on enterprise servers & AI infrastructure",
    icon: "🖥️",
    rarity: "legendary",
    checkFn: (p) => {
      const techSpend = p
        .filter((x) => x.product.assetClass === "commercial_tech")
        .reduce((s, x) => s + x.product.price, 0);
      return techSpend >= 10_000_000;
    },
  },
  {
    id: "the-barista",
    name: "The Barista",
    description: "Outfit a mansion with commercial coffee equipment",
    icon: "☕",
    rarity: "rare",
    checkFn: (p) => countByClass(p, "coffee_equipment") >= 3,
  },
  {
    id: "nomad-edition",
    name: "Nomad Edition",
    description: "Collect RVs and trailers for the open road",
    icon: "🏕️",
    rarity: "rare",
    checkFn: (p) => countByClass(p, "rv_trailer") >= 2,
  },
  {
    id: "supercar-enthusiast",
    name: "Supercar Enthusiast",
    description: "Own 3 or more supercars",
    icon: "🏎️",
    rarity: "rare",
    checkFn: (p) => countByClass(p, "supercar") >= 3,
  },
  {
    id: "real-estate-mogul",
    name: "Real Estate Mogul",
    description: "Acquire 5 or more properties",
    icon: "🏰",
    rarity: "legendary",
    checkFn: (p) => countByClass(p, "real_estate") >= 5,
  },
  {
    id: "art-collector",
    name: "Art Collector",
    description: "Amass a world-class art collection",
    icon: "🎨",
    rarity: "rare",
    checkFn: (p) => countByClass(p, "art") >= 3,
  },
  {
    id: "fashion-icon",
    name: "Fashion Icon",
    description: "Spend lavishly on luxury fashion",
    icon: "👗",
    rarity: "common",
    checkFn: (p) => countByClass(p, "luxury_fashion") >= 5,
  },
  {
    id: "sky-king",
    name: "Sky King",
    description: "Own an aircraft",
    icon: "✈️",
    rarity: "legendary",
    checkFn: (p) => countByClass(p, "aircraft") >= 1,
  },
  {
    id: "yacht-life",
    name: "Yacht Life",
    description: "Set sail with your own yacht",
    icon: "🛥️",
    rarity: "legendary",
    checkFn: (p) => countByClass(p, "yacht") >= 1,
  },
  {
    id: "shopaholic",
    name: "Shopaholic",
    description: "Make 20 purchases in a single session",
    icon: "🛒",
    rarity: "common",
    checkFn: (p) => p.length >= 20,
  },
];

export const achievements: Achievement[] = achievementDefs.map((a) => ({
  ...a,
  unlocked: false,
}));

export function checkAchievements(
  purchases: Purchase[],
  current: Achievement[]
): { updated: Achievement[]; newlyUnlocked: Achievement[] } {
  const newlyUnlocked: Achievement[] = [];
  const updated = current.map((a) => {
    if (a.unlocked) return a;
    const def = achievementDefs.find((d) => d.id === a.id);
    if (def && def.checkFn(purchases)) {
      const unlocked = { ...a, unlocked: true };
      newlyUnlocked.push(unlocked);
      return unlocked;
    }
    return a;
  });
  return { updated, newlyUnlocked };
}
