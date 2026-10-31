import json
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.config import DATA_PATH
from backend.app.database import (
    get_db,
    ChangeRequestModel,
    TimetableEntry,
    AuditLog,
    User,
)
from backend.app.auth import get_current_user, require_roles
from app.models import load_dataset
from app.scheduler import solve_timetable
from app.rescheduler import compute_schedule_diff
import validator

router = APIRouter(prefix="/changes", tags=["changes"])


class ProposeChangeInput(BaseModel):
    change_type: str = Field(..., description="faculty_leave | room_closed | add_session")
    details: Dict[str, Any] = Field(..., description="Parameters conforming to disruption schema")
    reason: Optional[str] = "Timetable change proposal"


class DecideChangeInput(BaseModel):
    reason: Optional[str] = "Decision rendered by Admin"


@router.get("")
def list_changes(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all proposed changes and their resolution."""
    query = db.query(ChangeRequestModel)
    if status_filter:
        query = query.filter(ChangeRequestModel.status == status_filter)
    changes = query.order_by(ChangeRequestModel.id.desc()).all()

    results = []
    for c in changes:
        diff_payload = json.loads(c.proposed_diff_json) if c.proposed_diff_json else {}
        results.append({
            "id": c.id,
            "requester_id": c.requester_id,
            "type": c.type,
            "details": json.loads(c.payload_json) if c.payload_json else {},
            "status": c.status,
            "diff": diff_payload.get("diff"),
            "decided_by": c.decided_by,
            "reason": c.reason,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })
    return {"total": len(results), "changes": results}


@router.post("/propose", status_code=status.HTTP_201_CREATED)
def propose_change(
    req: ProposeChangeInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Propose a timetable modification.
    Uses our minimal-move rescheduling solver to generate a feasible fix and diff.
    Status remains 'pending' until an Admin approves.
    """
    raw_data = validator.load(str(DATA_PATH))
    entries = db.query(TimetableEntry).all()
    baseline_sessions = [
        {"session_id": e.session_id, "day": e.day, "start_period": e.start_period, "room_id": e.room_id}
        for e in entries
    ]
    baseline_map = {s["session_id"]: (s["day"], s["start_period"], s["room_id"]) for s in baseline_sessions}

    # Map change type to disruption format
    mapped_type = req.change_type
    if mapped_type == "faculty_leave":
        mapped_type = "faculty_unavailable"
    elif mapped_type == "room_closed":
        mapped_type = "room_unavailable"

    disruption_item = {"type": mapped_type, **req.details}
    disruption = {"changes": [disruption_item]}

    try:
        disrupted_data = validator.apply_disruption(raw_data, disruption)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid disruption format or parameters: {exc}",
        )

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
        json.dump(disrupted_data, f)
        temp_path = Path(f.name)

    try:
        disrupted_dataset = load_dataset(temp_path)
    finally:
        if temp_path.exists():
            temp_path.unlink()

    # Solve with minimal disruption moves
    new_assign = solve_timetable(
        disrupted_dataset,
        optimize_soft=True,
        time_limit_seconds=15.0,
        hint_schedule=baseline_map,
        disruption_penalty_weight=500,
    )

    if new_assign is None:
        return {
            "status": "infeasible",
            "message": "Change proposal cannot be accommodated: constraint conflict prevents finding a valid schedule.",
            "conflicts": [
                f"Proposed change '{req.change_type}' causes unsolvable resource or time conflicts with active courses/rooms."
            ],
        }

    new_sessions = [
        {"session_id": sid, "day": day, "start_period": sp, "room_id": rid}
        for sid, (day, sp, rid) in sorted(new_assign.items())
    ]
    diff = compute_schedule_diff(baseline_sessions, new_sessions)

    change = ChangeRequestModel(
        requester_id=current_user.id,
        type=req.change_type,
        payload_json=json.dumps(req.details),
        proposed_diff_json=json.dumps({"diff": diff, "new_sessions": new_sessions}),
        status="pending",
        reason=req.reason,
        decided_by=None,
    )
    db.add(change)
    db.flush()

    audit = AuditLog(
        actor=current_user.email,
        action="PROPOSE_CHANGE",
        detail=f"Change #{change.id} ({req.change_type})",
        reason=f"Change proposal #{change.id} ({req.change_type}) submitted by {current_user.email}: {diff['total_moved']} sessions moved. Justification: {req.reason}",
    )
    db.add(audit)
    db.commit()
    db.refresh(change)

    return {
        "status": "pending",
        "change_id": change.id,
        "message": "Change evaluated successfully. Status is pending Admin approval.",
        "total_moved": diff["total_moved"],
        "diff": diff,
    }


@router.post("/{change_id}/approve")
def approve_change(
    change_id: int,
    req: DecideChangeInput = DecideChangeInput(),
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    """
    Admin approves a pending change request.
    Enforces rule: 'Nobody can approve their own request'.
    Applies minimal-move diff to the active timetable.
    """
    change = db.query(ChangeRequestModel).filter(ChangeRequestModel.id == change_id).first()
    if not change:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Change request not found.")

    if change.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Change request cannot be approved because status is already '{change.status}'.",
        )

    # Rule: Nobody can approve their own request
    if change.requester_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Rule violation - Nobody can approve their own request.",
        )

    payload = json.loads(change.proposed_diff_json) if change.proposed_diff_json else {}
    new_sessions = payload.get("new_sessions", [])
    if not new_sessions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No schedule diff found to apply.")

    # Apply new sessions
    db.query(TimetableEntry).delete()
    for s in new_sessions:
        entry = TimetableEntry(
            session_id=s["session_id"],
            day=s["day"],
            start_period=s["start_period"],
            room_id=s["room_id"],
        )
        db.add(entry)

    change.status = "approved"
    change.decided_by = current_user.id

    audit = AuditLog(
        actor=current_user.email,
        action="APPROVE_CHANGE",
        detail=f"Change #{change.id}",
        reason=f"Change #{change.id} approved by {current_user.email}. Reason: {req.reason}",
    )
    db.add(audit)
    db.commit()

    return {
        "status": "approved",
        "change_id": change.id,
        "message": f"Change #{change.id} approved and applied to active timetable.",
    }


@router.post("/{change_id}/reject")
def reject_change(
    change_id: int,
    req: DecideChangeInput = DecideChangeInput(),
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    """
    Admin rejects a pending change request.
    Enforces rule: 'Nobody can approve their own request'.
    """
    change = db.query(ChangeRequestModel).filter(ChangeRequestModel.id == change_id).first()
    if not change:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Change request not found.")

    if change.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Change request is already '{change.status}'.",
        )

    if change.requester_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Rule violation - Nobody can decide their own request.",
        )

    change.status = "rejected"
    change.decided_by = current_user.id

    audit = AuditLog(
        actor=current_user.email,
        action="REJECT_CHANGE",
        detail=f"Change #{change.id}",
        reason=f"Change #{change.id} rejected by {current_user.email}. Reason: {req.reason}",
    )
    db.add(audit)
    db.commit()

    return {
        "status": "rejected",
        "change_id": change.id,
        "message": f"Change #{change.id} has been rejected.",
    }
