from collections import defaultdict
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from ortools.sat.python import cp_model

from app.models import Dataset, Session, Room, Faculty, Group, load_dataset


def build_candidate_placements(dataset: Dataset) -> Dict[str, List[Tuple[str, int, str]]]:
    """
    For each session, find all valid (day, start_period, room_id) candidate placements.
    Filters out lunch crossings, lab start restrictions, unavailabilities,
    room type mismatches, capacity mismatches, and accessibility requirements.
    """
    # Precompute unavailabilities
    fac_un: Dict[str, Set[Tuple[str, int]]] = defaultdict(set)
    for f in dataset.faculty:
        for u in f.unavailable:
            for p in u.get("periods", []):
                fac_un[f.id].add((u["day"], p))

    room_un: Dict[str, Set[Tuple[str, int]]] = defaultdict(set)
    for u in dataset.room_unavailability:
        for p in u.get("periods", []):
            room_un[u["room_id"]].add((u["day"], p))

    teaching_periods = set(dataset.teaching_periods)
    lunch = dataset.lunch_after_period or 5
    lab_starts = set(dataset.lab_start_periods) if dataset.lab_start_periods else {2, 6}

    candidates: Dict[str, List[Tuple[str, int, str]]] = {}

    for s in dataset.sessions:
        s_cands = []
        fixed = s.fixed_slot

        # Valid candidate rooms
        eligible_rooms = []
        for r in dataset.rooms:
            if r.type not in s.room_types:
                continue
            if r.capacity < s.size:
                continue
            if s.needs_accessible and not r.accessible:
                continue
            eligible_rooms.append(r.id)

        for day in dataset.days:
            if fixed and fixed.get("day") != day:
                continue

            for start in range(1, 10 - s.duration + 1):
                if fixed and fixed.get("start_period") != start:
                    continue

                # Teaching periods check
                periods = list(range(start, start + s.duration))
                if not all(p in teaching_periods for p in periods):
                    continue

                # Lunch crossing check: cannot have periods on both sides of lunch
                if periods[0] <= lunch < periods[-1]:
                    continue

                # Lab start period check
                if s.kind == "lab" and start not in lab_starts:
                    continue

                # Faculty availability
                if any((day, p) in fac_un[s.faculty_id] for p in periods):
                    continue

                for rid in eligible_rooms:
                    # Room availability
                    if any((day, p) in room_un[rid] for p in periods):
                        continue
                    s_cands.append((day, start, rid))

        candidates[s.id] = s_cands

    return candidates


