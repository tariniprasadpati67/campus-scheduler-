import json
import re
from typing import Any, Dict, List, Optional, Tuple
from pathlib import Path
from groq import Groq, RateLimitError

from backend.app.config import LLM_API_KEY, LLM_MODEL, LLM_FALLBACK_MODEL, DATA_PATH
from backend.app.ai_validator import validate_ai_booking_payload
from app.models import load_dataset


BOOKING_EXTRACTION_SYSTEM_PROMPT = """You are CIT's expert Campus Scheduling AI Assistant.
Your task is to parse plain-language and Hinglish venue booking requests into an exact JSON object.

CIT TIME & PERIOD RULES:
- Teaching periods: P1 (08:00-09:00), P2 (09:00-10:00), P3 (10:00-11:00), P4 (11:00-12:00), P5 (12:00-13:00)
- Lunch: 13:00 - 14:00 (no classes or events)
- Afternoon teaching: P6 (14:00-15:00), P7 (15:00-16:00), P8 (16:00-17:00), P9 (17:00-18:00)
- Evening events: P10 (18:00-19:00), P11 (19:00-20:00), P12 (20:00-21:00), P13 (21:00-22:00)
- "6 to 8 pm" = P10 to P11 (duration: 2 periods)
- "7 to 8 pm" = P11 to P11 (duration: 1 period)
- "evening" / "shaam" = P10 to P12
- "after lunch" / "afternoon" = P6 to P8
- "morning" / "10 to 12" = P3 to P4

HINGLISH TRANSLATION:
- "kal shaam" = tomorrow evening (weekday window, e.g. THU or FRI P10-P11)
- "shaam ko" = evening (P10 onward)
- "chahiye" = required
- "log" = people / attendees
- "ghante" = hours / duration

VENUE TYPES & CODES:
- Allowed room_types: ["classroom", "lecture_hall", "seminar_hall", "auditorium", "outdoor", "lab_cs", "lab_elec", "lab_phy", "workshop", "lab_civil"]
- Known rooms: SH-1, SH-2, AUD, OAT, CR-101..CR-205, LH-1..LH-6, CS-LAB-1..CS-LAB-3

SAFETY & GOVERNANCE:
- Never output priority, category overrides, or approval decisions.
- Never invent missing values; list them under "missing" and provide a helpful "follow_up" question.
- Reply ONLY with a valid JSON object matching this schema:
{
  "title": str,
  "attendance": int or null,
  "duration_periods": int,
  "requested_category": "club_event" | "department_event" | "guest_lecture" | "institute_event",
  "windows": [{"day": "MON"|"TUE"|"WED"|"THU"|"FRI", "from_period": int, "to_period": int}],
  "room_types": [str],
  "needs": [str],
  "requested_room": str or null,
  "mandatory_for_groups": [str],
  "missing": [str],
  "follow_up": str or null
}
"""

FACULTY_CHANGE_SYSTEM_PROMPT = """You are CIT's Faculty Scheduling Assistant.
Parse faculty leave, room maintenance, or timetable change proposals into an exact JSON object:
{
  "change_type": "faculty_leave" | "room_closed",
  "faculty_id": str or null,
  "room_id": str or null,
  "day": "MON" | "TUE" | "WED" | "THU" | "FRI",
  "periods": [int],
  "reason": str,
  "follow_up": str or null
}
Periods are 1 through 9. "Morning" = [1, 2, 3, 4]. "Afternoon" = [6, 7, 8, 9].
Reply ONLY with the JSON object.
"""


def _get_groq_client() -> Optional[Groq]:
    if not LLM_API_KEY or not LLM_API_KEY.strip():
        return None
    try:
        return Groq(api_key=LLM_API_KEY)
    except Exception as exc:
        print(f"Warning: Failed to initialize Groq client: {exc}")
        return None


def _call_groq_json(system_prompt: str, user_text: str) -> Optional[dict]:
    client = _get_groq_client()
    if not client:
        return None

    models_to_try = [LLM_MODEL, LLM_FALLBACK_MODEL]
    for model_name in models_to_try:
        if not model_name:
            continue
        try:
            resp = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_text},
                ],
                temperature=0,
                max_tokens=600,
                response_format={"type": "json_object"},
            )
            content = resp.choices[0].message.content
            if content:
                return json.loads(content)
        except RateLimitError:
            continue
        except Exception as exc:
            print(f"Warning: Groq call failed for model {model_name}: {exc}")
            continue

    return None


