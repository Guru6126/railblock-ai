"""
Priority scoring engine — transparent, weighted formula (not ML).
Scores each maintenance task 0.0-1.0 so the optimizer can prefer scheduling
higher-priority tasks earlier when there's a choice.
"""
from models import Severity, Department

WEIGHTS = {
    "severity": 0.4,
    "overdue": 0.3,
    "dept_risk": 0.3,
}

SEVERITY_SCORE = {
    Severity.LOW: 0.25,
    Severity.MEDIUM: 0.5,
    Severity.HIGH: 0.75,
    Severity.CRITICAL: 1.0,
}

# Illustrative — in a real system this would come from asset-criticality data (e.g. TMS/SMMS/TDMS history)
DEPT_RISK = {
    Department.TRACK: 0.9,
    Department.SIGNAL: 0.7,
    Department.OHE: 0.6,
}

OVERDUE_CAP_DAYS = 30  # beyond this, overdue score maxes out at 1.0


def score_task(task) -> float:
    severity = SEVERITY_SCORE[task.severity]
    overdue = min(task.overdue_days / OVERDUE_CAP_DAYS, 1.0)
    dept_risk = DEPT_RISK[task.department]

    score = (
        WEIGHTS["severity"] * severity
        + WEIGHTS["overdue"] * overdue
        + WEIGHTS["dept_risk"] * dept_risk
    )
    return round(score, 3)


def score_all(tasks):
    for task in tasks:
        task.priority_score = score_task(task)
    return tasks


if __name__ == "__main__":
    from models import get_engine, init_db, Task

    engine = get_engine()
    Session = init_db(engine)
    session = Session()

    tasks = session.query(Task).all()
    if not tasks:
        print("No tasks found — run data_generator.py first.")
    else:
        score_all(tasks)
        session.commit()
        for t in sorted(tasks, key=lambda x: -x.priority_score):
            print(f"  {t.department.value:8s} | {t.defect_desc:30s} | score={t.priority_score}")
    session.close()
