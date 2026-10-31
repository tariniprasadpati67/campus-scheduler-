import json
import shutil
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.config import DATA_PATH, EXPORTS_DIR
from backend.app.database import (
    get_db,
    Base,
    engine,
    TimetableEntry,
    BookingRequestModel,
    ChangeRequestModel,
    AuditLog,
    User,
)
from backend.app.auth import require_roles
from backend.app.init_db import init_database
from app.models import load_dataset
from app.booking_engine import allocate_bookings

router = APIRouter(tags=["admin"])


class DatasetUploadInput(BaseModel):
    data: Dict[str, Any]
    reason: Optional[str] = "Admin dataset update"


@router.get("/schedule/export")
def export_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "department_coordinator", "faculty", "club"])),
):
    """Export complete schedule.json structure conforming to the official Crunch Week schema."""
    entries = db.query(TimetableEntry).order_by(TimetableEntry.session_id.asc()).all()
    sessions = [
        {"session_id": e.session_id, "day": e.day, "start_period": e.start_period, "room_id": e.room_id}
        for e in entries
    ]

    # Load midsem exams from baseline export if available
    baseline_export_path = EXPORTS_DIR / "schedule.json"
    midsem_exams = []
    if baseline_export_path.exists():
        with open(baseline_export_path, "r", encoding="utf-8") as f:
            base_data = json.load(f)
        midsem_exams = base_data.get("midsem_exams", [])

    # Load fest bookings from database
    approved_bookings = (
        db.query(BookingRequestModel)
        .filter(BookingRequestModel.status.in_(["approved", "alternative_offered"]))
        .all()
    )
    fest_week = []
    for b in approved_bookings:
        if b.assigned_day and b.assigned_start and b.assigned_room:
            fest_week.append({
                "request_id": b.request_id,
                "assigned_day": b.assigned_day,
                "assigned_start_period": b.assigned_start,
                "assigned_end_period": b.assigned_end or (b.assigned_start + b.duration_periods - 1),
                "assigned_room_id": b.assigned_room,
                "status": b.status,
                "reason": b.reason,
            })

    # Log export
    audit = AuditLog(
        action="EXPORT_SCHEDULE",
        entity_type="schedule",
        entity_id="schedule.json",
        actor_id=current_user.id,
        actor_role=current_user.role,
        reason=f"Schedule exported by {current_user.username}",
    )
    db.add(audit)
    db.commit()

    return {
        "sessions": sessions,
        "midsem_exams": midsem_exams,
        "fest_week": fest_week,
    }


@router.post("/admin/reset-demo-data")
def reset_demo_data(
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    """Reset all tables and reload baseline demo dataset and schedule."""
    # Wipe entries
    db.query(ChangeRequestModel).delete()
    db.query(BookingRequestModel).delete()
    db.query(TimetableEntry).delete()
    db.commit()

    # Re-initialize
    init_database()

    audit = AuditLog(
        action="RESET_DEMO_DATA",
        entity_type="system",
        entity_id="all",
        actor_id=current_user.id,
        actor_role=current_user.role,
        reason=f"Demo database reset triggered by {current_user.username}",
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

    # Save backup of current dataset
    backup_path = DATA_PATH.with_suffix(".backup.json")
    if DATA_PATH.exists():
        shutil.copy2(DATA_PATH, backup_path)

    # Write new dataset
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(req.data, f, indent=2)

    # Reset and regenerate
    db.query(ChangeRequestModel).delete()
    db.query(BookingRequestModel).delete()
    db.query(TimetableEntry).delete()
    db.commit()

    init_database()

    audit = AuditLog(
        action="UPLOAD_DATASET",
        entity_type="dataset",
        entity_id=DATA_PATH.name,
        actor_id=current_user.id,
        actor_role=current_user.role,
        reason=f"New dataset uploaded by {current_user.username}. Justification: {req.reason}",
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
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "actor_id": l.actor_id,
            "actor_role": l.actor_role,
            "reason": l.reason,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
        }
        for l in logs
    ]
    return {"total": len(results), "audit_logs": results}
