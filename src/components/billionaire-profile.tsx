"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";
import { t, Locale } from "@/lib/i18n";
import { formatCurrency, generateId } from "@/lib/format";
import { toast } from "@/lib/use-toast";
import { Skeleton } from "@/components/skeleton";
import {
  Billionaire,
  SecFiling,
  StockData,
  WikiData,
  WealthSlice,
  SignaturePurchase,
} from "@/lib/types";
import { applyWealthDna, formatModifier } from "@/lib/wealth-dna";
import { playAuthorize, playSparkle } from "@/lib/sounds";

// ─── Data Fetching Hooks ──────────────────────────────────────────

function useSecFilings(id: string | undefined) {
  const [filings, setFilings] = useState<SecFiling[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/sec-filings?id=${id}`)
      .then((r) => r.json())
      .then((d) => setFilings(d.filings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);
  return { filings, loading };
}

function useStockData(id: string | undefined) {
  const [stock, setStock] = useState<StockData | null>(null);
  useEffect(() => {
    if (!id) return;
    fetch(`/api/stock?id=${id}`)
      .then((r) => r.json())
      .then((d) => setStock(d.stock || null))
      .catch(() => {});
  }, [id]);
  return stock;
}

function useWikiData(id: string | undefined) {
  const [wiki, setWiki] = useState<WikiData | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/wiki?id=${id}`)
      .then((r) => r.json())
      .then((d) => setWiki(d.wiki || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);
  return { wiki, loading };
}

// ─── Sub-Components ───────────────────────────────────────────────

function StockTicker({ stock, ticker }: { stock: StockData | null; ticker?: string }) {
  if (!stock && !ticker) return null;

  if (!stock) {
    return <Skeleton.StockTicker />;
  }

  const isUp = stock.change >= 0;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-dim/80 border border-line/50">
      <span className="text-[10px] font-mono text-ash/60 uppercase tracking-wider">
        {stock.ticker || ticker}
      </span>
      <span className="text-sm font-semibold text-sand font-mono">
        ${stock.price.toLocaleString()}
      </span>
      <span
        className={`text-[11px] font-mono font-medium ${
          isUp ? "text-sage" : "text-[#e05555]"
        }`}
      >
        {isUp ? "▲" : "▼"} {Math.abs(stock.changePercent)}%
      </span>
    </div>
  );
}

