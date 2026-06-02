"use client";

import React, { ReactNode, useState, useCallback } from "react";
import { ErrorResponse, toFriendlyError, FriendlyError } from "@/lib/error-handler";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: FriendlyError, retry: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: FriendlyError | null;
}

/**
 * Error boundary component that catches errors and displays friendly UI.
 *
 * Handles known serverless failure modes:
 * - Lambda cold starts
 * - Bedrock throttling
 * - S3 failures
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Parse error if it's a known TwinError
    let friendlyError: FriendlyError | null = null;

    if (error instanceof Error && error.message) {
      try {
        const parsed = JSON.parse(error.message) as ErrorResponse;
        friendlyError = toFriendlyError(parsed);
      } catch {
        // Not a JSON error, treat as unknown
        friendlyError = {
          type: "unknown" as any,
          title: "Something Went Wrong",
          message: error.message || "An unexpected error occurred.",
          actionLabel: "Retry",
          isDismissible: true,
        };
      }
    }

    return {
      hasError: true,
      error: friendlyError,
    };
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <DefaultErrorFallback error={this.state.error} onRetry={this.resetError} />
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback UI component.
 */
function DefaultErrorFallback({
  error,
  onRetry,
}: {
  error: FriendlyError;
  onRetry: () => void;
}) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);

    // Wait for retry_after delay if specified
    if (error.retryAfterSeconds) {
      await new Promise((resolve) =>
        setTimeout(resolve, error.retryAfterSeconds! * 1000)
      );
    }

    setIsRetrying(false);
    onRetry();
  }, [error, onRetry]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error.title}
          </h2>
          <p className="text-gray-600 mb-6">{error.message}</p>

          {error.retryAfterSeconds && (
            <p className="text-sm text-gray-500 mb-4">
              Please wait {error.retryAfterSeconds} seconds before retrying.
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded transition"
            >
              {isRetrying ? "Retrying..." : error.actionLabel}
            </button>

            {error.isDismissible && (
              <button
                onClick={onRetry}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded transition"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
