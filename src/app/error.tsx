"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[BillionaireCart] Client error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-6">
      <div className="max-w-sm text-center space-y-4">
        <div className="text-4xl">💳</div>
        <h2 className="text-lg font-serif text-[#E8E4DF]/90">
          Something broke
        </h2>
        <p className="text-xs text-[#6B6560]/60">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-stone/15 text-stone text-xs hover:bg-stone/25 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
