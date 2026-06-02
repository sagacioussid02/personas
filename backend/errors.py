"""Custom exception classes for known serverless failure modes."""

from enum import Enum
from typing import Optional


class ErrorType(str, Enum):
    """Enumeration of user-facing error types."""
    LAMBDA_COLD_START = "lambda_cold_start"
    BEDROCK_THROTTLE = "bedrock_throttle"
    S3_FAILURE = "s3_failure"
    UNKNOWN = "unknown"


class TwinError(Exception):
    """Base exception for Twin application errors."""
    
    def __init__(
        self,
        error_type: ErrorType,
        user_message: str,
        technical_message: Optional[str] = None,
        retry_after_seconds: Optional[int] = None,
    ):
        self.error_type = error_type
        self.user_message = user_message
        self.technical_message = technical_message or user_message
        self.retry_after_seconds = retry_after_seconds
        super().__init__(self.technical_message)


class LambdaColdStartError(TwinError):
    """Raised when Lambda function times out during initialization."""
    
    def __init__(self, technical_message: Optional[str] = None):
        super().__init__(
            error_type=ErrorType.LAMBDA_COLD_START,
            user_message="The service is warming up. Please try again in a moment.",
            technical_message=technical_message or "Lambda cold start timeout",
            retry_after_seconds=5,
        )


class BedrockThrottleError(TwinError):
    """Raised when Bedrock API returns 429 (throttled)."""
    
    def __init__(self, retry_after_seconds: int = 30, technical_message: Optional[str] = None):
        super().__init__(
            error_type=ErrorType.BEDROCK_THROTTLE,
            user_message="High demand right now. Please try again in a moment.",
            technical_message=technical_message or "Bedrock API throttled (429)",
            retry_after_seconds=retry_after_seconds,
        )


class S3FailureError(TwinError):
    """Raised when S3 operations fail (access, availability, etc.)."""
    
    def __init__(self, technical_message: Optional[str] = None):
        super().__init__(
            error_type=ErrorType.S3_FAILURE,
            user_message="Unable to load context. Please refresh and try again.",
            technical_message=technical_message or "S3 operation failed",
            retry_after_seconds=10,
        )
