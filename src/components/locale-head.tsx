"use client";

import { useEffect } from "react";
import { useLocale } from "@/lib/use-locale";

/**
 * Syncs the HTML lang attribute with the current locale.
 * Placed in the body since layout.tsx is a server component
 * and can't dynamically set <html lang>.
 */
export function LocaleHead() {
  const locale = useLocale((s) => s.locale);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

  return null;
}
