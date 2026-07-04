"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { classifyProduct } from "@/lib/asset-classifier";
import { ParsedProduct, ParseResponse, AssetClass, SavedProduct } from "@/lib/types";
import { generateId, ASSET_LABELS, formatCurrency, timeAgo } from "@/lib/format";
import { ProductCard } from "./product-card";
import { CheckoutAnimation } from "./checkout-animation";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";

const ASSET_OPTIONS: { value: AssetClass; label: string }[] = [
  { value: "supercar", label: "🏎️ Supercar" },
  { value: "yacht", label: "🛥️ Yacht" },
  { value: "aircraft", label: "✈️ Aircraft" },
  { value: "real_estate", label: "🏰 Real Estate" },
  { value: "rv_trailer", label: "🏕️ RV / Trailer" },
  { value: "commercial_tech", label: "🖥️ Commercial Tech" },
  { value: "coffee_equipment", label: "☕ Coffee" },
  { value: "custom_keyboard", label: "⌨️ Keyboard" },
  { value: "luxury_fashion", label: "👗 Fashion" },
  { value: "jewelry", label: "💎 Jewelry" },
  { value: "art", label: "🎨 Art" },
  { value: "electronics", label: "📱 Electronics" },
  { value: "other", label: "📦 Other" },
];

export function OmniBox() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ParsedProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [parseSource, setParseSource] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Manual entry state
  const [manualTitle, setManualTitle] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualClass, setManualClass] = useState<AssetClass>("other");

  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const addPurchase = useCartStore((s) => s.addPurchase);
  const saveProduct = useCartStore((s) => s.saveProduct);
  const savedProducts = useCartStore((s) => s.savedProducts);
  const removeSavedProduct = useCartStore((s) => s.removeSavedProduct);
  const incrementPurchaseCount = useCartStore((s) => s.incrementPurchaseCount);
  const locale = useLocale((s) => s.locale);

  const parseUrl = useCallback(async (inputUrl?: string) => {
    const target = (inputUrl || url).trim();
    if (!target) return;
    setLoading(true);
    setError(null);
    setProduct(null);
    setParseSource(null);

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });

      const data: ParseResponse & { source?: string } = await res.json();

      if (data.success && data.product) {
        setProduct(data.product);
        setParseSource(data.source || null);
        // Auto-save to history
        saveProduct(data.product);
      } else {
        setError(data.error || t("omni.parseFail", locale));
        setShowManual(true);
        // Pre-fill manual with whatever we got
        if (data.product?.title) setManualTitle(data.product.title);
        if (data.product?.price) setManualPrice(String(data.product.price));
      }
    } catch {
      setError(t("omni.networkError", locale));
      setShowManual(true);
    } finally {
      setLoading(false);
    }
  }, [url, saveProduct, locale]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text");
    if (pasted && /^https?:\/\//i.test(pasted.trim())) {
      // Auto-parse URLs on paste
      setTimeout(() => parseUrl(pasted.trim()), 50);
    }
  }, [parseUrl]);

  const handleManualSubmit = () => {
    const price = parseFloat(manualPrice.replace(/[,$]/g, ""));
    if (!manualTitle.trim() || isNaN(price) || price <= 0) {
      setError(t("omni.validError", locale));
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
    setError(null);
  };

  const handleAuthorize = () => {
    if (!product || !selectedBillionaire) return;
    setShowCheckout(true);
  };

  const handleCheckoutComplete = () => {
    if (!product || !selectedBillionaire) return;

    // Find matching saved product and increment its purchase count
    const match = savedProducts.find(
      (sp) => sp.product.sourceUrl === product.sourceUrl
    );
    if (match) incrementPurchaseCount(match.id);

    const newlyUnlocked = addPurchase({
      id: generateId(),
      product,
      billionaireId: selectedBillionaire.id,
      timestamp: Date.now(),
    });

    setShowCheckout(false);
    setProduct(null);
    setUrl("");
    setManualTitle("");
    setManualPrice("");
    setManualClass("other");

    if (newlyUnlocked.length > 0) {
      setToast(`🏆 ${t("omni.achievementUnlocked", locale)}: ${newlyUnlocked.join(", ")}`);
      setTimeout(() => setToast(null), 4000);
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
        <div className="relative flex items-center bg-surface/80 backdrop-blur-md border border-line/30 rounded-2xl overflow-hidden focus-within:border-stone/40 transition-all duration-300">
          {/* Search icon */}
          <div className="pl-5 pr-2 text-ash/30">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && parseUrl()}
            onPaste={handlePaste}
            onFocus={() => recentProducts.length > 0 && !product && setShowHistory(true)}
            placeholder={t("omni.placeholder", locale)}
            disabled={loading}
            className="
              flex-1 px-2 py-4 bg-transparent
              text-sand/90 placeholder:text-ash/30
              focus:outline-none
              transition-all duration-300 text-sm
              disabled:opacity-50
            "
          />
          <button
            onClick={() => parseUrl()}
            disabled={loading || !url.trim()}
            className="
              mr-2 px-5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider
              bg-stone/15 text-stone hover:bg-stone/25
              disabled:opacity-30 transition-all duration-200
              whitespace-nowrap
            "
          >
            {loading ? t("omni.parsing", locale) : t("omni.parse", locale)}
          </button>
        </div>
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
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sage/10 text-sage/70 font-mono border border-sage/15">
              {parseSource === "json-ld" ? "Schema.org" : parseSource === "amazon" ? "Amazon" : parseSource === "product-meta" ? "Product Meta" : parseSource === "og-meta" ? "OpenGraph" : parseSource === "ai" ? "AI" : "Extracted"}
            </span>
            {product.sourceDomain && (
              <span className="flex items-center gap-1 text-[10px] text-ash/40">
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

      {/* Manual / History toggle row */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => {
            setShowManual(!showManual);
            setShowHistory(false);
          }}
          className="text-[11px] text-ash/40 hover:text-stone/60 transition-colors"
        >
          {showManual ? t("omni.backToUrl", locale) : t("omni.manual", locale)}
        </button>
        {recentProducts.length > 0 && (
          <button
            onClick={() => {
              setShowHistory(!showHistory);
              setShowManual(false);
            }}
            className="text-[11px] text-ash/40 hover:text-stone/60 transition-colors flex items-center gap-1"
          >
            <span>🕐</span>
            {showHistory ? t("omni.hideHistory", locale) : t("omni.recentItems", locale, { n: recentProducts.length })}
          </button>
        )}
      </div>

      {/* Recent products history */}
      <AnimatePresence>
        {showHistory && recentProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl bg-surface/40 border border-line/15 divide-y divide-line/10">
              {recentProducts.map((sp) => (
                <motion.div
                  key={sp.id}
                  className="flex items-center gap-3 p-3 hover:bg-surface/60 transition-colors cursor-pointer group/item"
                  onClick={() => handleRepurchase(sp)}
                >
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-surface-bright/50">
                    {sp.product.imageUrl ? (
                      <img
                        src={sp.product.imageUrl}
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
                      <span className="text-xs text-sand/80 truncate font-medium">
                        {sp.product.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-champagne font-serif">
                        {formatCurrency(sp.product.price)}
                      </span>
                      <span className="text-[10px] text-ash/30">
                        {timeAgo(sp.parsedAt)}
                      </span>
                      {sp.purchaseCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone/10 text-stone/60">
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
                      className="text-[10px] px-2 py-1 rounded-lg bg-stone/10 text-stone/70 hover:bg-stone/20 transition-colors opacity-0 group-hover/item:opacity-100"
                    >
                      {t("omni.rebuy", locale)}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSavedProduct(sp.id);
                      }}
                      className="text-ash/20 hover:text-[#9B6B6B]/60 transition-colors opacity-0 group-hover/item:opacity-100 p-1"
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
              className="w-full px-4 py-3 rounded-lg bg-surface/60 border border-line/20 text-sand/80 placeholder:text-ash/25 text-sm focus:outline-none focus:border-stone/40"
            />
            <div className="flex gap-3">
              <input
                type="text"
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value)}
                placeholder={t("omni.price", locale)}
                className="flex-1 px-4 py-3 rounded-lg bg-surface/60 border border-line/20 text-sand/80 placeholder:text-ash/25 text-sm focus:outline-none focus:border-stone/40"
              />
              <select
                value={manualClass}
                onChange={(e) => setManualClass(e.target.value as AssetClass)}
                className="px-3 py-3 rounded-lg bg-surface/60 border border-line/20 text-ash text-sm focus:outline-none focus:border-stone/40"
              >
                {ASSET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleManualSubmit}
              className="w-full py-3 rounded-lg bg-stone/15 text-stone text-sm font-medium hover:bg-stone/25 transition-colors"
            >
              {t("omni.addItem", locale)}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-[#9B6B6B]/70 px-1"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading skeleton */}
      {loading && (
        <div className="p-4 rounded-xl bg-surface/40 border border-line/10 space-y-3">
          <div className="flex gap-4 animate-pulse">
            <div className="w-24 h-24 rounded-lg bg-surface-bright/30" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-surface-bright/30 rounded w-3/4" />
              <div className="h-3 bg-surface-bright/20 rounded w-1/2" />
              <div className="h-5 bg-surface-bright/30 rounded w-1/3 mt-2" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-stone/40 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="h-2 w-2 rounded-full bg-stone/40 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="h-2 w-2 rounded-full bg-stone/40 animate-bounce" style={{ animationDelay: "300ms" }} />
            <span className="text-[10px] text-ash/30 ml-1">{t("omni.analyzing", locale)}</span>
          </div>
        </div>
      )}

      {/* Product card */}
      <AnimatePresence>
        {product && !showCheckout && (
          <ProductCard product={product} onAuthorize={handleAuthorize} />
        )}
      </AnimatePresence>

      {/* Checkout animation */}
      <AnimatePresence>
        {showCheckout && product && (
          <CheckoutAnimation
            product={product}
            billionaire={selectedBillionaire}
            onComplete={handleCheckoutComplete}
          />
        )}
      </AnimatePresence>

      {/* Achievement toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl bg-stone/20 border border-stone/40 text-stone text-sm backdrop-blur-md z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
