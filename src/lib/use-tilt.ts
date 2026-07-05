"use client";

import { useRef, useCallback, useEffect } from "react";

interface TiltOptions {
  /** Max rotation degrees (default 8) */
  max?: number;
  /** Transition speed in ms (default 300) */
  speed?: number;
  /** Glow enabled (default true) */
  glow?: boolean;
  /** Scale on hover (default 1.02) */
  scale?: number;
  /** Perspective distance (default 800) */
  perspective?: number;
}

/**
 * useTilt — premium 3D perspective tilt on mouse hover.
 * Returns a ref to attach to the target element.
 * Respects prefers-reduced-motion.
 */
export function useTilt<T extends HTMLElement = HTMLDivElement>(
  options: TiltOptions = {}
) {
  const {
    max = 8,
    speed = 400,
    glow = true,
    scale = 1.02,
    perspective = 800,
  } = options;

  const ref = useRef<T>(null);
  const animRef = useRef<number>(0);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (reducedMotion.current) return;
      const el = ref.current;
      if (!el) return;

      cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const mouseX = e.clientX - centerX;
        const mouseY = e.clientY - centerY;

        // Normalized -1 to 1
        const rotateY = (mouseX / (rect.width / 2)) * max;
        const rotateX = -(mouseY / (rect.height / 2)) * max;

        el.style.transform = `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale},${scale},${scale})`;

        if (glow) {
          // Glow follows cursor position
          const percentX = ((e.clientX - rect.left) / rect.width) * 100;
          const percentY = ((e.clientY - rect.top) / rect.height) * 100;
          el.style.setProperty("--tilt-glow-x", `${percentX}%`);
          el.style.setProperty("--tilt-glow-y", `${percentY}%`);
        }
      });
    },
    [max, perspective, scale, glow]
  );

  const handleMouseEnter = useCallback(() => {
    if (reducedMotion.current) return;
    const el = ref.current;
    if (!el) return;
    el.style.transition = `transform ${speed}ms cubic-bezier(0.03,0.98,0.52,0.99)`;
    el.style.willChange = "transform";
    if (glow) {
      el.classList.add("tilt-glow-active");
    }
  }, [speed, glow]);

  const handleMouseLeave = useCallback(() => {
    if (reducedMotion.current) return;
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(animRef.current);
    el.style.transition = `transform ${speed}ms cubic-bezier(0.03,0.98,0.52,0.99)`;
    el.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)`;
    el.style.willChange = "auto";
    if (glow) {
      el.classList.remove("tilt-glow-active");
    }
  }, [speed, perspective, glow]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.addEventListener("mousemove", handleMouseMove, { passive: true });
    el.addEventListener("mouseenter", handleMouseEnter);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseenter", handleMouseEnter);
      el.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animRef.current);
    };
  }, [handleMouseMove, handleMouseEnter, handleMouseLeave]);

  return ref;
}
