"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Billionaire, Purchase, Achievement } from "@/lib/types";
import { billionaires } from "@/data/billionaires";
import { achievements as defaultAchievements, checkAchievements } from "@/data/achievements";

interface CartState {
  selectedBillionaire: Billionaire | null;
  purchases: Purchase[];
  achievements: Achievement[];
  soundEnabled: boolean;
  selectBillionaire: (id: string) => void;
  addPurchase: (purchase: Purchase) => string[]; // returns newly unlocked achievement names
  removePurchase: (id: string) => void;
  toggleSound: () => void;
  reset: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      selectedBillionaire: null,
      purchases: [],
      achievements: defaultAchievements,
      soundEnabled: true,

      selectBillionaire: (id: string) => {
        const b = billionaires.find((x) => x.id === id) || null;
        set({ selectedBillionaire: b, purchases: [], achievements: defaultAchievements });
      },

      addPurchase: (purchase: Purchase) => {
        const newPurchases = [...get().purchases, purchase];
        const { updated, newlyUnlocked } = checkAchievements(
          newPurchases,
          get().achievements
        );
        set({ purchases: newPurchases, achievements: updated });
        return newlyUnlocked.map((a) => a.name);
      },

      removePurchase: (id: string) => {
        set({ purchases: get().purchases.filter((p) => p.id !== id) });
      },

      toggleSound: () => set({ soundEnabled: !get().soundEnabled }),

      reset: () =>
        set({
          selectedBillionaire: null,
          purchases: [],
          achievements: defaultAchievements,
        }),
    }),
    {
      name: "billionaire-cart-storage",
      partialize: (state) => ({
        selectedBillionaire: state.selectedBillionaire,
        purchases: state.purchases,
        achievements: state.achievements,
        soundEnabled: state.soundEnabled,
      }),
    }
  )
);

// Selectors
export const selectTotalSpent = (state: CartState) =>
  state.purchases.reduce((sum, p) => sum + p.product.price, 0);

export const selectMonthlyBurn = (state: CartState) =>
  state.purchases.reduce((sum, p) => sum + p.product.monthlyOverhead, 0);

export const selectNetWorth = (state: CartState) =>
  state.selectedBillionaire
    ? state.selectedBillionaire.netWorthB * 1_000_000_000
    : 0;

export const selectRemaining = (state: CartState) =>
  selectNetWorth(state) - selectTotalSpent(state);
