"""
Synthetic data generator — mocks TMS (track defects), SMMS (signal faults),
TDMS (OHE issues), and COA/RTIS (train timetable + live position) as if they
were real data feeds. Exposed the same shape a real integration would use,
so swapping in real APIs later is a data-source change, not a redesign.

Generates exactly the locked demo scenario:
  - 3 overlapping department requests in SEC-14 (merged into 1 block, ~10:00-11:55)
  - 4 trains tuned so each of the 4 conflict rules fires exactly once:
      Train 11111 (low priority, on-time, WITH enough slack)    -> held until section clears
      Train 22222 (low priority, on-time, WITHOUT enough slack) -> short hold + revised window
      Train 54321 (HIGH priority)                               -> block pauses, no exceptions
      Train 99999 (LATE running, regardless of priority)        -> passes immediately, never held
"""
from datetime import datetime, timedelta
from models import Task, Train, Department, Severity, TrainPriority, get_engine, init_db


def seed_demo_scenario(session):
    """Populate the DB with the SEC-14 demo scenario. Wipes existing tasks/trains first."""
    session.query(Task).delete()
    session.query(Train).delete()
    session.commit()

    today = datetime.now().replace(hour=10, minute=0, second=0, microsecond=0)

    # --- Maintenance tasks (mock TMS / SMMS / TDMS) ---
    tasks = [
        Task(
            department=Department.TRACK,
            section="SEC-14",
            defect_desc="Rail fracture inspection",
            severity=Severity.HIGH,
            overdue_days=12,
            est_duration_min=45,
        ),
        Task(
            department=Department.SIGNAL,
            section="SEC-14",
            defect_desc="Signal relay check",
            severity=Severity.MEDIUM,
            overdue_days=5,
            est_duration_min=30,
        ),
        Task(
            department=Department.OHE,
            section="SEC-14",
            defect_desc="Overhead wire tension check",
            severity=Severity.MEDIUM,
            overdue_days=8,
            est_duration_min=40,
        ),
    ]
    session.add_all(tasks)

    # --- Trains (mock COA schedule + RTIS live feed) ---
    # Block window will be ~10:00-11:55 (from the optimizer); all 4 trains are
    # timed to fall inside that window so every conflict rule fires once.
    trains = [
        Train(
            number="11111",
            section="SEC-14",
            priority=TrainPriority.LOW,
            scheduled_pass_time=today + timedelta(minutes=20),   # 10:20 AM scheduled
            actual_pass_time=today + timedelta(minutes=20),      # on time
            slack_minutes=120,                                    # plenty of slack -> can be held to section clear
            is_late=False,
        ),
        Train(
            number="22222",
            section="SEC-14",
            priority=TrainPriority.LOW,
            scheduled_pass_time=today + timedelta(minutes=40),   # 10:40 AM scheduled
            actual_pass_time=today + timedelta(minutes=40),      # on time
            slack_minutes=10,                                     # not enough slack to wait for section clear
            is_late=False,
        ),
        Train(
            number="54321",
            section="SEC-14",
            priority=TrainPriority.HIGH,
            scheduled_pass_time=today + timedelta(minutes=60),   # 11:00 AM scheduled
            actual_pass_time=today + timedelta(minutes=60),
            slack_minutes=0,                                      # irrelevant, high priority never held
            is_late=False,
        ),
        Train(
            number="99999",
            section="SEC-14",
            priority=TrainPriority.LOW,
            scheduled_pass_time=today + timedelta(minutes=70),   # 11:10 AM scheduled
            actual_pass_time=today + timedelta(minutes=100),     # running LATE -> 11:40
            slack_minutes=5,
            is_late=True,                                         # already late -> can never be held further
        ),
    ]
    session.add_all(trains)

    session.commit()
    return tasks, trains


if __name__ == "__main__":
    engine = get_engine()
    Session = init_db(engine)
    session = Session()
    tasks, trains = seed_demo_scenario(session)
    print(f"Seeded {len(tasks)} tasks and {len(trains)} trains for SEC-14 demo scenario.")
    for t in tasks:
        print(f"  Task: {t.department.value:8s} | {t.defect_desc:30s} | severity={t.severity.value:8s} | overdue={t.overdue_days}d | {t.est_duration_min}min")
    for tr in trains:
        print(f"  Train {tr.number} | priority={tr.priority.value:5s} | scheduled={tr.scheduled_pass_time.strftime('%H:%M')} | actual={tr.actual_pass_time.strftime('%H:%M')} | slack={tr.slack_minutes}min | late={tr.is_late}")
    session.close()