def _regex_fallback_booking_parser(text: str, user_role: str = "club") -> dict:
    """
    Deterministic rule-based backup parser when LLM API is unavailable.
    Guarantees the system never crashes and always extracts basic parameters.
    """
    lower = text.lower()

    # Attendance extraction
    att_match = re.search(r'(\d+)\s*(people|students|attendees|participants|log|persons)', lower)
    attendance = int(att_match.group(1)) if att_match else 50

    # Duration extraction
    dur_match = re.search(r'(\d+)\s*(hour|hours|hr|hrs|ghante|ghanta|periods|period)', lower)
    duration = int(dur_match.group(1)) if dur_match else 2

    # Day extraction
    day = "THU"
    if "mon" in lower or "somwar" in lower:
        day = "MON"
    elif "tue" in lower or "mangalwar" in lower:
        day = "TUE"
    elif "wed" in lower or "budhwar" in lower:
        day = "WED"
    elif "thu" in lower or "guruwar" in lower:
        day = "THU"
    elif "fri" in lower or "shukrawar" in lower:
        day = "FRI"
    elif "kal" in lower:
        day = "FRI"

    # Periods extraction
    from_p, to_p = 10, 11
    if "6 to 8" in lower or "6-8" in lower:
        from_p, to_p = 10, 11
    elif "7 to 8" in lower or "7-8" in lower:
        from_p, to_p = 11, 11
    elif "after lunch" in lower or "afternoon" in lower or "dopahar" in lower:
        from_p, to_p = 6, 8
    elif "morning" in lower or "subah" in lower or "10 to 12" in lower:
        from_p, to_p = 3, 4

    # Room types
    room_types = ["classroom"]
    if "auditorium" in lower:
        room_types = ["auditorium"]
    elif "seminar" in lower:
        room_types = ["seminar_hall"]
    elif "lab" in lower or "computer" in lower:
        room_types = ["lab_cs"]
    elif "outdoor" in lower or "theatre" in lower or "oat" in lower:
        room_types = ["outdoor"]

    # Specific room
    requested_room = None
    for r_candidate in ["SH-1", "SH-2", "AUD", "OAT", "CR-101", "CR-102", "LH-1", "LH-2"]:
        if r_candidate.lower() in lower:
            requested_room = r_candidate
            break

    # Needs
    needs = []
    if "projector" in lower:
        needs.append("projector")
    if "mic" in lower or "sound" in lower or "pa" in lower or "speaker" in lower:
        needs.append("pa_system")
    if "wheelchair" in lower or "accessible" in lower:
        needs.append("wheelchair_accessible")
    if "computer" in lower or "coding" in lower:
        needs.append("computers")
    if "stage" in lower:
        needs.append("stage")

    # Mandatory groups
    mandatory_for_groups = []
    if "mechanical" in lower or "me" in lower:
        if "third" in lower or "3" in lower:
            mandatory_for_groups.append("ME-3")

    return {
        "title": text[:60].strip(),
        "attendance": attendance,
        "duration_periods": duration,
        "requested_category": "club_event" if user_role == "club" else "department_event",
        "windows": [{"day": day, "from_period": from_p, "to_period": to_p}],
        "room_types": room_types,
        "needs": needs,
        "requested_room": requested_room,
        "mandatory_for_groups": mandatory_for_groups,
        "missing": [],
        "follow_up": None,
    }


def parse_booking_request(text: str, user_role: str = "club") -> Dict[str, Any]:
    """
    Parses natural language/Hinglish text into structured booking parameters.
    1. Attempts Groq LLM extraction (Qwen 3.8 27B / Allam 7B).
    2. Falls back to deterministic rule-based extractor if offline.
    3. Strictly enforces code validation via validate_ai_booking_payload.
    """
    parsed_json = _call_groq_json(BOOKING_EXTRACTION_SYSTEM_PROMPT, text)
    used_ai = True
    if not parsed_json:
        parsed_json = _regex_fallback_booking_parser(text, user_role)
        used_ai = False

    parsed_json["raw_text"] = text

    # Apply strict code validation
    sanitized, warnings, follow_ups = validate_ai_booking_payload(parsed_json, user_role)

    return {
        "structured": sanitized,
        "warnings": warnings,
        "follow_ups": follow_ups,
        "engine_used": "groq" if used_ai else "deterministic_rule_engine",
        "model": LLM_MODEL if used_ai else "fallback_regex",
    }


def parse_faculty_change_request(text: str, user_faculty_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Parses faculty leave or room disruption text into structured disruption payload.
    """
    parsed = _call_groq_json(FACULTY_CHANGE_SYSTEM_PROMPT, text)
    if not parsed:
        # Simple fallback
        lower = text.lower()
        change_type = "room_closed" if "room" in lower or "cr-" in lower or "lh-" in lower else "faculty_leave"
        day = "MON"
        for d in ["MON", "TUE", "WED", "THU", "FRI"]:
            if d.lower() in lower:
                day = d
                break
        parsed = {
            "change_type": change_type,
            "faculty_id": user_faculty_id or "F01",
            "room_id": "CR-101",
            "day": day,
            "periods": [2, 3],
            "reason": text[:80],
            "follow_up": None,
        }

    # Normalize fields
    faculty_id = parsed.get("faculty_id") or user_faculty_id or "F01"
    day = str(parsed.get("day") or "MON").upper()
    periods = [int(p) for p in (parsed.get("periods") or [2, 3]) if 1 <= int(p) <= 9]
    if not periods:
        periods = [2, 3]

    return {
        "change_type": parsed.get("change_type", "faculty_leave"),
        "faculty_id": faculty_id,
        "room_id": parsed.get("room_id") or "CR-101",
        "day": day,
        "periods": periods,
        "reason": parsed.get("reason") or text[:80],
        "follow_up": parsed.get("follow_up"),
    }


def explain_decision(decision_type: str, item_data: Dict[str, Any]) -> str:
    """
    Generates a natural-language explanation for why a booking or schedule change decision was made,
    referencing hard constraints and priority rankings.
    """
    status = item_data.get("status")
    reason = item_data.get("reason") or "Standard constraint policy applied."
    room = item_data.get("assigned_room") or item_data.get("room_id")
    category = item_data.get("category") or "event"

    if decision_type == "booking":
        if status == "approved":
            return (
                f"Booking was approved in {room} because the venue has sufficient capacity and all "
                f"compulsory groups and requested equipment requirements were satisfied without conflict."
            )
        elif status == "alternative_offered":
            return (
                f"An alternative slot or room ({room}) was offered. Reason: {reason}. "
                f"The original preferred room or time window was occupied by a higher priority session or regular classes."
            )
        elif status == "rejected":
            return (
                f"Booking was rejected. Reason: {reason}. All requested windows and suitable venues "
                f"exceeded capacity or conflicted with higher-priority academic/institute activities."
            )
        elif status == "cancelled":
            return "This booking was cancelled by the requester."

    return f"Decision: {status}. Rationale: {reason}"

