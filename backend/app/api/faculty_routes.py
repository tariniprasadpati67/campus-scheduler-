import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.config import DATA_PATH
from backend.app.database import (
    get_db,
    TimetableEntry,
    FacultyUnavailability,
    AuditLog,
    User,
)
from backend.app.auth import get_current_user, require_roles
from app.models import load_dataset

router = APIRouter(prefix="/faculty", tags=["faculty"])


class FacultyUnavailabilityInput(BaseModel):
    faculty_id: Optional[str] = None
    day: str
    periods: List[int] = Field(..., description="List of unavailable period indices (1-9)")
    reason: Optional[str] = "Faculty leave / unavailability"


@router.get("/unavailability")
def list_unavailability(
    faculty_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List recorded faculty unavailabilities."""
    query = db.query(FacultyUnavailability)
    if current_user.role == "faculty" and current_user.faculty_id:
        query = query.filter(FacultyUnavailability.faculty_id == current_user.faculty_id)
    elif faculty_id:
        query = query.filter(FacultyUnavailability.faculty_id == faculty_id)

    records = query.order_by(FacultyUnavailability.id.desc()).all()
    results = [
        {
            "id": r.id,
            "faculty_id": r.faculty_id,
            "day": r.day,
            "periods": json.loads(r.periods_json) if r.periods_json else [],
            "reason": r.reason,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]
    return {"total": len(results), "unavailability": results}


@router.post("/unavailability")
def add_unavailability(
    req: FacultyUnavailabilityInput,
    current_user: User = Depends(require_roles(["faculty", "coordinator", "admin"])),
    db: Session = Depends(get_db),
):
    """
    Mark faculty unavailability for specific day and periods.
    Identifies conflicting scheduled classes, persists record, and logs reason to audit_log.
    """
    target_fid = req.faculty_id or current_user.faculty_id or "F01"
    dataset = load_dataset(DATA_PATH)
    sessions_meta = {s.id: s for s in dataset.sessions}
    courses_meta = {c["id"]: c.get("name", c["id"]) for c in dataset.courses}

    # Check which active sessions clash
    entries = db.query(TimetableEntry).filter(TimetableEntry.day == req.day.upper()).all()
    conflicts = []

    for entry in entries:
        sm = sessions_meta.get(entry.session_id)
        if not sm or sm.faculty_id != target_fid:
            continue

        session_periods = list(range(entry.start_period, entry.start_period + sm.duration))
        clashing_periods = [p for p in session_periods if p in req.periods]
        if clashing_periods:
            conflicts.append({
                "session_id": entry.session_id,
                "course_id": sm.course_id,
                "course_name": courses_meta.get(sm.course_id, sm.course_id),
                "day": entry.day,
                "start_period": entry.start_period,
                "duration": sm.duration,
                "room_id": entry.room_id,
                "clashing_periods": clashing_periods,
            })

    # Persist unavailability record
    record = FacultyUnavailability(
        faculty_id=target_fid,
        day=req.day.upper(),
        periods_json=json.dumps(req.periods),
        reason=req.reason,
    )
    db.add(record)

    # Log to audit log
    audit = AuditLog(
        actor=current_user.email,
        action="ADD_FACULTY_UNAVAILABILITY",
        detail=f"{target_fid} on {req.day} periods {req.periods}",
        reason=f"Marked {target_fid} unavailable on {req.day} P{req.periods}. Justification: {req.reason}. Conflicting sessions: {len(conflicts)}",
    )
    db.add(audit)
    db.commit()
    db.refresh(record)

    return {
        "status": "success",
        "id": record.id,
        "faculty_id": target_fid,
        "day": record.day,
        "unavailable_periods": req.periods,
        "conflicts_count": len(conflicts),
        "conflicts": conflicts,
        "message": (
            f"Unavailability recorded. {len(conflicts)} session(s) require rescheduling. "
            "Propose a change request at POST /changes/propose to generate a minimal-move fix."
            if conflicts else "Unavailability recorded with 0 timetable conflicts."
        ),
    }
