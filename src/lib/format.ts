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

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
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
