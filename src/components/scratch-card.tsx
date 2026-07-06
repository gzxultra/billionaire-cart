"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectRemaining } from "@/lib/store";
import { catalogItems, CatalogItem } from "@/data/catalog";
import { formatCurrency, generateId } from "@/lib/format";
import { toast } from "@/lib/use-toast";
import { useLocale } from "@/lib/use-locale";

/**
 * ScratchCard — Interactive scratch-to-reveal card.
 * Scratch away the cover to reveal a random catalog item with a random discount.
 * Limited to one card per "cooldown" period to keep it special.
 */

interface ScratchReward {
  item: CatalogItem;
  discount: number; // 0.1 = 10% off, 0.5 = 50% off, etc.
  label: string;
  labelZh: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  color: string;
}

const DISCOUNT_TIERS = [
  { weight: 40, discount: 0.10, label: "10% OFF", labelZh: "9折", rarity: "common" as const, color: "#7D9B8A" },
  { weight: 25, discount: 0.20, label: "20% OFF", labelZh: "8折", rarity: "common" as const, color: "#7D9B8A" },
  { weight: 15, discount: 0.30, label: "30% OFF", labelZh: "7折", rarity: "rare" as const, color: "#A68530" },
  { weight: 10, discount: 0.50, label: "50% OFF", labelZh: "5折", rarity: "rare" as const, color: "#C5A572" },
  { weight: 6, discount: 0.75, label: "75% OFF", labelZh: "2.5折", rarity: "epic" as const, color: "#D4AF37" },
  { weight: 3, discount: 0.90, label: "90% OFF", labelZh: "1折", rarity: "epic" as const, color: "#B8860B" },
  { weight: 1, discount: 1.00, label: "FREE!", labelZh: "免费!", rarity: "legendary" as const, color: "#FFD700" },
];

function pickDiscount(): typeof DISCOUNT_TIERS[number] {
  const totalWeight = DISCOUNT_TIERS.reduce((s, t) => s + t.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const tier of DISCOUNT_TIERS) {
    roll -= tier.weight;
    if (roll <= 0) return tier;
  }
  return DISCOUNT_TIERS[0];
}

function pickRandomItem(): CatalogItem {
  // Prefer items that cost at least $100 to make the discount feel meaningful
  const good = catalogItems.filter((c) => c.price >= 100);
  const pool = good.length > 0 ? good : catalogItems;
  return pool[Math.floor(Math.random() * pool.length)];
}

const COOLDOWN_MS = 45_000; // 45 seconds between cards

const SCRATCH_COVER_PATTERNS = [
  "✨", "💎", "🌟", "⭐", "💫",
];

