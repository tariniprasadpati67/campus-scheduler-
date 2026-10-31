import json
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.models import load_dataset
from app.scheduler import solve_timetable
from app.validate import validate_schedule


def main() -> None:
    data_path = PROJECT_ROOT / "data" / "cit_public.json"
    dataset = load_dataset(data_path)

    print("Solving timetable (Step 3: hard constraints only)...")
    assignment = solve_timetable(dataset, soft_weights=None, time_limit_seconds=30.0)

    if assignment is None:
        print("FAILED: Solver could not find a feasible timetable!", file=sys.stderr)
        sys.exit(1)

    print(f"Solved successfully! {len(assignment)} / {len(dataset.sessions)} sessions scheduled.")

    # Build schedule export
    sched = {
        "team": "CIT Scheduler",
        "dataset_id": dataset.dataset_id,
        "sessions": [
            {"session_id": sid, "day": day, "start_period": start, "room_id": rid}
            for sid, (day, start, rid) in sorted(assignment.items())
        ],
        "fest_week": {
            "bookings": [],
            "session_overrides": [],
        },
        "exams": [],
    }

    export_path = PROJECT_ROOT / "exports" / "schedule_step3.json"
    export_path.parent.mkdir(parents=True, exist_ok=True)
    with open(export_path, "w", encoding="utf-8") as f:
        json.dump(sched, f, indent=2)

    print(f"Saved schedule to {export_path}")

    # Validate
    report = validate_schedule(data_path, export_path)
    session_hard_violations = [v for v in report.get("hard_violations", []) if v.get("rule") != "E1"]

    print("\n=== Step 3 Validation Report ===")
    print(f"Total hard violations:         {report['hard_violation_count']}")
    print(f"Session hard violations:       {len(session_hard_violations)}")
    print(f"Hard by rule:                  {report['hard_by_rule']}")
    print(f"Soft penalty:                  {report['soft_total']}")

    if session_hard_violations:
        print("FAIL: Found session hard violations:")
        for v in session_hard_violations[:20]:
            print(f"  [{v['rule']}] {v['detail']}")
        sys.exit(1)

    print("\nStep 3 PASSED: 0 session hard violations!")


if __name__ == "__main__":
    main()

