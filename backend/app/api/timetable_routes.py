import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.config import DATA_PATH
from backend.app.database import get_db, TimetableEntry, AuditLog, User
from backend.app.auth import get_current_user, require_roles
from app.models import load_dataset
import validator

router = APIRouter(prefix="/timetable", tags=["timetable"])


class ManualScheduleRequest(BaseModel):
    session_id: str
    day: str
    start_period: int
    room_id: str
    reason: Optional[str] = "Manual rescheduling request"


@router.get("")
def get_timetable(
    group_id: Optional[str] = Query(None, description="Filter by student group"),
    faculty_id: Optional[str] = Query(None, description="Filter by faculty ID"),
    room_id: Optional[str] = Query(None, description="Filter by room ID"),
    db: Session = Depends(get_db),
):
    """Retrieve full or filtered timetable with enriched session details."""
    dataset = load_dataset(DATA_PATH)
    sessions_meta = {s.id: s for s in dataset.sessions}
    courses_meta = {c["id"]: c.get("name", c["id"]) for c in dataset.courses}
    fac_meta = {f.id: f.name for f in dataset.faculty}
    rooms_meta = {r.id: r for r in dataset.rooms}

    entries = db.query(TimetableEntry).all()
    results = []

    for entry in entries:
        sid = entry.session_id
        sm = sessions_meta.get(sid)
        if not sm:
            continue

        course_name = courses_meta.get(sm.course_id, sm.course_id)
        faculty_name = fac_meta.get(sm.faculty_id, sm.faculty_id)

        # Apply filters
        if group_id and group_id not in sm.groups:
            continue
        if faculty_id and faculty_id != sm.faculty_id:
            continue
        if room_id and room_id != entry.room_id:
            continue

        results.append({
            "session_id": sid,
            "course_id": sm.course_id,
            "course_name": course_name,
            "faculty_id": sm.faculty_id,
            "faculty_name": faculty_name,
            "group_ids": sm.groups,
            "duration": sm.duration,
            "session_type": sm.kind,
            "day": entry.day,
            "start_period": entry.start_period,
            "end_period": entry.start_period + sm.duration - 1,
            "room_id": entry.room_id,
            "room_name": rooms_meta.get(entry.room_id).name if entry.room_id in rooms_meta else entry.room_id,
            "room_type": rooms_meta.get(entry.room_id).type if entry.room_id in rooms_meta else None,
        })

    results.sort(key=lambda x: (x["day"], x["start_period"], x["room_id"]))
    return {"total": len(results), "sessions": results}


@router.get("/utilisation")
def get_room_utilisation(db: Session = Depends(get_db)):
    """Calculate utilization statistics for each room (P1-P9 across 5 days = 45 teaching periods)."""
    dataset = load_dataset(DATA_PATH)
    sessions_meta = {s.id: s for s in dataset.sessions}
    rooms = {r.id: {"name": r.name, "capacity": r.capacity, "type": r.type} for r in dataset.rooms}

    entries = db.query(TimetableEntry).all()
    room_periods = {rid: 0 for rid in rooms}

    for entry in entries:
        sm = sessions_meta.get(entry.session_id)
        dur = sm.duration if sm else 1
        if entry.room_id in room_periods:
            room_periods[entry.room_id] += dur

    util_list = []
    total_slots = 45  # 5 days * 9 periods
    for rid, rdata in sorted(rooms.items()):
        periods_used = room_periods.get(rid, 0)
        percentage = round((periods_used / total_slots) * 100, 2)
        util_list.append({
            "room_id": rid,
            "room_name": rdata["name"],
            "room_type": rdata["type"],
            "capacity": rdata["capacity"],
            "periods_used": periods_used,
            "hours_used": periods_used,
            "total_available_periods": total_slots,
            "utilisation_percentage": percentage,
        })

    return {"utilisation": util_list}


@router.get("/conflicts")
def get_current_conflicts(db: Session = Depends(get_db)):
    """Check current database timetable for any hard or soft constraint conflicts."""
    raw_data = validator.load(str(DATA_PATH))
    entries = db.query(TimetableEntry).all()
    sessions = [
        {"session_id": e.session_id, "day": e.day, "start_period": e.start_period, "room_id": e.room_id}
        for e in entries
    ]

    assign, dup = validator.to_assign({"sessions": sessions})
    ctx = validator.Ctx(raw_data)
    h_viol, _ = validator.check_timetable(ctx, assign, "timetable")
    for d in dup:
        h_viol.append({"rule": "H1", "where": "timetable", "detail": f"Session {d} appears more than once"})
    s_viol, total_penalty = validator.soft_score(ctx, assign)

    return {
        "is_valid": len(h_viol) == 0,
        "hard_violations_count": len(h_viol),
        "hard_violations": h_viol,
        "soft_penalties": s_viol,
        "soft_total_penalty": total_penalty,
    }


@router.post("/manual-schedule")
def manual_schedule(
    req: ManualScheduleRequest,
    current_user: User = Depends(require_roles(["admin", "coordinator"])),
    db: Session = Depends(get_db),
):
    """
    Manually schedule or move a session.
    Rejected with a specific reason if any hard constraint is broken.
    """
    target = db.query(TimetableEntry).filter(TimetableEntry.session_id == req.session_id).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {req.session_id} not found in timetable."
        )

    # Build candidate timetable
    raw_data = validator.load(str(DATA_PATH))
    entries = db.query(TimetableEntry).all()
    proposed = []
    for e in entries:
        if e.session_id == req.session_id:
            proposed.append({
                "session_id": req.session_id,
                "day": req.day,
                "start_period": req.start_period,
                "room_id": req.room_id,
            })
        else:
            proposed.append({
                "session_id": e.session_id,
                "day": e.day,
                "start_period": e.start_period,
                "room_id": e.room_id,
            })

    # Validate using validator
    assign, dup = validator.to_assign({"sessions": proposed})
    ctx = validator.Ctx(raw_data)
    violations, _ = validator.check_timetable(ctx, assign, "timetable")
    for d in dup:
        violations.append({"rule": "H1", "where": "timetable", "detail": f"Session {d} appears more than once"})

    if violations:
        reasons = [f"[{v.get('rule', 'VIOLATION')}]: {v.get('detail', v.get('message', ''))}" for v in violations]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Manual schedule rejected: breaks hard constraints: {'; '.join(reasons)}"
        )

    # Valid: apply update
    old_loc = f"{target.day} P{target.start_period} in {target.room_id}"
    new_loc = f"{req.day} P{req.start_period} in {req.room_id}"

    target.day = req.day
    target.start_period = req.start_period
    target.room_id = req.room_id

    audit = AuditLog(
        actor=current_user.email,
        action="MANUAL_RESCHEDULE",
        detail=req.session_id,
        reason=f"Moved session {req.session_id} from {old_loc} to {new_loc}. Justification: {req.reason}",
    )
    db.add(audit)
    db.commit()
    db.refresh(target)

    return {
        "status": "success",
        "message": f"Session {req.session_id} moved to {new_loc}",
        "session": {
            "session_id": target.session_id,
            "day": target.day,
            "start_period": target.start_period,
            "room_id": target.room_id,
        },
    }
