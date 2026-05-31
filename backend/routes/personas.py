from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime

from backend.services.persona_service import PersonaService
from backend.models.persona import PersonaIntake, PersonaResponse

router = APIRouter(prefix="/personas", tags=["personas"])
persona_service = PersonaService()


class CreatePersonaRequest(BaseModel):
    """Request payload for persona creation."""

    name: str = Field(..., min_length=1, max_length=255, description="Full name of the persona")
    title: str = Field(
        ..., min_length=1, max_length=255, description="Title or role of the persona"
    )
    bio: str = Field(..., min_length=10, max_length=2000, description="Biography or background")
    voice_examples: List[str] = Field(
        ..., min_items=2, max_items=5, description="Examples of how the persona communicates"
    )
    core_values: List[str] = Field(
        ..., min_items=2, max_items=5, description="Core values that guide decisions"
    )
    decision_examples: List[str] = Field(
        ..., min_items=1, max_items=3, description="Examples of decision-making approach"
    )
    context_urls: List[str] = Field(
        default_factory=list, max_items=10, description="Optional URLs for additional context"
    )


class CreatePersonaResponse(BaseModel):
    """Response after persona creation."""

    persona_id: str
    name: str
    status: str
    initialized_at: str
    message: str


@router.post(
    "",
    response_model=CreatePersonaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new persona",
    description="Initialize a new AI persona with structured intake data",
)
async def create_persona(request: CreatePersonaRequest) -> CreatePersonaResponse:
    """
    Create a new persona from structured intake data.

    Accepts voice examples, values, and decision-making patterns,
    then initializes the Bedrock-backed persona model.

    Args:
        request: Persona intake data with name, bio, voice examples, values, and decisions

    Returns:
        CreatePersonaResponse with persona_id and initialization status

    Raises:
        HTTPException: If persona creation or Bedrock initialization fails
    """
    try:
        # Create intake model
        intake = PersonaIntake(
            name=request.name,
            title=request.title,
            bio=request.bio,
            voice_examples=request.voice_examples,
            core_values=request.core_values,
            decision_examples=request.decision_examples,
            context_urls=request.context_urls,
        )

        # Generate persona ID
        persona_id = str(uuid.uuid4())

        # Create persona via service (handles DynamoDB storage and Bedrock init)
        persona = await persona_service.create_persona(persona_id, intake)

        return CreatePersonaResponse(
            persona_id=persona.persona_id,
            name=persona.name,
            status="initialized",
            initialized_at=datetime.utcnow().isoformat(),
            message=f"Persona '{persona.name}' created successfully. Your twin is ready to chat.",
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid persona data: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create persona: {str(e)}",
        )


@router.get(
    "/{persona_id}",
    response_model=PersonaResponse,
    summary="Get persona details",
    description="Retrieve a persona by ID",
)
async def get_persona(persona_id: str) -> PersonaResponse:
    """
    Retrieve persona details by ID.

    Args:
        persona_id: UUID of the persona

    Returns:
        PersonaResponse with persona metadata and initialization status

    Raises:
        HTTPException: If persona not found
    """
    try:
        persona = await persona_service.get_persona(persona_id)
        if not persona:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Persona '{persona_id}' not found",
            )
        return persona
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve persona: {str(e)}",
        )
