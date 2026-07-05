"use client";

import { useEffect, useState, useCallback, memo } from "react";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
  drift: number;
}

const COLORS = [
  "#A68530", // champagne
  "#8C7A65", // stone
  "#5A8A68", // sage
  "#D4AF37", // gold
  "#C8A96E", // warm gold
  "#B8860B", // dark goldenrod
  "#E2D9CE", // line
  "#2A2520", // sand
];

function generatePieces(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 10 + Math.random() * 80,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 0.4,
    duration: 1.8 + Math.random() * 1.2,
    size: 4 + Math.random() * 6,
    rotation: Math.random() * 360,
    drift: (Math.random() - 0.5) * 60,
  }));
}

interface ConfettiBurstProps {
  /** Increment this to trigger a new burst */
  triggerId: number;
  /** Number of confetti pieces */
  count?: number;
}

function ConfettiBurstInner({ triggerId, count = 50 }: ConfettiBurstProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (triggerId <= 0) return;
    setPieces(generatePieces(count));
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setPieces([]);
    }, 3500);
    return () => clearTimeout(timer);
  }, [triggerId, count]);

  if (!visible || pieces.length === 0) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden"
      aria-hidden="true"
    >
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute confetti-piece"
          style={{
            left: `${p.x}%`,
            top: "-2%",
            width: `${p.size}px`,
            height: `${p.size * 0.6}px`,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            transform: `rotate(${p.rotation}deg)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            // @ts-expect-error CSS custom property for drift
            "--drift": `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

export const ConfettiBurst = memo(ConfettiBurstInner);
