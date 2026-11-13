"""Data models for LLM interactions.

Defines modality-agnostic message and response schemas to support
text, voice, structured outputs, and future modalities.
"""

from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class MessageRole(str, Enum):
    """Message originator role."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ContentType(str, Enum):
    """Content modality type."""
    TEXT = "text"
    VOICE = "voice"
    STRUCTURED = "structured"
    IMAGE = "image"


class Message(BaseModel):
    """A modality-agnostic message in a conversation.
    
    Attributes:
        role: Who sent the message (user, assistant, system).
        content: The primary message body (text, audio bytes, JSON, etc.).
        content_type: The modality of the content (text, voice, structured, etc.).
        metadata: Optional contextual data (speaker ID, timestamp, source, etc.).
    """
    role: MessageRole
    content: str
    content_type: ContentType = ContentType.TEXT
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        use_enum_values = False


class LLMResponse(BaseModel):
    """Response from an LLM provider.
    
    Attributes:
        content: The generated text or structured output.
        role: Always 'assistant'.
        finish_reason: Why generation stopped (stop, max_tokens, error, etc.).
        usage: Token counts (input_tokens, output_tokens) if available.
        model: The model ID that generated this response.
        latency_ms: Round-trip time in milliseconds.
        metadata: Provider-specific metadata (e.g. Bedrock request ID).
    """
    content: str
    role: MessageRole = MessageRole.ASSISTANT
    finish_reason: str
    usage: Optional[Dict[str, int]] = None
    model: str
    latency_ms: float
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        use_enum_values = False


class LLMConfig(BaseModel):
    """Configuration for LLM provider initialization.
    
    Attributes:
        provider: LLM provider name (bedrock, openai, local, etc.).
        model_id: Model identifier (e.g. 'claude-3-sonnet-20240229').
        region: AWS region for Bedrock (optional).
        api_key: API key for providers that require it (optional).
        temperature: Sampling temperature (0.0 to 1.0).
        max_tokens: Maximum output length.
        top_p: Nucleus sampling parameter.
    """
    provider: str
    model_id: str
    region: Optional[str] = None
    api_key: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 1024
    top_p: float = 0.95

    class Config:
        use_enum_values = False
