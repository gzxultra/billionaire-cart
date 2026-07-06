"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useCartStore } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";
import { t } from "@/lib/i18n";
import { SavedProduct } from "@/lib/types";
import { catalogItems } from "@/data/catalog";
import { IdentitySelector } from "@/components/identity-selector";
import { BalanceDisplay } from "@/components/balance-display";
import { EarningsTicker } from "@/components/earnings-ticker";
import { BlackCard } from "@/components/black-card";
import { OmniBox } from "@/components/omni-box";
import { Catalog } from "@/components/catalog";
import { WealthContext } from "@/components/wealth-context";
import { SpendingSpeed } from "@/components/spending-speed";
import { BankruptOverlay } from "@/components/bankrupt-overlay";
import { AbsurdToast } from "@/components/absurd-toast";
import { Atmosphere } from "@/components/atmosphere";
import { EasterEggOverlay } from "@/components/easter-egg-overlay";
import { BillionaireProfile } from "@/components/billionaire-profile";
import { ComboStreak } from "@/components/combo-streak";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { ScrollToTop } from "@/components/scroll-to-top";
import { WelcomeHero } from "@/components/welcome-hero";
import { ShareReceipt } from "@/components/share-receipt";
import { FloatingHud } from "@/components/floating-hud";
import { ConfettiBurst } from "@/components/confetti-burst";
import { MilestoneCelebration } from "@/components/milestone-celebration";
import { StickyOmniBox } from "@/components/sticky-omnibox";
import { SectionErrorBoundary } from "@/components/error-boundary";
import { SectionSkeleton, StatCardSkeleton } from "@/components/section-skeleton";
import { SpendingRing } from "@/components/spending-ring";
import { UndoToast } from "@/components/undo-toast";
import { FortuneBar } from "@/components/fortune-bar";
import { QuickSwitcher } from "@/components/quick-switcher";
import { SessionReport } from "@/components/session-report";
import { WealthRace } from "@/components/wealth-race";
import { ShoppingPersonality } from "@/components/shopping-personality";
import { CompareCard } from "@/components/compare-card";
import { SpendingPulse } from "@/components/spending-pulse";
import {
  checkEasterEggs,
  resetEasterEggs,
  type EasterEgg,
} from "@/data/easter-eggs";
import { SpendingNewsTicker } from "@/components/spending-news-ticker";
import { EarnBackTimer } from "@/components/earn-back-timer";
import { SpendingPowerCards } from "@/components/spending-power";

