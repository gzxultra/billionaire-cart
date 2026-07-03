"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  isShard: boolean;
  angle: number;
}

const COLORS = ["#818CF8", "#A5B4FC", "#FCD34D", "#C4B5FD"];

export function ParticleBurst() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Size canvas to viewport
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Spawn particles
    const particles: Particle[] = [];
    const count = 50 + Math.floor(Math.random() * 11); // 50-60

    for (let i = 0; i < count; i++) {
      // Random angle, weighted upward (bias toward negative vy)
      const angle = Math.random() * Math.PI * 2;
      const upBias = -0.3; // slight upward bias
      const speed = 200 + Math.random() * 300; // 200-500 px/s
      const isShard = Math.random() > 0.6;

      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + upBias * speed,
        size: isShard ? 1 : 2 + Math.random() * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 0,
        maxLife: 1.2 + Math.random() * 0.6, // 1.2-1.8s
        isShard,
        angle: Math.random() * Math.PI,
      });
    }

    // Flash animation
    if (flashRef.current) {
      flashRef.current.style.opacity = "1";
      flashRef.current.style.transform = "scale(0)";
      flashRef.current.animate(
        [
          { transform: "scale(0)", opacity: "0.8" },
          { transform: "scale(1.2)", opacity: "0.6", offset: 0.3 },
          { transform: "scale(1.2)", opacity: "0" },
        ],
        { duration: 450, easing: "ease-out", fill: "forwards" }
      );
    }

    const gravity = 400; // px/s²
    let lastTime = performance.now();
    let animFrame: number;

    const draw = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05); // cap delta
      lastTime = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;
      for (const p of particles) {
        p.life += dt;
        if (p.life >= p.maxLife) continue;

        alive = true;
        p.vy += gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const alpha = 1 - p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;

        if (p.isShard) {
          // Metallic shard: thin rectangle
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle + p.life * 3);
          ctx.fillRect(-0.5, -3, 1, 6);
          ctx.restore();
        } else {
          // Circle particle
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;

      if (alive) {
        animFrame = requestAnimationFrame(draw);
      } else {
        // Self-destruct
        canvas.remove();
        flashRef.current?.remove();
      }
    };

    animFrame = requestAnimationFrame(draw);

    // Safety cleanup after 2.5s
    const timeout = setTimeout(() => {
      cancelAnimationFrame(animFrame);
      canvas.remove();
      flashRef.current?.remove();
    }, 2500);

    return () => {
      cancelAnimationFrame(animFrame);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <>
      {/* Radial flash */}
      <div
        ref={flashRef}
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-[51]"
      >
        <div
          className="w-48 h-48 rounded-full opacity-0"
          style={{
            background: "radial-gradient(circle, rgba(129,140,248,0.4) 0%, rgba(165,180,252,0.15) 40%, transparent 70%)",
          }}
        />
      </div>
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-[52]"
      />
    </>
  );
}
