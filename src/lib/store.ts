"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Billionaire, Purchase, Achievement, ParsedProduct, SavedProduct } from "@/lib/types";
import { billionaires } from "@/data/billionaires";
import { achievements as defaultAchievements, checkAchievements } from "@/data/achievements";
import { useLiveData } from "@/lib/use-live-data";
import { generateId } from "@/lib/format";

const MAX_SAVED_PRODUCTS = 50;

interface CartState {
  selectedBillionaire: Billionaire | null;
  purchases: Purchase[];
  achievements: Achievement[];
  soundEnabled: boolean;
  fastCheckout: boolean;
  savedProducts: SavedProduct[];
  activeParsedProduct: ParsedProduct | null;
  selectBillionaire: (id: string) => void;
  addPurchase: (purchase: Purchase) => string[]; // returns newly unlocked achievement names
  removePurchase: (id: string) => void;
  toggleSound: () => void;
  toggleFastCheckout: () => void;
  reset: () => void;
  saveProduct: (product: ParsedProduct) => void;
  removeSavedProduct: (id: string) => void;
  clearAllSavedProducts: () => void;
  incrementPurchaseCount: (id: string) => void;
  setActiveParsed: (product: ParsedProduct | null) => void;
}

function resolveBillionaire(id: string): Billionaire | null {
  // Try live data first, then fall back to static
  const liveState = useLiveData.getState();
  if (liveState.loaded) {
    const merged = liveState.getMerged();
    const found = merged.find((x) => x.id === id);
    if (found) return found;
  }
  return billionaires.find((x) => x.id === id) || null;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      selectedBillionaire: null,
      purchases: [],
      achievements: defaultAchievements,
      soundEnabled: true,
      fastCheckout: false,
      savedProducts: [],
      activeParsedProduct: null,

      selectBillionaire: (id: string) => {
        const b = resolveBillionaire(id);
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

      toggleFastCheckout: () => set({ fastCheckout: !get().fastCheckout }),

      reset: () =>
        set({
          selectedBillionaire: null,
          purchases: [],
          achievements: defaultAchievements,
        }),

      saveProduct: (product: ParsedProduct) => {
        const existing = get().savedProducts;
        // Dedupe by sourceUrl
        const isDupe = existing.some((sp) => sp.product.sourceUrl === product.sourceUrl);
        if (isDupe) {
          // Update existing entry with fresh data
          set({
            savedProducts: existing.map((sp) =>
              sp.product.sourceUrl === product.sourceUrl
                ? { ...sp, product, parsedAt: Date.now() }
                : sp
            ),
          });
          return;
        }
        const newEntry: SavedProduct = {
          id: generateId(),
          product,
          parsedAt: Date.now(),
          purchaseCount: 0,
        };
        // Prepend and cap at MAX
        set({
          savedProducts: [newEntry, ...existing].slice(0, MAX_SAVED_PRODUCTS),
        });
      },

      removeSavedProduct: (id: string) => {
        set({ savedProducts: get().savedProducts.filter((sp) => sp.id !== id) });
      },

      clearAllSavedProducts: () => {
        set({ savedProducts: [] });
      },

      incrementPurchaseCount: (id: string) => {
        set({
          savedProducts: get().savedProducts.map((sp) =>
            sp.id === id ? { ...sp, purchaseCount: sp.purchaseCount + 1 } : sp
          ),
        });
      },

      setActiveParsed: (product: ParsedProduct | null) => {
        set({ activeParsedProduct: product });
      },
    }),
    {
      name: "billionaire-cart-storage",
      partialize: (state) => ({
        selectedBillionaire: state.selectedBillionaire,
        purchases: state.purchases,
        achievements: state.achievements,
        soundEnabled: state.soundEnabled,
        fastCheckout: state.fastCheckout,
        savedProducts: state.savedProducts,
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
