"""Error handling utilities for frontend.

Maps backend error responses to user-friendly UI states.
"""

export enum ErrorType {
  LAMBDA_COLD_START = "lambda_cold_start",
  BEDROCK_THROTTLE = "bedrock_throttle",
  S3_FAILURE = "s3_failure",
  UNKNOWN = "unknown",
}

export interface ErrorResponse {
  error: ErrorType;
  message: string;
  retry_after?: number;
}

export interface FriendlyError {
  type: ErrorType;
  title: string;
  message: string;
  actionLabel: string;
  retryAfterSeconds?: number;
  isDismissible: boolean;
}

/**
 * Parse a backend error response and return a user-friendly error object.
 */
export function parseErrorResponse(response: Response): ErrorResponse | null {
  try {
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return null;
    }
    return response.json();
  } catch {
    return null;
  }
}

/**
 * Convert an error response to a friendly UI state.
 */
export function toFriendlyError(error: ErrorResponse): FriendlyError {
  switch (error.error) {
    case ErrorType.LAMBDA_COLD_START:
      return {
        type: ErrorType.LAMBDA_COLD_START,
        title: "Service Warming Up",
        message: error.message || "The service is warming up. Please try again in a moment.",
        actionLabel: "Retry",
        retryAfterSeconds: error.retry_after || 5,
        isDismissible: false,
      };

    case ErrorType.BEDROCK_THROTTLE:
      return {
        type: ErrorType.BEDROCK_THROTTLE,
        title: "High Demand",
        message: error.message || "High demand right now. Please try again in a moment.",
        actionLabel: "Retry",
        retryAfterSeconds: error.retry_after || 30,
        isDismissible: false,
      };

    case ErrorType.S3_FAILURE:
      return {
        type: ErrorType.S3_FAILURE,
        title: "Unable to Load Context",
        message: error.message || "Unable to load context. Please refresh and try again.",
        actionLabel: "Refresh",
        retryAfterSeconds: error.retry_after || 10,
        isDismissible: true,
      };

    default:
      return {
        type: ErrorType.UNKNOWN,
        title: "Something Went Wrong",
        message: error.message || "An unexpected error occurred. Please try again.",
        actionLabel: "Retry",
        isDismissible: true,
      };
  }
}

/**
 * Check if a fetch response indicates a known serverless failure mode.
 */
export async function isKnownError(response: Response): Promise<boolean> {
  if (!response.ok) {
    const error = await parseErrorResponse(response);
    if (error) {
      return [
        ErrorType.LAMBDA_COLD_START,
        ErrorType.BEDROCK_THROTTLE,
        ErrorType.S3_FAILURE,
      ].includes(error.error);
    }
  }
  return false;
}

/**
 * Extract retry-after delay from response headers or error body.
 */
export function getRetryAfterDelay(response: Response, error?: ErrorResponse): number {
  // Check Retry-After header first (standard HTTP)
  const retryAfterHeader = response.headers.get("Retry-After");
  if (retryAfterHeader) {
    const parsed = parseInt(retryAfterHeader, 10);
    if (!isNaN(parsed)) {
      return parsed * 1000; // Convert to milliseconds
    }
  }

  // Fall back to error body
  if (error?.retry_after) {
    return error.retry_after * 1000; // Convert to milliseconds
  }

  // Default fallback
  return 5000; // 5 seconds
}
