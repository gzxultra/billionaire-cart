"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useToastStore } from "@/lib/use-toast";

/**
 * Global toast container — renders stacked, animated toasts.
 * Placed once in the root layout so every component can call `toast()`.
 */
export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col-reverse gap-2 items-center"
      aria-live="polite"
      role="status"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => removeToast(t.id)}
            className="px-6 py-3 rounded-xl bg-stone/20 border border-stone/40 text-stone text-sm backdrop-blur-md cursor-pointer hover:bg-stone/25 transition-colors shadow-stone-sm"
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
