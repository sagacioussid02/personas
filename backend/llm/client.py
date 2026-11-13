"""LLM client abstraction and implementations.

Provides a provider-agnostic interface for LLM interactions.
All business logic uses this interface; no direct provider SDK calls.
"""

import json
import logging
import time
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from datetime import datetime

import boto3
from botocore.exceptions import ClientError

from llm.models import Message, LLMResponse, LLMConfig, MessageRole, ContentType

logger = logging.getLogger(__name__)


class LLMClient(ABC):
    """Abstract base class for LLM providers.
    
    All implementations must provide a consistent interface for:
    - Initializing the client with configuration
    - Sending messages and receiving responses
    - Handling errors uniformly
    - Logging interactions for observability
    """

    def __init__(self, config: LLMConfig):
        """Initialize the LLM client.
        
        Args:
            config: LLM configuration (model, provider, parameters).
        """
        self.config = config
        self.model_id = config.model_id
        self.temperature = config.temperature
        self.max_tokens = config.max_tokens
        self.top_p = config.top_p

    @abstractmethod
    def invoke(
        self,
        messages: List[Message],
        system_prompt: Optional[str] = None,
        **kwargs,
    ) -> LLMResponse:
        """Send messages to the LLM and receive a response.
        
        Args:
            messages: Conversation history (modality-agnostic).
            system_prompt: Optional system instruction.
            **kwargs: Provider-specific overrides.
            
        Returns:
            LLMResponse with content, usage, and metadata.
            
        Raises:
            RuntimeError: If the provider is unavailable or the request fails.
        """
        pass

    @abstractmethod
    def health_check(self) -> bool:
        """Verify that the provider is reachable and functional.
        
        Returns:
            True if healthy, False otherwise.
        """
        pass


class BedrockClient(LLMClient):
    """AWS Bedrock implementation of LLMClient.
    
    Supports Claude models via AWS Bedrock inference API.
    Handles authentication, request formatting, and error recovery.
    """

    def __init__(self, config: LLMConfig):
        """Initialize the Bedrock client.
        
        Args:
            config: LLM configuration with provider='bedrock'.
            
        Raises:
            RuntimeError: If AWS credentials are not available.
        """
        super().__init__(config)
        region = config.region or "us-east-1"
        try:
            self.bedrock = boto3.client("bedrock-runtime", region_name=region)
            logger.info(
                "BedrockClient initialized",
                extra={
                    "model": self.model_id,
                    "region": region,
                    "temperature": self.temperature,
                },
            )
        except Exception as e:
            logger.error(
                "Failed to initialize Bedrock client",
                extra={"error": str(e), "region": region},
            )
            raise RuntimeError(f"Bedrock initialization failed: {e}") from e

    def invoke(
        self,
        messages: List[Message],
        system_prompt: Optional[str] = None,
        **kwargs,
    ) -> LLMResponse:
        """Invoke Claude model via Bedrock.
        
        Args:
            messages: Conversation history.
            system_prompt: Optional system instruction.
            **kwargs: Overrides (temperature, max_tokens, etc.).
            
        Returns:
            LLMResponse with Claude's reply.
            
        Raises:
            RuntimeError: If Bedrock returns an error.
        """
        start_time = time.time()
        
        # Extract configuration overrides
        temperature = kwargs.get("temperature", self.temperature)
        max_tokens = kwargs.get("max_tokens", self.max_tokens)
        top_p = kwargs.get("top_p", self.top_p)
        
        # Convert messages to Bedrock format
        bedrock_messages = [
            {"role": msg.role.value, "content": msg.content}
            for msg in messages
        ]
        
        # Build request payload
        request_payload = {
            "modelId": self.model_id,
            "messages": bedrock_messages,
            "inferenceConfig": {
                "temperature": temperature,
                "maxTokens": max_tokens,
                "topP": top_p,
            },
        }
        
        # Add system prompt if provided
        if system_prompt:
            request_payload["system"] = system_prompt
        
        try:
            logger.debug(
                "Sending request to Bedrock",
                extra={
                    "model": self.model_id,
                    "message_count": len(messages),
                    "has_system_prompt": bool(system_prompt),
                },
            )
            
            response = self.bedrock.converse(**request_payload)
            
            latency_ms = (time.time() - start_time) * 1000
            
            # Extract response content
            content = ""
            if response.get("output") and response["output"].get("message"):
                for block in response["output"]["message"].get("content", []):
                    if "text" in block:
                        content += block["text"]
            
            # Extract usage
            usage = None
            if response.get("usage"):
                usage = {
                    "input_tokens": response["usage"].get("inputTokens", 0),
                    "output_tokens": response["usage"].get("outputTokens", 0),
                }
            
            # Extract stop reason
            finish_reason = "unknown"
            if response.get("stopReason"):
                finish_reason = response["stopReason"]
            
            llm_response = LLMResponse(
                content=content,
                role=MessageRole.ASSISTANT,
                finish_reason=finish_reason,
                usage=usage,
                model=self.model_id,
                latency_ms=latency_ms,
                metadata={
                    "provider": "bedrock",
                    "request_id": response.get("ResponseMetadata", {}).get("RequestId"),
                },
            )
            
            logger.info(
                "Bedrock inference succeeded",
                extra={
                    "model": self.model_id,
                    "latency_ms": latency_ms,
                    "finish_reason": finish_reason,
                    "input_tokens": usage.get("input_tokens", 0) if usage else 0,
                    "output_tokens": usage.get("output_tokens", 0) if usage else 0,
                },
            )
            
            return llm_response
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            error_msg = e.response.get("Error", {}).get("Message", str(e))
            latency_ms = (time.time() - start_time) * 1000
            
            logger.error(
                "Bedrock error",
                extra={
                    "error_code": error_code,
                    "error_message": error_msg,
                    "model": self.model_id,
                    "latency_ms": latency_ms,
                },
            )
            
            raise RuntimeError(
                f"Bedrock error ({error_code}): {error_msg}"
            ) from e
            
        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000
            logger.error(
                "Unexpected error during Bedrock inference",
                extra={
                    "error": str(e),
                    "model": self.model_id,
                    "latency_ms": latency_ms,
                },
            )
            raise RuntimeError(f"Bedrock inference failed: {e}") from e

    def health_check(self) -> bool:
        """Check if Bedrock is accessible.
        
        Returns:
            True if Bedrock client is initialized and reachable.
        """
        try:
            # Attempt a lightweight describe_models call
            self.bedrock.list_foundation_models()
            logger.debug("Bedrock health check passed")
            return True
        except Exception as e:
            logger.warning(
                "Bedrock health check failed",
                extra={"error": str(e)},
            )
            return False