export function ScratchCard() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const remaining = useCartStore(selectRemaining);
  const addPurchase = useCartStore((s) => s.addPurchase);
  const purchases = useCartStore((s) => s.purchases);

  const [reward, setReward] = useState<ScratchReward | null>(null);
  const [scratched, setScratched] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(0);
  const [cooldownEnd, setCooldownEnd] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [claimed, setClaimed] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isScratching = useRef(false);
  const scratchedPixels = useRef(0);
  const totalPixels = useRef(1);

  // Generate a new card
  const generateCard = useCallback(() => {
    const item = pickRandomItem();
    const tier = pickDiscount();
    setReward({
      item,
      discount: tier.discount,
      label: tier.label,
      labelZh: tier.labelZh,
      rarity: tier.rarity,
      color: tier.color,
    });
    setScratched(false);
    setScratchProgress(0);
    setClaimed(false);
    scratchedPixels.current = 0;
  }, []);

  // Initialize card when billionaire selected and purchases exist
  useEffect(() => {
    if (selectedBillionaire && purchases.length >= 3 && !reward) {
      generateCard();
    }
  }, [selectedBillionaire, purchases.length, reward, generateCard]);

  // Draw scratch overlay on canvas
  useEffect(() => {
    if (!reward || scratched) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    totalPixels.current = w * h;

    // Draw golden scratch cover
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, "#B8A070");
    gradient.addColorStop(0.5, "#C5A572");
    gradient.addColorStop(1, "#A68530");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Add pattern text
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.font = "16px serif";
    ctx.textAlign = "center";
    for (let y = 20; y < h; y += 30) {
      for (let x = 20; x < w; x += 40) {
        const emoji = SCRATCH_COVER_PATTERNS[(x + y) % SCRATCH_COVER_PATTERNS.length];
        ctx.fillText(emoji, x, y);
      }
    }

    // "Scratch here" text
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(locale === "zh" ? "刮一刮 ➜" : "SCRATCH HERE ➜", w / 2, h / 2 + 5);
  }, [reward, scratched, locale]);

  // Scratch handler
  const scratch = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || scratched) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();

    scratchedPixels.current += 20 * 20 * Math.PI;
    const progress = Math.min(scratchedPixels.current / totalPixels.current, 1);
    setScratchProgress(progress);

    if (progress > 0.35) {
      setScratched(true);
    }
  }, [scratched]);

  const handlePointerDown = useCallback(() => { isScratching.current = true; }, []);
  const handlePointerUp = useCallback(() => { isScratching.current = false; }, []);
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isScratching.current) scratch(e.clientX, e.clientY);
  }, [scratch]);

  // Claim the reward
  const handleClaim = useCallback(() => {
    if (!reward || !selectedBillionaire || claimed) return;
    const discountedPrice = reward.item.price * (1 - reward.discount);
    if (discountedPrice > remaining && reward.discount < 1) {
      toast(locale === "zh" ? "余额不足！" : "Not enough balance!");
      return;
    }

    addPurchase({
      id: generateId(),
      product: {
        title: `🎰 ${reward.item.name} (${reward.label})`,
        price: discountedPrice,
        imageUrl: null,
        description: `Scratch card reward: ${reward.label}`,
        sourceUrl: `scratch-card:${reward.item.id}`,
        assetClass: reward.item.assetClass,
        monthlyOverhead: reward.item.monthlyOverhead,
      },
      billionaireId: selectedBillionaire.id,
      timestamp: Date.now(),
    });

    setClaimed(true);
    setCooldownEnd(Date.now() + COOLDOWN_MS);
    toast(
      locale === "zh"
        ? `🎰 刮中 ${reward.labelZh}！以 ${formatCurrency(discountedPrice)} 购入 ${reward.item.nameZh}`
        : `🎰 ${reward.label}! Got ${reward.item.name} for ${formatCurrency(discountedPrice)}`
    );
  }, [reward, selectedBillionaire, claimed, remaining, addPurchase, locale]);

  // New card after cooldown
  const handleNewCard = useCallback(() => {
    if (Date.now() < cooldownEnd) return;
    generateCard();
  }, [cooldownEnd, generateCard]);

  // Cooldown timer
  useEffect(() => {
    if (!claimed) return;
    const interval = setInterval(() => {
      const rem = Math.max(cooldownEnd - Date.now(), 0);
      setCooldownRemaining(rem);
      if (rem <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [claimed, cooldownEnd]);

  if (!selectedBillionaire || purchases.length < 3) return null;

  const rarityBorder = reward?.rarity === "legendary"
    ? "border-[#FFD700]/50 shadow-[0_0_20px_rgba(255,215,0,0.15)]"
    : reward?.rarity === "epic"
    ? "border-[#D4AF37]/40"
    : reward?.rarity === "rare"
    ? "border-champagne/40"
    : "border-line/50";

  return (
    <section className="card-panel p-5 sm:p-8 stagger-section">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">🎰</span>
        <h2 className="section-label">
          {locale === "zh" ? "刮刮卡" : "Scratch Card"}
        </h2>
        <span className="text-[9px] text-ash/50 uppercase tracking-wider ml-auto">
          {locale === "zh" ? "刮开揭示优惠" : "Scratch to reveal"}
        </span>
      </div>

      {reward && !claimed && (
        <div className={`relative rounded-xl overflow-hidden border-2 ${rarityBorder} bg-surface-dim/60`}>
          {/* Reward underneath */}
          <div className="p-6 text-center space-y-3">
            <div className="text-4xl">{reward.item.emoji}</div>
            <div className="text-base font-medium text-sand">
              {locale === "zh" ? reward.item.nameZh : reward.item.name}
            </div>
            <div className="text-xs text-ash/60">
              {locale === "zh" ? reward.item.descriptionZh : reward.item.description}
            </div>
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm text-ash/50 line-through font-mono">
                {formatCurrency(reward.item.price)}
              </span>
              <span className="text-2xl font-serif font-bold" style={{ color: reward.color }}>
                {reward.discount >= 1
                  ? (locale === "zh" ? "免费!" : "FREE!")
                  : formatCurrency(reward.item.price * (1 - reward.discount))}
              </span>
            </div>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
              style={{ backgroundColor: `${reward.color}20`, color: reward.color, border: `1px solid ${reward.color}40` }}
            >
              {locale === "zh" ? reward.labelZh : reward.label}
            </motion.div>

            {/* Claim button appears after scratching */}
            <AnimatePresence>
              {scratched && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleClaim}
                  className="w-full py-3 rounded-xl bg-stone-gradient text-sand font-semibold text-sm tracking-wide shadow-stone-sm hover:shadow-stone transition-shadow mt-2"
                >
                  {locale === "zh" ? "🎉 领取优惠" : "🎉 Claim Reward"}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Scratch overlay canvas */}
          {!scratched && (
            <canvas
              ref={canvasRef}
              width={320}
              height={200}
              className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerMove={handlePointerMove}
              style={{ touchAction: "none" }}
            />
          )}

          {/* Progress indicator */}
          {!scratched && scratchProgress > 0 && (
            <div className="absolute bottom-2 left-2 right-2">
              <div className="h-1 rounded-full bg-black/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white/50 transition-all"
                  style={{ width: `${scratchProgress * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cooldown state */}
      {claimed && (
        <div className="text-center py-6 space-y-3">
          {cooldownRemaining > 0 ? (
            <>
              <div className="text-3xl">⏳</div>
              <div className="text-sm text-ash/70">
                {locale === "zh" ? "下一张刮刮卡" : "Next card in"}
              </div>
              <div className="text-lg font-serif text-stone tabular-nums">
                {Math.ceil(cooldownRemaining / 1000)}s
              </div>
            </>
          ) : (
            <motion.button
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNewCard}
              className="px-6 py-3 rounded-xl bg-champagne/10 border border-champagne/30 text-champagne font-medium text-sm hover:bg-champagne/15 transition-colors"
            >
              {locale === "zh" ? "🎰 新刮刮卡" : "🎰 New Card"}
            </motion.button>
          )}
        </div>
      )}
    </section>
  );
}