// ─── Lazy-loaded below-fold components (with skeleton loading states) ─
const YoloMode = dynamic(() => import("@/components/yolo-mode").then(m => ({ default: m.YoloMode })), { ssr: false, loading: () => <SectionSkeleton lines={3} /> });
const PriceIsRight = dynamic(() => import("@/components/price-is-right").then(m => ({ default: m.PriceIsRight })), { ssr: false, loading: () => <SectionSkeleton lines={4} /> });
const ImpulseAisle = dynamic(() => import("@/components/impulse-aisle").then(m => ({ default: m.ImpulseAisle })), { ssr: false, loading: () => <SectionSkeleton lines={3} /> });
const Vault = dynamic(() => import("@/components/vault").then(m => ({ default: m.Vault })), { ssr: false, loading: () => <SectionSkeleton lines={4} /> });
const Achievements = dynamic(() => import("@/components/achievements").then(m => ({ default: m.Achievements })), { ssr: false, loading: () => <SectionSkeleton lines={3} /> });
const SpeedrunTimer = dynamic(() => import("@/components/speedrun-timer").then(m => ({ default: m.SpeedrunTimer })), { ssr: false, loading: () => <SectionSkeleton lines={2} /> });
const BillionaireReactions = dynamic(() => import("@/components/billionaire-reactions").then(m => ({ default: m.BillionaireReactions })), { ssr: false, loading: () => <SectionSkeleton lines={3} /> });
const CategoryBreakdown = dynamic(() => import("@/components/category-breakdown").then(m => ({ default: m.CategoryBreakdown })), { ssr: false, loading: () => <StatCardSkeleton /> });
const GuiltMeter = dynamic(() => import("@/components/guilt-meter").then(m => ({ default: m.GuiltMeter })), { ssr: false, loading: () => <StatCardSkeleton /> });
const PurchaseFeed = dynamic(() => import("@/components/purchase-feed").then(m => ({ default: m.PurchaseFeed })), { ssr: false, loading: () => <SectionSkeleton lines={4} /> });
const SpendingTimeline = dynamic(() => import("@/components/spending-timeline").then(m => ({ default: m.SpendingTimeline })), { ssr: false, loading: () => <SectionSkeleton lines={3} height="140px" /> });
const SpendingEquivalences = dynamic(() => import("@/components/spending-equivalences").then(m => ({ default: m.SpendingEquivalences })), { ssr: false, loading: () => <SectionSkeleton lines={2} /> });
const WealthPerspective = dynamic(() => import("@/components/wealth-perspective").then(m => ({ default: m.WealthPerspective })), { ssr: false, loading: () => <SectionSkeleton lines={2} /> });
const BudgetChallenge = dynamic(() => import("@/components/budget-challenge").then(m => ({ default: m.BudgetChallenge })), { ssr: false, loading: () => <SectionSkeleton lines={3} /> });
const BankruptcyCountdown = dynamic(() => import("@/components/bankruptcy-countdown").then(m => ({ default: m.BankruptcyCountdown })), { ssr: false });
const PurchaseHallOfFame = dynamic(() => import("@/components/purchase-hall-of-fame").then(m => ({ default: m.PurchaseHallOfFame })), { ssr: false, loading: () => <SectionSkeleton lines={4} /> });
const WhatElseCould = dynamic(() => import("@/components/what-else-could").then(m => ({ default: m.WhatElseCould })), { ssr: false });
const SpendingMilestoneTracker = dynamic(() => import("@/components/spending-milestone-tracker").then(m => ({ default: m.SpendingMilestoneTracker })), { ssr: false, loading: () => <SectionSkeleton lines={4} /> });
const SpendingReplay = dynamic(() => import("@/components/spending-replay").then(m => ({ default: m.SpendingReplay })), { ssr: false });

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

  // Confetti celebration state
  const [confettiTriggerId, setConfettiTriggerId] = useState(0);
  const triggerConfetti = useCallback(() => {
    setConfettiTriggerId((prev) => prev + 1);
  }, []);

  // Ref to the inline OmniBox section — shared with StickyOmniBox
  const omniSectionRef = useRef<HTMLElement>(null);

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
    <main className="min-h-screen bg-base relative" id="main-content">
      {/* Film grain overlay — Backlot style */}
      <div className="film-grain" aria-hidden="true" />

      {/* Dynamic atmosphere background */}
      <Atmosphere />

      {/* Combo streak floating indicator */}
      <ComboStreak />

      {/* Header */}
      <header className="relative z-10 sticky top-0 bg-base/80 backdrop-blur-xl border-b border-line/45" role="banner">
        <nav className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between" aria-label={locale === "zh" ? "主导航" : "Main navigation"}>
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
            {/* Spending progress ring */}
            <SpendingRing />
            {/* Quick billionaire switcher */}
            <QuickSwitcher />
            {/* Language toggle */}
            <button
              onClick={toggleLocale}
              className="px-2 py-1 rounded-md text-[11px] font-medium text-stone/85 hover:text-stone bg-surface-bright/80 border border-line/40 hover:border-stone/35 transition-all"
              title={locale === "en" ? "切换到中文" : "Switch to English"}
              aria-label={locale === "en" ? "Switch to Chinese / 切换到中文" : "Switch to English"}
            >
              {locale === "en" ? "中" : "EN"}
            </button>
            <ShareReceipt />
            <button
              onClick={toggleSound}
              className="text-ash/70 hover:text-stone/75 transition-colors text-sm"
              title={soundEnabled ? "Mute" : "Unmute"}
              aria-label={soundEnabled ? (locale === "zh" ? "关闭声音" : "Mute sounds") : (locale === "zh" ? "开启声音" : "Unmute sounds")}
              aria-pressed={soundEnabled}
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
        </nav>

        {/* Sticky OmniBox — slides in when inline OmniBox scrolls out */}
        <StickyOmniBox omniSectionRef={omniSectionRef} />

        {/* Gradient underline */}
        <div className="h-px bg-gradient-to-r from-transparent via-stone/15 to-transparent" />
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5 sm:space-y-8 relative z-10">
        {/* Identity selector — with hero intro */}
        {!selectedBillionaire && <WelcomeHero />}
        <section className="card-panel p-5 sm:p-8">
          <SectionErrorBoundary section="Identity Selector">
            <IdentitySelector />
          </SectionErrorBoundary>
        </section>

        {/* Main content — after billionaire selection */}
        {selectedBillionaire && (
          <>
            {/* Black Card — hero, full bleed feel */}
            <section className="p-5 sm:p-8 stagger-section">
              <SectionErrorBoundary section="Black Card" silent>
                <BlackCard />
              </SectionErrorBoundary>
            </section>

            {/* Fortune Health Bar — spending depletion progress */}
            <SectionErrorBoundary section="Fortune Bar" silent>
              <FortuneBar />
            </SectionErrorBoundary>

            {/* Bankruptcy Countdown — time until broke at current pace */}
            <SectionErrorBoundary section="Bankruptcy Countdown" silent>
              <BankruptcyCountdown />
            </SectionErrorBoundary>

            {/* Earn-Back Timer — live countdown for billionaire to earn back spending */}
            <SectionErrorBoundary section="Earn-Back Timer" silent>
              <EarnBackTimer />
            </SectionErrorBoundary>

            {/* Billionaire Profile — wealth DNA, signature purchases, SEC filings */}
            <section className="card-panel p-5 sm:p-8 stagger-section">
              <SectionErrorBoundary section="Billionaire Profile">
                <BillionaireProfile />
              </SectionErrorBoundary>
            </section>

            {/* Billionaire Comparison — side-by-side duel */}
            <SectionErrorBoundary section="Compare Card" silent>
              <CompareCard />
            </SectionErrorBoundary>

            {/* Balance — accent left border */}
            <section className="card-panel-champagne p-5 sm:p-8 stagger-section">
              <SectionErrorBoundary section="Balance">
                <BalanceDisplay />
              </SectionErrorBoundary>
            </section>

            {/* Spending News Ticker — live scrolling headlines */}
            <SectionErrorBoundary section="Spending News Ticker" silent>
              <SpendingNewsTicker />
            </SectionErrorBoundary>

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
                <SectionErrorBoundary section="OmniBox">
                  <OmniBox />
                </SectionErrorBoundary>
              </div>
            </section>

            {/* Purchase Feed — recent parsed & bought items */}
            <section className="card-panel p-5 sm:p-8 stagger-section">
              <SectionErrorBoundary section="Purchase Feed">
                <PurchaseFeed onRepurchase={handleRepurchase} />
              </SectionErrorBoundary>
            </section>

            {/* What Else Could You Buy — alternatives for same price as last purchase */}
            <SectionErrorBoundary section="What Else Could" silent>
              <WhatElseCould />
            </SectionErrorBoundary>

            {/* Stats row — two cards side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 stagger-section">
              <section className="card-panel p-5">
                <SectionErrorBoundary section="Spending Speed" silent>
                  <SpendingSpeed />
                </SectionErrorBoundary>
              </section>
              <section className="card-panel p-5">
                <SectionErrorBoundary section="Earnings Ticker" silent>
                  <EarningsTicker />
                </SectionErrorBoundary>
              </section>
            </div>

            {/* Spending Pulse — heartbeat visualization of spending intensity */}
            <SectionErrorBoundary section="Spending Pulse" silent>
              <SpendingPulse />
            </SectionErrorBoundary>

            {/* Net Worth Race — earnings vs spending animated race */}
            <SectionErrorBoundary section="Wealth Race" silent>
              <WealthRace />
            </SectionErrorBoundary>

            {/* Spending Timeline — purchase history sparkline */}
            <section className="card-panel p-5 sm:p-8 stagger-section">
              <SectionErrorBoundary section="Spending Timeline">
                <SpendingTimeline />
              </SectionErrorBoundary>
            </section>

            {/* Spending Replay — rewatch your spending spree in fast-forward */}
            <SectionErrorBoundary section="Spending Replay" silent>
              <SpendingReplay />
            </SectionErrorBoundary>

            {/* Purchase Hall of Fame — top purchases ranked with medals */}
            <SectionErrorBoundary section="Purchase Hall of Fame" silent>
              <PurchaseHallOfFame />
            </SectionErrorBoundary>

            {/* Spending Milestone Tracker — world-scale spending progress track */}
            <SectionErrorBoundary section="Spending Milestone Tracker" silent>
              <SpendingMilestoneTracker />
            </SectionErrorBoundary>

            {/* Session Report — gamified session statistics */}
            <SectionErrorBoundary section="Session Report" silent>
              <SessionReport />
            </SectionErrorBoundary>

            {/* Shopping Personality — fun archetype reveal based on purchase patterns */}
            <SectionErrorBoundary section="Shopping Personality" silent>
              <ShoppingPersonality />
            </SectionErrorBoundary>

            {/* Spending Equivalences — fun "your spending = X Big Macs" comparison */}
            <section className="card-panel p-5 sm:p-8 stagger-section">
              <SectionErrorBoundary section="Spending Equivalences" silent>
                <SpendingEquivalences />
              </SectionErrorBoundary>
            </section>

            {/* Wealth Perspective — mind-blowing wealth comparisons */}
            <section className="card-panel p-5 sm:p-8 stagger-section">
              <SectionErrorBoundary section="Wealth Perspective" silent>
                <WealthPerspective />
              </SectionErrorBoundary>
            </section>

            {/* Spending Power Cards — animated carousel of real-world equivalents */}
            <SectionErrorBoundary section="Spending Power Cards" silent>
              <SpendingPowerCards />
            </SectionErrorBoundary>

            {/* Wealth Context — accent left border */}
            <section className="card-panel-accent p-5 sm:p-8 stagger-section">
              <SectionErrorBoundary section="Wealth Context">
                <WealthContext />
              </SectionErrorBoundary>
            </section>

            {/* Billionaire Reactions */}
            <section className="card-panel p-5 sm:p-8 stagger-section">
              <SectionErrorBoundary section="Billionaire Reactions" silent>
                <BillionaireReactions />
              </SectionErrorBoundary>
            </section>

            {/* Quick Buy Catalog — full width */}
            <section className="card-panel p-5 sm:p-8 stagger-section">
              <SectionErrorBoundary section="Catalog">
                <Catalog onPurchase={handlePurchase} />
              </SectionErrorBoundary>
            </section>

            {/* Impulse Aisle — smart recommendations based on purchase history */}
            <SectionErrorBoundary section="Impulse Aisle" silent>
              <ImpulseAisle onPurchase={handlePurchase} />
            </SectionErrorBoundary>

            {/* YOLO Mode — auto-buy madness */}
            <SectionErrorBoundary section="YOLO Mode" silent>
              <YoloMode onPurchase={handlePurchase} />
            </SectionErrorBoundary>

            {/* Price Is Right — guess the price mini-game */}
            <SectionErrorBoundary section="Price Is Right" silent>
              <PriceIsRight />
            </SectionErrorBoundary>

            {/* Speedrun Mode */}
            <section className="card-panel-accent p-5 sm:p-8 stagger-section">
              <SectionErrorBoundary section="Speedrun Timer" silent>
                <SpeedrunTimer />
              </SectionErrorBoundary>
            </section>

            {/* Analytics row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 stagger-section">
              <section className="card-panel p-5">
                <SectionErrorBoundary section="Category Breakdown" silent>
                  <CategoryBreakdown />
                </SectionErrorBoundary>
              </section>
              <section className="card-panel p-5">
                <SectionErrorBoundary section="Guilt Meter" silent>
                  <GuiltMeter />
                </SectionErrorBoundary>
              </section>
            </div>

            {/* Budget Challenge — mini-game: hit the target spending amount */}
            <section className="card-panel-accent p-5 sm:p-8 stagger-section">
              <SectionErrorBoundary section="Budget Challenge" silent>
                <BudgetChallenge />
              </SectionErrorBoundary>
            </section>

            {/* The Vault */}
            <section className="card-panel-champagne p-5 sm:p-8 stagger-section">
              <SectionErrorBoundary section="Vault">
                <Vault />
              </SectionErrorBoundary>
            </section>

            {/* Achievements */}
            <section className="card-panel p-5 sm:p-8 stagger-section">
              <SectionErrorBoundary section="Achievements">
                <Achievements />
              </SectionErrorBoundary>
            </section>
          </>
        )}
      </div>

      {/* Live region for screen reader purchase announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="purchase-announcer"
      />

      {/* Footer */}
      <footer className="mt-20 relative z-10" role="contentinfo">
        <div className="h-px bg-gradient-to-r from-transparent via-line/15 to-transparent" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Fun stats row — only when a billionaire is selected */}
          {selectedBillionaire && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center">
                <div className="text-[10px] text-ash/50 uppercase tracking-wider font-mono mb-1">
                  {locale === "zh" ? "商品目录" : "Catalog"}
                </div>
                <div className="text-sm font-serif text-stone/70">{catalogItems.length}</div>
                <div className="text-[9px] text-ash/45">{locale === "zh" ? "件商品" : "items"}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-ash/50 uppercase tracking-wider font-mono mb-1">
                  {locale === "zh" ? "价格范围" : "Price Range"}
                </div>
                <div className="text-sm font-serif text-stone/70">$2.90 — $220B</div>
                <div className="text-[9px] text-ash/45">{locale === "zh" ? "从地铁票到世界杯" : "subway to World Cup"}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-ash/50 uppercase tracking-wider font-mono mb-1">
                  {locale === "zh" ? "快捷键" : "Shortcuts"}
                </div>
                <div className="text-sm font-serif text-stone/70 kbd-hint">?</div>
                <div className="text-[9px] text-ash/45">{locale === "zh" ? "按 ? 查看" : "press to view"}</div>
              </div>
            </div>
          )}
          <div className="text-center space-y-2">
            <p className="text-[10px] text-ash/50 tracking-wide">
              {t("app.footer", locale)}
            </p>
            <p className="text-[9px] text-ash/35 font-mono">
              {locale === "zh" ? "用 ❤️ 和大把虚拟钞票制作" : "Made with ❤️ and entirely imaginary money"}
            </p>
          </div>
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

      {/* Keyboard shortcuts overlay (press ?) */}
      <KeyboardShortcuts />

      {/* Purchase undo toast — 5s undo window after each purchase */}
      <UndoToast />

      {/* Floating scroll-to-top with progress ring */}
      <ScrollToTop />

      {/* Floating balance HUD — bottom left, shows when scrolled past balance */}
      <FloatingHud />

      {/* Milestone celebration tracker — invisible, fires toasts + confetti */}
      <MilestoneCelebration onConfetti={triggerConfetti} />

      {/* Confetti burst overlay */}
      <ConfettiBurst triggerId={confettiTriggerId} />
    </main>
  );
}
