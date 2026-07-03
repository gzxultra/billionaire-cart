"use client";

import { useState, useCallback } from "react";
import { useCartStore } from "@/lib/store";
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
import { ComboStreak } from "@/components/combo-streak";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { GuiltMeter } from "@/components/guilt-meter";
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

  // Absurd toast state
  const [lastPurchasePrice, setLastPurchasePrice] = useState(0);
  const [toastTriggerId, setToastTriggerId] = useState(0);

  // Easter egg state
  const [activeEgg, setActiveEgg] = useState<EasterEgg | null>(null);

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

  return (
    <main className="min-h-screen bg-vanta relative">
      {/* Dynamic atmosphere background */}
      <Atmosphere />

      {/* Combo streak floating indicator */}
      <ComboStreak />

      {/* Header */}
      <header className="border-b border-charcoal-600/10 relative z-10">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-medium text-white/80 tracking-wide">
              Billionaire Cart
            </h1>
            <p className="text-[10px] text-white/15 uppercase tracking-[0.3em] mt-0.5">
              Universal Checkout Simulation
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ShareReceipt />
            <button
              onClick={toggleSound}
              className="text-white/20 hover:text-copper/60 transition-colors text-sm"
              title={soundEnabled ? "Mute" : "Unmute"}
            >
              {soundEnabled ? "🔊" : "🔇"}
            </button>
            {selectedBillionaire && (
              <button
                onClick={handleReset}
                className="text-[10px] text-white/15 hover:text-red-400/50 transition-colors uppercase tracking-wider"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 relative z-10">
        {/* Identity selector — always visible */}
        <section className="glass-panel p-6">
          <IdentitySelector />
        </section>

        {/* Main content — after billionaire selection */}
        {selectedBillionaire && (
          <>
            {/* Black Card */}
            <section className="glass-panel p-6">
              <BlackCard />
            </section>

            {/* Balance */}
            <section className="glass-panel p-6">
              <BalanceDisplay />
            </section>

            {/* Wealth Context (milestones + comparisons) */}
            <section className="glass-panel p-6">
              <WealthContext />
            </section>

            {/* Billionaire Reactions */}
            <section className="glass-panel p-6">
              <BillionaireReactions />
            </section>

            {/* Spending Speed */}
            <section className="glass-panel p-6">
              <SpendingSpeed />
            </section>

            {/* Earnings Velocity */}
            <section className="glass-panel p-6">
              <EarningsTicker />
            </section>

            {/* Quick Buy Catalog */}
            <section className="glass-panel p-6">
              <Catalog onPurchase={handlePurchase} />
            </section>

            {/* Speedrun Mode */}
            <section className="glass-panel p-6">
              <SpeedrunTimer />
            </section>

            {/* Category Breakdown */}
            <section className="glass-panel p-6">
              <CategoryBreakdown />
            </section>

            {/* Real-World Impact */}
            <section className="glass-panel p-6">
              <GuiltMeter />
            </section>

            {/* Omni-Box */}
            <section className="glass-panel p-6">
              <OmniBox />
            </section>

            {/* The Vault */}
            <section className="glass-panel p-6">
              <Vault />
            </section>

            {/* Achievements */}
            <section className="glass-panel p-6">
              <Achievements />
            </section>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-charcoal-600/5 mt-16 relative z-10">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center">
          <p className="text-[9px] text-white/10 uppercase tracking-[0.2em]">
            Simulation only — no real purchases are made
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
