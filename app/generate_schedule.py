import json
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.models import load_dataset
from app.scheduler import solve_timetable
from app.exam_scheduler import solve_exam_schedule
from app.booking_engine import allocate_bookings
from app.validate import validate_schedule


def generate_baseline_schedule(
    data_path: Path,
    export_path: Path,
    time_limit_timetable: float = 30.0,
    time_limit_exams: float = 20.0,
) -> Path:
    """Generate the complete baseline schedule.json via app code."""
    dataset = load_dataset(data_path)

    print("1. Solving optimized timetable...")
    timetable_assignment = solve_timetable(
        dataset, optimize_soft=True, time_limit_seconds=time_limit_timetable
    )
    if timetable_assignment is None:
        raise RuntimeError("Timetable solver failed to find a feasible solution.")

    print("2. Solving midsem exam schedule...")
    exams = solve_exam_schedule(dataset, time_limit_seconds=time_limit_exams)
    if exams is None:
        raise RuntimeError("Exam solver failed to find a feasible solution.")

    print("3. Allocating Spectra week bookings...")
    fest_week = allocate_bookings(dataset, timetable_assignment)

    schedule = {
        "team": "CIT Scheduler",
        "dataset_id": dataset.dataset_id,
        "sessions": [
            {"session_id": sid, "day": day, "start_period": start, "room_id": rid}
            for sid, (day, start, rid) in sorted(timetable_assignment.items())
        ],
        "fest_week": fest_week,
        "exams": exams,
    }

    export_path.parent.mkdir(parents=True, exist_ok=True)
    with open(export_path, "w", encoding="utf-8") as f:
        json.dump(schedule, f, indent=2)

    print(f"Schedule successfully exported to {export_path}")
    return export_path


def main() -> None:
    data_path = PROJECT_ROOT / "data" / "cit_public.json"
    export_path = PROJECT_ROOT / "exports" / "schedule.json"

    generate_baseline_schedule(data_path, export_path)

    # Validate with official validator
    report = validate_schedule(data_path, export_path)

    print("\n=== Official Validator Report for exports/schedule.json ===")
    print(f"Dataset ID:                {report['dataset_id']}")
    print(f"Hard violations:           {report['hard_violation_count']} {report['hard_by_rule']}")
    print(f"Soft penalty total:        {report['soft_total']} {report['soft_penalties']}")

    if "bookings" in report:
        b = report["bookings"]
        print(f"Bookings: score {b['booking_score']}/{b['booking_score_max_if_all_approved']} | "
              f"approved {b['approved']}, alternatives {b['alternatives']}, "
              f"rejected {b['rejected']}, session overrides {b['session_overrides']}, "
              f"priority inversions: {len(b['priority_inversions'])}")
        for inv in b["priority_inversions"]:
            print(f"  [inversion] {inv}")

    if "exam_soft_penalty" in report:
        print(f"Exam soft penalty:         {report['exam_soft_penalty']}")

    # Verification assertions
    assert report["hard_violation_count"] == 0, f"Expected 0 hard violations, got {report['hard_violation_count']}"
    assert len(report.get("bookings", {}).get("priority_inversions", [])) == 0, "Expected 0 priority inversions"

    print("\nVerification PASSED: 0 hard violations, 0 priority inversions, exports/schedule.json generated!")


if __name__ == "__main__":
    main()
