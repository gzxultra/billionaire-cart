"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectMonthlyBurn } from "@/lib/store";
import { formatCurrency, timeAgo, assetLabel } from "@/lib/format";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

type VaultSort = "newest" | "oldest" | "priceHigh" | "priceLow";
type ViewMode = "list" | "grouped";

export function Vault() {
  const locale = useLocale((s) => s.locale);
  const purchases = useCartStore((s) => s.purchases);
  const removePurchase = useCartStore((s) => s.removePurchase);
  const totalSpent = useCartStore(selectTotalSpent);
  const monthlyBurn = useCartStore(selectMonthlyBurn);

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<VaultSort>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Filtered + sorted purchases
  const filteredPurchases = useMemo(() => {
    let items = [...purchases];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      items = items.filter(
        (p) =>
          p.product.title.toLowerCase().includes(q) ||
          p.product.description?.toLowerCase().includes(q) ||
          assetLabel(p.product.assetClass, "en").toLowerCase().includes(q) ||
          assetLabel(p.product.assetClass, "zh").includes(q)
      );
    }

    switch (sortMode) {
      case "newest":
        items.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case "oldest":
        items.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case "priceHigh":
        items.sort((a, b) => b.product.price - a.product.price);
        break;
      case "priceLow":
        items.sort((a, b) => a.product.price - b.product.price);
        break;
    }

    return items;
  }, [purchases, search, sortMode]);

  // Category grouped data
  const categoryGroups = useMemo(() => {
    const groups: Record<
      string,
      { items: typeof filteredPurchases; total: number; count: number }
    > = {};

    for (const p of filteredPurchases) {
      const cls = p.product.assetClass || "other";
      if (!groups[cls]) {
        groups[cls] = { items: [], total: 0, count: 0 };
      }
      groups[cls].items.push(p);
      groups[cls].total += p.product.price;
      groups[cls].count += 1;
    }

    // Sort groups by total spent (highest first)
    return Object.entries(groups).sort(([, a], [, b]) => b.total - a.total);
  }, [filteredPurchases]);

  const toggleGroup = useCallback((cls: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return next;
    });
  }, []);

  if (purchases.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3 opacity-30">🔒</div>
        <div className="text-xs text-ash/65 uppercase tracking-[0.2em]">
          {t("vault.empty", locale)}
        </div>
        <div className="text-xs text-ash/72 mt-1">
          {t("vault.emptyHint", locale)}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header + stats */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="section-label">{t("vault.title", locale)}</h2>
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.15em]">
          <span className="text-ash/70">
            {t("vault.deployed", locale)}:{" "}
            <span className="text-champagne">
              {formatCurrency(totalSpent, true)}
            </span>
          </span>
          {monthlyBurn > 0 && (
            <span className="text-ash/70">
              {t("vault.burn", locale)}:{" "}
              <span className="text-[#9B6B6B]/70">
                -{formatCurrency(monthlyBurn, true)}/mo
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Controls bar: search + sort + view toggle */}
      <div className="flex gap-2 mb-3 items-center">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              locale === "zh"
                ? "搜索购买记录…"
                : "Search vault…"
            }
            className="w-full px-3 py-2 pl-8 rounded-lg bg-surface/70 border border-line/45 text-sand placeholder:text-ash/72 text-xs focus:outline-none focus:border-stone/40 transition-colors"
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ash/65"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ash/65 hover:text-ash/80 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort */}
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as VaultSort)}
          className="px-2 py-2 rounded-lg bg-surface/70 border border-line/45 text-ash/80 text-[10px] focus:outline-none focus:border-stone/40 cursor-pointer"
        >
          <option value="newest">{locale === "zh" ? "最新" : "Newest"}</option>
          <option value="oldest">{locale === "zh" ? "最早" : "Oldest"}</option>
          <option value="priceHigh">{locale === "zh" ? "价高→低" : "Price ↓"}</option>
          <option value="priceLow">{locale === "zh" ? "价低→高" : "Price ↑"}</option>
        </select>

        {/* View toggle */}
        <div className="flex rounded-lg border border-line/45 overflow-hidden">
          <button
            onClick={() => setViewMode("list")}
            className={`px-2 py-1.5 text-[10px] transition-colors ${
              viewMode === "list"
                ? "bg-stone/20 text-stone"
                : "bg-surface/55 text-ash/60 hover:text-ash/80"
            }`}
            title={locale === "zh" ? "列表" : "List"}
          >
            ☰
          </button>
          <button
            onClick={() => setViewMode("grouped")}
            className={`px-2 py-1.5 text-[10px] transition-colors ${
              viewMode === "grouped"
                ? "bg-stone/20 text-stone"
                : "bg-surface/55 text-ash/60 hover:text-ash/80"
            }`}
            title={locale === "zh" ? "分类" : "Grouped"}
          >
            ▦
          </button>
        </div>
      </div>

      {/* Result count when searching */}
      {search.trim() && (
        <div className="text-[10px] text-ash/60 mb-2">
          {filteredPurchases.length}{" "}
          {locale === "zh" ? "件匹配" : "matching"}{" "}
          / {purchases.length} {locale === "zh" ? "总计" : "total"}
        </div>
      )}

      {/* List view */}
      {viewMode === "list" && (
        <div className="space-y-1">
          <AnimatePresence initial={false}>
            {filteredPurchases.map((purchase) => (
              <VaultItem
                key={purchase.id}
                purchase={purchase}
                locale={locale}
                onRemove={removePurchase}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Grouped view */}
      {viewMode === "grouped" && (
        <div className="space-y-3">
          {categoryGroups.map(([cls, group]) => {
            const isCollapsed = collapsedGroups.has(cls);
            const label = assetLabel(cls, locale);
            const pct =
              totalSpent > 0
                ? ((group.total / totalSpent) * 100).toFixed(1)
                : "0";

            return (
              <div
                key={cls}
                className="rounded-xl border border-line/40 overflow-hidden"
              >
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(cls)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-surface-dim/60 hover:bg-surface-dim/90 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{label}</span>
                    <span className="text-[9px] font-mono text-ash/50">
                      ×{group.count}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Mini bar */}
                    <div className="w-16 h-1.5 rounded-full bg-line/30 overflow-hidden hidden sm:block">
                      <div
                        className="h-full rounded-full bg-champagne/60"
                        style={{
                          width: `${Math.min(
                            100,
                            (group.total / totalSpent) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-serif text-champagne">
                      {formatCurrency(group.total, true)}
                    </span>
                    <span className="text-[9px] text-ash/50 font-mono w-8 text-right">
                      {pct}%
                    </span>
                    <span
                      className={`text-[9px] text-ash/50 transition-transform ${
                        isCollapsed ? "" : "rotate-180"
                      }`}
                    >
                      ▾
                    </span>
                  </div>
                </button>

                {/* Group items */}
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-2 py-1 space-y-1">
                        {group.items.map((purchase) => (
                          <VaultItem
                            key={purchase.id}
                            purchase={purchase}
                            locale={locale}
                            onRemove={removePurchase}
                            compact
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty filter state */}
      {filteredPurchases.length === 0 && search.trim() && (
        <div className="text-center py-8">
          <div className="text-2xl mb-2 opacity-30">🔍</div>
          <div className="text-xs text-ash/65">
            {locale === "zh" ? "无匹配记录" : "No matching items"}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Vault Item Row ───────────────────────────────────────────────

interface VaultItemProps {
  purchase: {
    id: string;
    product: {
      title: string;
      price: number;
      imageUrl: string | null;
      assetClass: string;
      monthlyOverhead: number;
    };
    timestamp: number;
  };
  locale: "en" | "zh";
  onRemove: (id: string) => void;
  compact?: boolean;
}

function VaultItem({ purchase, locale, onRemove, compact }: VaultItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`
        group flex items-center gap-3 rounded-lg
        bg-surface/70 border border-line/50
        hover:bg-surface/70 hover:border-line/45
        transition-colors
        ${compact ? "p-2" : "p-3"}
      `}
    >
      {/* Thumbnail */}
      {!compact && (
        <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 bg-surface-bright">
          {purchase.product.imageUrl ? (
            <img
              src={purchase.product.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full bg-stone-gradient opacity-20 flex items-center justify-center text-sm">
              📦
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className={`text-sand truncate ${compact ? "text-[11px]" : "text-sm"}`}>
          {purchase.product.title}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`font-serif text-champagne ${compact ? "text-[10px]" : "text-xs"}`}>
            {formatCurrency(purchase.product.price)}
          </span>
          {!compact && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-bright/65 text-ash/70">
              {assetLabel(purchase.product.assetClass, locale)}
            </span>
          )}
          {purchase.product.monthlyOverhead > 0 && (
            <span className="text-[9px] text-[#9B6B6B]/50">
              -{formatCurrency(purchase.product.monthlyOverhead)}/mo
            </span>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <span className="text-[9px] text-ash/72 shrink-0 hidden sm:block">
        {timeAgo(purchase.timestamp, locale)}
      </span>

      {/* Remove button */}
      <button
        onClick={() => onRemove(purchase.id)}
        className="opacity-0 group-hover:opacity-100 text-ash/65 hover:text-[#9B6B6B]/60 transition-all text-xs"
      >
        ✕
      </button>
    </motion.div>
  );
}
