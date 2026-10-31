from pathlib import Path
import sys

# Ensure root and app are on sys.path for direct script execution
CURRENT_FILE = Path(__file__).resolve()
APP_DIR = CURRENT_FILE.parent
BACKEND_DIR = APP_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

for p in (str(PROJECT_ROOT), str(BACKEND_DIR), str(APP_DIR)):
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.app.models import load_dataset
except ImportError:
    from models import load_dataset  # type: ignore


def main() -> None:
    data_path = PROJECT_ROOT / "data" / "cit_public.json"
    if not data_path.exists():
        print(f"Error: dataset file not found at {data_path}", file=sys.stderr)
        sys.exit(1)

    dataset = load_dataset(data_path)

    print("=== CIT Dataset Verification ===")
    print(f"Dataset ID:          {dataset.dataset_id}")
    print(f"Institute:           {dataset.institute}")
    print(f"Calendar Days:       {', '.join(dataset.days)}")
    print(f"Teaching Periods:    {dataset.teaching_periods}")
    print(f"Rooms:               {len(dataset.rooms)}")
    print(f"Faculty:             {len(dataset.faculty)}")
    print(f"Student Groups:      {len(dataset.student_groups)}")
    print(f"Courses:             {len(dataset.courses)}")
    print(f"Sessions:            {len(dataset.sessions)}")
    print(f"Total Teaching Hours:{dataset.total_teaching_hours}")
    print(f"Booking Requests:    {len(dataset.booking_requests)}")
    print(f"Cancellations:       {len(dataset.cancellations)}")
    print(f"Exams:               {len(dataset.exams)}")
    print("================================")


if __name__ == "__main__":
    main()

