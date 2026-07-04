// Type declarations for @cloudflare/next-on-pages
// Only used at runtime on Cloudflare Pages; provides D1/KV/R2 bindings
declare module "@cloudflare/next-on-pages" {
  interface RequestContext {
    env: Record<string, unknown>;
    ctx: {
      waitUntil(promise: Promise<unknown>): void;
      passThroughOnException(): void;
    };
    cf: Record<string, unknown>;
  }
  export function getRequestContext(): RequestContext;
}
