import json
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.rescheduler import reschedule_timetable
from app.validate import validate_schedule


def main() -> None:
    data_path = PROJECT_ROOT / "data" / "cit_public.json"
    disruption_path = PROJECT_ROOT / "examples" / "sample_disruption.json"
    baseline_path = PROJECT_ROOT / "exports" / "schedule.json"
    output_path = PROJECT_ROOT / "exports" / "schedule_after.json"

    print("Running Reschedule Engine (Steps 8 & 9)...")
    print(f"Applying disruption: {disruption_path}")
    print(f"Using baseline:      {baseline_path}")

    diff = reschedule_timetable(
        data_path,
        disruption_path,
        baseline_path,
        output_path,
        time_limit_seconds=30.0,
    )

    print(f"\nRescheduled schedule exported to: {output_path}")
    print("\n=== Schedule Diff Summary ===")
    print(f"Total sessions moved:      {diff['total_moved']}")
    print(f"Time changed:              {diff['time_changed_count']}")
    print(f"Room-only changed:         {diff['room_only_changed_count']}")
    print(f"New sessions added:        {len(diff['added'])} {diff['added']}")
    print(f"Sessions removed:          {len(diff['removed'])} {diff['removed']}")

    # Run official validator
    report = validate_schedule(
        data=data_path,
        schedule=output_path,
        disruption=disruption_path,
        baseline=baseline_path,
    )

    print("\n=== Official Validator Report for exports/schedule_after.json ===")
    print(f"Dataset ID:                {report['dataset_id']}")
    print(f"Hard violations:           {report['hard_violation_count']} {report['hard_by_rule']}")
    print(f"Soft penalty total:        {report['soft_total']} {report['soft_penalties']}")

    if "stability" in report:
        s = report["stability"]
        print(f"Stability:                 {s['sessions_moved']} sessions moved "
              f"({s['time_changed']} time changed, {s['room_only_changed']} room only)")
        print(f"Moved session IDs:         {s['moved_ids']}")

    if "bookings" in report:
        b = report["bookings"]
        print(f"Bookings: score {b['booking_score']}/{b['booking_score_max_if_all_approved']} | "
              f"approved {b['approved']}, alternatives {b['alternatives']}, "
              f"rejected {b['rejected']}, priority inversions: {len(b['priority_inversions'])}")

    assert report["hard_violation_count"] == 0, f"Expected 0 hard violations, got {report['hard_violation_count']}"
    assert len(report.get("bookings", {}).get("priority_inversions", [])) == 0, "Expected 0 priority inversions"

    print(f"\nVerification PASSED: 0 hard violations, 0 priority inversions, {report['stability']['sessions_moved']} moved sessions.")


if __name__ == "__main__":
    main()
