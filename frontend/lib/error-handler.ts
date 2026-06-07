/**
 * Error handling utilities for frontend.
 *
 * Maps backend error responses to user-friendly UI states.
 */

export interface ErrorState {
  message: string;
  code: string;
  retryable: boolean;
}

/**
 * Maps HTTP status codes and error responses to user-friendly error states.
 */
export function handleError(error: unknown): ErrorState {
  // Handle network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      message: 'Network connection failed. Please check your internet connection.',
      code: 'NETWORK_ERROR',
      retryable: true,
    };
  }

  // Handle timeout errors (Lambda cold starts, Bedrock throttling)
  if (error instanceof Error && error.message.includes('timeout')) {
    return {
      message: 'The request took too long. Please try again in a moment.',
      code: 'TIMEOUT',
      retryable: true,
    };
  }

  // Handle 429 (Bedrock throttling)
  if (error instanceof Error && error.message.includes('429')) {
    return {
      message: 'The service is temporarily busy. Please try again shortly.',
      code: 'RATE_LIMITED',
      retryable: true,
    };
  }

  // Handle 503 (service unavailable)
  if (error instanceof Error && error.message.includes('503')) {
    return {
      message: 'The service is temporarily unavailable. Please try again later.',
      code: 'SERVICE_UNAVAILABLE',
      retryable: true,
    };
  }

  // Handle 500 (internal server error)
  if (error instanceof Error && error.message.includes('500')) {
    return {
      message: 'An unexpected error occurred. Our team has been notified.',
      code: 'INTERNAL_ERROR',
      retryable: false,
    };
  }

  // Default error handling
  return {
    message: 'Something went wrong. Please try again.',
    code: 'UNKNOWN_ERROR',
    retryable: true,
  };
}

/**
 * Determines if an error is retryable.
 */
export function isRetryable(error: ErrorState): boolean {
  return error.retryable;
}

/**
 * Formats error message for display in UI.
 */
export function formatErrorMessage(error: ErrorState): string {
  return error.message;
}
