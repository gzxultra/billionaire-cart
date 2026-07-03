"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale } from "@/lib/i18n";

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

export const useLocale = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: "zh" as Locale,
      setLocale: (locale: Locale) => set({ locale }),
      toggleLocale: () =>
        set({ locale: get().locale === "en" ? "zh" : "en" }),
    }),
    { name: "bc-locale" }
  )
);
