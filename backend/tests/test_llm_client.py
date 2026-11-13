"""Unit tests for LLM abstraction layer.

Tests message serialization, response parsing, error handling,
and configuration management.
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from llm.models import (
    Message,
    MessageRole,
    LLMResponse,
    ContentType,
    LLMConfig,
)
from llm.client import BedrockClient
from llm.config import get_llm_config, get_llm_client


class TestMessageModel:
    """Test message schema and serialization."""

    def test_message_creation_text(self):
        """Test creating a text message."""
        msg = Message(
            role=MessageRole.USER,
            content="Hello, assistant!",
            content_type=ContentType.TEXT,
        )
        assert msg.role == MessageRole.USER
        assert msg.content == "Hello, assistant!"
        assert msg.content_type == ContentType.TEXT
        assert msg.metadata == {}

    def test_message_with_metadata(self):
        """Test message with metadata."""
        msg = Message(
            role=MessageRole.USER,
            content="Voice query",
            content_type=ContentType.VOICE,
            metadata={"speaker_id": "user_123", "duration_ms": 1500},
        )
        assert msg.metadata["speaker_id"] == "user_123"
        assert msg.metadata["duration_ms"] == 1500

    def test_message_json_schema(self):
        """Test that message can be serialized to JSON."""
        msg = Message(
            role=MessageRole.ASSISTANT,
            content="Response",
            content_type=ContentType.TEXT,
        )
        json_str = msg.model_dump_json()
        assert "role" in json_str
        assert "ASSISTANT" in json_str or "assistant" in json_str


class TestLLMResponse:
    """Test LLM response model."""

    def test_response_creation(self):
        """Test creating an LLM response."""
        resp = LLMResponse(
            content="This is the model's response.",
            role=MessageRole.ASSISTANT,
            finish_reason="stop",
            usage={"input_tokens": 50, "output_tokens": 150},
            model="claude-3-5-sonnet-20241022",
            latency_ms=234.5,
        )
        assert resp.content == "This is the model's response."
        assert resp.finish_reason == "stop"
        assert resp.usage["input_tokens"] == 50
        assert resp.latency_ms == 234.5

    def test_response_with_metadata(self):
        """Test response with provider metadata."""
        resp = LLMResponse(
            content="Result",
            role=MessageRole.ASSISTANT,
            finish_reason="stop",
            model="claude-3-5-sonnet-20241022",
            latency_ms=100.0,
            metadata={
                "provider": "bedrock",
                "request_id": "req-abc-123",
            },
        )
        assert resp.metadata["provider"] == "bedrock"
        assert resp.metadata["request_id"] == "req-abc-123"


class TestLLMConfig:
    """Test LLM configuration."""

    def test_config_creation(self):
        """Test creating an LLM config."""
        config = LLMConfig(
            provider="bedrock",
            model_id="claude-3-5-sonnet-20241022",
            region="us-east-1",
            temperature=0.7,
            max_tokens=1024,
        )
        assert config.provider == "bedrock"
        assert config.model_id == "claude-3-5-sonnet-20241022"
        assert config.temperature == 0.7

    def test_config_defaults(self):
        """Test that config has sensible defaults."""
        config = LLMConfig(
            provider="bedrock",
            model_id="claude-3-5-sonnet-20241022",
        )
        assert config.temperature == 0.7
        assert config.max_tokens == 1024
        assert config.top_p == 0.95


class TestGetLLMConfig:
    """Test environment-driven configuration loading."""

    @patch.dict(
        "os.environ",
        {
            "LLM_PROVIDER": "bedrock",
            "ANTHROPIC_MODEL_ID": "claude-3-5-sonnet-20241022",
            "AWS_REGION": "us-west-2",
            "LLM_TEMPERATURE": "0.5",
        },
    )
    def test_load_config_from_env(self):
        """Test loading config from environment variables."""
        config = get_llm_config()
        assert config.provider == "bedrock"
        assert config.model_id == "claude-3-5-sonnet-20241022"
        assert config.region == "us-west-2"
        assert config.temperature == 0.5

    @patch.dict("os.environ", {}, clear=True)
    def test_config_defaults_from_env(self):
        """Test that config uses defaults when env vars are not set."""
        # Set minimal required vars
        with patch.dict(
            "os.environ",
            {"LLM_PROVIDER": "bedrock"},
        ):
            config = get_llm_config()
            assert config.provider == "bedrock"
            assert config.temperature == 0.7  # default
            assert config.max_tokens == 1024  # default


class TestBedrockClient:
    """Test Bedrock LLM client."""

    @patch("llm.client.boto3.client")
    def test_bedrock_client_init(self, mock_boto_client):
        """Test Bedrock client initialization."""
        mock_bedrock = MagicMock()
        mock_boto_client.return_value = mock_bedrock

        config = LLMConfig(
            provider="bedrock",
            model_id="claude-3-5-sonnet-20241022",
        )
        client = BedrockClient(config)

        assert client.model_id == "claude-3-5-sonnet-20241022"
        mock_boto_client.assert_called_once_with(
            "bedrock-runtime",
            region_name="us-east-1",
        )

    @patch("llm.client.boto3.client")
    def test_bedrock_invoke_success(self, mock_boto_client):
        """Test successful Bedrock inference."""
        mock_bedrock = MagicMock()
        mock_boto_client.return_value = mock_bedrock

        # Mock Bedrock response
        mock_bedrock.converse.return_value = {
            "output": {
                "message": {
                    "content": [{"text": "This is the model response."}],
                },
            },
            "stopReason": "end_turn",
            "usage": {
                "inputTokens": 25,
                "outputTokens": 100,
            },
            "ResponseMetadata": {"RequestId": "req-123"},
        }

        config = LLMConfig(
            provider="bedrock",
            model_id="claude-3-5-sonnet-20241022",
        )
        client = BedrockClient(config)

        messages = [
            Message(
                role=MessageRole.USER,
                content="What is 2+2?",
            ),
        ]

        response = client.invoke(messages)

        assert response.content == "This is the model response."
        assert response.finish_reason == "end_turn"
        assert response.usage["input_tokens"] == 25
        assert response.usage["output_tokens"] == 100
        assert response.metadata["provider"] == "bedrock"

    @patch("llm.client.boto3.client")
    def test_bedrock_invoke_with_system_prompt(self, mock_boto_client):
        """Test Bedrock invoke with system prompt."""
        mock_bedrock = MagicMock()
        mock_boto_client.return_value = mock_bedrock
        mock_bedrock.converse.return_value = {
            "output": {
                "message": {
                    "content": [{"text": "Response with system context."}],
                },
            },
            "stopReason": "stop",
            "usage": {"inputTokens": 50, "outputTokens": 75},
        }

        config = LLMConfig(
            provider="bedrock",
            model_id="claude-3-5-sonnet-20241022",
        )
        client = BedrockClient(config)

        messages = [
            Message(
                role=MessageRole.USER,
                content="Respond as a helpful assistant.",
            ),
        ]

        response = client.invoke(
            messages,
            system_prompt="You are a coding expert.",
        )

        # Verify system prompt was included in request
        call_args = mock_bedrock.converse.call_args
        assert call_args[1]["system"] == "You are a coding expert."

    @patch("llm.client.boto3.client")
    def test_bedrock_invoke_error_handling(self, mock_boto_client):
        """Test error handling in Bedrock invoke."""
        mock_bedrock = MagicMock()
        mock_boto_client.return_value = mock_bedrock

        # Mock Bedrock error
        error_response = {
            "Error": {
                "Code": "ThrottlingException",
                "Message": "Rate exceeded",
            },
        }
        from botocore.exceptions import ClientError

        mock_bedrock.converse.side_effect = ClientError(
            error_response,
            "Converse",
        )

        config = LLMConfig(
            provider="bedrock",
            model_id="claude-3-5-sonnet-20241022",
        )
        client = BedrockClient(config)

        messages = [
            Message(
                role=MessageRole.USER,
                content="Test",
            ),
        ]

        with pytest.raises(RuntimeError, match="ThrottlingException"):
            client.invoke(messages)

    @patch("llm.client.boto3.client")
    def test_bedrock_health_check_success(self, mock_boto_client):
        """Test Bedrock health check."""
        mock_bedrock = MagicMock()
        mock_boto_client.return_value = mock_bedrock
        mock_bedrock.list_foundation_models.return_value = {"modelSummaries": []}

        config = LLMConfig(
            provider="bedrock",
            model_id="claude-3-5-sonnet-20241022",
        )
        client = BedrockClient(config)

        assert client.health_check() is True

    @patch("llm.client.boto3.client")
    def test_bedrock_health_check_failure(self, mock_boto_client):
        """Test Bedrock health check when service is unavailable."""
        mock_bedrock = MagicMock()
        mock_boto_client.return_value = mock_bedrock
        mock_bedrock.list_foundation_models.side_effect = Exception(
            "Connection failed"
        )

        config = LLMConfig(
            provider="bedrock",
            model_id="claude-3-5-sonnet-20241022",
        )
        client = BedrockClient(config)

        assert client.health_check() is False


class TestGetLLMClient:
    """Test LLM client factory."""

    @patch("llm.client.boto3.client")
    def test_get_bedrock_client(self, mock_boto_client):
        """Test factory creates Bedrock client."""
        mock_bedrock = MagicMock()
        mock_boto_client.return_value = mock_bedrock

        config = LLMConfig(
            provider="bedrock",
            model_id="claude-3-5-sonnet-20241022",
        )
        client = get_llm_client(config)

        assert isinstance(client, BedrockClient)

    def test_get_client_unknown_provider(self):
        """Test factory raises error for unknown provider."""
        config = LLMConfig(
            provider="unknown_provider",
            model_id="some-model",
        )

        with pytest.raises(ValueError, match="Unknown LLM provider"):
            get_llm_client(config)

    @patch("llm.config.get_llm_config")
    @patch("llm.client.boto3.client")
    def test_get_client_from_env(self, mock_boto_client, mock_get_config):
        """Test factory loads config from environment."""
        mock_bedrock = MagicMock()
        mock_boto_client.return_value = mock_bedrock

        mock_config = LLMConfig(
            provider="bedrock",
            model_id="claude-3-5-sonnet-20241022",
        )
        mock_get_config.return_value = mock_config

        client = get_llm_client()

        mock_get_config.assert_called_once()
        assert isinstance(client, BedrockClient)
