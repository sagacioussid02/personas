from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class PersonaIntake(BaseModel):
    """Structured intake data for persona creation."""

    name: str = Field(..., description="Full name of the persona")
    title: str = Field(..., description="Title or role")
    bio: str = Field(..., description="Biography or background")
    voice_examples: List[str] = Field(..., description="Communication style examples")
    core_values: List[str] = Field(..., description="Core values")
    decision_examples: List[str] = Field(..., description="Decision-making examples")
    context_urls: List[str] = Field(default_factory=list, description="Supporting URLs")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Sarah Chen",
                "title": "Founder & CEO",
                "bio": "Serial entrepreneur with 15 years in AI and fintech...",
                "voice_examples": [
                    "I believe in shipping fast and iterating based on user feedback",
                    "Complexity is the enemy of execution",
                ],
                "core_values": ["Transparency", "User-centricity", "Continuous learning"],
                "decision_examples": [
                    "When faced with a choice between perfect and shipped, I choose shipped"
                ],
                "context_urls": ["https://example.com/interview"],
            }
        }


class PersonaResponse(BaseModel):
    """Response model for persona data."""

    persona_id: str = Field(..., description="Unique persona identifier")
    name: str = Field(..., description="Persona name")
    title: str = Field(..., description="Persona title")
    bio: str = Field(..., description="Persona biography")
    voice_examples: List[str] = Field(..., description="Voice examples")
    core_values: List[str] = Field(..., description="Core values")
    decision_examples: List[str] = Field(..., description="Decision examples")
    context_urls: List[str] = Field(..., description="Context URLs")
    status: str = Field(default="initialized", description="Persona status")
    created_at: str = Field(..., description="Creation timestamp")
    bedrock_model_id: Optional[str] = Field(
        default=None, description="Associated Bedrock model ID"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "persona_id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "Sarah Chen",
                "title": "Founder & CEO",
                "bio": "Serial entrepreneur with 15 years in AI and fintech...",
                "voice_examples": [
                    "I believe in shipping fast and iterating based on user feedback"
                ],
                "core_values": ["Transparency", "User-centricity"],
                "decision_examples": ["When faced with a choice between perfect and shipped..."],
                "context_urls": ["https://example.com/interview"],
                "status": "initialized",
                "created_at": "2024-01-15T10:30:00Z",
                "bedrock_model_id": "arn:aws:bedrock:...",
            }
        }
