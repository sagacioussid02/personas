"""LLM abstraction layer for provider-agnostic inference.

This module provides a pluggable interface for LLM interactions,
ensuring that business logic never depends on a specific LLM provider.
"""

from llm.client import LLMClient, BedrockClient
from llm.models import (
    Message,
    MessageRole,
    LLMResponse,
    ContentType,
    LLMConfig,
)
from llm.config import get_llm_client

__all__ = [
    "LLMClient",
    "BedrockClient",
    "Message",
    "MessageRole",
    "LLMResponse",
    "ContentType",
    "LLMConfig",
    "get_llm_client",
]
