import json
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.models import load_dataset
from app.exam_scheduler import solve_exam_schedule
from app.validate import validate_schedule


def main() -> None:
    data_path = PROJECT_ROOT / "data" / "cit_public.json"
    dataset = load_dataset(data_path)

    # Load timetable sessions from Step 4
    step4_file = PROJECT_ROOT / "exports" / "schedule_step4.json"
    if not step4_file.exists():
        print("Error: exports/schedule_step4.json not found", file=sys.stderr)
        sys.exit(1)

    with open(step4_file, "r", encoding="utf-8") as f:
        sched = json.load(f)

    print("Solving midsem exam schedule (Step 5: 41 exams, half room capacity)...")
    exams_out = solve_exam_schedule(dataset, time_limit_seconds=20.0)

    if exams_out is None:
        print("FAILED: Exam solver could not find a feasible exam schedule!", file=sys.stderr)
        sys.exit(1)

    print(f"Solved successfully! {len(exams_out)} / {len(dataset.exams)} exams scheduled.")

    sched["exams"] = exams_out

    export_path = PROJECT_ROOT / "exports" / "schedule_step5.json"
    with open(export_path, "w", encoding="utf-8") as f:
        json.dump(sched, f, indent=2)

    print(f"Saved schedule to {export_path}")

    # Validate
    report = validate_schedule(data_path, export_path)
    e_violations = [v for v in report.get("hard_violations", []) if v.get("rule", "").startswith("E")]

    print("\n=== Step 5 Validation Report ===")
    print(f"Total hard violations:         {report['hard_violation_count']}")
    print(f"Exam hard violations (E):      {len(e_violations)}")
    print(f"Hard by rule:                  {report['hard_by_rule']}")
    print(f"Exam soft penalty:             {report.get('exam_soft_penalty', 0)}")
    print(f"Timetable soft total:          {report['soft_total']}")

    if report["hard_violation_count"] > 0:
        print("FAIL: Found hard violations:")
        for v in report["hard_violations"][:20]:
            print(f"  [{v['rule']}] ({v['where']}) {v['detail']}")
        sys.exit(1)

    print("\nStep 5 PASSED: 0 hard violations! (Timetable + Exams fully valid)")


if __name__ == "__main__":
    main()
