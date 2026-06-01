"""FastAPI backend for Personality Twin.

Provides endpoints for:
- Chat with a twin (invoke Bedrock model)
- Persona management (CRUD)
- Health checks

Error handling for known failure modes:
- Lambda cold starts (timeout)
- Bedrock throttling (rate limiting)
- S3 failures (access denied, transient errors)
"""

import json
import logging
import os
import time
from typing import Optional
from datetime import datetime

import boto3
from botocore.exceptions import ClientError, BotoCoreError
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# AWS clients
bedrock_client = boto3.client("bedrock-runtime", region_name="us-east-1")
s3_client = boto3.client("s3", region_name="us-east-1")

# Configuration
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "twin-personas-dev")
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-sonnet-20240229-v1:0")
MAX_RETRIES = 3
INITIAL_BACKOFF_SECONDS = 1

# FastAPI app
app = FastAPI(title="Personality Twin API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Pydantic Models
# ============================================================================

class ChatRequest(BaseModel):
    """Request body for chat endpoint."""
    persona_id: str
    message: str
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    """Response body for chat endpoint."""
    response: str
    conversation_id: str
    timestamp: str


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    error_code: str
    message: str
    timestamp: str


# ============================================================================
# Error Handling Middleware
# ============================================================================

class UserFacingError(Exception):
    """Base class for user-facing errors."""
    def __init__(self, message: str, error_code: str, status_code: int = 500):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        super().__init__(message)


class LambdaColdStartError(UserFacingError):
    """Lambda cold start timeout."""
    def __init__(self):
        super().__init__(
            message="Service temporarily unavailable due to high demand. Please try again in a few seconds.",
            error_code="LAMBDA_COLD_START",
            status_code=503
        )


class BedrockThrottleError(UserFacingError):
    """Bedrock API throttling (rate limit exceeded)."""
    def __init__(self):
        super().__init__(
            message="Service is experiencing high demand. Please try again shortly.",
            error_code="BEDROCK_THROTTLE",
            status_code=429
        )


class S3Error(UserFacingError):
    """S3 operation failed."""
    def __init__(self, original_error: str = None):
        super().__init__(
            message="Unable to load persona data. Please try again.",
            error_code="S3_ERROR",
            status_code=503
        )
        self.original_error = original_error


@app.exception_handler(UserFacingError)
async def user_facing_error_handler(request: Request, exc: UserFacingError):
    """Handle user-facing errors with friendly messages."""
    logger.error(f"{exc.error_code}: {exc.original_error if hasattr(exc, 'original_error') else exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.error_code,
            error_code=exc.error_code,
            message=exc.message,
            timestamp=datetime.utcnow().isoformat()
        ).dict()
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error="HTTP_ERROR",
            error_code="HTTP_ERROR",
            message=exc.detail,
            timestamp=datetime.utcnow().isoformat()
        ).dict()
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions with generic error message."""
    logger.exception(f"Unexpected error: {exc}")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="INTERNAL_ERROR",
            error_code="INTERNAL_ERROR",
            message="An unexpected error occurred. Please try again later.",
            timestamp=datetime.utcnow().isoformat()
        ).dict()
    )


# ============================================================================
# Retry Logic with Exponential Backoff
# ============================================================================

def invoke_bedrock_with_backoff(model_id: str, prompt: str, max_retries: int = MAX_RETRIES) -> str:
    """Invoke Bedrock model with exponential backoff for throttling.
    
    Args:
        model_id: Bedrock model ID
        prompt: Input prompt for the model
        max_retries: Maximum number of retry attempts
        
    Returns:
        Model response text
        
    Raises:
        BedrockThrottleError: If throttled after max retries
        LambdaColdStartError: If timeout occurs
    """
    backoff_seconds = INITIAL_BACKOFF_SECONDS
    
    for attempt in range(max_retries + 1):
        try:
            logger.info(f"Invoking Bedrock model (attempt {attempt + 1}/{max_retries + 1})")
            
            response = bedrock_client.invoke_model(
                modelId=model_id,
                body=json.dumps({
                    "prompt": prompt,
                    "max_tokens_to_sample": 1024,
                    "temperature": 0.7,
                })
            )
            
            response_body = json.loads(response["body"].read())
            return response_body.get("completion", "")
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            
            # Handle throttling
            if error_code == "ThrottlingException":
                logger.warning(f"Bedrock throttled (attempt {attempt + 1}/{max_retries + 1})")
                if attempt < max_retries:
                    logger.info(f"Retrying in {backoff_seconds} seconds...")
                    time.sleep(backoff_seconds)
                    backoff_seconds *= 2  # Exponential backoff
                else:
                    raise BedrockThrottleError()
            
            # Handle timeout (cold start)
            elif error_code == "RequestTimeout" or "timed out" in str(e).lower():
                logger.error(f"Bedrock request timeout (cold start): {e}")
                raise LambdaColdStartError()
            
            else:
                logger.error(f"Bedrock error: {error_code}: {e}")
                raise
        
        except Exception as e:
            logger.error(f"Unexpected error invoking Bedrock: {e}")
            raise
    
    # Should not reach here
    raise BedrockThrottleError()


def read_s3_with_backoff(bucket: str, key: str, max_retries: int = MAX_RETRIES) -> str:
    """Read S3 object with exponential backoff for transient failures.
    
    Args:
        bucket: S3 bucket name
        key: S3 object key
        max_retries: Maximum number of retry attempts
        
    Returns:
        Object content as string
        
    Raises:
        S3Error: If read fails after max retries
    """
    backoff_seconds = INITIAL_BACKOFF_SECONDS
    
    for attempt in range(max_retries + 1):
        try:
            logger.info(f"Reading S3 object s3://{bucket}/{key} (attempt {attempt + 1}/{max_retries + 1})")
            
            response = s3_client.get_object(Bucket=bucket, Key=key)
            return response["Body"].read().decode("utf-8")
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            
            # Handle transient errors (retry)
            if error_code in ["ServiceUnavailable", "SlowDown", "RequestTimeout"]:
                logger.warning(f"S3 transient error: {error_code} (attempt {attempt + 1}/{max_retries + 1})")
                if attempt < max_retries:
                    # Exponential backoff with jitter
                    import random
                    jitter = random.uniform(0, backoff_seconds)
                    sleep_time = backoff_seconds + jitter
                    logger.info(f"Retrying in {sleep_time:.2f} seconds...")
                    time.sleep(sleep_time)
                    backoff_seconds *= 2
                else:
                    raise S3Error(original_error=error_code)
            
            # Handle permanent errors (don't retry)
            elif error_code == "AccessDenied":
                logger.error(f"S3 access denied: {e}")
                raise S3Error(original_error="AccessDenied")
            
            elif error_code == "NoSuchBucket":
                logger.error(f"S3 bucket not found: {e}")
                raise S3Error(original_error="NoSuchBucket")
            
            elif error_code == "NoSuchKey":
                logger.error(f"S3 object not found: {e}")
                raise S3Error(original_error="NoSuchKey")
            
            else:
                logger.error(f"S3 error: {error_code}: {e}")
                raise S3Error(original_error=error_code)
        
        except Exception as e:
            logger.error(f"Unexpected error reading S3: {e}")
            raise S3Error(original_error=str(e))
    
    # Should not reach here
    raise S3Error(original_error="Max retries exceeded")


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat with a personality twin.
    
    Args:
        request: ChatRequest with persona_id, message, and optional conversation_id
        
    Returns:
        ChatResponse with model response and conversation_id
        
    Raises:
        LambdaColdStartError: If Lambda cold start timeout occurs
        BedrockThrottleError: If Bedrock throttles the request
        S3Error: If persona data cannot be loaded from S3
    """
    logger.info(f"Chat request: persona_id={request.persona_id}, message_length={len(request.message)}")
    
    # Load persona context from S3
    persona_key = f"personas/{request.persona_id}/context.json"
    try:
        persona_context = read_s3_with_backoff(S3_BUCKET_NAME, persona_key)
        persona_data = json.loads(persona_context)
    except S3Error:
        raise
    
    # Build prompt with persona context
    system_prompt = f"""
You are {persona_data.get('name', 'a personality twin')}.

Background:
{persona_data.get('bio', '')}

Values and Principles:
{persona_data.get('values', '')}

Communication Style:
{persona_data.get('communication_style', '')}

Respond authentically as this person would, drawing on their experience and perspective.
"""
    
    full_prompt = f"{system_prompt}\n\nUser: {request.message}\n\nAssistant:"
    
    # Invoke Bedrock with backoff
    try:
        response_text = invoke_bedrock_with_backoff(BEDROCK_MODEL_ID, full_prompt)
    except (BedrockThrottleError, LambdaColdStartError):
        raise
    
    # Return response
    conversation_id = request.conversation_id or f"conv_{int(time.time())}"
    
    return ChatResponse(
        response=response_text.strip(),
        conversation_id=conversation_id,
        timestamp=datetime.utcnow().isoformat()
    )


@app.get("/personas/{persona_id}")
async def get_persona(persona_id: str):
    """Get persona metadata.
    
    Args:
        persona_id: Persona ID
        
    Returns:
        Persona metadata
        
    Raises:
        S3Error: If persona data cannot be loaded from S3
    """
    logger.info(f"Get persona: {persona_id}")
    
    persona_key = f"personas/{persona_id}/metadata.json"
    try:
        persona_data = read_s3_with_backoff(S3_BUCKET_NAME, persona_key)
        return json.loads(persona_data)
    except S3Error:
        raise


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
