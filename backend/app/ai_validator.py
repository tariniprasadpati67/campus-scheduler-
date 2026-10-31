import json
from typing import Any, Dict, List, Optional, Tuple
from pathlib import Path

from backend.app.config import DATA_PATH
from app.models import load_dataset

ROLE_CATEGORY_CAPS = {
    "club": "club_event",
    "coordinator": "department_event",
    "faculty": "department_event",
    "admin": "institute_event",
}

VALID_CATEGORIES = [
    "club_event",
    "department_event",
    "guest_lecture",
    "institute_event",
]

CATEGORY_RANK = {
    "club_event": 1,
    "department_event": 2,
    "guest_lecture": 3,
    "institute_event": 4,
}

VALID_ROOM_TYPES = [
    "classroom",
    "lecture_hall",
    "seminar_hall",
    "auditorium",
    "outdoor",
    "lab_cs",
    "lab_elec",
    "lab_phy",
    "workshop",
    "lab_civil",
]

VALID_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"]


def validate_ai_booking_payload(
    raw_payload: Dict[str, Any],
    user_role: str = "club",
) -> Tuple[Dict[str, Any], List[str], List[str]]:
    """
    Validates, sanitizes, and enforces deterministic code rules on LLM-extracted booking JSON.
    Returns:
      (sanitized_dict, warnings_list, follow_up_questions)
    """
    dataset = load_dataset(DATA_PATH)
    rooms_by_id = {r.id: r for r in dataset.rooms}
    groups_by_id = {g.id: g for g in dataset.student_groups}

    warnings: List[str] = []
    follow_ups: List[str] = []

    # 1. Clean Title
    title = str(raw_payload.get("title") or "Venue Booking Request").strip()
    if not title:
        title = "Venue Booking Request"

    # 2. Attendance validation
    raw_attendance = raw_payload.get("attendance")
    try:
        attendance = int(raw_attendance) if raw_attendance is not None else 0
    except (ValueError, TypeError):
        attendance = 0

    if attendance <= 0:
        attendance = 50
        follow_ups.append("Attendance was not specified; defaulted to 50. Please confirm attendee count.")

    # 3. Duration validation
    raw_duration = raw_payload.get("duration_periods") or raw_payload.get("duration")
    try:
        duration = int(raw_duration) if raw_duration is not None else 2
    except (ValueError, TypeError):
        duration = 2

    if duration < 1:
        duration = 1
    elif duration > 5:
        duration = 5
        warnings.append("Duration was capped at maximum 5 periods for single events.")

    # 4. Role-based Category Capping
    requested_category = str(raw_payload.get("requested_category") or "club_event").lower().strip()
    if requested_category not in VALID_CATEGORIES:
        requested_category = "club_event"

    cap = ROLE_CATEGORY_CAPS.get(user_role, "club_event")
    max_rank = CATEGORY_RANK.get(cap, 1)
    req_rank = CATEGORY_RANK.get(requested_category, 1)

    if req_rank > max_rank:
        warnings.append(
            f"Requested category '{requested_category}' exceeds permissions for role '{user_role}'. "
            f"Automatically capped to '{cap}'."
        )
        requested_category = cap

    # 5. Windows & Day/Period Validation
    raw_windows = raw_payload.get("windows") or []
    windows = []
    if isinstance(raw_windows, list):
        for w in raw_windows:
            if not isinstance(w, dict):
                continue
            day = str(w.get("day") or "THU").upper().strip()
            if day not in VALID_DAYS:
                day = "THU"

            from_p = w.get("from_period") or w.get("start_period") or 10
            to_p = w.get("to_period") or w.get("end_period") or (from_p + duration - 1)

            try:
                from_p = max(1, min(13, int(from_p)))
                to_p = max(from_p, min(13, int(to_p)))
            except (ValueError, TypeError):
                from_p, to_p = 10, 11

            windows.append({"day": day, "from_period": from_p, "to_period": to_p})

    if not windows:
        windows = [{"day": "THU", "from_period": 10, "to_period": 10 + duration - 1}]
        follow_ups.append("Preferred day/time window was missing; defaulted to Thursday evening.")

    # 6. Room Types Validation
    raw_types = raw_payload.get("room_types") or []
    if isinstance(raw_types, str):
        raw_types = [raw_types]
    room_types = [str(rt).lower().strip() for rt in raw_types if str(rt).lower().strip() in VALID_ROOM_TYPES]
    if not room_types:
        room_types = ["seminar_hall", "classroom"]

    # 7. Needs list
    raw_needs = raw_payload.get("needs") or []
    if isinstance(raw_needs, str):
        raw_needs = [raw_needs]
    needs = [str(n).strip() for n in raw_needs if str(n).strip()]

    # 8. Requested Room & Accessibility Verification
    requested_room = raw_payload.get("requested_room")
    if requested_room:
        requested_room = str(requested_room).strip()
        if requested_room not in rooms_by_id:
            warnings.append(f"Named room '{requested_room}' does not exist on campus.")
            requested_room = None
        else:
            room_obj = rooms_by_id[requested_room]
            # Check capacity
            if room_obj.capacity < attendance:
                warnings.append(
                    f"Requested room {requested_room} capacity ({room_obj.capacity}) is smaller "
                    f"than expected attendance ({attendance})."
                )
            # Check accessibility
            requires_accessible = any("accessible" in n.lower() or "wheelchair" in n.lower() for n in needs)
            if requires_accessible and not room_obj.accessible:
                # Find an accessible alternative room of same type or seminar hall
                accessible_alt = "SH-1" if "SH-1" in rooms_by_id else None
                warnings.append(
                    f"Conflict: Room {requested_room} is NOT wheelchair accessible! "
                    f"Recommending accessible venue '{accessible_alt}' instead."
                )
                if accessible_alt:
                    requested_room = accessible_alt

    # 9. Mandatory for student groups
    raw_groups = raw_payload.get("mandatory_for_groups") or []
    if isinstance(raw_groups, str):
        raw_groups = [raw_groups]
    valid_groups = [g for g in raw_groups if g in groups_by_id]
    if raw_groups and not valid_groups:
        warnings.append(f"Specified student groups {raw_groups} not found in student groups registry.")

    # 10. Follow-up notes from LLM
    llm_follow = raw_payload.get("follow_up")
    if llm_follow and isinstance(llm_follow, str) and llm_follow.strip():
        follow_ups.append(llm_follow.strip())

    sanitized = {
        "title": title,
        "attendance": attendance,
        "duration_periods": duration,
        "requested_category": requested_category,
        "windows": windows,
        "room_types": room_types,
        "needs": needs,
        "requested_room": requested_room,
        "mandatory_for_groups": valid_groups,
        "raw_text": raw_payload.get("raw_text") or "",
    }

    return sanitized, warnings, follow_ups
