"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useCartStore } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";
import { SavedProduct } from "@/lib/types";
import { IdentitySelector } from "@/components/identity-selector";
import { BalanceDisplay } from "@/components/balance-display";
import { EarningsTicker } from "@/components/earnings-ticker";
import { BlackCard } from "@/components/black-card";
import { OmniBox } from "@/components/omni-box";
import { Vault } from "@/components/vault";
import { Achievements } from "@/components/achievements";
import { ShareReceipt } from "@/components/share-receipt";
import { Catalog } from "@/components/catalog";
import { WealthContext } from "@/components/wealth-context";
import { SpendingSpeed } from "@/components/spending-speed";
import { BankruptOverlay } from "@/components/bankrupt-overlay";
import { AbsurdToast } from "@/components/absurd-toast";
import { Atmosphere } from "@/components/atmosphere";
import { EasterEggOverlay } from "@/components/easter-egg-overlay";
import { SpeedrunTimer } from "@/components/speedrun-timer";
import { BillionaireReactions } from "@/components/billionaire-reactions";
import { BillionaireProfile } from "@/components/billionaire-profile";
import { ComboStreak } from "@/components/combo-streak";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { GuiltMeter } from "@/components/guilt-meter";
import { PurchaseFeed } from "@/components/purchase-feed";
import {
  checkEasterEggs,
  resetEasterEggs,
  type EasterEgg,
} from "@/data/easter-eggs";

