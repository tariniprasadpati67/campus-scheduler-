from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from backend.app.auth import get_current_user_optional, get_current_user
from backend.app.database import User
from backend.app.ai_service import (
    parse_booking_request,
    parse_faculty_change_request,
    explain_decision,
)

router = APIRouter(prefix="/ai", tags=["ai"])


class ParseBookingInput(BaseModel):
    text: str = Field(..., description="Plain-language or Hinglish booking request text")
    user_role: Optional[str] = None


class ParseChangeInput(BaseModel):
    text: str = Field(..., description="Plain-language faculty leave or room maintenance description")
    faculty_id: Optional[str] = None


class ExplainDecisionInput(BaseModel):
    decision_type: str = Field(..., description="'booking' or 'schedule_diff'")
    data: Dict[str, Any] = Field(..., description="Decision record or diff payload")


@router.post("/parse-booking")
def api_parse_booking(
    req: ParseBookingInput,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Parse a natural-language or Hinglish venue booking request into editable structured JSON.
    Code validation enforces role category caps and wheelchair accessibility constraints.
    """
    if not req.text or not req.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request text cannot be empty.",
        )

    role = current_user.role if current_user else (req.user_role or "club")
    result = parse_booking_request(req.text.strip(), user_role=role)
    return result


@router.post("/parse-change")
def api_parse_change(
    req: ParseChangeInput,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Faculty AI Assistant: Parse natural language leave or disruption requests into structured disruption parameters.
    """
    if not req.text or not req.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request text cannot be empty.",
        )

    fac_id = req.faculty_id
    if not fac_id and current_user and current_user.faculty_id:
        fac_id = current_user.faculty_id

    result = parse_faculty_change_request(req.text.strip(), user_faculty_id=fac_id)
    return result


@router.post("/explain-decision")
def api_explain_decision(req: ExplainDecisionInput):
    """
    Generate clear, factual natural-language explanations for booking or rescheduling decisions.
    """
    explanation = explain_decision(req.decision_type, req.data)
    return {"explanation": explanation}