def solve_timetable(
    dataset: Dataset,
    soft_weights: Optional[Dict[str, int]] = None,
    time_limit_seconds: float = 30.0,
    hint_schedule: Optional[Dict[str, Tuple[str, int, str]]] = None,
) -> Optional[Dict[str, Tuple[str, int, str]]]:
    """
    Solve the timetable using OR-Tools CP-SAT.
    If soft_weights is provided (Step 4+), optimizes S1-S6 penalties.
    If hint_schedule is provided (Step 8+), hints variables toward baseline.
    Returns: mapping session_id -> (day, start_period, room_id).
    """
    model = cp_model.CpModel()
    candidates = build_candidate_placements(dataset)

    # Decision variables: x[sid, (day, start, room)]
    x: Dict[Tuple[str, str, int, str], cp_model.IntVar] = {}
    session_vars: Dict[str, List[cp_model.IntVar]] = defaultdict(list)

    for sid, cands in candidates.items():
        if not cands:
            print(f"Error: No candidates available for session {sid}")
            return None
        for cand in cands:
            var = model.NewBoolVar(f"x_{sid}_{cand[0]}_{cand[1]}_{cand[2]}")
            x[(sid, cand[0], cand[1], cand[2])] = var
            session_vars[sid].append(var)

    # 1. Exactly one placement per session (Hard constraint H1)
    for sid, vars_list in session_vars.items():
        model.AddExactlyOne(vars_list)

    # 2. Elective Baskets (Hard constraint H11)
    # All sessions in the same basket must have identical (day, start_period)
    baskets: Dict[str, List[Session]] = defaultdict(list)
    for s in dataset.sessions:
        if s.basket_slot:
            baskets[s.basket_slot].append(s)

    basket_time_vars: Dict[Tuple[str, str, int], cp_model.IntVar] = {}

    for bname, bsessions in baskets.items():
        dur = bsessions[0].duration
        # Find common timeslots (day, start) where all sessions in basket have at least one room
        common_timeslots: Set[Tuple[str, int]] = set()
        for cand in candidates[bsessions[0].id]:
            common_timeslots.add((cand[0], cand[1]))
        for s in bsessions[1:]:
            s_times = {(cand[0], cand[1]) for cand in candidates[s.id]}
            common_timeslots.intersection_update(s_times)

        y_vars = []
        for (day, start) in sorted(common_timeslots):
            y = model.NewBoolVar(f"basket_{bname}_{day}_{start}")
            basket_time_vars[(bname, day, start)] = y
            y_vars.append(y)

            # Link each session's room choices at (day, start) to y
            for s in bsessions:
                matching_x = [
                    x[(s.id, day, start, cand[2])]
                    for cand in candidates[s.id]
                    if cand[0] == day and cand[1] == start
                ]
                model.Add(sum(matching_x) == y)

        model.AddExactlyOne(y_vars)

    # 3. Room non-overlap (Hard constraint H4)
    # At any room r, day d, period p: at most 1 session
    room_period_map: Dict[Tuple[str, str, int], List[cp_model.IntVar]] = defaultdict(list)
    for (sid, day, start, rid), var in x.items():
        dur = dataset.sessions_by_id[sid].duration
        for p in range(start, start + dur):
            room_period_map[(rid, day, p)].append(var)

    for (rid, day, p), vars_list in room_period_map.items():
        if len(vars_list) > 1:
            model.Add(sum(vars_list) <= 1)

    # 4. Faculty non-overlap (Hard constraint H2)
    # At any faculty f, day d, period p: at most 1 session
    fac_period_map: Dict[Tuple[str, str, int], List[cp_model.IntVar]] = defaultdict(list)
    for (sid, day, start, rid), var in x.items():
        fac_id = dataset.sessions_by_id[sid].faculty_id
        dur = dataset.sessions_by_id[sid].duration
        for p in range(start, start + dur):
            fac_period_map[(fac_id, day, p)].append(var)

    for (fac_id, day, p), vars_list in fac_period_map.items():
        if len(vars_list) > 1:
            model.Add(sum(vars_list) <= 1)

    # 5. Student Group non-overlap (Hard constraint H3)
    # At any group g, day d, period p: at most 1 non-basket session, OR active basket
    group_period_nonbasket: Dict[Tuple[str, str, int], List[cp_model.IntVar]] = defaultdict(list)
    for (sid, day, start, rid), var in x.items():
        s = dataset.sessions_by_id[sid]
        if s.basket_slot is None:
            for g in s.groups:
                for p in range(start, start + s.duration):
                    group_period_nonbasket[(g, day, p)].append(var)

    # Map groups to baskets
    group_baskets: Dict[str, Set[str]] = defaultdict(set)
    for bname, bsessions in baskets.items():
        for s in bsessions:
            for g in s.groups:
                group_baskets[g].add(bname)

    all_days = dataset.days
    all_periods = dataset.teaching_periods

    for g in dataset.groups_by_id:
        for day in all_days:
            for p in all_periods:
                terms: List[cp_model.IntVar] = list(group_period_nonbasket.get((g, day, p), []))

                # Add basket terms if group attends basket
                for bname in group_baskets.get(g, []):
                    b_dur = baskets[bname][0].duration
                    for start in range(max(1, p - b_dur + 1), p + 1):
                        if (bname, day, start) in basket_time_vars:
                            terms.append(basket_time_vars[(bname, day, start)])

                if len(terms) > 1:
                    model.Add(sum(terms) <= 1)

    # 6. Faculty daily limit (Hard constraint H12)
    for fac in dataset.faculty:
        max_h = fac.max_hours_per_day
        for day in all_days:
            day_terms = []
            for sid, cands in candidates.items():
                if dataset.sessions_by_id[sid].faculty_id == fac.id:
                    dur = dataset.sessions_by_id[sid].duration
                    for cand in cands:
                        if cand[0] == day:
                            day_terms.append(dur * x[(sid, cand[0], cand[1], cand[2])])
            if day_terms:
                model.Add(sum(day_terms) <= max_h)

    # Add hint schedule if provided
    if hint_schedule:
        for sid, (day, start, rid) in hint_schedule.items():
            if (sid, day, start, rid) in x:
                model.AddHint(x[(sid, day, start, rid)], 1)

    # Soft constraints handling (Step 4+)
    if soft_weights:
        objective_terms = []
        # S1: Faculty avoid preferences
        # S5: Room under-utilization (<40% capacity)
        # S6: Period 9 usage
        for (sid, day, start, rid), var in x.items():
            s = dataset.sessions_by_id[sid]
            r = dataset.rooms_by_id[rid]
            dur = s.duration
            per = list(range(start, start + dur))

            # S1
            fac = dataset.faculty_by_id[s.faculty_id]
            s1_penalty = 0
            for pref in fac.preferences:
                if pref.get("type") == "avoid" and day in pref.get("days", dataset.days):
                    s1_penalty += 2 * sum(1 for p in per if p in pref.get("periods", []))
            if s1_penalty > 0 and soft_weights.get("S1", 0) > 0:
                objective_terms.append(soft_weights["S1"] * s1_penalty * var)

            # S5
            if r.capacity > 0 and (s.size / r.capacity) < 0.4:
                if soft_weights.get("S5", 0) > 0:
                    objective_terms.append(soft_weights["S5"] * 1 * var)

            # S6
            if 9 in per:
                if soft_weights.get("S6", 0) > 0:
                    objective_terms.append(soft_weights["S6"] * 1 * var)

        # S4: Group same course lecture >1 in a day
        # For each group g, course c, day d: count lectures
        course_group_lectures: Dict[Tuple[str, str, str], List[cp_model.IntVar]] = defaultdict(list)
        for (sid, day, start, rid), var in x.items():
            s = dataset.sessions_by_id[sid]
            if s.kind == "lecture" and not s.basket_slot:
                for g in s.groups:
                    course_group_lectures[(g, s.course_id, day)].append(var)

        for (g, cid, day), lvars in course_group_lectures.items():
            if len(lvars) > 1 and soft_weights.get("S4", 0) > 0:
                # penalty is 3 * (count - 1) if count > 1
                excess = model.NewIntVar(0, len(lvars), f"excess_s4_{g}_{cid}_{day}")
                model.Add(excess >= sum(lvars) - 1)
                objective_terms.append(soft_weights["S4"] * 3 * excess)

        # S3: Group hours > 6 in a day
        for g in dataset.groups_by_id:
            for day in all_days:
                # sum of durations for group on that day
                g_day_durations = []
                for (sid, d, start, rid), var in x.items():
                    if d == day:
                        s = dataset.sessions_by_id[sid]
                        if g in s.groups:
                            if not s.basket_slot:
                                g_day_durations.append(s.duration * var)
                # Baskets duration
                for bname in group_baskets.get(g, []):
                    b_dur = baskets[bname][0].duration
                    for (bn, d, start), y in basket_time_vars.items():
                        if bn == bname and d == day:
                            g_day_durations.append(b_dur * y)

                if g_day_durations and soft_weights.get("S3", 0) > 0:
                    excess_hours = model.NewIntVar(0, 9, f"excess_h_{g}_{day}")
                    model.Add(excess_hours >= sum(g_day_durations) - 6)
                    objective_terms.append(soft_weights["S3"] * 3 * excess_hours)

        if objective_terms:
            model.Minimize(sum(objective_terms))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_seconds
    solver.parameters.num_workers = 8

    status = solver.Solve(model)
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        schedule: Dict[str, Tuple[str, int, str]] = {}
        for (sid, day, start, rid), var in x.items():
            if solver.BooleanValue(var):
                schedule[sid] = (day, start, rid)
        return schedule
    else:
        print(f"Solver ended with status: {solver.StatusName(status)}")
        return None

