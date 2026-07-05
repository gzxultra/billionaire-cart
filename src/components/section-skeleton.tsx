"use client";

/**
 * SectionSkeleton — a reusable loading placeholder for lazy-loaded
 * below-fold sections. Shows a shimmer card matching the section
 * card-panel dimensions so layout doesn't shift when the real
 * component loads.
 */
export function SectionSkeleton({
  lines = 3,
  height,
}: {
  /** Number of shimmer text lines to display */
  lines?: number;
  /** Optional explicit height; otherwise auto from lines */
  height?: string;
}) {
  return (
    <div
      className="w-full animate-pulse space-y-3 py-2"
      style={height ? { minHeight: height } : undefined}
      role="status"
      aria-label="Loading…"
    >
      {/* Header skeleton */}
      <div className="flex items-center gap-2">
        <div className="skeleton-shimmer w-5 h-5 rounded" />
        <div className="skeleton-shimmer h-3 w-28 rounded" />
      </div>
      {/* Body lines */}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="skeleton-shimmer h-3 rounded"
            style={{ width: `${85 - i * 12}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/** Compact two-column skeleton for side-by-side stat cards */
export function StatCardSkeleton() {
  return (
    <div className="w-full animate-pulse space-y-2.5 py-2" role="status" aria-label="Loading…">
      <div className="skeleton-shimmer h-3 w-20 rounded" />
      <div className="skeleton-shimmer h-8 w-32 rounded" />
      <div className="skeleton-shimmer h-2.5 w-16 rounded" />
    </div>
  );
}
