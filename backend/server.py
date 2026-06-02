"""FastAPI backend for Personality Twin.

Provides chat, persona management, and context loading endpoints.
Powered by Bedrock, Lambda, S3, and CloudFront.
"""

import json
import logging
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from errors import (
    TwinError,
    ErrorType,
    LambdaColdStartError,
    BedrockThrottleError,
    S3FailureError,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown."""
    logger.info("Twin backend starting up")
    yield
    logger.info("Twin backend shutting down")


app = FastAPI(
    title="Personality Twin API",
    description="Turn human expertise into an always-on AI persona.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers for known serverless failure modes

@app.exception_handler(LambdaColdStartError)
async def lambda_cold_start_handler(request: Request, exc: LambdaColdStartError):
    """Handle Lambda cold start timeouts."""
    logger.warning(
        f"Lambda cold start timeout: {exc.technical_message}",
        extra={"error_type": exc.error_type},
    )
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "error": exc.error_type,
            "message": exc.user_message,
            "retry_after": exc.retry_after_seconds,
        },
    )


@app.exception_handler(BedrockThrottleError)
async def bedrock_throttle_handler(request: Request, exc: BedrockThrottleError):
    """Handle Bedrock API throttling (429)."""
    logger.warning(
        f"Bedrock throttled: {exc.technical_message}",
        extra={"error_type": exc.error_type},
    )
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "error": exc.error_type,
            "message": exc.user_message,
            "retry_after": exc.retry_after_seconds,
        },
        headers={"Retry-After": str(exc.retry_after_seconds)},
    )


@app.exception_handler(S3FailureError)
async def s3_failure_handler(request: Request, exc: S3FailureError):
    """Handle S3 operation failures."""
    logger.error(
        f"S3 failure: {exc.technical_message}",
        extra={"error_type": exc.error_type},
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": exc.error_type,
            "message": exc.user_message,
            "retry_after": exc.retry_after_seconds,
        },
    )


@app.exception_handler(TwinError)
async def twin_error_handler(request: Request, exc: TwinError):
    """Handle generic Twin errors."""
    logger.error(
        f"Twin error: {exc.technical_message}",
        extra={"error_type": exc.error_type},
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": exc.error_type,
            "message": exc.user_message,
            "retry_after": exc.retry_after_seconds,
        },
    )


# Health check endpoint

@app.get("/health")
async def health_check():
    """Health check endpoint for Lambda and load balancers."""
    return {"status": "ok", "service": "twin-backend"}


# Chat endpoint (stub for demonstration)

@app.post("/chat")
async def chat(request: Request):
    """
    Chat with a personality twin.
    
    Expected request body:
    {
        "twin_id": "string",
        "message": "string",
        "conversation_id": "string (optional)"
    }
    
    Returns:
    {
        "response": "string",
        "conversation_id": "string"
    }
    """
    try:
        body = await request.json()
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON in request body",
        )
    
    twin_id = body.get("twin_id")
    message = body.get("message")
    
    if not twin_id or not message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required fields: twin_id, message",
        )
    
    # Placeholder: In production, this would:
    # 1. Load persona context from S3 (may raise S3FailureError)
    # 2. Call Bedrock API (may raise BedrockThrottleError)
    # 3. Return response
    
    return {
        "response": f"Hello! I'm {twin_id}. You said: {message}",
        "conversation_id": "conv_123",
    }


# Taglines endpoint (stub for demonstration)

@app.get("/taglines/{twin_id}")
async def get_taglines(twin_id: str):
    """
    Get taglines for a personality twin.
    
    Returns:
    {
        "taglines": ["string", ...]
    }
    """
    # Placeholder: In production, this would load from S3 or database
    return {
        "taglines": [
            "Always learning, always growing.",
            "Turning ideas into reality.",
        ]
    }


if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
