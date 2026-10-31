import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.check_step2 import main as check_step2
from app.generate_schedule import main as generate_schedule
from app.solve_step8_9 import main as solve_disruption


def main() -> None:
    print("=" * 60)
    print("CIT Campus Scheduling Platform - Full Verification Pipeline")
    print("=" * 60)

    print("\n>>> [1/3] Step 2: Checking dataset models & counts...")
    check_step2()

    print("\n>>> [2/3] Steps 3-7: Generating & validating baseline schedule.json...")
    generate_schedule()

    print("\n>>> [3/3] Steps 8-9: Rescheduling after disruption & validating schedule_after.json...")
    solve_disruption()

    print("\n" + "=" * 60)
    print("All Steps (1 to 9) executed and validated successfully!")
    print("=" * 60)


if __name__ == "__main__":
    main()
