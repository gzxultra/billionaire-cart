"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, selectRemaining } from "@/lib/store";
import { catalogItems, CatalogItem } from "@/data/catalog";
import { generateId, formatCurrency } from "@/lib/format";
import { playAuthorize, playSparkle } from "@/lib/sounds";
import { toast } from "@/lib/use-toast";
import { useLocale } from "@/lib/use-locale";

interface SaleItem {
  item: CatalogItem;
  discount: number; // 0.3 to 0.6
  salePrice: number;
  bought: boolean;
}

const SALE_DURATION = 90; // seconds

export function FlashSale() {
  const locale = useLocale((s) => s.locale);
  const selectedBillionaire = useCartStore((s) => s.selectedBillionaire);
  const addPurchase = useCartStore((s) => s.addPurchase);
  const soundEnabled = useCartStore((s) => s.soundEnabled);
  const remaining = useCartStore(selectRemaining);

  const [active, setActive] = useState(false);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [timeLeft, setTimeLeft] = useState(SALE_DURATION);
  const [expired, setExpired] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const eligibleItems = useMemo(() => {
    return catalogItems.filter((i) => i.price >= 10 && i.price > 0);
  }, []);

  const startSale = useCallback(() => {
    if (eligibleItems.length < 3) return;

    const shuffled = [...eligibleItems].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 3).map((item) => {
      const discount = 0.3 + Math.random() * 0.3; // 30-60% off
      return {
        item,
        discount,
        salePrice: Math.round(item.price * (1 - discount)),
        bought: false,
      };
    });

    setSaleItems(picked);
    setTimeLeft(SALE_DURATION);
    setExpired(false);
    setActive(true);

    if (soundEnabled) playAuthorize();

    // Start countdown
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [eligibleItems, soundEnabled]);

  const grabItem = useCallback((index: number) => {
    if (!selectedBillionaire) return;
    const sale = saleItems[index];
    if (!sale || sale.bought || expired) return;

    if (sale.salePrice > remaining) {
      toast(locale === "zh" ? "余额不足！" : "Not enough balance!");
      return;
    }

    addPurchase({
      id: generateId(),
      product: {
        title: `⚡ ${sale.item.name} (Flash Sale!)`,
        price: sale.salePrice,
        imageUrl: null,
        description: locale === "zh"
          ? `限时抢购！原价 ${formatCurrency(sale.item.price)}，${Math.round(sale.discount * 100)}% 折扣`
          : `Flash Sale! Was ${formatCurrency(sale.item.price)}, ${Math.round(sale.discount * 100)}% off`,
        sourceUrl: `flash-sale://${sale.item.id}/${Date.now()}`,
        assetClass: sale.item.assetClass,
        monthlyOverhead: sale.item.monthlyOverhead,
      },
      billionaireId: selectedBillionaire.id,
      timestamp: Date.now(),
    });

    setSaleItems((prev) => prev.map((s, i) => (i === index ? { ...s, bought: true } : s)));

    if (soundEnabled) playSparkle();
    toast(
      locale === "zh"
        ? `⚡ 抢到了！${sale.item.nameZh}，省了 ${formatCurrency(sale.item.price - sale.salePrice)}`
        : `⚡ Grabbed ${sale.item.name}! Saved ${formatCurrency(sale.item.price - sale.salePrice)}`
    );
  }, [saleItems, selectedBillionaire, remaining, addPurchase, soundEnabled, locale, expired]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!selectedBillionaire) return null;

  const allBought = saleItems.every((s) => s.bought);
  const showNewDeals = expired || allBought;

  return (
    <section className="card-panel p-5 sm:p-8">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-base">⚡</span>
        <h2 className="text-xs uppercase tracking-[0.2em] text-stone/75 font-medium">
          {locale === "zh" ? "限时抢购" : "Flash Sale"}
        </h2>
        {active && !expired && (
          <motion.div
            className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs ${
              timeLeft <= 10
                ? "bg-[#9B6B6B]/15 text-[#9B6B6B]"
                : "bg-surface-bright/80 text-stone/70"
            }`}
            animate={timeLeft <= 10 ? { scale: [1, 1.05, 1] } : {}}
            transition={timeLeft <= 10 ? { duration: 0.5, repeat: Infinity } : {}}
          >
            <span>⏱</span>
            <span>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}</span>
          </motion.div>
        )}
      </div>

      {!active ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-6"
        >
          <div className="text-3xl mb-3">🏷️</div>
          <p className="text-[11px] text-ash/60 mb-4">
            {locale === "zh"
              ? "3 件随机商品，30-60% 折扣，90 秒限时"
              : "3 random items, 30-60% off, 90 seconds only"}
          </p>
          <button
            onClick={startSale}
            className="px-5 py-2.5 rounded-xl text-xs font-medium text-sand bg-stone-gradient shadow-stone-sm hover:shadow-stone transition-all"
          >
            {locale === "zh" ? "开启抢购" : "Start Flash Sale"}
          </button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {/* Sale items */}
          <AnimatePresence mode="popLayout">
            {saleItems.map((sale, i) => (
              <motion.div
                key={`${sale.item.id}-${i}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{
                  opacity: sale.bought ? 0 : expired && !sale.bought ? 0.3 : 1,
                  x: 0,
                  scale: sale.bought ? 0.95 : 1,
                }}
                exit={{ opacity: 0, x: 30, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className={`flex items-center gap-3 bg-surface-bright/60 rounded-xl p-3 border transition-all ${
                  sale.bought
                    ? "border-sage/20"
                    : expired
                      ? "border-[#9B6B6B]/20"
                      : "border-line/30"
                }`}
              >
                <div className="text-2xl shrink-0">{sale.item.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-sand truncate">
                    {locale === "zh" ? sale.item.nameZh : sale.item.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-ash/40 line-through font-mono">
                      {formatCurrency(sale.item.price, true)}
                    </span>
                    <span className="text-[11px] text-champagne font-serif font-medium">
                      {formatCurrency(sale.salePrice, true)}
                    </span>
                    <span className="text-[9px] text-sage font-mono px-1.5 py-0.5 rounded bg-sage/10">
                      -{Math.round(sale.discount * 100)}%
                    </span>
                  </div>
                </div>

                {sale.bought ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-[10px] text-sage font-medium px-2 py-1"
                  >
                    ✓ {locale === "zh" ? "已抢" : "GOT IT"}
                  </motion.div>
                ) : expired ? (
                  <div className="text-[10px] text-[#9B6B6B] font-mono">
                    {locale === "zh" ? "已过期" : "EXPIRED"}
                  </div>
                ) : (
                  <button
                    onClick={() => grabItem(i)}
                    disabled={sale.salePrice > remaining}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-medium uppercase tracking-wider text-sand bg-stone-gradient shadow-stone-sm hover:shadow-stone transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {locale === "zh" ? "抢！" : "GRAB"}
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Timer bar */}
          {!expired && !allBought && (
            <div className="h-1 rounded-full bg-surface-dim overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  timeLeft <= 10 ? "bg-[#9B6B6B]" : "bg-stone/40"
                }`}
                initial={{ width: "100%" }}
                animate={{ width: `${(timeLeft / SALE_DURATION) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}

          {/* Expired / new deals */}
          {showNewDeals && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center pt-2"
            >
              {expired && !allBought && (
                <p className="text-[11px] text-[#9B6B6B] mb-3 font-serif">
                  {locale === "zh" ? "⏰ 时间到！" : "⏰ Time's up!"}
                </p>
              )}
              {allBought && (
                <p className="text-[11px] text-sage mb-3 font-serif">
                  {locale === "zh" ? "🎯 全部抢到！" : "🎯 Swept the sale!"}
                </p>
              )}
              <button
                onClick={startSale}
                className="px-5 py-2 rounded-xl text-xs font-medium text-sand bg-stone-gradient shadow-stone-sm hover:shadow-stone transition-all"
              >
                {locale === "zh" ? "开启新一轮" : "New Deals"}
              </button>
            </motion.div>
          )}
        </div>
      )}
    </section>
  );
}