function SecFilingsPanel({
  filings,
  loading,
  locale,
}: {
  filings: SecFiling[];
  loading: boolean;
  locale: Locale;
}) {
  if (loading) {
    return <Skeleton.SecFilings />;
  }
  if (filings.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-[10px] font-mono text-ash/70 uppercase tracking-wider flex items-center gap-1.5">
        <span className="text-xs">📊</span>
        {t("profile.secTitle", locale)}
      </h3>
      <div className="space-y-1.5">
        {filings.map((f, i) => (
          <motion.div
            key={`${f.date}-${i}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface-dim/80 border border-line/45"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  f.type === "sell"
                    ? "bg-[#e05555]/15 text-[#e05555]"
                    : f.type === "buy"
                    ? "bg-sage/15 text-sage"
                    : "bg-stone/15 text-stone/75"
                }`}
              >
                {f.type === "sell"
                  ? locale === "zh" ? "卖出" : "SELL"
                  : f.type === "buy"
                  ? locale === "zh" ? "买入" : "BUY"
                  : locale === "zh" ? "行权" : "OPT"}
              </span>
              <span className="text-[11px] text-ash/70 font-mono">{f.date}</span>
            </div>
            <div className="text-right shrink-0 min-w-[100px]">
              <div className="text-[11px] text-sand font-mono whitespace-nowrap">
                {f.shares >= 1_000_000
                  ? `${(f.shares / 1_000_000).toFixed(1)}M`
                  : f.shares.toLocaleString()}{" "}
                {f.ticker}
              </div>
              <div className="text-[9px] text-ash/60 font-mono whitespace-nowrap">
                @ ${f.pricePerShare.toLocaleString(undefined, { maximumFractionDigits: 2 })} = $
                {f.totalValue >= 1_000_000_000
                  ? `${(f.totalValue / 1_000_000_000).toFixed(1)}B`
                  : f.totalValue >= 1_000_000
                  ? `${(f.totalValue / 1_000_000).toFixed(1)}M`
                  : f.totalValue.toLocaleString()}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function WealthComposition({
  slices,
  locale,
  netWorthB,
}: {
  slices: WealthSlice[];
  locale: Locale;
  netWorthB: number;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  // Compute donut chart segments
  const segments = useMemo(() => {
    let cumulative = 0;
    return slices.map((s) => {
      const start = cumulative;
      cumulative += s.pct;
      return { ...s, start, end: cumulative };
    });
  }, [slices]);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  const handleSegmentEnter = useCallback((i: number) => setActiveIdx(i), []);
  const handleSegmentLeave = useCallback(() => setActiveIdx(null), []);
  const handleLegendClick = useCallback((i: number) => {
    setActiveIdx((prev) => (prev === i ? null : i));
  }, []);

  // Format dollar value from percentage
  const sliceDollar = useCallback(
    (pct: number) => {
      const val = pct * netWorthB;
      if (val >= 1) return `$${val.toFixed(1)}B`;
      const m = val * 1000;
      if (m >= 1) return `$${m.toFixed(0)}M`;
      return `$${(m * 1000).toFixed(0)}K`;
    },
    [netWorthB]
  );

  const activeSlice = activeIdx !== null ? slices[activeIdx] : null;

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-mono text-ash/70 uppercase tracking-wider flex items-center gap-1.5">
        <span className="text-xs">🧬</span>
        {t("profile.wealthTitle", locale)}
      </h3>
      <div className="flex items-center gap-5">
        {/* Interactive donut chart */}
        <div
          className="relative w-28 h-28 shrink-0"
          onMouseLeave={handleSegmentLeave}
          role="img"
          aria-label={locale === "zh" ? "财富构成饼图" : "Wealth composition chart"}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {segments.map((seg, i) => {
              const isActive = activeIdx === i;
              const isDimmed = activeIdx !== null && activeIdx !== i;
              return (
                <motion.circle
                  key={i}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={isActive ? 18 : 14}
                  strokeDasharray={`${seg.pct * circumference} ${circumference}`}
                  strokeDashoffset={-seg.start * circumference}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: isDimmed ? 0.35 : isActive ? 1 : 0.85,
                    strokeWidth: isActive ? 18 : 14,
                  }}
                  transition={{ duration: 0.2 }}
                  className="cursor-pointer"
                  style={{ filter: isActive ? `drop-shadow(0 0 6px ${seg.color}50)` : undefined }}
                  onMouseEnter={() => handleSegmentEnter(i)}
                  onClick={() => handleLegendClick(i)}
                />
              );
            })}
          </svg>
          {/* Center tooltip — shows active slice or default */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <AnimatePresence mode="wait">
              {activeSlice ? (
                <motion.div
                  key={`active-${activeIdx}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="text-center"
                >
                  <div className="text-[13px] font-serif text-sand/90 tabular-nums leading-tight">
                    {sliceDollar(activeSlice.pct)}
                  </div>
                  <div className="text-[8px] text-ash/60 font-mono mt-0.5">
                    {(activeSlice.pct * 100).toFixed(0)}%
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="default"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-center"
                >
                  <div className="text-[11px] font-serif text-sand/70 tabular-nums">
                    ${netWorthB.toFixed(0)}B
                  </div>
                  <div className="text-[8px] text-ash/50 font-mono mt-0.5">
                    {locale === "zh" ? "总计" : "Total"}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        {/* Interactive legend */}
        <div className="flex-1 space-y-1.5 min-w-0">
          {slices.map((s, i) => {
            const isActive = activeIdx === i;
            const isDimmed = activeIdx !== null && activeIdx !== i;
            return (
              <button
                key={i}
                className={`w-full flex items-center gap-2 rounded-md px-1.5 py-0.5 -mx-1.5 transition-all duration-150 text-left ${
                  isActive
                    ? "bg-surface-dim/80"
                    : "hover:bg-surface-dim/50"
                } ${isDimmed ? "opacity-40" : ""}`}
                onMouseEnter={() => handleSegmentEnter(i)}
                onMouseLeave={handleSegmentLeave}
                onClick={() => handleLegendClick(i)}
              >
                <div
                  className="w-2.5 h-2.5 rounded-sm shrink-0 transition-transform duration-150"
                  style={{
                    backgroundColor: s.color,
                    opacity: isActive ? 1 : 0.85,
                    transform: isActive ? "scale(1.3)" : "scale(1)",
                  }}
                />
                <span className="text-[11px] text-ash/70 truncate flex-1">
                  {locale === "zh" ? s.labelZh : s.label}
                  {s.ticker && (
                    <span className="text-[9px] text-ash/50 font-mono ml-1">{s.ticker}</span>
                  )}
                </span>
                <span className="text-[10px] font-mono ml-auto shrink-0 tabular-nums">
                  {isActive ? (
                    <span className="text-champagne/80">{sliceDollar(s.pct)}</span>
                  ) : (
                    <span className="text-ash/60">{(s.pct * 100).toFixed(0)}%</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SignaturePurchasesPanel({
  purchases,
  locale,
  onBuy,
}: {
  purchases: SignaturePurchase[];
  locale: Locale;
  onBuy?: (purchase: SignaturePurchase) => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-mono text-ash/70 uppercase tracking-wider flex items-center gap-1.5">
        <span className="text-xs">⭐</span>
        {t("profile.signatureTitle", locale)}
      </h3>
      <div className="grid gap-2">
        {purchases.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-dim/80 border border-line/45 hover:border-stone/25 hover:bg-surface/70 transition-all cursor-pointer group active:scale-[0.98]"
            onClick={() => onBuy?.(p)}
          >
            <span className="text-xl shrink-0">{p.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-sand truncate">
                {locale === "zh" ? p.nameZh : p.name}
              </div>
              <div className="text-[10px] text-ash/65 truncate">
                {locale === "zh" ? p.descriptionZh : p.description}
              </div>
            </div>
            <div className="text-right shrink-0 min-w-[52px]">
              {p.price > 0 ? (
                <div className="text-[11px] font-mono text-champagne whitespace-nowrap">
                  {p.price >= 1_000_000_000
                    ? `$${(p.price / 1_000_000_000).toFixed(1)}B`
                    : p.price >= 1_000_000
                    ? `$${(p.price / 1_000_000).toFixed(0)}M`
                    : `$${p.price.toLocaleString()}`}
                </div>
              ) : (
                <div className="text-[10px] text-ash/72 italic">
                  {locale === "zh" ? "无价" : "Priceless"}
                </div>
              )}
              <div className="text-[9px] text-ash/70 font-mono whitespace-nowrap">{p.year}</div>
              {onBuy && (
                <div className="text-[8px] text-stone/50 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity font-medium mt-0.5">
                  {locale === "zh" ? "点击购买" : "Click to buy"}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function WealthDnaPanel({
  billionaire,
  locale,
}: {
  billionaire: Billionaire;
  locale: Locale;
}) {
  const dna = billionaire.wealthDna;
  if (!dna) return null;

  const personalityLabels: Record<string, { en: string; zh: string }> = {
    tech_visionary: { en: "Tech Visionary", zh: "科技远见者" },
    luxury_connoisseur: { en: "Luxury Connoisseur", zh: "奢华鉴赏家" },
    value_investor: { en: "Value Investor", zh: "价值投资者" },
    empire_builder: { en: "Empire Builder", zh: "帝国缔造者" },
    silicon_titan: { en: "Silicon Titan", zh: "硅谷巨擘" },
    sports_mogul: { en: "Sports Mogul", zh: "体育大亨" },
    ai_pioneer: { en: "AI Pioneer", zh: "AI 先驱" },
    water_baron: { en: "Water Baron", zh: "水业大王" },
    cloud_king: { en: "Cloud King", zh: "云端之王" },
    philanthropist: { en: "Philanthropist", zh: "慈善家" },
  };

  const assetLabels: Record<string, { en: string; zh: string }> = {
    supercar: { en: "Supercars", zh: "超跑" },
    yacht: { en: "Yachts", zh: "游艇" },
    aircraft: { en: "Aircraft", zh: "飞机" },
    real_estate: { en: "Real Estate", zh: "房产" },
    commercial_tech: { en: "Tech", zh: "科技" },
    luxury_fashion: { en: "Fashion", zh: "时装" },
    jewelry: { en: "Jewelry", zh: "珠宝" },
    electronics: { en: "Electronics", zh: "电子" },
    art: { en: "Art", zh: "艺术" },
    coffee_equipment: { en: "Coffee", zh: "咖啡" },
    industrial_equipment: { en: "Industrial", zh: "工业" },
    custom_keyboard: { en: "Keyboards", zh: "键盘" },
    other: { en: "Other", zh: "其他" },
  };

  const modEntries = Object.entries(dna.modifiers).sort((a, b) => a[1]! - b[1]!);

  const pLabel = personalityLabels[dna.personality] || { en: dna.personality, zh: dna.personality };

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-mono text-ash/70 uppercase tracking-wider flex items-center gap-1.5">
        <span className="text-xs">🧬</span>
        {t("profile.dnaTitle", locale)}
      </h3>

      {/* Personality badge + quote */}
      <div className="px-3 py-2.5 rounded-lg bg-stone/[0.06] border border-stone/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone/85 px-2 py-0.5 rounded bg-stone/15">
            {locale === "zh" ? pLabel.zh : pLabel.en}
          </span>
        </div>
        <p className="text-[11px] text-ash/60 italic leading-relaxed">
          &ldquo;{locale === "zh" ? dna.quoteZh : dna.quote}&rdquo;
        </p>
      </div>

      {/* Modifiers */}
      <div className="grid grid-cols-2 gap-1.5">
        {modEntries.map(([asset, mod]) => {
          const label = assetLabels[asset] || { en: asset, zh: asset };
          const isDiscount = mod! < 0;
          return (
            <div
              key={asset}
              className="flex items-center justify-between px-2 py-1.5 rounded bg-surface-dim/80 border border-line/45"
            >
              <span className="text-[10px] text-ash/60">
                {locale === "zh" ? label.zh : label.en}
              </span>
              <span
                className={`text-[10px] font-mono font-medium ${
                  isDiscount ? "text-sage" : "text-[#e05555]/70"
                }`}
              >
                {isDiscount ? "" : "+"}{(mod! * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Free items */}
      {dna.freeItems && dna.freeItems.length > 0 && (
        <div className="text-[10px] text-ash/65">
          <span className="text-sage/85 font-medium">
            {locale === "zh" ? "免费：" : "Free: "}
          </span>
          {dna.freeItems.join(", ")}
        </div>
      )}
    </div>
  );
}

function WikiSummary({ wiki, locale, loading }: { wiki: WikiData | null; locale: Locale; loading?: boolean }) {
  if (loading) return <Skeleton.WikiSummary />;
  if (!wiki?.summary) return null;

  // Truncate to ~2 sentences
  const sentences = wiki.summary.split(". ");
  const short = sentences.slice(0, 2).join(". ") + (sentences.length > 2 ? "." : "");

  return (
    <div className="space-y-2">
      <h3 className="text-[10px] font-mono text-ash/70 uppercase tracking-wider flex items-center gap-1.5">
        <span className="text-xs">📖</span>
        {t("profile.bioTitle", locale)}
      </h3>
      <p className="text-[11px] text-ash/72 leading-relaxed">{short}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────

export function BillionaireProfile() {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const addPurchase = useCartStore((s) => s.addPurchase);
  const soundEnabled = useCartStore((s) => s.soundEnabled);
  const locale = useLocale((s) => s.locale);
  const [expanded, setExpanded] = useState(false);

  const id = selectedBillionaire?.id;
  const { filings, loading: secLoading } = useSecFilings(id);
  const stock = useStockData(id);
  const { wiki, loading: wikiLoading } = useWikiData(id);

  if (!selectedBillionaire) return null;

  const b = selectedBillionaire;
  const hasContent =
    b.wealthBreakdown ||
    b.signaturePurchases?.length ||
    b.wealthDna ||
    b.sec ||
    b.ticker;

  if (!hasContent) return null;

  const handleBuySignature = (purchase: SignaturePurchase) => {
    if (!selectedBillionaire) return;
    const dna = applyWealthDna(
      { title: purchase.name, price: purchase.price, assetClass: "other" as const },
      selectedBillionaire
    );
    if (soundEnabled) {
      playAuthorize();
      playSparkle();
    }
    const newlyUnlocked = addPurchase({
      id: generateId(),
      product: {
        title: `${purchase.emoji} ${locale === "zh" ? purchase.nameZh : purchase.name}`,
        price: dna.adjustedPrice,
        imageUrl: null,
        description: locale === "zh" ? purchase.descriptionZh : purchase.description,
        sourceUrl: `signature://${selectedBillionaire.id}/${purchase.name.toLowerCase().replace(/\s+/g, "-")}`,
        assetClass: "other",
        monthlyOverhead: 0,
      },
      billionaireId: selectedBillionaire.id,
      timestamp: Date.now(),
    });
    if (newlyUnlocked.length > 0) {
      toast(`🏆 ${newlyUnlocked.join(", ")}`, 4000);
    } else {
      toast(
        locale === "zh"
          ? `✓ 已购买 ${purchase.nameZh}`
          : `✓ Acquired ${purchase.name}`
      );
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-label flex items-center gap-2">
          <span className="text-base">{b.emoji}</span>
          {t("profile.title", locale, { name: b.name })}
        </h2>
        {b.ticker && <StockTicker stock={stock} ticker={b.ticker} />}
      </div>

      {/* Wiki bio */}
      <WikiSummary wiki={wiki} locale={locale} loading={wikiLoading} />

      {/* Wealth Composition - always visible */}
      {b.wealthBreakdown && (
        <WealthComposition slices={b.wealthBreakdown} locale={locale} netWorthB={b.netWorthB} />
      )}

      {/* Expandable detailed section */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-center py-2 text-[10px] text-ash/60 hover:text-stone/75 transition-colors uppercase tracking-wider font-mono"
      >
        {expanded
          ? locale === "zh" ? "收起详情 ▲" : "Less ▲"
          : locale === "zh" ? "展开详情 ▼" : "More ▼"}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden space-y-5"
          >
            {/* Wealth DNA */}
            <WealthDnaPanel billionaire={b} locale={locale} />

            {/* Signature Purchases */}
            {b.signaturePurchases && b.signaturePurchases.length > 0 && (
              <SignaturePurchasesPanel
                purchases={b.signaturePurchases}
                locale={locale}
                onBuy={handleBuySignature}
              />
            )}

            {/* SEC Filings */}
            {b.sec && (
              <SecFilingsPanel
                filings={filings}
                loading={secLoading}
                locale={locale}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
