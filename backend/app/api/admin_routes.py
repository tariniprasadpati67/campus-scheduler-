import json
import shutil
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.config import DATA_PATH, EXPORTS_DIR
from backend.app.database import (
    get_db,
    TimetableEntry,
    BookingRequestModel,
    ChangeRequestModel,
    AuditLog,
    User,
)
from backend.app.auth import require_roles, get_current_user
from backend.app.init_db import init_database

router = APIRouter(tags=["admin"])


class DatasetUploadInput(BaseModel):
    data: Dict[str, Any]
    reason: Optional[str] = "Admin dataset update"


@router.get("/schedule/export")
def export_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export complete schedule.json structure conforming to the official Crunch Week schema."""
    entries = db.query(TimetableEntry).order_by(TimetableEntry.session_id.asc()).all()
    sessions = [
        {"session_id": e.session_id, "day": e.day, "start_period": e.start_period, "room_id": e.room_id}
        for e in entries
    ]

    baseline_export_path = EXPORTS_DIR / "schedule.json"
    midsem_exams = []
    if baseline_export_path.exists():
        with open(baseline_export_path, "r", encoding="utf-8") as f:
            base_data = json.load(f)
        midsem_exams = base_data.get("midsem_exams", [])

    approved_bookings = (
        db.query(BookingRequestModel)
        .filter(BookingRequestModel.status.in_(["approved", "alternative_offered"]))
        .all()
    )
    fest_week = []
    for b in approved_bookings:
        if b.assigned_day and b.assigned_start and b.assigned_room:
            structured = json.loads(b.structured_json) if b.structured_json else {}
            duration = structured.get("duration_periods", 1)
            end_p = b.assigned_end or (b.assigned_start + duration - 1)
            req_id = structured.get("id") or f"REQ_{b.id}"
            fest_week.append({
                "request_id": req_id,
                "assigned_day": b.assigned_day,
                "assigned_start_period": b.assigned_start,
                "assigned_end_period": end_p,
                "assigned_room_id": b.assigned_room,
                "status": b.status,
                "reason": b.reason,
            })

    audit = AuditLog(
        actor=current_user.email,
        action="EXPORT_SCHEDULE",
        detail="schedule.json",
        reason=f"Schedule exported by {current_user.email}",
    )
    db.add(audit)
    db.commit()

    return {
        "sessions": sessions,
        "midsem_exams": midsem_exams,
        "fest_week": fest_week,
    }


@router.post("/admin/reset-demo")
@router.post("/admin/reset-demo-data")
def reset_demo_data(
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    """Reset all tables and reload baseline demo dataset and schedule."""
    db.query(AuditLog).delete()
    db.query(ChangeRequestModel).delete()
    db.query(BookingRequestModel).delete()
    db.query(TimetableEntry).delete()
    db.commit()

    init_database()

    audit = AuditLog(
        actor=current_user.email,
        action="RESET_DEMO_DATA",
        detail="All PostgreSQL tables reset",
        reason=f"Demo database reset triggered by {current_user.email}",
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "message": "Demo database successfully reset to baseline."}


@router.post("/admin/upload-dataset")
def upload_dataset(
    req: DatasetUploadInput,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    """Upload a new dataset JSON, validate its schema, and re-initialize."""
    required_keys = {"rooms", "faculty", "student_groups", "courses", "sessions"}
    missing = required_keys - set(req.data.keys())
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Uploaded dataset missing required top-level keys: {sorted(missing)}",
        )

    backup_path = DATA_PATH.with_suffix(".backup.json")
    if DATA_PATH.exists():
        shutil.copy2(DATA_PATH, backup_path)

    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(req.data, f, indent=2)

    db.query(ChangeRequestModel).delete()
    db.query(BookingRequestModel).delete()
    db.query(TimetableEntry).delete()
    db.commit()

    init_database()

    audit = AuditLog(
        actor=current_user.email,
        action="UPLOAD_DATASET",
        detail=DATA_PATH.name,
        reason=f"New dataset uploaded by {current_user.email}. Justification: {req.reason}",
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "message": "Dataset uploaded and database re-initialized successfully.",
        "counts": {
            "rooms": len(req.data.get("rooms", [])),
            "faculty": len(req.data.get("faculty", [])),
            "student_groups": len(req.data.get("student_groups", [])),
            "courses": len(req.data.get("courses", [])),
            "sessions": len(req.data.get("sessions", [])),
        },
    }


@router.get("/admin/audit-logs")
def get_audit_logs(
    limit: int = 50,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    """Retrieve system audit logs for administrative review."""
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(limit).all()
    results = [
        {
            "id": l.id,
            "actor": l.actor,
            "action": l.action,
            "detail": l.detail,
            "reason": l.reason,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]
    return {"total": len(results), "audit_logs": results}


class PriorityOrderUpdateInput(BaseModel):
    priority_order: List[str]
    reason: Optional[str] = "Dean's office priority order update"


@router.get("/admin/priority-order")
def get_priority_order(
    current_user: User = Depends(get_current_user),
):
    """Retrieve current venue allocation priority order."""
    if DATA_PATH.exists():
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {"priority_order": data.get("priority_order", [])}
    return {
        "priority_order": [
            "exam",
            "regular_session",
            "institute_event",
            "guest_lecture",
            "department_event",
            "club_event",
        ]
    }


@router.put("/admin/priority-order")
def update_priority_order(
    req: PriorityOrderUpdateInput,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    """Admin (Dean's office) updates the room conflict priority order."""
    if not DATA_PATH.exists():
        raise HTTPException(status_code=404, detail="Dataset file not found.")

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    old_order = data.get("priority_order", [])
    data["priority_order"] = req.priority_order

    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    audit = AuditLog(
        actor=current_user.email,
        action="UPDATE_PRIORITY_ORDER",
        detail="Priority Order Updated",
        reason=f"Priority order changed by {current_user.email}. Old: {old_order} -> New: {req.priority_order}. Justification: {req.reason}",
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "message": "Priority order updated successfully by Dean's Office.",
        "priority_order": req.priority_order,
    }
