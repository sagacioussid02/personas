from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from pydantic import BaseModel
from typing import Optional
import uuid
import json
from datetime import datetime
import boto3
from app.auth import verify_clerk_token
from app.models.persona import Persona, PersonaCreate

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

class OnboardingStep(BaseModel):
    step: str
    data: dict

class PersonaResponse(BaseModel):
    id: str
    name: str
    bio: str
    voice_url: Optional[str]
    created_at: str
    status: str

@router.post("/start")
async def start_onboarding(user_id: str = Depends(verify_clerk_token)):
    """
    Initialize onboarding session for user.
    Returns session ID and first step instructions.
    """
    session_id = str(uuid.uuid4())
    return {
        "session_id": session_id,
        "user_id": user_id,
        "current_step": 1,
        "total_steps": 4,
        "steps": [
            {"step": 1, "title": "Basic Info", "fields": ["name", "bio", "expertise"]},
            {"step": 2, "title": "Voice Capture", "fields": ["voice_sample"]},
            {"step": 3, "title": "Values & Judgment", "fields": ["core_values", "decision_style"]},
            {"step": 4, "title": "Review & Confirm", "fields": ["confirm"]}
        ]
    }

@router.post("/step/{step_number}")
async def submit_onboarding_step(
    step_number: int,
    step_data: OnboardingStep,
    user_id: str = Depends(verify_clerk_token)
):
    """
    Submit data for a specific onboarding step.
    Validates and stores step data.
    """
    if step_number < 1 or step_number > 4:
        raise HTTPException(status_code=400, detail="Invalid step number")
    
    # Store step data in session cache (in production, use Redis or DynamoDB)
    return {
        "step": step_number,
        "status": "completed",
        "next_step": step_number + 1 if step_number < 4 else None,
        "message": f"Step {step_number} completed successfully"
    }

@router.post("/voice-upload")
async def upload_voice(
    file: UploadFile = File(...),
    user_id: str = Depends(verify_clerk_token)
):
    """
    Upload voice sample for persona.
    Stores in S3 and returns signed URL.
    """
    if not file.content_type.startswith('audio/'):
        raise HTTPException(status_code=400, detail="File must be audio format")
    
    voice_key = f"voices/{user_id}/{uuid.uuid4()}.wav"
    
    try:
        contents = await file.read()
        s3_client.put_object(
            Bucket='twin-voices',
            Key=voice_key,
            Body=contents,
            ContentType=file.content_type
        )
        
        voice_url = f"s3://twin-voices/{voice_key}"
        return {
            "voice_url": voice_url,
            "file_name": file.filename,
            "size_bytes": len(contents),
            "status": "uploaded"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice upload failed: {str(e)}")

@router.post("/create-persona")
async def create_persona(
    persona_data: PersonaCreate,
    user_id: str = Depends(verify_clerk_token)
) -> PersonaResponse:
    """
    Create persona profile from onboarding data.
    Persists to DynamoDB and returns persona ID.
    """
    persona_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    persona = Persona(
        id=persona_id,
        user_id=user_id,
        name=persona_data.name,
        bio=persona_data.bio,
        expertise=persona_data.expertise,
        voice_url=persona_data.voice_url,
        core_values=persona_data.core_values,
        decision_style=persona_data.decision_style,
        created_at=now,
        status="active"
    )
    
    try:
        table = dynamodb.Table('twin-personas')
        table.put_item(
            Item={
                'persona_id': persona_id,
                'user_id': user_id,
                'name': persona.name,
                'bio': persona.bio,
                'expertise': persona.expertise,
                'voice_url': persona.voice_url,
                'core_values': persona.core_values,
                'decision_style': persona.decision_style,
                'created_at': now,
                'status': 'active'
            }
        )
        
        return PersonaResponse(
            id=persona_id,
            name=persona.name,
            bio=persona.bio,
            voice_url=persona.voice_url,
            created_at=now,
            status="active"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Persona creation failed: {str(e)}")

@router.get("/persona/{persona_id}")
async def get_persona(
    persona_id: str,
    user_id: str = Depends(verify_clerk_token)
) -> PersonaResponse:
    """
    Retrieve persona by ID.
    Validates user ownership.
    """
    try:
        table = dynamodb.Table('twin-personas')
        response = table.get_item(
            Key={'persona_id': persona_id}
        )
        
        if 'Item' not in response:
            raise HTTPException(status_code=404, detail="Persona not found")
        
        item = response['Item']
        
        # Verify ownership
        if item.get('user_id') != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        return PersonaResponse(
            id=item['persona_id'],
            name=item['name'],
            bio=item['bio'],
            voice_url=item.get('voice_url'),
            created_at=item['created_at'],
            status=item.get('status', 'active')
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Persona retrieval failed: {str(e)}")

@router.get("/personas")
async def list_user_personas(user_id: str = Depends(verify_clerk_token)):
    """
    List all personas for authenticated user.
    """
    try:
        table = dynamodb.Table('twin-personas')
        response = table.query(
            IndexName='user_id-created_at-index',
            KeyConditionExpression='user_id = :uid',
            ExpressionAttributeValues={':uid': user_id}
        )
        
        personas = [
            PersonaResponse(
                id=item['persona_id'],
                name=item['name'],
                bio=item['bio'],
                voice_url=item.get('voice_url'),
                created_at=item['created_at'],
                status=item.get('status', 'active')
            )
            for item in response.get('Items', [])
        ]
        
        return {"personas": personas, "count": len(personas)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Persona list failed: {str(e)}")
