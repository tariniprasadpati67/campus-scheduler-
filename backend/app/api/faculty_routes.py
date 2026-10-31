from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.config import DATA_PATH
from backend.app.database import get_db, TimetableEntry, AuditLog, User
from backend.app.auth import get_current_user, require_roles
from app.models import load_dataset

router = APIRouter(prefix="/faculty", tags=["faculty"])


class FacultyUnavailabilityInput(BaseModel):
    faculty_id: str
    day: str
    periods: List[int] = Field(..., description="List of unavailable period indices (1-9)")
    reason: Optional[str] = "Personal/official unavailability"


@router.post("/unavailability")
def mark_unavailability(
    req: FacultyUnavailabilityInput,
    current_user: User = Depends(require_roles(["faculty", "department_coordinator", "admin"])),
    db: Session = Depends(get_db),
):
    """
    Mark faculty unavailability for specific day/periods.
    Identifies conflicting scheduled classes and logs the unavailability reason.
    """
    dataset = load_dataset(DATA_PATH)
    sessions_meta = {s.id: s for s in dataset.sessions}
    courses_meta = {c["id"]: c.get("name", c["id"]) for c in dataset.courses}

    # Verify faculty exists
    fac_ids = {f.id for f in dataset.faculty}
    if req.faculty_id not in fac_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Faculty member '{req.faculty_id}' not found in dataset."
        )

    # Check which sessions clash
    entries = db.query(TimetableEntry).filter(TimetableEntry.day == req.day.upper()).all()
    conflicts = []

    for entry in entries:
        sm = sessions_meta.get(entry.session_id)
        if not sm or sm.faculty_id != req.faculty_id:
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

    # Log to audit log
    audit = AuditLog(
        action="FACULTY_UNAVAILABILITY",
        entity_type="faculty",
        entity_id=req.faculty_id,
        actor_id=current_user.id,
        actor_role=current_user.role,
        reason=f"Marked {req.faculty_id} unavailable on {req.day} periods {req.periods}. Justification: {req.reason}. Conflicting sessions: {len(conflicts)}",
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "faculty_id": req.faculty_id,
        "day": req.day,
        "unavailable_periods": req.periods,
        "conflicts_count": len(conflicts),
        "conflicts": conflicts,
        "message": (
            f"Unavailability noted. {len(conflicts)} session(s) require rescheduling. "
            "Propose a change request at POST /api/changes/propose to generate a minimal-move fix."
            if conflicts else "Unavailability recorded with 0 timetable conflicts."
        ),
    }
