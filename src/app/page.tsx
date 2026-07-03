"use client";

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

export default function Home() {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const soundEnabled = useCartStore((s) => s.soundEnabled);
  const toggleSound = useCartStore((s) => s.toggleSound);
  const reset = useCartStore((s) => s.reset);

  return (
    <main className="min-h-screen bg-vanta">
      {/* Header */}
      <header className="border-b border-charcoal-600/10">
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
                onClick={reset}
                className="text-[10px] text-white/15 hover:text-red-400/50 transition-colors uppercase tracking-wider"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
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
              <Catalog />
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
      <footer className="border-t border-charcoal-600/5 mt-16">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center">
          <p className="text-[9px] text-white/10 uppercase tracking-[0.2em]">
            Simulation only — no real purchases are made
          </p>
        </div>
      </footer>

      {/* Bankrupt overlay */}
      <BankruptOverlay />
    </main>
  );
}
