"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { classifyProduct } from "@/lib/asset-classifier";
import { ParsedProduct, ParseResponse, AssetClass } from "@/lib/types";
import { generateId, ASSET_LABELS } from "@/lib/format";
import { ProductCard } from "./product-card";
import { CheckoutAnimation } from "./checkout-animation";

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

  // Manual entry state
  const [manualTitle, setManualTitle] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualClass, setManualClass] = useState<AssetClass>("other");

  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const addPurchase = useCartStore((s) => s.addPurchase);

  const parseUrl = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setProduct(null);

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data: ParseResponse = await res.json();

      if (data.success && data.product) {
        setProduct(data.product);
      } else {
        setError(data.error || "Failed to parse URL");
        setShowManual(true);
      }
    } catch {
      setError("Network error — try manual entry");
      setShowManual(true);
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handleManualSubmit = () => {
    const price = parseFloat(manualPrice.replace(/[,$]/g, ""));
    if (!manualTitle.trim() || isNaN(price) || price <= 0) {
      setError("Enter a valid title and price");
      return;
    }
    const { assetClass, monthlyOverhead } = classifyProduct(manualTitle, price);
    const finalClass = manualClass !== "other" ? manualClass : assetClass;
    const finalOverhead =
      manualClass !== "other"
        ? classifyProduct(ASSET_LABELS[manualClass] || "", price).monthlyOverhead
        : monthlyOverhead;

    setProduct({
      title: manualTitle.trim(),
      price,
      imageUrl: null,
      description: "Manually entered item",
      sourceUrl: url || "manual://entry",
      assetClass: finalClass,
      monthlyOverhead: finalOverhead,
    });
    setShowManual(false);
    setError(null);
  };

  const handleAuthorize = () => {
    if (!product || !selectedBillionaire) return;
    setShowCheckout(true);
  };

  const handleCheckoutComplete = () => {
    if (!product || !selectedBillionaire) return;

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
      setToast(`🏆 Achievement Unlocked: ${newlyUnlocked.join(", ")}`);
      setTimeout(() => setToast(null), 4000);
    }
  };

  if (!selectedBillionaire) return null;

  return (
    <div className="w-full space-y-4">
      {/* Main input */}
      <div className="relative">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && parseUrl()}
          onPaste={() => setTimeout(parseUrl, 100)}
          placeholder="Paste any URL to purchase..."
          disabled={loading}
          className="
            w-full px-5 py-4 rounded-xl
            bg-charcoal-800/80 border border-charcoal-600/30
            text-white/90 placeholder:text-white/20
            focus:outline-none focus:border-copper/50 focus:shadow-copper
            transition-all duration-300 text-sm
            disabled:opacity-50
            animate-copper-pulse
          "
        />
        <button
          onClick={parseUrl}
          disabled={loading || !url.trim()}
          className="
            absolute right-2 top-1/2 -translate-y-1/2
            px-4 py-2 rounded-lg text-xs font-medium
            bg-copper/20 text-copper hover:bg-copper/30
            disabled:opacity-30 transition-all
          "
        >
          {loading ? "Parsing..." : "Parse"}
        </button>
      </div>

      {/* Manual entry toggle */}
      <button
        onClick={() => setShowManual(!showManual)}
        className="text-[11px] text-white/25 hover:text-copper/60 transition-colors"
      >
        {showManual ? "← Back to URL" : "Or enter manually →"}
      </button>

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
              placeholder="Product name..."
              className="w-full px-4 py-3 rounded-lg bg-charcoal-800/60 border border-charcoal-600/20 text-white/80 placeholder:text-white/15 text-sm focus:outline-none focus:border-copper/40"
            />
            <div className="flex gap-3">
              <input
                type="text"
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value)}
                placeholder="Price (USD)..."
                className="flex-1 px-4 py-3 rounded-lg bg-charcoal-800/60 border border-charcoal-600/20 text-white/80 placeholder:text-white/15 text-sm focus:outline-none focus:border-copper/40"
              />
              <select
                value={manualClass}
                onChange={(e) => setManualClass(e.target.value as AssetClass)}
                className="px-3 py-3 rounded-lg bg-charcoal-800/60 border border-charcoal-600/20 text-white/60 text-sm focus:outline-none focus:border-copper/40"
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
              className="w-full py-3 rounded-lg bg-copper/15 text-copper text-sm font-medium hover:bg-copper/25 transition-colors"
            >
              Add Item
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
            className="text-xs text-red-400/70 px-1"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading skeleton */}
      {loading && (
        <div className="p-4 rounded-xl bg-charcoal-800/40 border border-charcoal-600/10 animate-pulse">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-lg bg-charcoal-600/30" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-charcoal-600/30 rounded w-3/4" />
              <div className="h-3 bg-charcoal-600/20 rounded w-1/2" />
              <div className="h-3 bg-charcoal-600/20 rounded w-1/4" />
            </div>
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
            className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl bg-copper/20 border border-copper/40 text-copper text-sm backdrop-blur-md z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
