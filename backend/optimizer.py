"""
Block optimization engine — OR-Tools CP-SAT.

This is the technical core of the prototype: given a set of maintenance tasks
in the same section, find the minimum-span combined block that fits all of
them back-to-back, subject to the maintenance window. (Train-conflict
avoidance during an ACTIVE block is handled live by conflict_monitor.py,
not baked into this solve — see the demo scenario notes.)

For the "3 requests -> 1 block" headline number: this takes N separate task
durations and returns ONE block whose span is the sum of durations (plus a
small buffer), instead of N separate blocks.
"""
# pyrefly: ignore [missing-import]
from ortools.sat.python import cp_model
from datetime import timedelta


def optimize_into_single_block(tasks, day_start, buffer_min=5):
    """
    tasks: list of Task ORM objects (same section), sorted by priority score desc.
    day_start: datetime the maintenance window begins (e.g. 10:00 AM).
    Returns: (block_start, block_end, ordered_task_ids)

    This is intentionally simple for the prototype: since all 3 tasks are in
    the same section and none conflict with each other, CP-SAT's job here is
    to find a valid non-overlapping ORDER (respecting priority as a soft
    preference) that packs them into the minimum total span. At larger scale
    (many sections, many tasks, train windows as forbidden intervals) this is
    where the solver's real value shows up.
    """
    model = cp_model.CpModel()
    n = len(tasks)
    horizon = sum(t.est_duration_min for t in tasks) + buffer_min * n + 60  # generous upper bound, minutes

    starts = []
    ends = []
    intervals = []
    for i, t in enumerate(tasks):
        start = model.NewIntVar(0, horizon, f"start_{i}")
        end = model.NewIntVar(0, horizon, f"end_{i}")
        interval = model.NewIntervalVar(start, t.est_duration_min, end, f"interval_{i}")
        starts.append(start)
        ends.append(end)
        intervals.append(interval)

    # Parallel Department Execution: Only enforce no-overlap for tasks WITHIN the same department.
    # Tasks from different departments (e.g. Track vs Signal) can execute simultaneously in the block.
    dept_intervals = {}
    for i, t in enumerate(tasks):
        dept_intervals.setdefault(t.department, []).append(intervals[i])
        
    for intervs in dept_intervals.values():
        if len(intervs) > 1:
            model.AddNoOverlap(intervs)

    # Objective: minimize the overall finish time (pack tightly) while
    # preferring higher-priority tasks to start earlier
    makespan = model.NewIntVar(0, horizon, "makespan")
    model.AddMaxEquality(makespan, ends)

    # Higher priority_score -> larger coefficient -> solver minimizes objective
    # by giving that task the earliest possible start time
    priority_weighted_starts = sum(
        starts[i] * int(tasks[i].priority_score * 100) for i in range(n)
    )
    model.Minimize(makespan * 1000 + priority_weighted_starts)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 5
    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return None

    order = sorted(range(n), key=lambda i: solver.Value(starts[i]))
    block_start = day_start
    block_end = day_start + timedelta(minutes=solver.Value(makespan))
    ordered_task_ids = [tasks[i].id for i in order]

    return block_start, block_end, ordered_task_ids


if __name__ == "__main__":
    from datetime import datetime
    from models import get_engine, init_db, Task, Block, BlockStatus
    from priority_engine import score_all

    engine = get_engine()
    Session = init_db(engine)
    session = Session()

    tasks = session.query(Task).filter(Task.section == "SEC-14").all()
    if not tasks:
        print("No tasks found — run data_generator.py first.")
    else:
        score_all(tasks)
        session.commit()

        day_start = datetime.now().replace(hour=10, minute=0, second=0, microsecond=0)
        result = optimize_into_single_block(tasks, day_start)

        if result is None:
            print("Solver could not find a feasible schedule.")
        else:
            block_start, block_end, ordered_ids = result
            total_separate_min = sum(t.est_duration_min for t in tasks)

            block = Block(section="SEC-14", start_time=block_start, end_time=block_end, status=BlockStatus.OPTIMIZED)
            session.add(block)
            session.flush()
            for tid in ordered_ids:
                task = session.query(Task).get(tid)
                task.block_id = block.id
            session.commit()

            print(f"BEFORE: {len(tasks)} separate requests, {total_separate_min} min total, {len(tasks)} blocks needed")
            print(f"AFTER:  1 merged block, {block_start.strftime('%H:%M')} - {block_end.strftime('%H:%M')}")
            print(f"Block reduction: {len(tasks)} -> 1  ({round((1 - 1/len(tasks)) * 100)}% fewer blocks)")
            print("Task order in block:")
            for tid in ordered_ids:
                t = session.query(Task).get(tid)
                print(f"  - {t.department.value:8s} {t.defect_desc:30s} (priority={t.priority_score})")
    session.close()
