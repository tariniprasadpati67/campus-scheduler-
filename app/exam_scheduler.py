from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

from ortools.sat.python import cp_model

from app.models import Dataset, Room


def solve_exam_schedule(
    dataset: Dataset,
    time_limit_seconds: float = 20.0,
) -> Optional[List[Dict[str, Any]]]:
    """
    Schedules 41 midsem exams across exam week (MON-SAT, AM/PM).
    Constraints:
      - E1: Each exam scheduled exactly once in a valid (day, session) slot
      - E2: Rooms must allow "exam" in allowed_uses
      - H5: sum(capacity // 2) across assigned rooms >= exam size
      - H4: Room cannot be used by multiple exams in the same slot
      - H3: No student group has 2 exams in the same slot
      - Soft: Minimize groups having 2 exams on the same day (AM & PM)
    Returns: List of {"exam_id": eid, "day": day, "session": session, "rooms": [rid, ...]}
    """
    model = cp_model.CpModel()

    exam_week = dataset.calendar.get("exam_week", {})
    days = exam_week.get("days", ["MON", "TUE", "WED", "THU", "FRI", "SAT"])
    session_types = [s["id"] for s in exam_week.get("sessions", [{"id": "AM"}, {"id": "PM"}])]
    slots: List[Tuple[str, str]] = [(d, s) for d in days for s in session_types]

    exams = dataset.exams
    exam_rooms = [r for r in dataset.rooms if "exam" in r.allowed_uses]

    # Decision variables:
    # 1. slot_var[e_id, slot]: exam e is scheduled in slot (day, session)
    slot_var: Dict[Tuple[str, Tuple[str, str]], cp_model.IntVar] = {}
    for e in exams:
        eid = e["id"]
        vars_for_e = []
        for slot in slots:
            var = model.NewBoolVar(f"slot_{eid}_{slot[0]}_{slot[1]}")
            slot_var[(eid, slot)] = var
            vars_for_e.append(var)
        model.AddExactlyOne(vars_for_e)

    # 2. Group clashes: student group cannot have multiple exams in same slot (H3)
    group_exams: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for e in exams:
        for g in e.get("groups", []):
            group_exams[g].append(e)

    for g, g_ex_list in group_exams.items():
        if len(g_ex_list) > 1:
            for slot in slots:
                model.Add(sum(slot_var[(e["id"], slot)] for e in g_ex_list) <= 1)

    # 3. room_var[e_id, rid]: room r is assigned to exam e
    room_var: Dict[Tuple[str, str], cp_model.IntVar] = {}
    for e in exams:
        eid = e["id"]
        for r in exam_rooms:
            room_var[(eid, r.id)] = model.NewBoolVar(f"room_{eid}_{r.id}")

        # Half-capacity constraint: sum(r.cap // 2) >= e.size (H5)
        model.Add(
            sum((r.capacity // 2) * room_var[(eid, r.id)] for r in exam_rooms) >= e["size"]
        )

    # 4. Room exclusivity per slot (H4)
    # A room r cannot be used by more than 1 exam in slot
    for r in exam_rooms:
        for slot in slots:
            active_in_slot = []
            for e in exams:
                eid = e["id"]
                # xr is 1 iff room r is used by exam e in this slot
                xr = model.NewBoolVar(f"use_{eid}_{r.id}_{slot[0]}_{slot[1]}")
                model.Add(xr <= room_var[(eid, r.id)])
                model.Add(xr <= slot_var[(eid, slot)])
                model.Add(xr >= room_var[(eid, r.id)] + slot_var[(eid, slot)] - 1)
                active_in_slot.append(xr)
            model.Add(sum(active_in_slot) <= 1)

    # Objective: Minimize groups having 2 exams on the same day + small cost for extra rooms
    objective_terms = []
    for g, g_ex_list in group_exams.items():
        if len(g_ex_list) > 1:
            for d in days:
                day_exams = []
                for e in g_ex_list:
                    eid = e["id"]
                    day_exams.append(slot_var[(eid, (d, "AM"))])
                    day_exams.append(slot_var[(eid, (d, "PM"))])
                two_on_day = model.NewIntVar(0, len(g_ex_list), f"two_day_{g}_{d}")
                model.Add(two_on_day >= sum(day_exams) - 1)
                objective_terms.append(5 * two_on_day)

    # Room parsimony: don't assign unused extra rooms
    for (eid, rid), rv in room_var.items():
        objective_terms.append(1 * rv)

    model.Minimize(sum(objective_terms))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_seconds
    solver.parameters.num_workers = 8

    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        print(f"Exam solver failed with status: {solver.StatusName(status)}")
        return None

    results: List[Dict[str, Any]] = []
    for e in exams:
        eid = e["id"]
        chosen_slot = None
        for slot in slots:
            if solver.BooleanValue(slot_var[(eid, slot)]):
                chosen_slot = slot
                break

        chosen_rooms = [
            r.id for r in exam_rooms if solver.BooleanValue(room_var[(eid, r.id)])
        ]
        # Sort rooms for deterministic output
        chosen_rooms.sort()

        results.append({
            "exam_id": eid,
            "day": chosen_slot[0],
            "session": chosen_slot[1],
            "rooms": chosen_rooms,
        })

    # Sort exams by exam_id
    results.sort(key=lambda x: x["exam_id"])
    return results
