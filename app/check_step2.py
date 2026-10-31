import sys
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.models import load_dataset
from app.validate import validate_schedule


def main() -> None:
    data_path = PROJECT_ROOT / "data" / "cit_public.json"
    if not data_path.exists():
        print(f"Error: dataset file not found at {data_path}", file=sys.stderr)
        sys.exit(1)

    dataset = load_dataset(data_path)

    rooms_count = len(dataset.rooms)
    faculty_count = len(dataset.faculty)
    groups_count = len(dataset.student_groups)
    courses_count = len(dataset.courses)
    sessions_count = len(dataset.sessions)
    hours = dataset.total_teaching_hours
    bookings_count = len(dataset.booking_requests)
    cancellations_count = len(dataset.cancellations)
    exams_count = len(dataset.exams)

    print("=== Step 2 Verification ===")
    print(f"Rooms:            {rooms_count} (expected 27)")
    print(f"Faculty:          {faculty_count} (expected 40)")
    print(f"Student Groups:   {groups_count} (expected 14)")
    print(f"Courses:          {courses_count} (expected 62)")
    print(f"Sessions:         {sessions_count} (expected 189)")
    print(f"Teaching Hours:   {hours} h (expected 243 h)")
    print(f"Booking Requests: {bookings_count} (expected 25)")
    print(f"Cancellations:    {cancellations_count} (expected 1)")
    print(f"Exams:            {exams_count} (expected 41)")

    # Assert expected counts
    assert rooms_count == 27, f"Rooms count mismatch: {rooms_count}"
    assert faculty_count == 40, f"Faculty count mismatch: {faculty_count}"
    assert groups_count == 14, f"Groups count mismatch: {groups_count}"
    assert sessions_count == 189, f"Sessions count mismatch: {sessions_count}"
    assert hours == 243, f"Teaching hours mismatch: {hours}"
    assert bookings_count == 25, f"Bookings count mismatch: {bookings_count}"
    assert cancellations_count == 1, f"Cancellations count mismatch: {cancellations_count}"
    assert exams_count == 41, f"Exams count mismatch: {exams_count}"

    # Test validate_schedule wrapper with sample schedule
    sample_sched = PROJECT_ROOT / "examples" / "schedule.example.json"
    if sample_sched.exists():
        rep = validate_schedule(data_path, sample_sched)
        print(f"Wrapper Test - Example schedule hard violations: {rep['hard_violation_count']}")

    print("Step 2 verification PASSED (counts: 27/40/14/189/25/1/41, 243 h)")


if __name__ == "__main__":
    main()
