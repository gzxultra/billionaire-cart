"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/lib/use-locale";
import { useCartStore } from "@/lib/store";

const SHORTCUTS = [
  { keys: ["⌘", "K"], en: "Focus search", zh: "聚焦搜索" },
  { keys: ["Enter"], en: "Authorize purchase", zh: "授权购买" },
  { keys: ["?"], en: "Show shortcuts", zh: "显示快捷键" },
  { keys: ["Esc"], en: "Close overlay", zh: "关闭弹窗" },
];

function KeyboardShortcutsInner() {
  const [visible, setVisible] = useState(false);
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);

  const toggle = useCallback(() => setVisible((v) => !v), []);

  useEffect(() => {
    if (!selectedBillionaire) return;

    const handler = (e: KeyboardEvent) => {
      // ? key (shift+/) to show shortcuts
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
        e.preventDefault();
        toggle();
      }
      // Escape to close
      if (e.key === "Escape" && visible) {
        setVisible(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedBillionaire, visible, toggle]);

  if (!selectedBillionaire) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setVisible(false)}
          role="dialog"
          aria-modal="true"
          aria-label={locale === "zh" ? "键盘快捷键" : "Keyboard shortcuts"}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="bg-surface border border-line/50 rounded-2xl shadow-glass p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xs uppercase tracking-[0.2em] text-stone/80 font-medium mb-4">
              {locale === "zh" ? "⌨️ 键盘快捷键" : "⌨️ Keyboard Shortcuts"}
            </h2>
            <div className="space-y-3">
              {SHORTCUTS.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-sand/85">
                    {locale === "zh" ? s.zh : s.en}
                  </span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k, j) => (
                      <kbd
                        key={j}
                        className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md bg-surface-bright/80 text-ash/80 text-[11px] font-mono border border-line/50 shadow-sm"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-line/40">
              <p className="text-[10px] text-ash/60 text-center">
                {locale === "zh" ? "按 ? 或 Esc 关闭" : "Press ? or Esc to close"}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const KeyboardShortcuts = memo(KeyboardShortcutsInner);
