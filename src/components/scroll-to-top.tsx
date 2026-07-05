"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Floating scroll-to-top button with a circular progress ring
 * showing how far down the page the user has scrolled.
 * Appears after scrolling past ~400px.
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? Math.min(scrollY / docHeight, 1) : 0;

        setVisible(scrollY > 400);
        setProgress(pct);
        ticking = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          onClick={scrollToTop}
          className="
            fixed bottom-6 right-6 z-40
            w-11 h-11 rounded-full
            bg-surface/90 backdrop-blur-xl
            border border-line/50
            shadow-stone-sm hover:shadow-stone
            flex items-center justify-center
            transition-shadow duration-200
            group
          "
          aria-label="Scroll to top"
          title="Back to top"
        >
          {/* SVG progress ring */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 44 44"
          >
            {/* Track */}
            <circle
              cx="22"
              cy="22"
              r={radius}
              fill="none"
              stroke="rgba(226,217,206,0.3)"
              strokeWidth="2"
            />
            {/* Progress arc */}
            <circle
              cx="22"
              cy="22"
              r={radius}
              fill="none"
              stroke="rgba(140,122,101,0.5)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-[stroke-dashoffset] duration-150"
            />
          </svg>

          {/* Arrow icon */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-stone/70 group-hover:text-stone transition-colors relative z-10"
          >
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
