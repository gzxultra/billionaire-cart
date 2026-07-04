/** Proxy an external image URL through our server to bypass hotlinking / referrer blocks. */
export function proxyImage(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("data:") || url.startsWith("/") || url.startsWith("blob:")) return url;
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

export function formatCurrency(amount: number, compact = false): string {
  if (compact) {
    if (amount >= 1_000_000_000_000) return `$${(amount / 1_000_000_000_000).toFixed(2)}T`;
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(2)}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNetWorth(billions: number): string {
  return `$${billions.toFixed(1)}B`;
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(4)}%`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function timeAgo(timestamp: number, locale?: "en" | "zh"): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  const zh = locale === "zh";
  if (seconds < 60) return zh ? "刚刚" : "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return zh ? `${minutes}分钟前` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return zh ? `${hours}小时前` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return zh ? `${days}天前` : `${days}d ago`;
}

export const ASSET_LABELS: Record<string, string> = {
  supercar: "🏎️ Supercar",
  yacht: "🛥️ Yacht",
  aircraft: "✈️ Aircraft",
  real_estate: "🏰 Real Estate",
  rv_trailer: "🏕️ RV / Trailer",
  commercial_tech: "🖥️ Commercial Tech",
  luxury_fashion: "👗 Luxury Fashion",
  jewelry: "💎 Jewelry",
  coffee_equipment: "☕ Coffee Equipment",
  custom_keyboard: "⌨️ Custom Keyboard",
  industrial_equipment: "🔧 Industrial",
  art: "🎨 Art",
  electronics: "📱 Electronics",
  other: "📦 Other",
};

/** Return the i18n-aware asset label. Falls back to ASSET_LABELS (English). */
export function assetLabel(cls: string, locale?: "en" | "zh"): string {
  if (!locale || locale === "en") return ASSET_LABELS[cls] || "📦 Other";
  // Dynamic import avoided — inline lookup for zh
  const ZH_LABELS: Record<string, string> = {
    supercar: "🏎️ 超跑",
    yacht: "🛥️ 游艇",
    aircraft: "✈️ 飞机",
    real_estate: "🏰 房产",
    rv_trailer: "🏕️ 房车",
    commercial_tech: "🖥️ 商用科技",
    luxury_fashion: "👗 奢侈品",
    jewelry: "💎 珠宝",
    coffee_equipment: "☕ 咖啡设备",
    custom_keyboard: "⌨️ 键盘",
    industrial_equipment: "🔧 工业设备",
    art: "🎨 艺术品",
    electronics: "📱 电子产品",
    other: "📦 其他",
  };
  return ZH_LABELS[cls] || ASSET_LABELS[cls] || "📦 其他";
}
