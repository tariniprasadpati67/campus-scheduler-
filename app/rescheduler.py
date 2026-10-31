import copy
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import validator
from app.models import Dataset, load_dataset
from app.scheduler import solve_timetable
from app.booking_engine import allocate_bookings


def apply_disruption_to_dataset(dataset_path: Path, disruption_path: Path) -> Tuple[Dataset, Dict[str, Any]]:
    """Apply disruption json to dataset and return modified Dataset object."""
    data = validator.load(str(dataset_path))
    dis = validator.load(str(disruption_path))
    disrupted_data = validator.apply_disruption(data, dis)

    # Dump to a temp or in-memory load
    import tempfile
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
        json.dump(disrupted_data, f)
        temp_path = Path(f.name)

    try:
        disrupted_dataset = load_dataset(temp_path)
    finally:
        if temp_path.exists():
            temp_path.unlink()

    return disrupted_dataset, disrupted_data


def compute_schedule_diff(
    baseline_sessions: List[Dict[str, Any]],
    rescheduled_sessions: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Compute the difference between baseline and rescheduled timetables."""
    base_map = {s["session_id"]: (s["day"], s["start_period"], s["room_id"]) for s in baseline_sessions}
    new_map = {s["session_id"]: (s["day"], s["start_period"], s["room_id"]) for s in rescheduled_sessions}

    moved = []
    time_changed = []
    room_only_changed = []

    for sid, new_slot in new_map.items():
        if sid in base_map:
            old_slot = base_map[sid]
            if old_slot != new_slot:
                moved.append(sid)
                if old_slot[:2] != new_slot[:2]:
                    time_changed.append({
                        "session_id": sid,
                        "from": f"{old_slot[0]} P{old_slot[1]} in {old_slot[2]}",
                        "to": f"{new_slot[0]} P{new_slot[1]} in {new_slot[2]}",
                    })
                else:
                    room_only_changed.append({
                        "session_id": sid,
                        "day": old_slot[0],
                        "period": old_slot[1],
                        "from_room": old_slot[2],
                        "to_room": new_slot[2],
                    })

    added = [sid for sid in new_map if sid not in base_map]
    removed = [sid for sid in base_map if sid not in new_map]

    return {
        "total_moved": len(moved),
        "time_changed_count": len(time_changed),
        "room_only_changed_count": len(room_only_changed),
        "added": added,
        "removed": removed,
        "time_changed_details": time_changed,
        "room_only_details": room_only_changed,
    }


def reschedule_timetable(
    dataset_path: Path,
    disruption_path: Path,
    baseline_path: Path,
    output_path: Path,
    time_limit_seconds: float = 30.0,
) -> Dict[str, Any]:
    """
    Reschedule after a disruption:
      - Applies disruption changes
      - Minimizes moved sessions using baseline as hint
      - Allocates Spectra bookings
      - Preserves exams
      - Exports schedule_after.json
    """
    disrupted_dataset, _ = apply_disruption_to_dataset(dataset_path, disruption_path)

    with open(baseline_path, "r", encoding="utf-8") as f:
        baseline_sched = json.load(f)

    baseline_assign = {
        s["session_id"]: (s["day"], s["start_period"], s["room_id"])
        for s in baseline_sched.get("sessions", [])
    }

    # Solve with baseline hint and high disruption penalty weight
    new_assign = solve_timetable(
        disrupted_dataset,
        optimize_soft=True,
        time_limit_seconds=time_limit_seconds,
        hint_schedule=baseline_assign,
        disruption_penalty_weight=500,
    )

    if new_assign is None:
        raise RuntimeError("Reschedule solver failed: could not find feasible schedule after disruption.")

    new_sessions = [
        {"session_id": sid, "day": day, "start_period": start, "room_id": rid}
        for sid, (day, start, rid) in sorted(new_assign.items())
    ]

    # Re-allocate fest week bookings
    fest_week = allocate_bookings(disrupted_dataset, new_assign)

    rescheduled_sched = {
        "team": baseline_sched.get("team", "CIT Scheduler"),
        "dataset_id": disrupted_dataset.dataset_id,
        "sessions": new_sessions,
        "fest_week": fest_week,
        "exams": baseline_sched.get("exams", []),
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(rescheduled_sched, f, indent=2)

    diff = compute_schedule_diff(baseline_sched.get("sessions", []), new_sessions)
    return diff