export default function Home() {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const soundEnabled = useCartStore((s) => s.soundEnabled);
  const toggleSound = useCartStore((s) => s.toggleSound);
  const reset = useCartStore((s) => s.reset);
  const locale = useLocale((s) => s.locale);
  const toggleLocale = useLocale((s) => s.toggleLocale);

  // Absurd toast state
  const [lastPurchasePrice, setLastPurchasePrice] = useState(0);
  const [toastTriggerId, setToastTriggerId] = useState(0);

  // Easter egg state
  const [activeEgg, setActiveEgg] = useState<EasterEgg | null>(null);

  // Sticky OmniBox — shows a compact input bar in the header when the inline OmniBox scrolls out of view
  const omniSectionRef = useRef<HTMLElement>(null);
  const stickyInputRef = useRef<HTMLInputElement>(null);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [stickyUrl, setStickyUrl] = useState("");
  const [stickyLoading, setStickyLoading] = useState(false);

  useEffect(() => {
    const target = omniSectionRef.current;
    if (!target) return;
    const obs = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
    );
    obs.observe(target);
    return () => obs.disconnect();
  }, [selectedBillionaire]);

  // ⌘K / Ctrl+K — global shortcut to focus OmniBox from anywhere
  useEffect(() => {
    if (!selectedBillionaire) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (stickyVisible && stickyInputRef.current) {
          stickyInputRef.current.focus();
        } else {
          const omniInput = document.getElementById("omnibox-input") as HTMLInputElement | null;
          if (omniInput) {
            omniInput.scrollIntoView({ behavior: "smooth", block: "center" });
            setTimeout(() => omniInput.focus(), 300);
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedBillionaire, stickyVisible]);

  const handleStickyParse = useCallback(async () => {
    const target = stickyUrl.trim();
    if (!target) return;
    setStickyLoading(true);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = await res.json();
      if (data.success && data.product) {
        useCartStore.getState().saveProduct(data.product);
        useCartStore.getState().setActiveParsed(data.product);
        setStickyUrl("");
        // Scroll to the inline OmniBox to show the parsed product
        omniSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } catch {
      // Ignore — will use inline OmniBox on failure
    } finally {
      setStickyLoading(false);
    }
  }, [stickyUrl]);

  const handleStickyPaste = useCallback((e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text");
    if (pasted && /^https?:\/\//i.test(pasted.trim())) {
      setStickyUrl(pasted.trim());
      setTimeout(() => {
        setStickyLoading(true);
        fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: pasted.trim() }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.success && data.product) {
              useCartStore.getState().saveProduct(data.product);
              useCartStore.getState().setActiveParsed(data.product);
              setStickyUrl("");
              omniSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          })
          .catch(() => {})
          .finally(() => setStickyLoading(false));
      }, 50);
    }
  }, []);

  const handlePurchase = useCallback((totalPrice: number) => {
    setLastPurchasePrice(totalPrice);
    setToastTriggerId((prev) => prev + 1);

    // Check easter eggs
    const currentPurchases = useCartStore.getState().purchases;
    const egg = checkEasterEggs(currentPurchases);
    if (egg) {
      setTimeout(() => setActiveEgg(egg), 800);
    }
  }, []);

  const handleReset = useCallback(() => {
    reset();
    resetEasterEggs();
  }, [reset]);

  // Handle repurchase from feed
  const handleRepurchase = useCallback(
    (savedProduct: SavedProduct) => {
      useCartStore.getState().setActiveParsed(savedProduct.product);
    },
    []
  );

  return (
    <main className="min-h-screen bg-base relative">
      {/* Film grain overlay — Backlot style */}
      <div className="film-grain" aria-hidden="true" />

      {/* Dynamic atmosphere background */}
      <Atmosphere />

      {/* Combo streak floating indicator */}
      <ComboStreak />

      {/* Header */}
      <header className="relative z-10 sticky top-0 bg-base/80 backdrop-blur-xl border-b border-line/45">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-surface-bright flex items-center justify-center text-xs border border-line/30">
              💳
            </div>
            <div>
              <h1 className="text-sm font-medium text-sand tracking-wide">
                {t("app.title", locale)}
              </h1>
              <p className="text-[10px] text-ash/60 mt-0.5 hidden sm:block">
                {t("app.subtitle", locale)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language toggle */}
            <button
              onClick={toggleLocale}
              className="px-2 py-1 rounded-md text-[11px] font-medium text-stone/85 hover:text-stone bg-surface-bright/80 border border-line/40 hover:border-stone/35 transition-all"
              title={locale === "en" ? "切换到中文" : "Switch to English"}
            >
              {locale === "en" ? "中" : "EN"}
            </button>
            <ShareReceipt />
            <button
              onClick={toggleSound}
              className="text-ash/70 hover:text-stone/75 transition-colors text-sm"
              title={soundEnabled ? "Mute" : "Unmute"}
            >
              {soundEnabled ? "🔊" : "🔇"}
            </button>
            {selectedBillionaire && (
              <button
                onClick={handleReset}
                className="text-[10px] text-ash/60 hover:text-[#9B6B6B]/70 transition-colors uppercase tracking-wider font-medium"
              >
                {t("app.reset", locale)}
              </button>
            )}
          </div>
        </div>

        {/* Sticky OmniBox input — slides in when inline OmniBox scrolls out */}
        {selectedBillionaire && (
          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${stickyVisible ? "max-h-14 opacity-100" : "max-h-0 opacity-0"}`}
          >
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-2.5">
              <div className="flex items-center bg-surface/70 backdrop-blur-md border border-line/45 rounded-xl overflow-hidden shadow-stone-sm">
                <div className="pl-3 pr-1 text-ash/72 flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <kbd className="hidden sm:inline-flex text-[8px] px-1 py-px rounded bg-surface-bright/80 text-ash/65 font-mono border border-line/30 leading-none">⌘K</kbd>
                </div>
                <input
                  ref={stickyInputRef}
                  type="url"
                  value={stickyUrl}
                  onChange={(e) => setStickyUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleStickyParse()}
                  onPaste={handleStickyPaste}
                  placeholder={t("omni.placeholder", locale)}
                  disabled={stickyLoading}
                  className="flex-1 px-2 py-2 bg-transparent text-sand/90 placeholder:text-ash/72 focus:outline-none text-xs disabled:opacity-50"
                />
                <button
                  onClick={handleStickyParse}
                  disabled={stickyLoading || !stickyUrl.trim()}
                  className="mr-1.5 px-3 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-stone/20 text-stone hover:bg-stone/30 disabled:opacity-30 transition-all whitespace-nowrap"
                >
                  {stickyLoading ? "…" : t("omni.parse", locale)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gradient underline */}
        <div className="h-px bg-gradient-to-r from-transparent via-stone/15 to-transparent" />
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5 sm:space-y-8 relative z-10">
        {/* Identity selector — always visible */}
        <section className="card-panel p-5 sm:p-8">
          <IdentitySelector />
        </section>

        {/* Main content — after billionaire selection */}
        {selectedBillionaire && (
          <>
            {/* Black Card — hero, full bleed feel */}
            <section className="p-5 sm:p-8 stagger-section">
              <BlackCard />
            </section>

            {/* Billionaire Profile — wealth DNA, signature purchases, SEC filings */}
            <section className="card-panel p-5 sm:p-8 stagger-section">
              <BillionaireProfile />
            </section>

            {/* Balance — accent left border */}
            <section className="card-panel-champagne p-5 sm:p-8 stagger-section">
              <BalanceDisplay />
            </section>

            {/* ★ OmniBox — HERO position, the core shopping interaction */}
            <section ref={omniSectionRef} className="card-panel-champagne p-5 sm:p-8 stagger-section relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-stone/[0.03] to-transparent pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-base">🔗</span>
                  <h2 className="text-xs uppercase tracking-[0.2em] text-stone/75 font-medium">
                    {t("omni.sectionTitle", locale)}
                  </h2>
                </div>
                <OmniBox />
              </div>
            </section>

            {/* Purchase Feed — recent parsed & bought items */}
            <section className="card-panel p-5 sm:p-8 stagger-section">
              <PurchaseFeed onRepurchase={handleRepurchase} />
            </section>

            {/* Stats row — two cards side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 stagger-section">
              <section className="card-panel p-5">
                <SpendingSpeed />
              </section>
              <section className="card-panel p-5">
                <EarningsTicker />
              </section>
            </div>

            {/* Wealth Context — accent left border */}
            <section className="card-panel-accent p-5 sm:p-8 stagger-section">
              <WealthContext />
            </section>

            {/* Billionaire Reactions */}
            <section className="card-panel p-5 sm:p-8 stagger-section">
              <BillionaireReactions />
            </section>

            {/* Quick Buy Catalog — full width */}
            <section className="card-panel p-5 sm:p-8 stagger-section">
              <Catalog onPurchase={handlePurchase} />
            </section>

            {/* Speedrun Mode */}
            <section className="card-panel-accent p-5 sm:p-8 stagger-section">
              <SpeedrunTimer />
            </section>

            {/* Analytics row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 stagger-section">
              <section className="card-panel p-5">
                <CategoryBreakdown />
              </section>
              <section className="card-panel p-5">
                <GuiltMeter />
              </section>
            </div>

            {/* The Vault */}
            <section className="card-panel-champagne p-5 sm:p-8 stagger-section">
              <Vault />
            </section>

            {/* Achievements */}
            <section className="card-panel p-5 sm:p-8 stagger-section">
              <Achievements />
            </section>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-20 relative z-10">
        <div className="h-px bg-gradient-to-r from-transparent via-line/15 to-transparent" />
        <div className="max-w-3xl mx-auto px-4 py-8 text-center">
          <p className="text-[10px] text-ash/72 tracking-wide">
            {t("app.footer", locale)}
          </p>
        </div>
      </footer>

      {/* Overlays */}
      <BankruptOverlay />

      {/* Absurd purchase toasts */}
      {selectedBillionaire && (
        <AbsurdToast
          price={lastPurchasePrice}
          billionaireName={selectedBillionaire.name}
          earningsPerSecond={selectedBillionaire.earningsPerSecond}
          triggerId={toastTriggerId}
        />
      )}

      {/* Easter egg overlay */}
      <EasterEggOverlay egg={activeEgg} onDismiss={() => setActiveEgg(null)} />
    </main>
  );
}
