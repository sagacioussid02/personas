"""LLM configuration and factory.

Manages environment-driven provider selection and client initialization.
Ensures all LLM clients are instantiated through a single, testable factory.
"""

import os
import logging
from typing import Optional

from llm.models import LLMConfig
from llm.client import LLMClient, BedrockClient

logger = logging.getLogger(__name__)


def get_llm_config() -> LLMConfig:
    """Load LLM configuration from environment variables.
    
    Environment variables:
        - LLM_PROVIDER: Provider name ('bedrock', 'openai', etc.). Defaults to 'bedrock'.
        - ANTHROPIC_MODEL_ID: Model identifier. Defaults to 'claude-3-5-sonnet-20241022'.
        - AWS_REGION: AWS region for Bedrock. Defaults to 'us-east-1'.
        - LLM_TEMPERATURE: Sampling temperature (0.0-1.0). Defaults to 0.7.
        - LLM_MAX_TOKENS: Maximum output tokens. Defaults to 1024.
        - LLM_TOP_P: Nucleus sampling parameter. Defaults to 0.95.
    
    Returns:
        LLMConfig object with all settings.
    """
    provider = os.getenv("LLM_PROVIDER", "bedrock").lower()
    model_id = os.getenv(
        "ANTHROPIC_MODEL_ID",
        "claude-3-5-sonnet-20241022",
    )
    region = os.getenv("AWS_REGION", "us-east-1")
    temperature = float(os.getenv("LLM_TEMPERATURE", "0.7"))
    max_tokens = int(os.getenv("LLM_MAX_TOKENS", "1024"))
    top_p = float(os.getenv("LLM_TOP_P", "0.95"))
    
    config = LLMConfig(
        provider=provider,
        model_id=model_id,
        region=region,
        temperature=temperature,
        max_tokens=max_tokens,
        top_p=top_p,
    )
    
    logger.info(
        "LLM configuration loaded",
        extra={
            "provider": provider,
            "model_id": model_id,
            "region": region,
            "temperature": temperature,
        },
    )
    
    return config


def get_llm_client(config: Optional[LLMConfig] = None) -> LLMClient:
    """Factory function to instantiate the appropriate LLM client.
    
    Args:
        config: LLMConfig object. If None, loads from environment.
    
    Returns:
        Initialized LLMClient instance.
    
    Raises:
        ValueError: If provider is not recognized.
        RuntimeError: If client initialization fails.
    """
    if config is None:
        config = get_llm_config()
    
    provider = config.provider.lower()
    
    if provider == "bedrock":
        return BedrockClient(config)
    else:
        raise ValueError(
            f"Unknown LLM provider: {provider}. "
            "Supported providers: bedrock, openai (coming soon)."
        )
