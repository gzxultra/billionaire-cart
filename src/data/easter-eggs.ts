import { Purchase } from "@/lib/types";

export interface EasterEgg {
  id: string;
  name: string;
  emoji: string;
  description: string;
  checkFn: (purchases: Purchase[]) => boolean;
  effect: "shake" | "rainbow" | "gold_rain" | "explosion" | "matrix" | "fire";
}

export const easterEggs: EasterEgg[] = [
  {
    id: "speed-demon",
    name: "Speed Demon",
    emoji: "🏁",
    description: "Own 3+ supercars",
    checkFn: (p) =>
      p.filter((x) => x.product.assetClass === "supercar").length >= 3,
    effect: "shake",
  },
  {
    id: "bond-villain",
    name: "Bond Villain",
    emoji: "🦹",
    description: "Own a jet AND an island",
    checkFn: (p) =>
      p.some((x) => x.product.assetClass === "aircraft") &&
      p.some(
        (x) =>
          x.product.title.toLowerCase().includes("island") ||
          x.product.title.toLowerCase().includes("caribbean")
      ),
    effect: "explosion",
  },
  {
    id: "tweet-from-space",
    name: "Tweeting from Space",
    emoji: "🛸",
    description: "Buy Twitter AND the Space Station",
    checkFn: (p) =>
      p.some((x) => x.product.title.toLowerCase().includes("twitter")) &&
      p.some((x) => x.product.title.toLowerCase().includes("space station")),
    effect: "matrix",
  },
  {
    id: "full-circle",
    name: "Full Circle",
    emoji: "🔄",
    description: "Buy McDonald's Corp AND a Big Mac",
    checkFn: (p) =>
      p.some(
        (x) =>
          x.product.title.toLowerCase().includes("mcdonald") &&
          x.product.price >= 100_000_000_000
      ) &&
      p.some(
        (x) =>
          x.product.title.toLowerCase().includes("big mac") ||
          (x.product.title.toLowerCase().includes("mac") &&
            x.product.price < 100)
      ),
    effect: "gold_rain",
  },
  {
    id: "elons-nightmare",
    name: "Elon's Nightmare",
    emoji: "😱",
    description: "Buy both Teslas",
    checkFn: (p) => {
      const teslas = p.filter((x) =>
        x.product.title.toLowerCase().includes("tesla")
      );
      const hasModel3 = teslas.some(
        (t) =>
          t.product.title.includes("Model 3") ||
          t.product.title.includes("model 3")
      );
      const hasModelS = teslas.some(
        (t) =>
          t.product.title.includes("Model S") ||
          t.product.title.includes("Plaid")
      );
      return hasModel3 && hasModelS;
    },
    effect: "fire",
  },
  {
    id: "sea-king",
    name: "King of the Seas",
    emoji: "🌊",
    description: "Own 2+ yachts",
    checkFn: (p) =>
      p.filter((x) => x.product.assetClass === "yacht").length >= 2,
    effect: "rainbow",
  },
  {
    id: "sports-mogul",
    name: "Sports Mogul",
    emoji: "🏟️",
    description: "Buy both an NBA and NFL team",
    checkFn: (p) =>
      p.some((x) => x.product.title.toLowerCase().includes("nba")) &&
      p.some((x) => x.product.title.toLowerCase().includes("nfl")),
    effect: "explosion",
  },
  {
    id: "everything-store",
    name: "The Everything Store",
    emoji: "🏪",
    description: "Own 50+ different items",
    checkFn: (p) => {
      const uniqueTitles = new Set(p.map((x) => x.product.title.split(" (")[0]));
      return uniqueTitles.size >= 15;
    },
    effect: "gold_rain",
  },
  {
    id: "carrier-group",
    name: "Naval Supremacy",
    emoji: "⚓",
    description: "Buy an aircraft carrier AND a mega yacht",
    checkFn: (p) =>
      p.some((x) => x.product.title.toLowerCase().includes("carrier")) &&
      p.some((x) => x.product.title.toLowerCase().includes("mega yacht")),
    effect: "explosion",
  },
  {
    id: "impulse-buyer",
    name: "Impulse Buyer",
    emoji: "⚡",
    description: "Make 10 purchases in 30 seconds",
    checkFn: (p) => {
      if (p.length < 10) return false;
      const sorted = [...p].sort((a, b) => a.timestamp - b.timestamp);
      for (let i = 0; i <= sorted.length - 10; i++) {
        if (sorted[i + 9].timestamp - sorted[i].timestamp < 30000) return true;
      }
      return false;
    },
    effect: "fire",
  },
  {
    id: "art-banana-paradox",
    name: "The Art Banana Paradox",
    emoji: "🍌",
    description: "Buy a $6.2M banana AND a $5.69 Big Mac",
    checkFn: (p) =>
      p.some((x) => x.product.title.toLowerCase().includes("cattelan") || x.product.title.toLowerCase().includes("banana")) &&
      p.some((x) => x.product.title.toLowerCase().includes("big mac")),
    effect: "gold_rain" as const,
  },
  {
    id: "speed-vs-luxury",
    name: "Speed vs Luxury",
    emoji: "🏆",
    description: "Own a Bugatti AND a Rolls-Royce",
    checkFn: (p) =>
      p.some((x) => x.product.title.toLowerCase().includes("bugatti")) &&
      p.some((x) => x.product.title.toLowerCase().includes("rolls")),
    effect: "shake" as const,
  },
  {
    id: "space-race",
    name: "Space Race",
    emoji: "🌌",
    description: "Fund a Mars mission AND buy the ISS",
    checkFn: (p) =>
      p.some((x) => x.product.title.toLowerCase().includes("mars")) &&
      p.some((x) => x.product.title.toLowerCase().includes("space station")),
    effect: "matrix" as const,
  },
];

// Track which easter eggs have been triggered this session
const triggeredEggs = new Set<string>();

export function checkEasterEggs(purchases: Purchase[]): EasterEgg | null {
  for (const egg of easterEggs) {
    if (triggeredEggs.has(egg.id)) continue;
    if (egg.checkFn(purchases)) {
      triggeredEggs.add(egg.id);
      return egg;
    }
  }
  return null;
}

export function resetEasterEggs() {
  triggeredEggs.clear();
}
