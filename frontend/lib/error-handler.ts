/**
 * Error handling utilities for the chat application.
 * Provides structured error parsing, user-friendly error messages, and retry logic.
 */

export interface ErrorResponse {
  status: number;
  message: string;
  code?: string;
  retryAfter?: number;
}

export interface FriendlyError {
  title: string;
  message: string;
  action?: string;
  retryable: boolean;
}

/**
 * Parse a raw API error response into a structured ErrorResponse object.
 * Handles various error formats (JSON, text, network errors).
 *
 * @param error - The raw error from fetch or API call
 * @returns Parsed ErrorResponse with status, message, and optional retry info
 */
export function parseErrorResponse(error: unknown): ErrorResponse {
  // Handle fetch/network errors
  if (error instanceof TypeError) {
    return {
      status: 0,
      message: error.message || 'Network error',
      code: 'NETWORK_ERROR',
    };
  }

  // Handle Response objects with JSON body
  if (error instanceof Response) {
    const retryAfter = error.headers.get('retry-after');
    return {
      status: error.status,
      message: error.statusText || 'Unknown error',
      retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
    };
  }

  // Handle objects with status and message properties
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    return {
      status: typeof err.status === 'number' ? err.status : 500,
      message: typeof err.message === 'string' ? err.message : 'Unknown error',
      code: typeof err.code === 'string' ? err.code : undefined,
      retryAfter: typeof err.retryAfter === 'number' ? err.retryAfter : undefined,
    };
  }

  // Fallback for string or other types
  return {
    status: 500,
    message: String(error) || 'An unexpected error occurred',
  };
}

/**
 * Convert an ErrorResponse or Error into a user-friendly FriendlyError.
 * Provides actionable, non-technical messages for display in the UI.
 *
 * @param error - ErrorResponse, Error, or unknown error object
 * @returns FriendlyError with user-facing title, message, and retry guidance
 */
export function toFriendlyError(error: unknown): FriendlyError {
  const parsed = parseErrorResponse(error);

  // Lambda cold start or timeout
  if (parsed.status === 504 || parsed.code === 'TIMEOUT') {
    return {
      title: 'Taking a moment to warm up',
      message: 'The service is initializing. Please try again in a few seconds.',
      action: 'Retry',
      retryable: true,
    };
  }

  // Bedrock throttling or rate limit
  if (parsed.status === 429 || parsed.code === 'THROTTLED') {
    return {
      title: 'Too many requests',
      message: 'The service is busy. Please wait a moment and try again.',
      action: 'Retry',
      retryable: true,
    };
  }

  // S3 or storage errors
  if (parsed.status === 503 || parsed.code === 'SERVICE_UNAVAILABLE') {
    return {
      title: 'Service temporarily unavailable',
      message: 'We are experiencing temporary issues. Please try again shortly.',
      action: 'Retry',
      retryable: true,
    };
  }

  // Client errors (bad request, validation)
  if (parsed.status >= 400 && parsed.status < 500) {
    return {
      title: 'Request error',
      message: parsed.message || 'Your request could not be processed.',
      retryable: false,
    };
  }

  // Server errors
  if (parsed.status >= 500) {
    return {
      title: 'Server error',
      message: 'Something went wrong on our end. Please try again later.',
      action: 'Retry',
      retryable: true,
    };
  }

  // Network errors
  if (parsed.status === 0) {
    return {
      title: 'Connection error',
      message: 'Unable to connect to the service. Check your internet connection.',
      action: 'Retry',
      retryable: true,
    };
  }

  // Fallback
  return {
    title: 'Error',
    message: parsed.message || 'An unexpected error occurred.',
    retryable: true,
  };
}

/**
 * Extract the retry-after delay from an error response.
 * Used to determine how long to wait before retrying a failed request.
 *
 * @param error - ErrorResponse or raw error object
 * @returns Delay in milliseconds, or undefined if no retry-after info available
 */
export function getRetryAfterDelay(error: unknown): number | undefined {
  const parsed = parseErrorResponse(error);

  if (parsed.retryAfter) {
    // retryAfter is typically in seconds; convert to milliseconds
    return parsed.retryAfter * 1000;
  }

  // Default exponential backoff based on status code
  if (parsed.status === 429) {
    return 5000; // 5 seconds for rate limiting
  }

  if (parsed.status === 504) {
    return 3000; // 3 seconds for timeout/cold start
  }

  if (parsed.status >= 500) {
    return 2000; // 2 seconds for server errors
  }

  return undefined;
}

/**
 * Handle an error by parsing it and logging it.
 * Useful for centralized error logging and monitoring.
 *
 * @param error - The error to handle
 * @param context - Optional context about where the error occurred
 */
export function handleError(error: unknown, context?: string): void {
  const parsed = parseErrorResponse(error);
  const friendly = toFriendlyError(error);

  // Log to console in development
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.error(
      `[${context || 'Error'}] Status: ${parsed.status}, Message: ${parsed.message}`,
      error
    );
  }

  // In production, you could send to error tracking service (Sentry, etc.)
  // Example: Sentry.captureException(error, { tags: { context } });
}
