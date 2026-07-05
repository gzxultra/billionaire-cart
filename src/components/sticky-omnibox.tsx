"use client";

import { useState, useCallback, useRef, useEffect, memo } from "react";
import { useCartStore } from "@/lib/store";
import { useLocale } from "@/lib/use-locale";
import { useUrlParse } from "@/lib/use-url-parse";
import { t } from "@/lib/i18n";

interface StickyOmniBoxProps {
  /** Ref to the inline OmniBox section — visibility toggling anchors on it */
  omniSectionRef: React.RefObject<HTMLElement | null>;
}

/**
 * StickyOmniBox — a compact URL input bar that appears in the header
 * when the inline OmniBox scrolls out of view.
 * Supports paste-to-parse and ⌘K keyboard shortcut focus.
 */
function StickyOmniBoxInner({ omniSectionRef }: StickyOmniBoxProps) {
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const setActiveParsed = useCartStore((s) => s.setActiveParsed);
  const locale = useLocale((s) => s.locale);

  const inputRef = useRef<HTMLInputElement>(null);
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState("");

  const { loading, parseUrl } = useUrlParse();

  // Track inline OmniBox visibility via IntersectionObserver
  useEffect(() => {
    const target = omniSectionRef.current;
    if (!target) return;
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
    );
    obs.observe(target);
    return () => obs.disconnect();
  }, [omniSectionRef, selectedBillionaire]);

  // ⌘K / Ctrl+K — global shortcut to focus the right OmniBox
  useEffect(() => {
    if (!selectedBillionaire) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (visible && inputRef.current) {
          inputRef.current.focus();
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
  }, [selectedBillionaire, visible]);

  const handleParse = useCallback(async () => {
    const target = url.trim();
    if (!target) return;

    await parseUrl(target, {
      onSuccess: (product) => {
        setActiveParsed(product);
        setUrl("");
        omniSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      },
    });
  }, [url, parseUrl, setActiveParsed, omniSectionRef]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const pasted = e.clipboardData.getData("text");
      if (pasted && /^https?:\/\//i.test(pasted.trim())) {
        const cleanUrl = pasted.trim();
        setUrl(cleanUrl);
        setTimeout(async () => {
          await parseUrl(cleanUrl, {
            onSuccess: (product) => {
              setActiveParsed(product);
              setUrl("");
              omniSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            },
          });
        }, 50);
      }
    },
    [parseUrl, setActiveParsed, omniSectionRef]
  );

  if (!selectedBillionaire) return null;

  return (
    <div
      className={`overflow-hidden transition-all duration-300 ease-out ${
        visible ? "max-h-14 opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-2.5">
        <div className="flex items-center bg-surface/70 backdrop-blur-md border border-line/45 rounded-xl overflow-hidden shadow-stone-sm">
          <div className="pl-3 pr-1 text-ash/72 flex items-center gap-1">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <kbd className="hidden sm:inline-flex text-[8px] px-1 py-px rounded bg-surface-bright/80 text-ash/65 font-mono border border-line/30 leading-none">
              ⌘K
            </kbd>
          </div>
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleParse()}
            onPaste={handlePaste}
            placeholder={t("omni.placeholder", locale)}
            disabled={loading}
            className="flex-1 px-2 py-2 bg-transparent text-sand/90 placeholder:text-ash/72 focus:outline-none text-xs disabled:opacity-50"
          />
          <button
            onClick={handleParse}
            disabled={loading || !url.trim()}
            className="mr-1.5 px-3 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-stone/20 text-stone hover:bg-stone/30 disabled:opacity-30 transition-all whitespace-nowrap"
          >
            {loading ? "…" : t("omni.parse", locale)}
          </button>
        </div>
      </div>
    </div>
  );
}

export const StickyOmniBox = memo(StickyOmniBoxInner);
