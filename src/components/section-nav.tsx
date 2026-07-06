"use client";

import { memo, useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";

/**
 * SectionNav — floating minimap / quick-jump navigator.
 * Shows all major sections with their current visibility status.
 * Click to smooth-scroll to any section. Collapses into a pill on mobile.
 */

interface NavSection {
  id: string;
  label: string;
  labelZh: string;
  emoji: string;
  selector: string; // CSS selector to find the section
}

const SECTIONS: NavSection[] = [
  { id: "hero", label: "Profile", labelZh: "档案", emoji: "👤", selector: "[data-section='profile']" },
  { id: "balance", label: "Balance", labelZh: "余额", emoji: "💰", selector: "[data-section='balance']" },
  { id: "omnibox", label: "Shop", labelZh: "购物", emoji: "🔗", selector: "[data-section='omnibox']" },
  { id: "empire", label: "Empire", labelZh: "帝国", emoji: "🏛️", selector: "[data-section='empire']" },
  { id: "stats", label: "Analytics", labelZh: "数据", emoji: "📈", selector: "[data-section='analytics']" },
  { id: "catalog", label: "Catalog", labelZh: "商品", emoji: "🛍️", selector: "[data-section='catalog']" },
  { id: "vault", label: "Vault", labelZh: "保险库", emoji: "🏦", selector: "[data-section='vault']" },
  { id: "achievements", label: "Trophies", labelZh: "成就", emoji: "🏆", selector: "[data-section='achievements']" },
];

function SectionNavInner() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const [scrollProgress, setScrollProgress] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Track which section is in view
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? scrollTop / docHeight : 0);
    };

    // IntersectionObserver to track visible sections
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute("data-section");
            if (sectionId) setActiveSection(sectionId);
          }
        }
      },
      { rootMargin: "-30% 0px -50% 0px", threshold: 0 }
    );

    // Observe all data-section elements
    const sections = document.querySelectorAll("[data-section]");
    sections.forEach((el) => observerRef.current?.observe(el));

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observerRef.current?.disconnect();
    };
  }, [selectedBillionaire]);

  const handleJump = useCallback((selector: string) => {
    const el = document.querySelector(selector);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setIsOpen(false);
    }
  }, []);

  if (!selectedBillionaire) return null;

  const activeSectionData = SECTIONS.find(
    (s) => s.selector === `[data-section='${activeSection}']`
  );

  return (
    <>
      {/* Collapsed pill — bottom-right, above scroll-to-top */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="fixed bottom-24 right-4 z-40"
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-ink/80 backdrop-blur-md border border-white/10 shadow-lg hover:bg-ink/90 transition-all group"
          aria-label={locale === "zh" ? "快速导航" : "Quick navigation"}
        >
          {/* Progress ring */}
          <svg width="18" height="18" viewBox="0 0 18 18" className="flex-shrink-0">
            <circle cx="9" cy="9" r="7" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
            <circle
              cx="9" cy="9" r="7" fill="none"
              stroke="rgba(166,133,48,0.8)"
              strokeWidth="2"
              strokeDasharray={2 * Math.PI * 7}
              strokeDashoffset={2 * Math.PI * 7 * (1 - scrollProgress)}
              strokeLinecap="round"
              className="-rotate-90 origin-center transition-all duration-300"
            />
          </svg>
          <span className="text-[9px] font-mono text-white/70 uppercase tracking-wider hidden sm:inline">
            {activeSectionData
              ? (locale === "zh" ? activeSectionData.labelZh : activeSectionData.label)
              : locale === "zh" ? "导航" : "NAV"}
          </span>
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            className="text-white/50 text-[10px]"
          >
            ▲
          </motion.span>
        </button>
      </motion.div>

      {/* Expanded nav panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
              onClick={() => setIsOpen(false)}
            />
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="fixed bottom-40 right-4 z-50 w-48 rounded-xl bg-ink/90 backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="p-3">
                <div className="text-[9px] text-white/40 uppercase tracking-wider font-mono mb-2">
                  {locale === "zh" ? "快速导航" : "Quick Jump"}
                </div>
                <div className="space-y-0.5">
                  {SECTIONS.map((section) => {
                    const isActive = activeSection === section.selector.match(/data-section='(.+?)'/)?.[1];
                    return (
                      <button
                        key={section.id}
                        onClick={() => handleJump(section.selector)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all ${
                          isActive
                            ? "bg-champagne/20 text-champagne-light"
                            : "text-white/60 hover:bg-white/10 hover:text-white/80"
                        }`}
                      >
                        <span className="text-[10px] w-4 text-center">{section.emoji}</span>
                        <span className="text-[10px] font-mono">
                          {locale === "zh" ? section.labelZh : section.label}
                        </span>
                        {isActive && (
                          <motion.div
                            layoutId="nav-indicator"
                            className="ml-auto w-1 h-1 rounded-full bg-champagne"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-0.5 bg-white/5">
                <div
                  className="h-full bg-champagne/40 transition-all duration-300"
                  style={{ width: `${scrollProgress * 100}%` }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export const SectionNav = memo(SectionNavInner);
