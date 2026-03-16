"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback UI to show on error. If not provided, uses the default card. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React error boundary with a hand-drawn error card and retry button.
 * Catches rendering errors in child components without crashing the page.
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="flex flex-col items-center justify-center gap-3 p-6 rounded-[14px] text-center"
          style={{
            background: "var(--color-card-bg)",
            border: "1px solid var(--color-card-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <AlertTriangle
            size={32}
            style={{ color: "var(--color-orange)" }}
          />
          <p
            className="text-sm font-medium"
            style={{ color: "var(--color-text-1)" }}
          >
            Something went wrong
          </p>
          <p
            className="text-xs"
            style={{ color: "var(--color-text-3)" }}
          >
            {this.state.error?.message ?? "An unexpected error occurred"}
          </p>
          <button
            onClick={this.handleRetry}
            className="mt-2 px-4 py-2 text-sm font-medium text-white rounded-[8px] cursor-pointer"
            style={{ background: "var(--color-orange)" }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
