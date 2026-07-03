import { AssetClass } from "@/lib/types";

interface ClassificationResult {
  assetClass: AssetClass;
  monthlyOverhead: number;
}

const KEYWORD_MAP: { keywords: string[]; assetClass: AssetClass }[] = [
  { keywords: ["lamborghini", "ferrari", "bugatti", "mclaren", "porsche 911", "koenigsegg", "pagani", "rolls-royce", "bentley", "aston martin", "supercar", "hypercar"], assetClass: "supercar" },
  { keywords: ["yacht", "sailboat", "catamaran", "superyacht"], assetClass: "yacht" },
  { keywords: ["aircraft", "jet", "gulfstream", "cessna", "bombardier", "dassault", "airplane", "helicopter", "private jet"], assetClass: "aircraft" },
  { keywords: ["house", "mansion", "villa", "penthouse", "estate", "condo", "apartment", "property", "real estate", "acre lot", "ranch"], assetClass: "real_estate" },
  { keywords: ["airstream", "rv", "motorhome", "camper", "trailer", "caravan", "winnebago", "travel trailer"], assetClass: "rv_trailer" },
  { keywords: ["nvidia", "gpu", "h100", "a100", "dgx", "server rack", "data center", "hpc", "tpu", "supercomputer", "cluster"], assetClass: "commercial_tech" },
  { keywords: ["la marzocco", "espresso", "grinder", "coffee machine", "barista", "niche zero", "decent espresso", "slayer"], assetClass: "coffee_equipment" },
  { keywords: ["keyboard", "keycap", "gmk", "mode designs", "mode sonnet", "angry miao", "keychron", "cherry mx", "artisan keycap"], assetClass: "custom_keyboard" },
  { keywords: ["cnc", "lathe", "mill", "industrial", "3d printer", "laser cutter", "welder"], assetClass: "industrial_equipment" },
  { keywords: ["painting", "sculpture", "artwork", "gallery", "sotheby", "christie", "art piece", "canvas", "banksy", "warhol"], assetClass: "art" },
  { keywords: ["gucci", "louis vuitton", "hermes", "chanel", "prada", "dior", "balenciaga", "birkin", "rolex", "patek", "audemars", "richard mille", "watch", "handbag", "couture"], assetClass: "luxury_fashion" },
  { keywords: ["diamond", "emerald", "sapphire", "ruby", "necklace", "bracelet", "ring", "tiara", "carat", "tiffany", "cartier", "jewelry", "jewellery"], assetClass: "jewelry" },
];

function getOverhead(assetClass: AssetClass, price: number): number {
  switch (assetClass) {
    case "supercar":
      return 25_000;
    case "yacht":
      return Math.max(50_000, price * 0.005);
    case "aircraft":
      return Math.max(100_000, price * 0.01);
    case "real_estate":
      return Math.max(5_000, price * 0.003);
    case "rv_trailer":
      return 2_500;
    case "commercial_tech":
      return price >= 1_000_000 ? 4_500_000 : Math.max(1_000, price * 0.05);
    case "luxury_fashion":
      return 500;
    case "jewelry":
      return 200;
    case "coffee_equipment":
      return 800;
    case "custom_keyboard":
      return 0;
    case "industrial_equipment":
      return Math.max(500, price * 0.02);
    case "art":
      return 1_000;
    case "electronics":
      return 0;
    case "other":
      return 0;
  }
}

export function classifyProduct(title: string, price: number): ClassificationResult {
  const lower = title.toLowerCase();

  for (const entry of KEYWORD_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return {
        assetClass: entry.assetClass,
        monthlyOverhead: getOverhead(entry.assetClass, price),
      };
    }
  }

  // Price-based heuristics
  if (price >= 100_000_000) return { assetClass: "real_estate", monthlyOverhead: getOverhead("real_estate", price) };
  if (price >= 1_000_000) return { assetClass: "luxury_fashion", monthlyOverhead: getOverhead("luxury_fashion", price) };

  return { assetClass: "other", monthlyOverhead: 0 };
}
