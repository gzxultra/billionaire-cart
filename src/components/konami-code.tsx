"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectRemaining } from "@/lib/store";
import { toast } from "@/lib/use-toast";
import { useLocale } from "@/lib/use-locale";

const KONAMI = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];

const GOD_MODE_DURATION_MS = 30_000; // 30 seconds

export function KonamiCode() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);

  const [godMode, setGodMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const bufferRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endRef = useRef(0);

  const activateGodMode = useCallback(() => {
    if (!selectedBillionaire) return;

    setGodMode(true);
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 1500);

    endRef.current = Date.now() + GOD_MODE_DURATION_MS;
    setTimeLeft(GOD_MODE_DURATION_MS / 1000);

    toast(
      locale === "zh"
        ? "👑 上帝模式激活！30秒内一切免费！"
        : "👑 GOD MODE ACTIVATED! Everything is FREE for 30s!",
      4000
    );

    // Countdown timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setGodMode(false);
        if (timerRef.current) clearInterval(timerRef.current);
        toast(
          locale === "zh" ? "⏰ 上帝模式结束" : "⏰ God Mode expired",
          2000
        );
      }
    }, 250);
  }, [selectedBillionaire, locale]);

  // Listen for Konami Code
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedBillionaire || godMode) return;

      bufferRef.current.push(e.key);
      if (bufferRef.current.length > KONAMI.length) {
        bufferRef.current.shift();
      }

      // Check match
      if (bufferRef.current.length === KONAMI.length) {
        const match = bufferRef.current.every((k, i) => k === KONAMI[i]);
        if (match) {
          bufferRef.current = [];
          activateGodMode();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedBillionaire, godMode, activateGodMode]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Reset on billionaire change
  useEffect(() => {
    setGodMode(false);
    bufferRef.current = [];
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [selectedBillionaire?.id]);

  return (
    <>
      {/* Activation flash overlay */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] pointer-events-none"
          >
            {/* Gold radial flash */}
            <motion.div
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(166,133,48,0.6) 0%, rgba(197,165,114,0.3) 40%, transparent 70%)",
              }}
            />
            {/* Crown emoji */}
            <motion.div
              initial={{ scale: 0, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl"
            >
              👑
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* God Mode HUD indicator */}
      <AnimatePresence>
        {godMode && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="px-4 py-2 rounded-full bg-champagne/15 border border-champagne/40 backdrop-blur-md flex items-center gap-2">
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-sm"
              >
                👑
              </motion.span>
              <span className="text-xs font-bold text-champagne uppercase tracking-wider">
                {locale === "zh" ? "上帝模式" : "GOD MODE"}
              </span>
              <span className="text-xs font-mono text-champagne/70 tabular-nums">
                {timeLeft}s
              </span>
              {/* Timer bar */}
              <div className="w-16 h-1 rounded-full bg-champagne/15 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-champagne/60"
                  style={{
                    width: `${(timeLeft / (GOD_MODE_DURATION_MS / 1000)) * 100}%`,
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent gold border glow when active */}
      {godMode && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          <motion.div
            className="absolute inset-0 border-2 border-champagne/30 rounded-none"
            animate={{
              boxShadow: [
                "inset 0 0 30px rgba(166,133,48,0.1)",
                "inset 0 0 60px rgba(166,133,48,0.2)",
                "inset 0 0 30px rgba(166,133,48,0.1)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      )}
    </>
  );
}
