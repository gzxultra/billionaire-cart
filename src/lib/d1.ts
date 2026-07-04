// ─── D1 Database Helper ─────────────────────────────────────────────
// Provides access to Cloudflare D1 binding when running on CF Pages.
// Returns null when running locally (next dev) without D1 available.

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  raw<T = unknown[]>(): Promise<T[]>;
}

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

/**
 * Get the D1 database binding from the Cloudflare Pages environment.
 * Returns null when not available (local dev, Vercel, etc.)
 */
export async function getD1(): Promise<D1Database | null> {
  try {
    const mod = await import("@cloudflare/next-on-pages");
    const ctx = mod.getRequestContext();
    return (ctx?.env?.DB as D1Database) ?? null;
  } catch {
    // Not running on CF Pages — graceful fallback
    return null;
  }
}
