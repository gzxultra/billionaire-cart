"use client";

import { ReactNode } from "react";

// ─── Skeleton Building Blocks ─────────────────────────────────────
// Reusable shimmer skeleton components for loading states.
// Uses the warm palette: base shimmer on surface-bright, highlight on lighter warm tone.

interface SkeletonBaseProps {
  className?: string;
}

function Line({ className = "" }: SkeletonBaseProps & { width?: string }) {
  return (
    <div
      className={`skeleton-shimmer h-3 rounded ${className}`}
      style={{ width: className.includes("w-") ? undefined : "100%" }}
    />
  );
}

function Circle({
  className = "",
  size = 40,
}: SkeletonBaseProps & { size?: number }) {
  return (
    <div
      className={`skeleton-shimmer rounded-full shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

function Block({
  className = "",
  aspectRatio,
}: SkeletonBaseProps & { aspectRatio?: string }) {
  return (
    <div
      className={`skeleton-shimmer rounded-lg w-full ${className}`}
      style={aspectRatio ? { aspectRatio } : { height: 60 }}
    />
  );
}

// ─── Compound Skeletons ───────────────────────────────────────────

/** Skeleton matching the StockTicker pill dimensions */
function StockTickerSkeleton() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-dim/80 border border-line/50">
      <div className="skeleton-shimmer h-3 w-10 rounded" />
      <div className="skeleton-shimmer h-4 w-16 rounded" />
      <div className="skeleton-shimmer h-3 w-12 rounded" />
    </div>
  );
}

/** Skeleton matching a single SEC filing row */
function SecFilingRowSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface-dim/80 border border-line/45"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="skeleton-shimmer h-4 w-10 rounded" />
        <div className="skeleton-shimmer h-3 w-16 rounded" />
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="skeleton-shimmer h-3 w-20 rounded" />
        <div className="skeleton-shimmer h-2.5 w-14 rounded" />
      </div>
    </div>
  );
}

/** Multiple SEC filing rows skeleton */
function SecFilingsSkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <div className="skeleton-shimmer h-3 w-3 rounded" />
        <div className="skeleton-shimmer h-2.5 w-28 rounded" />
      </div>
      <div className="space-y-1.5">
        {[0, 1, 2, 3].map((i) => (
          <SecFilingRowSkeleton key={i} delay={i * 80} />
        ))}
      </div>
    </div>
  );
}

/** Wiki summary skeleton — 2 text lines */
function WikiSummarySkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <div className="skeleton-shimmer h-3 w-3 rounded" />
        <div className="skeleton-shimmer h-2.5 w-12 rounded" />
      </div>
      <div className="space-y-1.5">
        <div className="skeleton-shimmer h-3 w-full rounded" />
        <div className="skeleton-shimmer h-3 w-3/4 rounded" />
      </div>
    </div>
  );
}

// ─── Export ────────────────────────────────────────────────────────

export const Skeleton = {
  Line,
  Circle,
  Block,
  StockTicker: StockTickerSkeleton,
  SecFilings: SecFilingsSkeleton,
  WikiSummary: WikiSummarySkeleton,
};
