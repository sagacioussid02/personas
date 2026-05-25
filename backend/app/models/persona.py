from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PersonaCreate(BaseModel):
    name: str
    bio: str
    expertise: str
    voice_url: Optional[str] = None
    core_values: Optional[List[str]] = None
    decision_style: Optional[str] = None

class Persona(BaseModel):
    id: str
    user_id: str
    name: str
    bio: str
    expertise: str
    voice_url: Optional[str] = None
    core_values: Optional[List[str]] = None
    decision_style: Optional[str] = None
    created_at: str
    status: str = "active"
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "user_id": "user_123",
                "name": "Jane Doe",
                "bio": "Founder and CEO with 15 years of experience",
                "expertise": "Product Strategy, Leadership, AI/ML",
                "voice_url": "s3://twin-voices/user_123/voice.wav",
                "core_values": ["Innovation", "Integrity", "Impact"],
                "decision_style": "Data-driven with strong intuition",
                "created_at": "2024-01-15T10:30:00",
                "status": "active"
            }
        }
