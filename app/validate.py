import json
from pathlib import Path
from typing import Any, Dict, Optional, Union
import sys

# Ensure root is in sys.path so validator can be imported
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import validator


def validate_schedule(
    data: Union[str, Path, Dict[str, Any]],
    schedule: Union[str, Path, Dict[str, Any]],
    disruption: Optional[Union[str, Path, Dict[str, Any]]] = None,
    baseline: Optional[Union[str, Path, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Wrapper around validator.py.
    Accepts paths or in-memory dicts for dataset, schedule, disruption, and baseline.
    Returns the full validation report dictionary.
    """
    # Load dataset
    if isinstance(data, (str, Path)):
        dataset_obj = validator.load(str(data))
    else:
        dataset_obj = data

    # Apply disruption if provided
    if disruption:
        if isinstance(disruption, (str, Path)):
            dis_obj = validator.load(str(disruption))
        else:
            dis_obj = disruption
        dataset_obj = validator.apply_disruption(dataset_obj, dis_obj)

    # Load schedule
    if isinstance(schedule, (str, Path)):
        sched_obj = validator.load(str(schedule))
    else:
        sched_obj = schedule

    # Load baseline if provided
    if baseline:
        if isinstance(baseline, (str, Path)):
            base_obj = validator.load(str(baseline))
        else:
            base_obj = baseline
    else:
        base_obj = None

    # Run official validator
    return validator.run(dataset_obj, sched_obj, base_obj)


def check_is_valid(report: Dict[str, Any], allow_e1: bool = False) -> bool:
    """Check if schedule has 0 hard violations (optionally ignoring E1 unscheduled exams)."""
    violations = report.get("hard_violations", [])
    if allow_e1:
        violations = [v for v in violations if v.get("rule") != "E1"]
    return len(violations) == 0


if __name__ == "__main__":
    validator.main()
