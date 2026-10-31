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
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # admin | coordinator | faculty | club
    department = Column(String(50), nullable=True)
    faculty_id = Column(String(50), nullable=True)
    club_name = Column(String(100), nullable=True)
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
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    original_text = Column(Text, nullable=True)
    structured_json = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)
    status = Column(String(50), default="pending")  # pending | approved | rejected | alternative_offered | cancelled
    reason = Column(Text, nullable=True)
    decided_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_day = Column(String(10), nullable=True)
    assigned_start = Column(Integer, nullable=True)
    assigned_end = Column(Integer, nullable=True)
    assigned_room = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ChangeRequestModel(Base):
    __tablename__ = "change_requests"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False)  # faculty_leave | room_closed | add_session
    payload_json = Column(Text, nullable=False)
    proposed_diff_json = Column(Text, nullable=True)
    status = Column(String(50), default="pending")  # pending | approved | rejected
    reason = Column(Text, nullable=True)
    decided_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class FacultyUnavailability(Base):
    __tablename__ = "faculty_unavailability"

    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(String(50), nullable=False, index=True)
    day = Column(String(10), nullable=False)
    periods_json = Column(Text, nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    actor = Column(String(100), nullable=False)
    action = Column(String(100), nullable=False)
    detail = Column(Text, nullable=True)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
