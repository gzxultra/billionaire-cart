"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SalaryState {
  salary: number; // annual USD
  enabled: boolean;
  setSalary: (s: number) => void;
  setEnabled: (e: boolean) => void;
}

export const useSalaryStore = create<SalaryState>()(
  persist(
    (set) => ({
      salary: 60000,
      enabled: false,
      setSalary: (salary: number) => set({ salary }),
      setEnabled: (enabled: boolean) => set({ enabled }),
    }),
    { name: "billionaire-salary-store" }
  )
);

/**
 * Convert a billionaire's purchase to "your money" equivalent.
 * Formula: (price / billionaire_net_worth) * your_salary_equivalent_net_worth
 * We assume net worth ≈ 10× annual income for a typical person.
 */
export function toYourMoney(
  price: number,
  billionaireNetWorthUsd: number,
  annualSalary: number
): number {
  if (billionaireNetWorthUsd <= 0 || annualSalary <= 0) return 0;
  const yourNetWorth = annualSalary * 10; // rough approximation
  return (price / billionaireNetWorthUsd) * yourNetWorth;
}

/**
 * Find a relatable everyday item for a dollar amount.
 */
export function relatableItem(
  amount: number,
  locale: "en" | "zh"
): { emoji: string; label: string } | null {
  if (amount < 0.001) return locale === "zh" ? { emoji: "🫧", label: "一粒灰尘" } : { emoji: "🫧", label: "a speck of dust" };
  if (amount < 0.01) return locale === "zh" ? { emoji: "🫧", label: "一粒沙" } : { emoji: "🫧", label: "a grain of sand" };
  if (amount < 0.05) return locale === "zh" ? { emoji: "📎", label: "一根回形针" } : { emoji: "📎", label: "a paperclip" };
  if (amount < 0.25) return locale === "zh" ? { emoji: "🍬", label: "一颗糖" } : { emoji: "🍬", label: "a piece of candy" };
  if (amount < 1) return locale === "zh" ? { emoji: "🥤", label: "一杯自来水" } : { emoji: "🥤", label: "a cup of tap water" };
  if (amount < 2) return locale === "zh" ? { emoji: "🍭", label: "一根棒棒糖" } : { emoji: "🍭", label: "a lollipop" };
  if (amount < 4) return locale === "zh" ? { emoji: "☕", label: "一杯咖啡" } : { emoji: "☕", label: "a coffee" };
  if (amount < 8) return locale === "zh" ? { emoji: "🍔", label: "一个汉堡" } : { emoji: "🍔", label: "a burger" };
  if (amount < 15) return locale === "zh" ? { emoji: "🍕", label: "一份外卖" } : { emoji: "🍕", label: "a takeout meal" };
  if (amount < 30) return locale === "zh" ? { emoji: "🎬", label: "一张电影票" } : { emoji: "🎬", label: "a movie ticket" };
  if (amount < 60) return locale === "zh" ? { emoji: "📱", label: "一个手机壳" } : { emoji: "📱", label: "a phone case" };
  if (amount < 150) return locale === "zh" ? { emoji: "👟", label: "一双运动鞋" } : { emoji: "👟", label: "a pair of sneakers" };
  if (amount < 400) return locale === "zh" ? { emoji: "🎮", label: "一台游戏机" } : { emoji: "🎮", label: "a gaming console" };
  if (amount < 1000) return locale === "zh" ? { emoji: "📱", label: "一部新手机" } : { emoji: "📱", label: "a new phone" };
  if (amount < 3000) return locale === "zh" ? { emoji: "💻", label: "一台笔记本电脑" } : { emoji: "💻", label: "a laptop" };
  if (amount < 8000) return locale === "zh" ? { emoji: "🏖️", label: "一次度假" } : { emoji: "🏖️", label: "a vacation" };
  if (amount < 20000) return locale === "zh" ? { emoji: "🚗", label: "一辆二手车" } : { emoji: "🚗", label: "a used car" };
  if (amount < 50000) return locale === "zh" ? { emoji: "🚙", label: "一辆新车" } : { emoji: "🚙", label: "a new car" };
  if (amount < 200000) return locale === "zh" ? { emoji: "🏠", label: "一套房子的首付" } : { emoji: "🏠", label: "a house down payment" };
  if (amount < 500000) return locale === "zh" ? { emoji: "🏡", label: "一套房子" } : { emoji: "🏡", label: "a house" };
  return locale === "zh" ? { emoji: "🏰", label: "一栋豪宅" } : { emoji: "🏰", label: "a mansion" };
}

/**
 * Format a small dollar amount with appropriate precision.
 */
export function formatYourMoney(amount: number): string {
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  if (amount < 1) return `$${amount.toFixed(2)}`;
  if (amount < 100) return `$${amount.toFixed(2)}`;
  if (amount < 10000) return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
