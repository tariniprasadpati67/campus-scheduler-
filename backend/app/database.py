from datetime import datetime
from typing import Generator
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from backend.app.config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # admin, department_coordinator, faculty, club
    department = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class TimetableEntry(Base):
    __tablename__ = "timetable"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), unique=True, index=True, nullable=False)
    day = Column(String(10), nullable=False)
    start_period = Column(Integer, nullable=False)
    room_id = Column(String(50), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BookingRequestModel(Base):
    __tablename__ = "booking_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    requester = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False)
    requested_category = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    attendance = Column(Integer, nullable=False)
    duration_periods = Column(Integer, nullable=False)
    windows_json = Column(Text, nullable=False)  # list of windows as JSON
    room_types_json = Column(Text, nullable=False)
    needs_json = Column(Text, nullable=False)
    requested_room = Column(String(50), nullable=True)
    mandatory_groups_json = Column(Text, nullable=True)
    status = Column(String(50), default="pending")  # approved, alternative_offered, rejected
    assigned_day = Column(String(10), nullable=True)
    assigned_start = Column(Integer, nullable=True)
    assigned_end = Column(Integer, nullable=True)
    assigned_room = Column(String(50), nullable=True)
    reason = Column(Text, nullable=True)
    raw_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ChangeRequestModel(Base):
    __tablename__ = "change_requests"

    id = Column(Integer, primary_key=True, index=True)
    proposer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False)  # faculty_unavailable, room_unavailable, add_session, etc.
    details_json = Column(Text, nullable=False)  # parameters of change
    status = Column(String(50), default="pending")  # pending, approved, rejected
    diff_json = Column(Text, nullable=True)  # minimal-move diff
    conflict_reason = Column(Text, nullable=True)  # if infeasible
    decided_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    decided_at = Column(DateTime, nullable=True)
    decision_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(100), nullable=True)
    actor_id = Column(Integer, nullable=True)
    actor_role = Column(String(50), nullable=True)
    reason = Column(Text, nullable=False)
    details_json = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

