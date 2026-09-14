"""
Deterministic Constraint Engine — Hard Safety Gatekeeper.

This module is the SOLE authority on whether a maintenance block is safe to run.
It NEVER calls any AI or external service. All decisions are rule-based Python logic.

Rules enforced:
  1. Train-Block Overlap Detection   — is any train scheduled through the section during the block?
  2. Minimum Headway Separation      — ≥5 min buffer before and after each train for high-priority,
                                       ≥2 min for standard trains.
  3. High-Priority Interlocking Rule — block cannot start within HIGHPRI_HEADWAY_MIN of a HIGH
                                       priority train's pass time, regardless of slack.
  4. Late-Train Immovable Rule       — a LATE train cannot be held. If it falls in the window,
                                       the block is flagged as conflicting immediately.
  5. Asset Availability Guardrail    — (stub for prototype) checks whether the section is already
                                       locked by another active block in the same window.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional

# ── Constants ──────────────────────────────────────────────────────────────────
HIGHPRI_HEADWAY_MIN: int = 5        # minutes — minimum buffer either side of a HIGH priority train
STDPRI_HEADWAY_MIN: int = 2         # minutes — minimum buffer for LOW priority trains
LATE_TRAIN_HEADWAY_MIN: int = 0     # late trains always pass; no buffer obligation on block side


# ── Return Types ───────────────────────────────────────────────────────────────
@dataclass
class Violation:
    """A single constraint violation."""
    code: str                   # e.g. "HIGHPRI_OVERLAP", "HEADWAY_VIOLATION"
    description: str
    severity: str               # "CRITICAL" | "WARNING"
    train_number: Optional[str] = None
    suggested_action: Optional[str] = None


@dataclass
class ValidationResult:
    """The full result of a constraint validation pass."""
    approved: bool
    violations: list[Violation] = field(default_factory=list)
    # If not approved, the engine proposes a fallback window
    fallback_start: Optional[datetime] = None
    fallback_end: Optional[datetime] = None
    fallback_reason: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "approved": self.approved,
            "violations": [
                {
                    "code": v.code,
                    "description": v.description,
                    "severity": v.severity,
                    "train_number": v.train_number,
                    "suggested_action": v.suggested_action,
                }
                for v in self.violations
            ],
            "fallback_start": self.fallback_start.isoformat() if self.fallback_start else None,
            "fallback_end": self.fallback_end.isoformat() if self.fallback_end else None,
            "fallback_reason": self.fallback_reason,
        }


@dataclass
class HeadwayConflict:
    """Describes a headway separation violation between consecutive trains."""
    train_a: str
    train_b: str
    actual_gap_minutes: float
    required_gap_minutes: int
    description: str


# ── Core Validation Functions ──────────────────────────────────────────────────

def validate_block_window(
    block_start: datetime,
    block_end: datetime,
    trains: list,
    existing_blocks: list | None = None,
) -> ValidationResult:
    """
    Master validation entry point.

    Args:
        block_start: Proposed block start datetime.
        block_end:   Proposed block end datetime.
        trains:      List of Train ORM objects (or dicts with same fields).
        existing_blocks: Other active blocks — used for asset availability check.

    Returns:
        ValidationResult — approved=True means the block is safe to proceed.
    """
    violations: list[Violation] = []
    block_duration = block_end - block_start

    for train in trains:
        # Support both ORM objects and plain dicts
        number = getattr(train, "number", None) or train.get("number", "Unknown")
        priority = getattr(train, "priority", None) or train.get("priority", "low")
        is_late = getattr(train, "is_late", False) or train.get("is_late", False)
        slack = getattr(train, "slack_minutes", 0) or train.get("slack_minutes", 0)
        actual_pass = getattr(train, "actual_pass_time", None) or train.get("actual_pass_time")

        if actual_pass is None:
            continue

        # Normalise: if actual_pass is a string, parse it
        if isinstance(actual_pass, str):
            actual_pass = datetime.fromisoformat(actual_pass)

        # Determine headway requirement
        if str(priority).lower() == "high":
            headway = HIGHPRI_HEADWAY_MIN
        elif is_late:
            headway = LATE_TRAIN_HEADWAY_MIN
        else:
            headway = STDPRI_HEADWAY_MIN

        buffered_start = block_start - timedelta(minutes=headway)
        buffered_end = block_end + timedelta(minutes=headway)

        in_window = buffered_start <= actual_pass <= buffered_end

        if not in_window:
            continue  # No conflict for this train

        # ── Rule 1: High-Priority Interlocking ─────────────────────────────
        if str(priority).lower() == "high":
            violations.append(Violation(
                code="HIGHPRI_OVERLAP",
                description=(
                    f"Train {number} (HIGH priority) passes at "
                    f"{actual_pass.strftime('%H:%M')} — within {headway}-min interlocking "
                    f"zone of proposed block window {block_start.strftime('%H:%M')}–"
                    f"{block_end.strftime('%H:%M')}. Block MUST pause."
                ),
                severity="CRITICAL",
                train_number=number,
                suggested_action=(
                    f"Pause block when train {number} is {headway} min out. "
                    "Resume after it clears the section."
                ),
            ))

        # ── Rule 2: Late Train (Cannot be held) ────────────────────────────
        elif is_late:
            violations.append(Violation(
                code="LATE_TRAIN_IMMOVABLE",
                description=(
                    f"Train {number} is LATE and cannot be held. "
                    f"Actual pass time {actual_pass.strftime('%H:%M')} falls inside "
                    f"block window. Block must yield."
                ),
                severity="CRITICAL",
                train_number=number,
                suggested_action=(
                    f"Pause block to allow late train {number} through. "
                    "Resume maintenance after it clears."
                ),
            ))

        # ── Rule 3: Insufficient Slack (Cannot absorb full hold) ───────────
        elif slack is not None:
            hold_needed = int((block_end - actual_pass).total_seconds() // 60)
            if hold_needed > slack:
                violations.append(Violation(
                    code="INSUFFICIENT_SLACK",
                    description=(
                        f"Train {number} (low priority) needs {hold_needed} min hold "
                        f"but only has {slack} min slack. Cannot hold for full block duration."
                    ),
                    severity="WARNING",
                    train_number=number,
                    suggested_action=(
                        f"Hold train {number} for up to {slack} min only, "
                        "then revise block window or allow partial pass."
                    ),
                ))

    # ── Rule 4: Asset Availability (stub) ──────────────────────────────────
    if existing_blocks:
        for other in existing_blocks:
            other_start = getattr(other, "start_time", None) or other.get("start_time")
            other_end = getattr(other, "end_time", None) or other.get("end_time")
            other_section = getattr(other, "section", None) or other.get("section")

            if isinstance(other_start, str):
                other_start = datetime.fromisoformat(other_start)
            if isinstance(other_end, str):
                other_end = datetime.fromisoformat(other_end)

            if other_start and other_end:
                overlap = block_start < other_end and block_end > other_start
                if overlap:
                    violations.append(Violation(
                        code="ASSET_CONFLICT",
                        description=(
                            f"Proposed block overlaps with an existing active block "
                            f"({other_section}) in the same window "
                            f"{other_start.strftime('%H:%M')}–{other_end.strftime('%H:%M')}."
                        ),
                        severity="CRITICAL",
                        suggested_action="Choose a non-overlapping time slot.",
                    ))

    # ── Determine approval & fallback ──────────────────────────────────────
    critical_violations = [v for v in violations if v.severity == "CRITICAL"]
    approved = len(critical_violations) == 0

    fallback_start = None
    fallback_end = None
    fallback_reason = None

    if not approved:
        # Propose a fallback: push the block AFTER the latest conflicting train + buffer
        latest_conflict_time = block_end
        for train in trains:
            actual_pass = getattr(train, "actual_pass_time", None) or train.get("actual_pass_time")
            if actual_pass is None:
                continue
            if isinstance(actual_pass, str):
                actual_pass = datetime.fromisoformat(actual_pass)
            priority = getattr(train, "priority", "low") or train.get("priority", "low")
            headway = HIGHPRI_HEADWAY_MIN if str(priority).lower() == "high" else STDPRI_HEADWAY_MIN
            potential_latest = actual_pass + timedelta(minutes=headway)
            if potential_latest > latest_conflict_time:
                latest_conflict_time = potential_latest

        fallback_start = latest_conflict_time
        fallback_end = fallback_start + block_duration
        fallback_reason = (
            f"Original window {block_start.strftime('%H:%M')}–{block_end.strftime('%H:%M')} "
            f"has {len(critical_violations)} critical constraint violation(s). "
            f"Proposed fallback: {fallback_start.strftime('%H:%M')}–{fallback_end.strftime('%H:%M')}."
        )

    return ValidationResult(
        approved=approved,
        violations=violations,
        fallback_start=fallback_start,
        fallback_end=fallback_end,
        fallback_reason=fallback_reason,
    )


def check_headway_separation(trains: list) -> list[HeadwayConflict]:
    """
    Check minimum headway between consecutive trains in the section.
    Trains are sorted by actual_pass_time.

    Returns a list of HeadwayConflict objects for any pairs with insufficient gaps.
    """
    sorted_trains = []
    for t in trains:
        actual_pass = getattr(t, "actual_pass_time", None) or t.get("actual_pass_time")
        if actual_pass is None:
            continue
        if isinstance(actual_pass, str):
            actual_pass = datetime.fromisoformat(actual_pass)
        number = getattr(t, "number", None) or t.get("number", "Unknown")
        priority = getattr(t, "priority", "low") or t.get("priority", "low")
        sorted_trains.append((actual_pass, number, priority))

    sorted_trains.sort(key=lambda x: x[0])
    conflicts = []

    for i in range(len(sorted_trains) - 1):
        time_a, num_a, pri_a = sorted_trains[i]
        time_b, num_b, pri_b = sorted_trains[i + 1]

        gap_minutes = (time_b - time_a).total_seconds() / 60
        required = HIGHPRI_HEADWAY_MIN if (
            str(pri_a).lower() == "high" or str(pri_b).lower() == "high"
        ) else STDPRI_HEADWAY_MIN

        if gap_minutes < required:
            conflicts.append(HeadwayConflict(
                train_a=num_a,
                train_b=num_b,
                actual_gap_minutes=round(gap_minutes, 1),
                required_gap_minutes=required,
                description=(
                    f"Trains {num_a} and {num_b} are only {gap_minutes:.1f} min apart — "
                    f"below the {required}-min minimum headway."
                ),
            ))

    return conflicts
