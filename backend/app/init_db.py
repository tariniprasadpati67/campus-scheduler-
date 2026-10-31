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
        "name": "Admin User",
        "email": "admin@cit.test",
        "password": "admin123",
        "role": "admin",
        "department": "ADMIN",
        "faculty_id": None,
        "club_name": None,
    },
    {
        "name": "Department Coordinator",
        "email": "coordinator@cit.test",
        "password": "coord123",
        "role": "coordinator",
        "department": "CSE",
        "faculty_id": None,
        "club_name": None,
    },
    {
        "name": "Prof. Sharma",
        "email": "faculty@cit.test",
        "password": "faculty123",
        "role": "faculty",
        "department": "CSE",
        "faculty_id": "F01",
        "club_name": None,
    },
    {
        "name": "Club Representative",
        "email": "club@cit.test",
        "password": "club123",
        "role": "club",
        "department": None,
        "faculty_id": None,
        "club_name": "Robotics Club",
    },
]


def init_database() -> None:
    """Create all tables in PostgreSQL and seed initial demo data safely."""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # 1. Seed demo users
        for u in DEMO_USERS:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                user = User(
                    name=u["name"],
                    email=u["email"],
                    password_hash=hash_password(u["password"]),
                    role=u["role"],
                    department=u["department"],
                    faculty_id=u["faculty_id"],
                    club_name=u["club_name"],
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

            admin_user = db.query(User).filter(User.role == "admin").first()
            log = AuditLog(
                actor=admin_user.email if admin_user else "system",
                action="INITIALIZE_TIMETABLE",
                detail="cit-public-v1 baseline timetable",
                reason="Initial timetable generated and seeded from baseline dataset",
            )
            db.add(log)
            db.commit()

        # 3. Seed booking requests
        req_count = db.query(BookingRequestModel).count()
        if req_count == 0 and DATA_PATH.exists():
            dataset = load_dataset(DATA_PATH)
            entries = db.query(TimetableEntry).all()
            timetable_map = {e.session_id: (e.day, e.start_period, e.room_id) for e in entries}

            fest_result = allocate_bookings(dataset, timetable_map)
            decisions_by_id = {b["request_id"]: b for b in fest_result.get("bookings", [])}

            default_club = db.query(User).filter(User.role == "club").first()
            for r in dataset.booking_requests:
                rid = r["id"]
                dec = decisions_by_id.get(rid, {})
                status_val = dec.get("status", "rejected")
                req_model = BookingRequestModel(
                    requester_id=default_club.id if default_club else None,
                    original_text=r.get("raw_text") or r.get("title", ""),
                    structured_json=json.dumps(r),
                    category=r.get("requested_category", "club_event"),
                    status=status_val,
                    reason=dec.get("reason", "Allocated by Spectra booking engine"),
                    assigned_day=dec.get("day"),
                    assigned_start=dec.get("start_period"),
                    assigned_end=dec.get("end_period"),
                    assigned_room=dec.get("room_id"),
                )
                db.add(req_model)
            db.commit()

    finally:
        db.close()


if __name__ == "__main__":
    init_database()
    print("Database initialized successfully.")
