from dataclasses import dataclass, field
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Union


@dataclass
class Room:
    id: str
    name: str
    building: str
    type: str
    capacity: int
    features: List[str] = field(default_factory=list)
    accessible: bool = False
    allowed_uses: List[str] = field(default_factory=list)


@dataclass
class Faculty:
    id: str
    name: str
    department: str
    max_hours_per_day: int
    needs_accessible: bool = False
    unavailable: List[Dict[str, Any]] = field(default_factory=list)
    preferences: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class Group:
    id: str
    name: str
    year: int
    department: str
    size: int
    needs_accessible: bool = False


@dataclass
class Session:
    id: str
    course_id: str
    kind: str
    groups: List[str]
    faculty_id: str
    size: int
    duration: int
    room_types: List[str]
    needs_accessible: bool = False
    basket_slot: Optional[str] = None
    fixed_slot: Optional[Dict[str, Any]] = None


@dataclass
class Dataset:
    dataset_id: str
    institute: str
    calendar: Dict[str, Any]
    priority_order: List[str]
    role_category_cap: Dict[str, str]
    rooms: List[Room]
    room_unavailability: List[Dict[str, Any]]
    faculty: List[Faculty]
    student_groups: List[Group]
    courses: List[Dict[str, Any]]
    sessions: List[Session]
    booking_requests: List[Dict[str, Any]]
    cancellations: List[Dict[str, Any]]
    exams: List[Dict[str, Any]]

    def __post_init__(self) -> None:
        self.rooms_by_id: Dict[str, Room] = {r.id: r for r in self.rooms}
        self.faculty_by_id: Dict[str, Faculty] = {f.id: f for f in self.faculty}
        self.groups_by_id: Dict[str, Group] = {g.id: g for g in self.student_groups}
        self.sessions_by_id: Dict[str, Session] = {s.id: s for s in self.sessions}

    @property
    def days(self) -> List[str]:
        return self.calendar.get("days", [])

    @property
    def periods(self) -> List[Dict[str, Any]]:
        return self.calendar.get("periods", [])

    @property
    def teaching_periods(self) -> List[int]:
        return [p["id"] for p in self.periods if p.get("teaching", False)]

    @property
    def lunch_after_period(self) -> Optional[int]:
        lunch = self.calendar.get("lunch")
        return lunch.get("after_period") if isinstance(lunch, dict) else None

    @property
    def lab_start_periods(self) -> List[int]:
        return self.calendar.get("lab_start_periods", [])

    @property
    def total_teaching_hours(self) -> int:
        return sum(s.duration for s in self.sessions)


def load_dataset(path: Union[str, Path]) -> Dataset:
    """Load and parse the CIT public dataset into typed dataclasses."""
    with open(path, "r", encoding="utf-8") as f:
        raw: Dict[str, Any] = json.load(f)

    rooms = [
        Room(
            id=r["id"],
            name=r["name"],
            building=r["building"],
            type=r["type"],
            capacity=r["capacity"],
            features=r.get("features", []),
            accessible=r.get("accessible", False),
            allowed_uses=r.get("allowed_uses", []),
        )
        for r in raw.get("rooms", [])
    ]

    faculty = [
        Faculty(
            id=fac["id"],
            name=fac["name"],
            department=fac["department"],
            max_hours_per_day=fac["max_hours_per_day"],
            needs_accessible=fac.get("needs_accessible", False),
            unavailable=fac.get("unavailable", []),
            preferences=fac.get("preferences", []),
        )
        for fac in raw.get("faculty", [])
    ]

    groups = [
        Group(
            id=grp["id"],
            name=grp["name"],
            year=grp["year"],
            department=grp["department"],
            size=grp["size"],
            needs_accessible=grp.get("needs_accessible", False),
        )
        for grp in raw.get("student_groups", [])
    ]

    sessions = [
        Session(
            id=s["id"],
            course_id=s["course_id"],
            kind=s["kind"],
            groups=s.get("groups", []),
            faculty_id=s["faculty_id"],
            size=s["size"],
            duration=s["duration"],
            room_types=s.get("room_types", []),
            needs_accessible=s.get("needs_accessible", False),
            basket_slot=s.get("basket_slot"),
            fixed_slot=s.get("fixed_slot"),
        )
        for s in raw.get("sessions", [])
    ]

    return Dataset(
        dataset_id=raw["dataset_id"],
        institute=raw["institute"],
        calendar=raw.get("calendar", {}),
        priority_order=raw.get("priority_order", []),
        role_category_cap=raw.get("role_category_cap", {}),
        rooms=rooms,
        room_unavailability=raw.get("room_unavailability", []),
        faculty=faculty,
        student_groups=groups,
        courses=raw.get("courses", []),
        sessions=sessions,
        booking_requests=raw.get("booking_requests", []),
        cancellations=raw.get("cancellations", []),
        exams=raw.get("exams", []),
    )

