"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { classifyProduct } from "@/lib/asset-classifier";
import { ParsedProduct, AssetClass, SavedProduct } from "@/lib/types";
import { generateId, ASSET_LABELS, assetLabel, formatCurrency, timeAgo, proxyImage } from "@/lib/format";
import { applyWealthDna } from "@/lib/wealth-dna";
import { useUrlParse } from "@/lib/use-url-parse";
import { toast } from "@/lib/use-toast";
import { ProductCard } from "./product-card";
import { CheckoutAnimation } from "./checkout-animation";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";
import { catalogItems } from "@/data/catalog";
import { getBulkPurchaseFact } from "@/lib/fun-facts";

const ASSET_OPTION_VALUES: AssetClass[] = [
  "supercar", "yacht", "aircraft", "real_estate", "rv_trailer",
  "commercial_tech", "coffee_equipment", "custom_keyboard",
  "luxury_fashion", "jewelry", "art", "electronics", "other",
];

export function OmniBox() {
  const [url, setUrl] = useState("");
  const [product, setProduct] = useState<ParsedProduct | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pasteFlash, setPasteFlash] = useState(false);
  const [batchUrls, setBatchUrls] = useState<string[]>([]);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; success: number } | null>(null);
  const [batchResult, setBatchResult] = useState<{ success: number; total: number } | null>(null);
  const [purchaseQty, setPurchaseQty] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Manual entry state
  const [manualTitle, setManualTitle] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualClass, setManualClass] = useState<AssetClass>("other");

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(-1);

  // Shared parse hook — replaces duplicated fetch logic
  const { loading, error, parseSource, lastFailedUrl, parseUrl: doParse, clearError } = useUrlParse();

  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const addPurchase = useCartStore((s) => s.addPurchase);
  const saveProduct = useCartStore((s) => s.saveProduct);
  const savedProducts = useCartStore((s) => s.savedProducts);
  const removeSavedProduct = useCartStore((s) => s.removeSavedProduct);
  const incrementPurchaseCount = useCartStore((s) => s.incrementPurchaseCount);
  const activeParsedProduct = useCartStore((s) => s.activeParsedProduct);
  const setActiveParsed = useCartStore((s) => s.setActiveParsed);
  const locale = useLocale((s) => s.locale);

  // Catalog auto-suggest: match when input looks like text (not a URL)
  const catalogSuggestions = useMemo(() => {
    const q = url.trim().toLowerCase();
    if (!q || q.length < 2 || /^https?:\/\//i.test(q) || /\.\w{2,}/.test(q)) return [];
    return catalogItems
      .filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.nameZh.includes(q) ||
          item.emoji.includes(q) ||
          item.description.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [url]);

  // Watch for external product selection (e.g. from PurchaseFeed)
  useEffect(() => {
    if (activeParsedProduct) {
      setProduct(activeParsedProduct);
      setUrl(activeParsedProduct.sourceUrl);
      setShowHistory(false);
      setActiveParsed(null);
      // Auto-scroll to card
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [activeParsedProduct, setActiveParsed]);

  const parseUrl = useCallback(async (inputUrl?: string) => {
    const target = (inputUrl || url).trim();
    if (!target) return;
    setProduct(null);

    await doParse(target, {
      onSuccess: (parsed) => {
        setProduct(parsed);
        setTimeout(() => {
          cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      },
      onError: (msg) => {
        setShowManual(true);
      },
    });
  }, [url, doParse]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text");
    // Extract all URLs from pasted text
    const urlPattern = /https?:\/\/[^\s<>"']+/gi;
    const urls = (pasted.match(urlPattern) || []).map((u) => u.replace(/[),;.]+$/, ""));
    const uniqueUrls = Array.from(new Set(urls));

    if (uniqueUrls.length > 1) {
      // Multi-URL paste — show batch prompt
      e.preventDefault();
      setBatchUrls(uniqueUrls);
      setBatchResult(null);
      setPasteFlash(true);
      setTimeout(() => setPasteFlash(false), 600);
    } else if (uniqueUrls.length === 1) {
      // Single URL paste — original behavior
      setPasteFlash(true);
      setTimeout(() => setPasteFlash(false), 600);
      setTimeout(() => parseUrl(uniqueUrls[0]), 50);
    }
  }, [parseUrl]);

  const handleBatchParse = useCallback(async () => {
    const urls = batchUrls;
    setBatchUrls([]);
    setBatchResult(null);
    let successCount = 0;

    for (let i = 0; i < urls.length; i++) {
      setBatchProgress({ current: i + 1, total: urls.length, success: successCount });
      try {
        const res = await fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urls[i] }),
        });
        const data = await res.json();
        if (data.success && data.product) {
          saveProduct(data.product);
          successCount++;
        }
      } catch {
        // Skip failed URLs
      }
    }

    setBatchProgress(null);
    setBatchResult({ success: successCount, total: urls.length });
    setTimeout(() => setBatchResult(null), 4000);
  }, [batchUrls, saveProduct]);

  const handleSelectCatalogSuggestion = useCallback(
    (item: (typeof catalogItems)[number]) => {
      if (!selectedBillionaire) return;
      const dna = applyWealthDna(
        { title: item.name, price: item.price, assetClass: item.assetClass },
        selectedBillionaire
      );
      const parsed: ParsedProduct = {
        title: item.name,
        price: dna.adjustedPrice,
        imageUrl: null,
        description: item.description,
        sourceUrl: `catalog://${item.id}`,
        assetClass: item.assetClass,
        monthlyOverhead: item.monthlyOverhead,
      };
      setProduct(parsed);
      setUrl("");
      setShowSuggestions(false);
      setSelectedSuggestionIdx(-1);
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    },
    [selectedBillionaire]
  );

  const handleClipboardPaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const urlMatch = text.match(/https?:\/\/[^\s<>"']+/i);
      if (urlMatch) {
        const cleanUrl = urlMatch[0].replace(/[),;.]+$/, '');
        setUrl(cleanUrl);
        setPasteFlash(true);
        setTimeout(() => setPasteFlash(false), 600);
        setTimeout(() => parseUrl(cleanUrl), 50);
      }
    } catch {
      // Clipboard API not available or permission denied — silently ignore
    }
  }, [parseUrl]);

  const handleManualSubmit = () => {
    const price = parseFloat(manualPrice.replace(/[,$]/g, ""));
    if (!manualTitle.trim() || isNaN(price) || price <= 0) {
      toast(t("omni.validError", locale));
      return;
    }
    const { assetClass, monthlyOverhead } = classifyProduct(manualTitle, price);
    const finalClass = manualClass !== "other" ? manualClass : assetClass;
    const finalOverhead =
      manualClass !== "other"
        ? classifyProduct(ASSET_LABELS[manualClass] || "", price).monthlyOverhead
        : monthlyOverhead;

    const parsed: ParsedProduct = {
      title: manualTitle.trim(),
      price,
      imageUrl: null,
      description: "Manually entered item",
      sourceUrl: url || "manual://entry",
      assetClass: finalClass,
      monthlyOverhead: finalOverhead,
    };
    setProduct(parsed);
    saveProduct(parsed);
    setShowManual(false);
    clearError();
  };

  const handleAuthorize = (qty: number = 1) => {
    if (!product || !selectedBillionaire) return;
    setPurchaseQty(qty);
    // Fast checkout: skip animation, process immediately
    const fastCheckout = useCartStore.getState().fastCheckout;
    if (fastCheckout) {
      handleCheckoutComplete(qty);
      return;
    }
    setShowCheckout(true);
  };

  const handleCheckoutComplete = (overrideQty?: number) => {
    if (!product || !selectedBillionaire) return;

    // Apply Wealth DNA modifiers to the price
    const dna = applyWealthDna(product, selectedBillionaire);

    // Find matching saved product and increment its purchase count
    const match = savedProducts.find(
      (sp) => sp.product.sourceUrl === product.sourceUrl
    );
    if (match) incrementPurchaseCount(match.id);

    const adjustedProduct = dna.adjustedPrice !== product.price
      ? { ...product, price: dna.adjustedPrice }
      : product;

    // Batch add purchases for selected quantity
    const actualQty = Math.max(1, overrideQty ?? purchaseQty);
    let lastUnlocked: string[] = [];
    for (let i = 0; i < actualQty; i++) {
      lastUnlocked = addPurchase({
        id: generateId(),
        product: adjustedProduct,
        billionaireId: selectedBillionaire.id,
        timestamp: Date.now(),
      });
    }

    setShowCheckout(false);
    setProduct(null);
    setUrl("");
    setManualTitle("");
    setManualPrice("");
    setManualClass("other");
    setPurchaseQty(1);

    if (lastUnlocked.length > 0) {
      toast(`🏆 ${t("omni.achievementUnlocked", locale)}: ${lastUnlocked.join(", ")}`, 4000);
    } else if (actualQty >= 10) {
      const totalCost = adjustedProduct.price * actualQty;
      const fact = getBulkPurchaseFact(adjustedProduct.title, actualQty, totalCost, locale);
      toast(fact
        ? `✓ ${actualQty.toLocaleString()}× ${adjustedProduct.title} — ${fact}`
        : `✓ ${actualQty.toLocaleString()}× ${adjustedProduct.title}`, 4000);
    } else if (actualQty > 1) {
      toast(`✓ ${actualQty.toLocaleString()}× ${adjustedProduct.title}`, 3000);
    }
  };

  const handleRepurchase = (savedProduct: SavedProduct) => {
    setProduct(savedProduct.product);
    setUrl(savedProduct.product.sourceUrl);
    setShowHistory(false);
  };

  // Focus the input on mount
  useEffect(() => {
    if (inputRef.current && selectedBillionaire) {
      // Small delay to ensure DOM is ready
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [selectedBillionaire]);

  if (!selectedBillionaire) return null;

  const recentProducts = savedProducts.slice(0, 8);

  return (
    <div className="w-full space-y-4">
      {/* Hero input — the core interaction */}
      <div className="relative group">
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-stone/0 via-stone/20 to-stone/0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
        <div className={`relative flex items-center bg-surface/80 backdrop-blur-md border rounded-2xl overflow-hidden transition-all duration-300 ${pasteFlash ? "border-sage/60 shadow-[0_0_20px_rgba(143,160,134,0.2)]" : "border-line/50 focus-within:border-stone/40"}`}>
          {/* Paste detection flash overlay */}
          <AnimatePresence>
            {pasteFlash && (
              <motion.div
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 bg-sage/10 pointer-events-none z-0 rounded-2xl"
              />
            )}
          </AnimatePresence>
          {/* Search icon + ⌘K hint */}
          <div className="pl-5 pr-1 text-ash/60 flex items-center gap-1.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <kbd className="hidden sm:inline-flex items-center text-[9px] px-1.5 py-0.5 rounded bg-surface-bright/80 text-ash/72 font-mono border border-line/50 leading-none">⌘K</kbd>
          </div>
          <input
            ref={inputRef}
            id="omnibox-input"
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setShowSuggestions(true);
              setSelectedSuggestionIdx(-1);
            }}
            onKeyDown={(e) => {
              if (catalogSuggestions.length > 0 && showSuggestions) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSelectedSuggestionIdx((prev) =>
                    prev < catalogSuggestions.length - 1 ? prev + 1 : 0
                  );
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSelectedSuggestionIdx((prev) =>
                    prev > 0 ? prev - 1 : catalogSuggestions.length - 1
                  );
                  return;
                }
                if (e.key === "Enter" && selectedSuggestionIdx >= 0) {
                  e.preventDefault();
                  handleSelectCatalogSuggestion(catalogSuggestions[selectedSuggestionIdx]);
                  return;
                }
                if (e.key === "Escape") {
                  setShowSuggestions(false);
                  return;
                }
              }
              if (e.key === "Enter") parseUrl();
            }}
            onPaste={handlePaste}
            onFocus={() => {
              if (catalogSuggestions.length > 0) setShowSuggestions(true);
              else if (recentProducts.length > 0 && !product) setShowHistory(true);
            }}
            onBlur={() => {
              // Delay to allow click on suggestion
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            placeholder={t("omni.placeholder", locale)}
            disabled={loading}
            className="
              flex-1 px-2 py-4 bg-transparent
              text-sand placeholder:text-ash/60
              focus:outline-none
              transition-all duration-300 text-sm
              disabled:opacity-50
            "
            autoComplete="off"
          />
          <button
            onClick={handleClipboardPaste}
            disabled={loading}
            className="p-2 text-ash/72 hover:text-stone/75 disabled:opacity-30 transition-colors shrink-0"
            title={t("omni.clipboardPaste", locale)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="8" y="2" width="8" height="4" rx="1" />
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            </svg>
          </button>
          <button
            onClick={() => parseUrl()}
            disabled={loading || !url.trim()}
            className="
              mr-2 px-5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider
              bg-stone/20 text-stone hover:bg-stone/30
              disabled:opacity-30 transition-all duration-200
              whitespace-nowrap
            "
          >
            {loading ? t("omni.parsing", locale) : t("omni.parse", locale)}
          </button>
        </div>

        {/* Catalog auto-suggest dropdown */}
        <AnimatePresence>
          {showSuggestions && catalogSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-1 z-30 bg-surface border border-line/50 rounded-xl shadow-xl overflow-hidden"
            >
              <div className="px-3 py-1.5 border-b border-line/30">
                <span className="text-[9px] uppercase tracking-wider text-ash/50 font-mono">
                  {locale === "zh" ? "目录匹配" : "Catalog matches"}
                </span>
              </div>
              {catalogSuggestions.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectCatalogSuggestion(item)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                    ${i === selectedSuggestionIdx ? "bg-stone/10" : "hover:bg-surface-dim/50"}
                  `}
                >
                  <span className="text-base shrink-0">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-sand/90 truncate">
                      {locale === "zh" ? item.nameZh : item.name}
                    </div>
                    <div className="text-[10px] text-ash/50 truncate">
                      {locale === "zh" ? item.descriptionZh : item.description}
                    </div>
                  </div>
                  <span className="text-[11px] font-serif text-champagne/80 tabular-nums shrink-0">
                    {formatCurrency(item.price, item.price >= 1_000_000)}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Parse source badge */}
      <AnimatePresence>
        {parseSource && product && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-1"
          >
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sage/10 text-sage/85 font-mono border border-sage/15">
              {parseSource === "json-ld" ? "Schema.org" : parseSource === "amazon" ? "Amazon" : parseSource === "ebay" ? "eBay" : parseSource === "taobao" ? "淘宝/天猫" : parseSource === "jd" ? "京东 JD" : parseSource === "walmart" ? "Walmart" : parseSource === "bestbuy" ? "Best Buy" : parseSource === "etsy" ? "Etsy" : parseSource === "product-meta" ? "Product Meta" : parseSource === "og-meta" ? "OpenGraph" : parseSource === "ai" ? "AI" : "Extracted"}
            </span>
            {product.sourceDomain && (
              <span className="flex items-center gap-1 text-[10px] text-ash/60">
                {product.favicon && (
                  <img
                    src={product.favicon}
                    alt=""
                    className="w-3 h-3 rounded-sm"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                {product.sourceDomain}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch URL prompt */}
      <AnimatePresence>
        {batchUrls.length > 1 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between p-3 rounded-xl bg-sage/8 border border-sage/15">
              <span className="text-xs text-sage/80">
                {t("batch.detected", locale, { n: batchUrls.length })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBatchUrls([])}
                  className="text-[10px] px-2 py-1 text-ash/60 hover:text-ash/60 transition-colors"
                >
                  {t("batch.cancel", locale)}
                </button>
                <button
                  onClick={handleBatchParse}
                  className="text-[10px] px-3 py-1 rounded-lg bg-stone/20 text-stone font-semibold hover:bg-stone/30 transition-colors"
                >
                  {t("batch.parseAll", locale)}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch progress / result */}
      <AnimatePresence>
        {batchProgress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 px-1"
          >
            <div className="flex-1 h-1.5 rounded-full bg-surface-bright/80 overflow-hidden">
              <motion.div
                className="h-full bg-stone/50 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-[10px] text-ash/60 font-mono shrink-0">
              {t("batch.progress", locale, { current: batchProgress.current, total: batchProgress.total })}
            </span>
          </motion.div>
        )}
        {batchResult && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-1"
          >
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sage/10 text-sage/85 font-mono border border-sage/15">
              ✓ {t("batch.done", locale, { success: batchResult.success, total: batchResult.total })}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual / History toggle row */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => {
            setShowManual(!showManual);
            setShowHistory(false);
          }}
          className="text-[11px] text-ash/60 hover:text-stone/80 transition-colors"
        >
          {showManual ? t("omni.backToUrl", locale) : t("omni.manual", locale)}
        </button>
        {recentProducts.length > 0 && (
          <button
            onClick={() => {
              setShowHistory(!showHistory);
              setShowManual(false);
            }}
            className="text-[11px] text-ash/60 hover:text-stone/80 transition-colors flex items-center gap-1"
          >
            <span>🕐</span>
            {showHistory ? t("omni.hideHistory", locale) : t("omni.recentItems", locale, { n: recentProducts.length })}
          </button>
        )}
      </div>

      {/* Empty state — first-use onboarding */}
      <AnimatePresence>
        {savedProducts.length === 0 && !product && !loading && !showManual && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-5 pt-2"
          >
            {/* How it works — 3 steps */}
            <div className="flex items-center justify-center gap-2 sm:gap-5">
              {[
                { icon: "📋", label: t("omni.step1", locale) },
                { icon: "⚡", label: t("omni.step2", locale) },
                { icon: "💳", label: t("omni.step3", locale) },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2 sm:gap-4">
                  {i > 0 && <span className="text-ash/60 text-sm">→</span>}
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-lg sm:text-xl">{step.icon}</span>
                    <span className="text-[10px] text-ash/70 font-medium tracking-wide">{step.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Supported sites */}
            <div className="text-center space-y-2.5">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {["Amazon", "eBay", "Walmart", "Best Buy", "Etsy", "淘宝", "京东"].map((site) => (
                  <span key={site} className="text-[10px] px-2.5 py-1 rounded-full border border-line/50 bg-surface/70 text-ash/60 font-mono">
                    {site}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-ash/70">{t("omni.supportedSites", locale)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent products history */}
      <AnimatePresence>
        {showHistory && recentProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl bg-surface/70 border border-line/40 divide-y divide-line/30">
              {recentProducts.map((sp) => (
                <motion.div
                  key={sp.id}
                  className="flex items-center gap-3 p-3 hover:bg-surface/70 transition-colors cursor-pointer group/item"
                  onClick={() => handleRepurchase(sp)}
                >
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-surface-bright/80">
                    {sp.product.imageUrl ? (
                      <img
                        src={proxyImage(sp.product.imageUrl) || ""}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm opacity-40">
                        📦
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {sp.product.favicon && sp.product.sourceDomain && (
                        <img
                          src={sp.product.favicon}
                          alt=""
                          className="w-3 h-3 rounded-sm shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                      <span className="text-xs text-sand truncate font-medium">
                        {sp.product.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-champagne font-serif">
                        {formatCurrency(sp.product.price)}
                      </span>
                      <span className="text-[10px] text-ash/60">
                        {timeAgo(sp.parsedAt, locale)}
                      </span>
                      {sp.purchaseCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone/20 text-stone/80">
                          ×{sp.purchaseCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRepurchase(sp);
                      }}
                      className="text-[10px] px-2 py-1 rounded-lg bg-stone/20 text-stone/80 hover:bg-stone/20 transition-colors opacity-0 group-hover/item:opacity-100"
                    >
                      {t("omni.rebuy", locale)}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSavedProduct(sp.id);
                      }}
                      className="text-ash/70 hover:text-[#9B6B6B]/60 transition-colors opacity-0 group-hover/item:opacity-100 p-1"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual entry form */}
      <AnimatePresence>
        {showManual && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder={t("omni.productName", locale)}
              className="w-full px-4 py-3 rounded-lg bg-surface/70 border border-line/45 text-sand placeholder:text-ash/72 text-sm focus:outline-none focus:border-stone/40"
            />
            <div className="flex gap-3">
              <input
                type="text"
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value)}
                placeholder={t("omni.price", locale)}
                className="flex-1 px-4 py-3 rounded-lg bg-surface/70 border border-line/45 text-sand placeholder:text-ash/72 text-sm focus:outline-none focus:border-stone/40"
              />
              <select
                value={manualClass}
                onChange={(e) => setManualClass(e.target.value as AssetClass)}
                className="px-3 py-3 rounded-lg bg-surface/70 border border-line/45 text-ash text-sm focus:outline-none focus:border-stone/40"
              >
                {ASSET_OPTION_VALUES.map((cls) => (
                  <option key={cls} value={cls}>
                    {assetLabel(cls, locale)}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleManualSubmit}
              className="w-full py-3 rounded-lg bg-stone/20 text-stone text-sm font-medium hover:bg-stone/30 transition-colors"
            >
              {t("omni.addItem", locale)}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error + Retry */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-1"
          >
            <span className="text-xs text-[#9B6B6B]/70 flex-1">
              {error}
            </span>
            {lastFailedUrl && (
              <button
                onClick={() => parseUrl(lastFailedUrl)}
                disabled={loading}
                className="shrink-0 text-[10px] px-2.5 py-1 rounded-lg bg-stone/20 text-stone/80 hover:bg-stone/20 transition-colors font-medium disabled:opacity-30"
              >
                {t("omni.retry", locale)}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading skeleton */}
      {loading && (
        <div className="p-4 rounded-xl bg-surface/70 border border-line/50 space-y-3">
          <div className="flex gap-4 animate-pulse">
            <div className="w-24 h-24 rounded-lg bg-surface-bright/80" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-surface-bright/80 rounded w-3/4" />
              <div className="h-3 bg-surface-bright/80 rounded w-1/2" />
              <div className="h-5 bg-surface-bright/80 rounded w-1/3 mt-2" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-stone/40 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="h-2 w-2 rounded-full bg-stone/40 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="h-2 w-2 rounded-full bg-stone/40 animate-bounce" style={{ animationDelay: "300ms" }} />
            <span className="text-[10px] text-ash/60 ml-1">{t("omni.analyzing", locale)}</span>
          </div>
        </div>
      )}

      {/* Product card */}
      <AnimatePresence>
        {product && !showCheckout && (
          <div ref={cardRef}>
            <ProductCard product={product} onAuthorize={handleAuthorize} autoFocusBuy />
          </div>
        )}
      </AnimatePresence>

      {/* Price neighbors — similar-value catalog items */}
      <AnimatePresence>
        {product && !showCheckout && !loading && (
          <PriceNeighbors price={product.price} locale={locale} />
        )}
      </AnimatePresence>

      {/* Checkout animation */}
      <AnimatePresence>
        {showCheckout && product && (
          <CheckoutAnimation
            product={product}
            billionaire={selectedBillionaire}
            onComplete={handleCheckoutComplete}
            qty={purchaseQty}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Price Neighbors — catalog items near the parsed product's price ─
function PriceNeighbors({ price, locale }: { price: number; locale: "en" | "zh" }) {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const addPurchase = useCartStore((s) => s.addPurchase);
  const soundEnabled = useCartStore((s) => s.soundEnabled);

  const neighbors = useMemo(() => {
    if (price <= 0) return [];
    // Sort catalog items by closeness to parsed price, take top 3
    return [...catalogItems]
      .map((item) => ({ item, dist: Math.abs(Math.log10(item.price + 1) - Math.log10(price + 1)) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3)
      .map((x) => x.item);
  }, [price]);

  const handleQuickBuy = useCallback((item: typeof catalogItems[0]) => {
    if (!selectedBillionaire) return;
    const dna = applyWealthDna(
      { title: item.name, price: item.price, assetClass: item.assetClass },
      selectedBillionaire
    );
    addPurchase({
      id: generateId(),
      product: {
        title: item.name,
        price: dna.adjustedPrice,
        imageUrl: null,
        description: item.description,
        sourceUrl: `catalog://${item.id}`,
        assetClass: item.assetClass,
        monthlyOverhead: item.monthlyOverhead,
      },
      billionaireId: selectedBillionaire.id,
      timestamp: Date.now(),
    });
    toast(`✓ ${locale === "zh" ? item.nameZh : item.name}`, 2000);
  }, [selectedBillionaire, addPurchase, locale]);

  if (neighbors.length === 0 || !selectedBillionaire) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ delay: 0.3 }}
      className="space-y-2"
    >
      <div className="flex items-center gap-2 px-1">
        <span className="text-[10px] uppercase tracking-wider text-ash/50 font-mono">
          {locale === "zh" ? "同价位推荐" : "Similar Value"}
        </span>
        <div className="flex-1 h-px bg-line/20" />
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5 -mx-1 px-1">
        {neighbors.map((item) => (
          <button
            key={item.id}
            onClick={() => handleQuickBuy(item)}
            className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-surface/60 border border-line/30 hover:border-stone/30 hover:bg-surface/80 transition-all group"
          >
            <span className="text-lg">{item.emoji}</span>
            <div className="text-left min-w-0">
              <div className="text-[11px] text-sand/85 font-medium truncate max-w-[120px]">
                {locale === "zh" ? item.nameZh : item.name}
              </div>
              <div className="text-[10px] text-champagne font-serif">
                {formatCurrency(item.price, item.price >= 1_000_000)}
              </div>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone/15 text-stone/70 opacity-0 group-hover:opacity-100 transition-opacity font-medium ml-1">
              {locale === "zh" ? "买" : "Buy"}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
