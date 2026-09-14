"""
Real-time conflict monitor — compares an active block's window against each
train's simulated live position (mock RTIS) and decides what happens, per the
finalized rules:

  1. High-priority train approaching  -> ALWAYS passes; block pauses immediately, no exceptions.
  2. Late-running train approaching   -> ALWAYS passes immediately, regardless of priority; never held.
  3. Low-priority, on-time, WITH slack   -> can be held until the section clears.
  4. Low-priority, on-time, WITHOUT slack -> held only a few minutes, not the full remaining duration.
  5. Otherwise safe to hold briefly   -> alert fires, system proposes a revised window.
"""
from datetime import datetime, timedelta
from models import Alert, TrainPriority

FEW_MINUTES_HOLD = 5  # cap for low-priority trains without slack


def check_conflict(block, train, now=None):
    """
    Returns a dict describing the decision: action, message, and (if applicable)
    a revised window suggestion. Does not touch the DB — caller decides what to persist.
    """
    now = now or datetime.now()

    # Is the train's live position inside (or about to enter) the active block's window?
    conflict = block.start_time <= train.actual_pass_time <= block.end_time
    if not conflict:
        return None

    minutes_to_arrival = max(0, int((train.actual_pass_time - now).total_seconds() // 60))

    # Rule 1: high priority always wins
    if train.priority == TrainPriority.HIGH:
        return {
            "action": "block_paused",
            "message": f"Train {train.number} (HIGH priority) approaching SEC in {minutes_to_arrival} min. "
                       f"Work PAUSED immediately \u2014 train passes, no exceptions.",
        }

    # Rule 2: late-running trains always win, regardless of priority
    if train.is_late:
        return {
            "action": "block_paused",
            "message": f"Train {train.number} is running LATE. Cannot be held further \u2014 "
                       f"work PAUSED to let it pass, then resumes.",
        }

    # Rule 3: low-priority, on-time, WITH slack -> can be held until section clears
    hold_needed_min = max(0, int((block.end_time - train.actual_pass_time).total_seconds() // 60))
    if train.slack_minutes >= hold_needed_min:
        return {
            "action": f"held_{hold_needed_min}_min",
            "message": f"Train {train.number} (low priority, on-time, slack={train.slack_minutes}min) "
                       f"held for {hold_needed_min} min until section clears.",
        }

    # Rule 4: low-priority, on-time, WITHOUT enough slack -> short hold only, propose revised window
    revised_start = train.actual_pass_time + timedelta(minutes=FEW_MINUTES_HOLD)
    revised_end = revised_start + (block.end_time - block.start_time)
    return {
        "action": f"held_{FEW_MINUTES_HOLD}_min_then_revised",
        "message": (
            f"Train {train.number} (low priority, insufficient slack={train.slack_minutes}min) "
            f"held only {FEW_MINUTES_HOLD} min. Remaining work rescheduled to a revised window: "
            f"{revised_start.strftime('%H:%M')}-{revised_end.strftime('%H:%M')}."
        ),
        "revised_window": (revised_start, revised_end),
    }


def run_monitor_once(session, block, trains, now=None):
    """Check every train against the block and persist any alerts raised."""
    raised = []
    for train in trains:
        result = check_conflict(block, train, now=now)
        if result:
            alert = Alert(
                block_id=block.id,
                train_id=train.id,
                message=result["message"],
                action_taken=result["action"],
                created_at=now or datetime.now(),
            )
            session.add(alert)
            raised.append(alert)
    session.commit()
    return raised


if __name__ == "__main__":
    from models import get_engine, init_db, Task, Train, Block

    engine = get_engine()
    Session = init_db(engine)
    session = Session()

    block = session.query(Block).filter(Block.section == "SEC-14").first()
    trains = session.query(Train).filter(Train.section == "SEC-14").all()

    if not block:
        print("No optimized block found \u2014 run optimizer.py first.")
    else:
        print(f"Active block: {block.start_time.strftime('%H:%M')} - {block.end_time.strftime('%H:%M')}\n")
        alerts = run_monitor_once(session, block, trains)
        if not alerts:
            print("No conflicts detected.")
        for a in alerts:
            print(f"[{a.action_taken}] {a.message}")
    session.close()
