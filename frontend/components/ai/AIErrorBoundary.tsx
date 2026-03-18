"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import RoughCard from "@/components/design-system/RoughCard";

interface AIErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI to render on error */
  fallback?: ReactNode;
  /** Feature name shown in the default error message */
  featureName?: string;
}

interface AIErrorBoundaryState {
  hasError: boolean;
}

/**
 * Error boundary for AI-powered components.
 * Catches render errors and displays a friendly fallback message
 * so one AI component crash does not take down the entire page.
 */
export default class AIErrorBoundary extends Component<
  AIErrorBoundaryProps,
  AIErrorBoundaryState
> {
  constructor(props: AIErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): AIErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details for debugging
    console.error(
      `[AIErrorBoundary] ${this.props.featureName ?? "AI Component"} error:`,
      error,
      errorInfo.componentStack,
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <RoughCard className="p-5 bg-[var(--color-card-bg)]">
          <h3
            className="text-lg mb-2"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {this.props.featureName ?? "AI Feature"}
          </h3>
          <p
            className="text-sm"
            style={{ color: "var(--color-text-3)" }}
          >
            This feature requires AI services. Please check your API
            configuration.
          </p>
        </RoughCard>
      );
    }

    return this.props.children;
  }
}
