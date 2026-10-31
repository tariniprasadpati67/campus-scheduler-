import json
from pathlib import Path
from sqlalchemy.orm import Session

from backend.app.config import DATA_PATH, EXPORTS_DIR
from backend.app.database import (
    Base,
    engine,
    SessionLocal,
    User,
    TimetableEntry,
    BookingRequestModel,
    AuditLog,
)
from backend.app.auth import hash_password
from app.models import load_dataset
from app.scheduler import solve_timetable
from app.booking_engine import allocate_bookings


DEMO_USERS = [
    {
        "username": "admin",
        "email": "admin@cit.ac.in",
        "password": "admin123",
        "role": "admin",
        "department": "ADMIN",
    },
    {
        "username": "coordinator",
        "email": "coord@cit.ac.in",
        "password": "coord123",
        "role": "department_coordinator",
        "department": "CSE",
    },
    {
        "username": "faculty",
        "email": "faculty@cit.ac.in",
        "password": "faculty123",
        "role": "faculty",
        "department": "CSE",
    },
    {
        "username": "club",
        "email": "club@cit.ac.in",
        "password": "club123",
        "role": "club",
        "department": None,
    },
]


def init_database() -> None:
    """Create all tables and seed initial demo data."""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # 1. Seed demo users
        for u in DEMO_USERS:
            existing = db.query(User).filter(User.username == u["username"]).first()
            if not existing:
                user = User(
                    username=u["username"],
                    email=u["email"],
                    hashed_password=hash_password(u["password"]),
                    role=u["role"],
                    department=u["department"],
                )
                db.add(user)
        db.commit()

        # 2. Seed Timetable
        entry_count = db.query(TimetableEntry).count()
        if entry_count == 0:
            schedule_json_path = EXPORTS_DIR / "schedule.json"
            if schedule_json_path.exists():
                with open(schedule_json_path, "r", encoding="utf-8") as f:
                    sched = json.load(f)
                sessions = sched.get("sessions", [])
            else:
                dataset = load_dataset(DATA_PATH)
                res = solve_timetable(dataset, optimize_soft=True, time_limit_seconds=20.0)
                sessions = [
                    {"session_id": sid, "day": d, "start_period": sp, "room_id": rid}
                    for sid, (d, sp, rid) in (res or {}).items()
                ]

            for s in sessions:
                entry = TimetableEntry(
                    session_id=s["session_id"],
                    day=s["day"],
                    start_period=s["start_period"],
                    room_id=s["room_id"],
                )
                db.add(entry)
            db.commit()

            # Audit log
            log = AuditLog(
                action="INITIALIZE_TIMETABLE",
                entity_type="timetable",
                entity_id="cit-public-v1",
                actor_id=1,
                actor_role="admin",
                reason="Initial timetable generated and seeded from baseline dataset",
            )
            db.add(log)
            db.commit()

        # 3. Seed booking requests
        req_count = db.query(BookingRequestModel).count()
        if req_count == 0 and DATA_PATH.exists():
            dataset = load_dataset(DATA_PATH)
            # Reconstruct timetable map
            entries = db.query(TimetableEntry).all()
            timetable_map = {e.session_id: (e.day, e.start_period, e.room_id) for e in entries}

            # Run booking engine
            fest_result = allocate_bookings(dataset, timetable_map)
            decisions_by_id = {b["request_id"]: b for b in fest_result.get("bookings", [])}

            for r in dataset.booking_requests:
                rid = r["id"]
                dec = decisions_by_id.get(rid, {})
                req_model = BookingRequestModel(
                    request_id=rid,
                    requester=r["requester"],
                    role=r["role"],
                    requested_category=r["requested_category"],
                    title=r["title"],
                    attendance=r["attendance"],
                    duration_periods=r["duration_periods"],
                    windows_json=json.dumps(r.get("windows", [])),
                    room_types_json=json.dumps(r.get("room_types", [])),
                    needs_json=json.dumps(r.get("needs", [])),
                    requested_room=r.get("requested_room"),
                    mandatory_groups_json=json.dumps(r.get("mandatory_for_groups", [])),
                    status=dec.get("status", "rejected"),
                    assigned_day=dec.get("day"),
                    assigned_start=dec.get("start_period"),
                    assigned_end=dec.get("end_period"),
                    assigned_room=dec.get("room_id"),
                    reason=dec.get("reason", "Allocated by Spectra booking engine"),
                    raw_text=r.get("raw_text"),
                )
                db.add(req_model)
            db.commit()

    finally:
        db.close()


if __name__ == "__main__":
    init_database()
    print("Database initialized successfully.")
