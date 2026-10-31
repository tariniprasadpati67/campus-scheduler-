import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.config import DATA_PATH
from backend.app.database import (
    get_db,
    BookingRequestModel,
    TimetableEntry,
    AuditLog,
    User,
)
from backend.app.auth import get_current_user, require_roles
from app.models import load_dataset
from app.booking_engine import allocate_bookings

router = APIRouter(prefix="/bookings", tags=["bookings"])


class WindowInput(BaseModel):
    day: str
    from_period: Optional[int] = None
    to_period: Optional[int] = None
    start_period: Optional[int] = None
    end_period: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        fp = self.from_period if self.from_period is not None else self.start_period
        tp = self.to_period if self.to_period is not None else self.end_period
        return {"day": self.day, "from_period": fp, "to_period": tp}


class BookingCreateInput(BaseModel):
    title: str
    attendance: int
    duration_periods: int
    requested_category: str = Field(..., description="club_event | department_event | guest_lecture | institute_event")
    windows: List[WindowInput]
    room_types: List[str] = Field(default_factory=lambda: ["classroom"])
    needs: List[str] = Field(default_factory=list)
    requested_room: Optional[str] = None
    mandatory_for_groups: List[str] = Field(default_factory=list)
    raw_text: Optional[str] = None


@router.get("")
def list_bookings(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List booking requests with role-based visibility (club sees own, admin/coordinator sees all)."""
    query = db.query(BookingRequestModel)

    if current_user.role == "club":
        query = query.filter(BookingRequestModel.requester_id == current_user.id)
    if status_filter:
        query = query.filter(BookingRequestModel.status == status_filter)

    bookings = query.order_by(BookingRequestModel.id.asc()).all()
    results = []
    for b in bookings:
        structured = json.loads(b.structured_json) if b.structured_json else {}
        results.append({
            "id": b.id,
            "requester_id": b.requester_id,
            "title": structured.get("title", b.original_text or f"Booking #{b.id}"),
            "category": b.category,
            "status": b.status,
            "assigned_day": b.assigned_day,
            "assigned_start": b.assigned_start,
            "assigned_end": b.assigned_end,
            "assigned_room": b.assigned_room,
            "reason": b.reason,
            "decided_by": b.decided_by,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "structured": structured,
        })
    return {"total": len(results), "bookings": results}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_booking(
    req: BookingCreateInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new booking request.
    The booking engine immediately evaluates constraints, priorities, and rooms to decide status and reason.
    """
    dataset = load_dataset(DATA_PATH)
    entries = db.query(TimetableEntry).all()
    timetable_map = {e.session_id: (e.day, e.start_period, e.room_id) for e in entries}

    windows_dicts = [w.to_dict() for w in req.windows]
    req_id = f"REQ_U{current_user.id}_{datetime.utcnow().strftime('%H%M%S')}"

    new_req_dict = {
        "id": req_id,
        "submitted_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
        "requester": current_user.name or current_user.email,
        "role": current_user.role,
        "department": current_user.department,
        "requested_category": req.requested_category,
        "title": req.title,
        "attendance": req.attendance,
        "duration_periods": req.duration_periods,
        "windows": windows_dicts,
        "room_types": req.room_types,
        "needs": req.needs,
        "requested_room": req.requested_room,
        "mandatory_for_groups": req.mandatory_for_groups,
        "series_id": None,
        "raw_text": req.raw_text or req.title,
    }

    # Evaluate with booking engine
    dataset.booking_requests.append(new_req_dict)
    fest_result = allocate_bookings(dataset, timetable_map)

    dec = next((b for b in fest_result.get("bookings", []) if b["request_id"] == req_id), None)
    if not dec:
        dec_status = "rejected"
        dec_reason = "No matching venue or time window found that satisfies constraints"
        assigned_day, assigned_start, assigned_end, assigned_room = None, None, None, None
    else:
        dec_status = dec.get("status", "rejected")
        dec_reason = dec.get("reason", "Allocated by booking engine")
        assigned_day = dec.get("day")
        assigned_start = dec.get("start_period")
        assigned_end = dec.get("end_period")
        assigned_room = dec.get("room_id")

    model = BookingRequestModel(
        requester_id=current_user.id,
        original_text=req.raw_text or req.title,
        structured_json=json.dumps(new_req_dict),
        category=req.requested_category,
        status=dec_status,
        reason=dec_reason,
        assigned_day=assigned_day,
        assigned_start=assigned_start,
        assigned_end=assigned_end,
        assigned_room=assigned_room,
        decided_by=None,
    )
    db.add(model)
    db.flush()

    audit = AuditLog(
        actor=current_user.email,
        action="CREATE_BOOKING",
        detail=f"Booking #{model.id} ({req.title})",
        reason=f"Booking #{model.id} evaluated: status={dec_status}, room={assigned_room}, day={assigned_day}. Reason: {dec_reason}",
    )
    db.add(audit)
    db.commit()
    db.refresh(model)

    return {
        "id": model.id,
        "title": req.title,
        "status": model.status,
        "assigned_day": model.assigned_day,
        "assigned_start": model.assigned_start,
        "assigned_end": model.assigned_end,
        "assigned_room": model.assigned_room,
        "reason": model.reason,
    }


@router.post("/{booking_id}/cancel")
def cancel_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel own booking request (club can only cancel own; admin can cancel any)."""
    b = db.query(BookingRequestModel).filter(BookingRequestModel.id == booking_id).first()
    if not b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking request not found.")

    if current_user.role == "club" and b.requester_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only cancel your own booking requests.",
        )

    old_status = b.status
    b.status = "cancelled"
    b.reason = f"Cancelled by {current_user.email} ({current_user.role})"
    b.assigned_day = None
    b.assigned_start = None
    b.assigned_end = None
    b.assigned_room = None

    audit = AuditLog(
        actor=current_user.email,
        action="CANCEL_BOOKING",
        detail=f"Booking #{booking_id}",
        reason=f"Booking #{booking_id} cancelled by {current_user.email} (was {old_status}).",
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "message": f"Booking #{booking_id} has been cancelled."}
