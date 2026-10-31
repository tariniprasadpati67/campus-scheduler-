from collections import defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple

from app.models import Dataset


def allocate_bookings(
    dataset: Dataset,
    timetable_assignment: Dict[str, Tuple[str, int, str]],
) -> Dict[str, Any]:
    """
    Spectra week booking engine.
    Applies priority rules, role caps, and cancellations.
    Allocates venues for booking requests, offering alternatives where needed,
    guaranteeing 0 priority inversions.
    Returns: {"bookings": [...], "session_overrides": [...]}
    """
    raw_priority_order = dataset.priority_order
    role_caps = dataset.role_category_cap
    cancellations = {c["request_id"] for c in dataset.cancellations}

    def effective_category(req: Dict[str, Any]) -> str:
        role = req.get("role", "club")
        cap = role_caps.get(role, "club_event")
        req_cat = req.get("requested_category", "club_event")
        a = (
            raw_priority_order.index(req_cat)
            if req_cat in raw_priority_order
            else len(raw_priority_order) - 1
        )
        cap_idx = (
            raw_priority_order.index(cap)
            if cap in raw_priority_order
            else len(raw_priority_order) - 1
        )
        return raw_priority_order[max(a, cap_idx)]

    def priority_sort_key(r: Dict[str, Any]) -> Tuple[int, str]:
        eff = effective_category(r)
        return (raw_priority_order.index(eff), r["submitted_at"])

    sorted_requests = sorted(dataset.booking_requests, key=priority_sort_key)

    # Precompute room unavailabilities
    room_un: Dict[str, Set[Tuple[str, int]]] = defaultdict(set)
    for u in dataset.room_unavailability:
        for p in u.get("periods", []):
            room_un[u["room_id"]].add((u["day"], p))

    # Initialize occupied slots with regular timetable sessions
    room_busy: Dict[Tuple[str, str, int], List[str]] = defaultdict(list)
    group_class_busy: Dict[Tuple[str, str, int], List[str]] = defaultdict(list)

    for sid, (day, start, rid) in timetable_assignment.items():
        s = dataset.sessions_by_id[sid]
        for p in range(start, start + s.duration):
            room_busy[(rid, day, p)].append(sid)
        for g in s.groups:
            for p in range(start, start + s.duration):
                group_class_busy[(g, day, p)].append(sid)

    decisions: List[Dict[str, Any]] = []
    days = dataset.days

    for req in sorted_requests:
        req_id = req["id"]

        # Cancelled requests must never be approved
        if req_id in cancellations:
            decisions.append({
                "request_id": req_id,
                "status": "rejected",
                "reason": "Request was withdrawn by the requester",
            })
            continue

        # Find eligible rooms
        pref_room = req.get("requested_room")
        eligible_rooms = []
        for r in dataset.rooms:
            if "event" not in r.allowed_uses:
                continue
            if r.type not in req["room_types"]:
                continue
            if r.capacity < req["attendance"]:
                continue
            features = set(r.features) | ({"accessible"} if r.accessible else set())
            if set(req.get("needs", [])) - features:
                continue
            eligible_rooms.append(r)

        # Prefer requested room, then sort by capacity for best fit
        eligible_rooms.sort(key=lambda r: (0 if r.id == pref_room else 1, r.capacity))

        if not eligible_rooms:
            decisions.append({
                "request_id": req_id,
                "status": "rejected",
                "reason": f"No available venue matches capacity {req['attendance']} and required features",
            })
            continue

        dur = req["duration_periods"]
        approved_slot: Optional[Tuple[str, int, int, str]] = None

        # 1. Try to approve within requested windows
        for w in req.get("windows", []):
            day = w["day"]
            from_p = w["from_period"]
            to_p = w["to_period"]
            for s0 in range(from_p, to_p - dur + 2):
                e0 = s0 + dur - 1
                if e0 > 13:
                    continue

                for r in eligible_rooms:
                    room_id = r.id
                    # Check room unavailability
                    if any((day, p) in room_un[room_id] for p in range(s0, e0 + 1)):
                        continue
                    # Check room occupation
                    if any(room_busy[(room_id, day, p)] for p in range(s0, e0 + 1)):
                        continue
                    # Check mandatory groups class conflicts
                    if any(
                        group_class_busy[(g, day, p)]
                        for g in req.get("mandatory_for_groups", [])
                        for p in range(s0, e0 + 1)
                    ):
                        continue

                    approved_slot = (day, s0, e0, room_id)
                    break
                if approved_slot:
                    break
            if approved_slot:
                break

        if approved_slot:
            day, s0, e0, room_id = approved_slot
            for p in range(s0, e0 + 1):
                room_busy[(room_id, day, p)].append(req_id)
            decisions.append({
                "request_id": req_id,
                "status": "approved",
                "day": day,
                "start_period": s0,
                "end_period": e0,
                "room_id": room_id,
                "reason": "Approved within requested window",
            })
            continue

        # 2. Try to find alternative outside windows
        alt_slot: Optional[Tuple[str, int, int, str]] = None
        # Try evening event-only periods first (10-13), then daytime
        candidate_starts = [10, 11, 12, 6, 7, 8, 1, 2, 3, 4]
        for day in days:
            for s0 in candidate_starts:
                e0 = s0 + dur - 1
                if e0 > 13:
                    continue
                for r in eligible_rooms:
                    room_id = r.id
                    if any((day, p) in room_un[room_id] for p in range(s0, e0 + 1)):
                        continue
                    if any(room_busy[(room_id, day, p)] for p in range(s0, e0 + 1)):
                        continue
                    if any(
                        group_class_busy[(g, day, p)]
                        for g in req.get("mandatory_for_groups", [])
                        for p in range(s0, e0 + 1)
                    ):
                        continue

                    alt_slot = (day, s0, e0, room_id)
                    break
                if alt_slot:
                    break
            if alt_slot:
                break

        if alt_slot:
            day, s0, e0, room_id = alt_slot
            for p in range(s0, e0 + 1):
                room_busy[(room_id, day, p)].append(req_id)
            decisions.append({
                "request_id": req_id,
                "status": "alternative_offered",
                "day": day,
                "start_period": s0,
                "end_period": e0,
                "room_id": room_id,
                "reason": "Requested window was conflicted by higher-priority events or classes; alternative offered",
            })
        else:
            decisions.append({
                "request_id": req_id,
                "status": "rejected",
                "reason": "No feasible venue slot available during festival week",
            })

    # Sort decisions by request_id for clean deterministic output
    decisions.sort(key=lambda x: x["request_id"])

    return {
        "bookings": decisions,
        "session_overrides": [],
    }
