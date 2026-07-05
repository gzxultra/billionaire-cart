import { useState, useCallback, useRef } from "react";
import { useCartStore } from "@/lib/store";
import { ParsedProduct, ParseResponse } from "@/lib/types";

/**
 * Shared URL parse hook — encapsulates the parse-from-URL logic
 * used by both the inline OmniBox and the sticky header OmniBox.
 * Eliminates duplicated fetch + state management across inputs.
 */
export function useUrlParse() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseSource, setParseSource] = useState<string | null>(null);
  const [lastFailedUrl, setLastFailedUrl] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const saveProduct = useCartStore((s) => s.saveProduct);

  const parseUrl = useCallback(
    async (
      targetUrl: string,
      options?: {
        /** Called with the parsed product on success */
        onSuccess?: (product: ParsedProduct, source: string | null) => void;
        /** Called on failure */
        onError?: (errorMsg: string) => void;
        /** If true, auto-save to history and set as active parsed product */
        autoSave?: boolean;
      }
    ): Promise<ParsedProduct | null> => {
      const url = targetUrl.trim();
      if (!url) return null;

      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      setParseSource(null);
      setLastFailedUrl(null);

      try {
        const res = await fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
          signal: controller.signal,
        });

        const data: ParseResponse & { source?: string } = await res.json();

        if (data.success && data.product) {
          setParseSource(data.source || null);
          if (options?.autoSave !== false) {
            saveProduct(data.product);
          }
          options?.onSuccess?.(data.product, data.source || null);
          return data.product;
        } else {
          const msg = data.error || "Parse failed";
          setError(msg);
          setLastFailedUrl(url);
          options?.onError?.(msg);
          return null;
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return null;
        const msg = "Network error";
        setError(msg);
        setLastFailedUrl(url);
        options?.onError?.(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [saveProduct]
  );

  const clearError = useCallback(() => {
    setError(null);
    setLastFailedUrl(null);
  }, []);

  return {
    loading,
    error,
    parseSource,
    lastFailedUrl,
    parseUrl,
    clearError,
  };
}
