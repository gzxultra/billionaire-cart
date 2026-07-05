"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Human-friendly section name for the fallback UI */
  section?: string;
  /** Optional custom fallback renderer */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** If true, render nothing on error instead of the default fallback */
  silent?: boolean;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * SectionErrorBoundary — wraps a UI section so a thrown error
 * only collapses that one section instead of crashing the whole page.
 * Provides a styled retry button by default.
 */
export class SectionErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log for debugging — production would send to error tracking
    console.error(`[SectionErrorBoundary:${this.props.section ?? "unknown"}]`, error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { children, section, fallback, silent } = this.props;

    if (error) {
      // Custom fallback
      if (fallback) return fallback(error, this.handleReset);

      // Silent — collapse the section entirely
      if (silent) return null;

      // Default styled fallback
      return (
        <div className="w-full px-4 py-5 rounded-xl border border-line/30 bg-surface-dim/50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm shrink-0">⚠️</span>
              <div className="min-w-0">
                <p className="text-[11px] text-ash/70 font-medium truncate">
                  {section
                    ? `${section} failed to load`
                    : "Something went wrong"}
                </p>
                <p className="text-[9px] text-ash/50 font-mono mt-0.5 truncate">
                  {error.message}
                </p>
              </div>
            </div>
            <button
              onClick={this.handleReset}
              className="shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-medium uppercase tracking-wider bg-stone/15 text-stone/80 hover:bg-stone/25 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}
