import json
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.config import DATA_PATH
from backend.app.database import get_db, BookingRequestModel, TimetableEntry, AuditLog, User
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
    requested_category: str = Field(..., description="club_event, department_event, guest_lecture, institute_event")
    windows: List[WindowInput]
    room_types: List[str] = Field(default_factory=lambda: ["classroom"])
    needs: List[str] = Field(default_factory=list)
    requested_room: Optional[str] = None
    mandatory_for_groups: List[str] = Field(default_factory=list)
    raw_text: Optional[str] = None


@router.get("")
def list_bookings(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all booking requests and their current allocation status/reasons."""
    query = db.query(BookingRequestModel)
    if status_filter:
        query = query.filter(BookingRequestModel.status == status_filter)
    
    bookings = query.order_by(BookingRequestModel.id.asc()).all()
    results = []
    for b in bookings:
        results.append({
            "id": b.id,
            "request_id": b.request_id,
            "title": b.title,
            "requester": b.requester,
            "role": b.role,
            "requested_category": b.requested_category,
            "attendance": b.attendance,
            "duration_periods": b.duration_periods,
            "windows": json.loads(b.windows_json) if b.windows_json else [],
            "room_types": json.loads(b.room_types_json) if b.room_types_json else [],
            "needs": json.loads(b.needs_json) if b.needs_json else [],
            "requested_room": b.requested_room,
            "mandatory_for_groups": json.loads(b.mandatory_groups_json) if b.mandatory_groups_json else [],
            "status": b.status,
            "assigned_day": b.assigned_day,
            "assigned_start": b.assigned_start,
            "assigned_end": b.assigned_end,
            "assigned_room": b.assigned_room,
            "reason": b.reason,
            "created_at": b.created_at.isoformat() if b.created_at else None,
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
    The booking engine evaluates constraints, priorities, and rooms to decide status and reason.
    """
    dataset = load_dataset(DATA_PATH)
    entries = db.query(TimetableEntry).all()
    timetable_map = {e.session_id: (e.day, e.start_period, e.room_id) for e in entries}

    req_id = f"REQ_{uuid.uuid4().hex[:6].upper()}"
    windows_dicts = [w.to_dict() for w in req.windows]
    new_req_dict = {
        "id": req_id,
        "submitted_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
        "requester": current_user.username,
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
        "raw_text": req.raw_text,
    }

    # Add to dataset requests and evaluate
    dataset.booking_requests.append(new_req_dict)
    fest_result = allocate_bookings(dataset, timetable_map)

    # Locate decision for this request
    dec = next((b for b in fest_result.get("bookings", []) if b["request_id"] == req_id), None)
    if not dec:
        dec_status = "rejected"
        dec_reason = "No matching venue or time window found that satisfies constraints"
        assigned_day = None
        assigned_start = None
        assigned_end = None
        assigned_room = None
    else:
        dec_status = dec.get("status", "rejected")
        dec_reason = dec.get("reason", "Allocated by booking engine")
        assigned_day = dec.get("day")
        assigned_start = dec.get("start_period")
        assigned_end = dec.get("end_period")
        assigned_room = dec.get("room_id")

    # Persist in DB
    model = BookingRequestModel(
        request_id=req_id,
        user_id=current_user.id,
        requester=current_user.username,
        role=current_user.role,
        requested_category=req.requested_category,
        title=req.title,
        attendance=req.attendance,
        duration_periods=req.duration_periods,
        windows_json=json.dumps(windows_dicts),
        room_types_json=json.dumps(req.room_types),
        needs_json=json.dumps(req.needs),
        requested_room=req.requested_room,
        mandatory_groups_json=json.dumps(req.mandatory_for_groups),
        status=dec_status,
        assigned_day=assigned_day,
        assigned_start=assigned_start,
        assigned_end=assigned_end,
        assigned_room=assigned_room,
        reason=dec_reason,
        raw_text=req.raw_text,
    )
    db.add(model)

    audit = AuditLog(
        action="CREATE_BOOKING",
        entity_type="booking_request",
        entity_id=req_id,
        actor_id=current_user.id,
        actor_role=current_user.role,
        reason=f"Booking {req_id} ({req.title}) evaluated: status={dec_status}, room={assigned_room}, day={assigned_day}. Reason: {dec_reason}",
    )
    db.add(audit)
    db.commit()
    db.refresh(model)

    return {
        "request_id": model.request_id,
        "title": model.title,
        "status": model.status,
        "assigned_day": model.assigned_day,
        "assigned_start": model.assigned_start,
        "assigned_end": model.assigned_end,
        "assigned_room": model.assigned_room,
        "reason": model.reason,
    }


@router.post("/{request_id}/cancel")
def cancel_booking(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel a booking request. Students/clubs may only cancel their own requests."""
    b = db.query(BookingRequestModel).filter(BookingRequestModel.request_id == request_id).first()
    if not b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking request not found.")

    if current_user.role == "club" and b.user_id != current_user.id and b.requester != current_user.username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot cancel another user's booking request."
        )

    old_status = b.status
    b.status = "cancelled"
    b.reason = f"Cancelled by {current_user.username} ({current_user.role})"
    b.assigned_day = None
    b.assigned_start = None
    b.assigned_end = None
    b.assigned_room = None

    audit = AuditLog(
        action="CANCEL_BOOKING",
        entity_type="booking_request",
        entity_id=request_id,
        actor_id=current_user.id,
        actor_role=current_user.role,
        reason=f"Booking {request_id} cancelled by {current_user.username} (was {old_status}).",
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "message": f"Booking {request_id} has been cancelled."}
