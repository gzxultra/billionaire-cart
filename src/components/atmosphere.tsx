"use client";

import { useEffect, useRef, useMemo } from "react";
import { useCartStore, selectTotalSpent, selectNetWorth } from "@/lib/store";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number; // 0-360
  life: number;
  maxLife: number;
}

export function Atmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const totalSpent = useCartStore(selectTotalSpent);
  const netWorth = useCartStore(selectNetWorth);

  const spentPercent = useMemo(
    () => (netWorth > 0 ? (totalSpent / netWorth) * 100 : 0),
    [totalSpent, netWorth]
  );

  useEffect(() => {
    if (!selectedBillionaire) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const particles: Particle[] = [];
    let animFrame: number;

    const handleResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener("resize", handleResize);

    function spawnParticle(pct: number) {
      // Color shifts with spending — warm stone → muted amber → dusty rose → muted red
      let hue: number;
      let sat: number;
      if (pct < 20) {
        hue = 30 + Math.random() * 10; // Warm stone
        sat = 15 + Math.random() * 10;
      } else if (pct < 50) {
        hue = 35 + Math.random() * 10; // Muted amber/taupe
        sat = 20 + Math.random() * 10;
      } else if (pct < 80) {
        hue = 15 + Math.random() * 15; // Dusty rose
        sat = 25 + Math.random() * 10;
      } else {
        hue = 5 + Math.random() * 10; // Muted red
        sat = 30 + Math.random() * 10;
      }

      const speed = 0.15 + (pct / 100) * 0.5;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * speed,
        vy: -0.2 - Math.random() * speed,
        size: 0.8 + Math.random() * (1 + (pct / 100) * 1.5),
        opacity: 0.03 + Math.random() * (0.06 + (pct / 100) * 0.08),
        hue,
        life: 0,
        maxLife: 5 + Math.random() * 8,
      };
    }

    // Initial spawn
    const baseCount = 15 + Math.floor((spentPercent / 100) * 40);
    for (let i = 0; i < baseCount; i++) {
      particles.push(spawnParticle(spentPercent));
    }

    let lastPct = spentPercent;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Ambient background glow
      if (lastPct > 30) {
        const glowIntensity = Math.min(0.03, ((lastPct - 30) / 70) * 0.03);
        const glowHue = lastPct > 70 ? 5 : 30;
        const gradient = ctx.createRadialGradient(
          w / 2, h * 0.4, 0,
          w / 2, h * 0.4, Math.max(w, h) * 0.7
        );
        gradient.addColorStop(0, `hsla(${glowHue}, 25%, 45%, ${glowIntensity})`);
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += 1 / 60;
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.y < -10) p.y = h + 10;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        // Fade in/out
        const lifeRatio = p.life / p.maxLife;
        const fadeFactor =
          lifeRatio < 0.1
            ? lifeRatio / 0.1
            : lifeRatio > 0.8
            ? (1 - lifeRatio) / 0.2
            : 1;
        const alpha = p.opacity * fadeFactor;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = `hsl(${p.hue}, 20%, 55%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Glow for bigger particles
        if (p.size > 2) {
          ctx.globalAlpha = alpha * 0.3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;

      // Respawn particles
      const targetCount = 15 + Math.floor((lastPct / 100) * 45);
      while (particles.length < targetCount) {
        particles.push(spawnParticle(lastPct));
      }

      animFrame = requestAnimationFrame(draw);
    };

    animFrame = requestAnimationFrame(draw);

    // Periodically update from store values
    const updateInterval = setInterval(() => {
      const store = useCartStore.getState();
      const currentSpent = store.purchases.reduce((s, p) => s + p.product.price, 0);
      const currentNet = store.selectedBillionaire
        ? store.selectedBillionaire.netWorthB * 1_000_000_000
        : 0;
      lastPct = currentNet > 0 ? (currentSpent / currentNet) * 100 : 0;
    }, 500);

    return () => {
      cancelAnimationFrame(animFrame);
      clearInterval(updateInterval);
      window.removeEventListener("resize", handleResize);
    };
  }, [selectedBillionaire, spentPercent, netWorth]);

  if (!selectedBillionaire) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.5 }}
    />
  );
}
