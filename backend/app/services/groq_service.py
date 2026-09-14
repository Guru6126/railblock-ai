"""
Groq AI Reasoning Layer — all Groq API calls live here, never in the frontend.

This service:
  - Calls Groq (llama-3.3-70b-versatile) via httpx
  - Enforces structured JSON output via system prompt instructions
  - Falls back to deterministic baselines on any failure (timeout, invalid JSON, quota)
  - NEVER makes scheduling decisions — it only returns recommendations that must be
    validated by app/core/constraints.py before being acted upon

Environment variable required:
  GROQ_API_KEY — the Groq Cloud API key (set on the server; never exposed to the browser)
"""

import os
import json
import logging
from datetime import datetime
from typing import Optional

# -------------------------------------------------
#  👉  Paste your Groq API key here (hard‑coded)  👈
# -------------------------------------------------
HARDCODED_GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
# -------------------------------------------------

import httpx

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "openai/gpt-oss-120b"
GROQ_TIMEOUT = 20.0  # seconds

# In-memory key store — set via POST /api/settings/groq-key at runtime
_runtime_groq_key: Optional[str] = None


def set_groq_key(key: str) -> None:
    global _runtime_groq_key
    _runtime_groq_key = key.strip().strip("\"'")


def get_groq_key() -> Optional[str]:
    # First try the hard‑coded value, fall back to runtime or env if needed
    return HARDCODED_GROQ_API_KEY or _runtime_groq_key or os.environ.get("GROQ_API_KEY", "").strip()


def is_groq_configured() -> bool:
    return bool(get_groq_key())


# ── Internal HTTP helper ───────────────────────────────────────────────────────

async def _call_groq(system_prompt: str, user_prompt: str, max_tokens: int = 1200) -> dict:
    """
    Make one Groq API call. Returns the parsed JSON dict from the model response.
    Raises ValueError if the key is missing or the response is not valid JSON.
    Raises httpx.HTTPError on network/HTTP errors.
    """
    api_key = get_groq_key()
    if not api_key:
        raise ValueError("Groq API key not configured. POST /api/settings/groq-key to set it.")

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    async with httpx.AsyncClient(timeout=GROQ_TIMEOUT) as client:
        response = await client.post(
            GROQ_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "max_tokens": max_tokens,
                "messages": messages,
                "temperature": 0.2,
            },
        )

    if response.status_code == 401:
        raise ValueError("Invalid Groq API key. Update it via POST /api/settings/groq-key.")

    response.raise_for_status()
    data = response.json()
    content = data["choices"][0]["message"]["content"]

    # Strip markdown code fences if the model wraps the JSON
    content = content.strip()
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    content = content.strip()

    return json.loads(content)


# ── 1. Maintenance Risk Prediction ────────────────────────────────────────────

async def prioritize_tasks(tasks: list) -> list[dict]:
    """
    Evaluate each task and return a numerical risk score (0–100) + risk level.

    Returns list of dicts:
      { task_id, ai_risk_score (0-100), risk_level, priority_rank, reasoning_bullets }
    Falls back to deterministic scores on failure.
    """
    if not tasks:
        return []

    task_lines = "\n".join(
        f"- ID:{t['id']} Dept:{t['department']} Severity:{t['severity']} "
        f"Overdue:{t['overdue_days']}d Duration:{t['est_duration_min']}min "
        f"Desc:\"{t['defect_desc']}\""
        for t in tasks
    )

    system_prompt = """You are RailBlock AI, an Indian Railways Maintenance Risk Specialist.

CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no explanation outside the JSON.

Return exactly this structure:
{
  "prioritized_tasks": [
    {
      "task_id": "<id>",
      "ai_risk_score": <integer 0-100>,
      "risk_level": "<CRITICAL|HIGH|MODERATE|LOW>",
      "priority_rank": <integer starting from 1>,
      "reasoning_bullets": ["<bullet 1>", "<bullet 2>", "<bullet 3>"]
    }
  ]
}

Scoring guidance:
- CRITICAL (80-100): Immediate derailment/safety hazard, highly overdue
- HIGH (60-79): Significant safety risk, operationally urgent
- MODERATE (40-59): Important but manageable within the window  
- LOW (0-39): Routine maintenance, can be deferred if needed

Factor in: severity weight (40%), overdue urgency (30%), department criticality Track>Signal>OHE (30%)."""

    user_prompt = f"""Score and rank these maintenance tasks for Indian Railways section SEC-14:

{task_lines}

Return ONLY the JSON object. No preamble."""

    try:
        result = await _call_groq(system_prompt, user_prompt)
        return result.get("prioritized_tasks", [])
    except Exception as exc:
        logger.warning("Groq prioritize_tasks failed: %s — using deterministic fallback", exc)
        return _fallback_priority_scores(tasks)


def _fallback_priority_scores(tasks: list) -> list[dict]:
    """Deterministic fallback when Groq is unavailable."""
    SEVERITY_SCORE = {"critical": 100, "high": 75, "medium": 50, "low": 25}
    DEPT_RISK = {"track": 0.9, "signal": 0.7, "ohe": 0.6}

    scored = []
    for t in tasks:
        base = SEVERITY_SCORE.get(t["severity"], 50)
        overdue_bonus = min(t["overdue_days"] * 2, 30)
        dept_mult = DEPT_RISK.get(t["department"], 0.6)
        score = int((base * 0.4 + overdue_bonus + base * dept_mult * 0.3))
        scored.append((t["id"], min(score, 100)))

    scored.sort(key=lambda x: -x[1])
    LEVEL_MAP = [(80, "CRITICAL"), (60, "HIGH"), (40, "MODERATE"), (0, "LOW")]

    return [
        {
            "task_id": tid,
            "ai_risk_score": score,
            "risk_level": next(level for threshold, level in LEVEL_MAP if score >= threshold),
            "priority_rank": rank + 1,
            "reasoning_bullets": [
                "Deterministic score (Groq unavailable)",
                f"Score based on severity + overdue days + department criticality",
            ],
        }
        for rank, (tid, score) in enumerate(scored)
    ]


# ── 2. Optimal Block Recommendation ───────────────────────────────────────────

async def recommend_block(
    tasks: list,
    trains: list,
    section: str,
    day_start: datetime,
) -> dict:
    """
    Analyse available temporal windows, train schedules, and task durations to propose
    the best maintenance slot with explicit justification.

    Returns:
      {
        recommended_start: ISO string,
        recommended_end: ISO string,
        confidence: "HIGH|MEDIUM|LOW",
        justification: str,
        reasoning_bullets: [str, ...],
        alternative_windows: [{start, end, note}, ...]
      }
    Falls back to a deterministic window on failure.
    """
    total_duration = sum(t.get("est_duration_min", 30) for t in tasks)
    buffer = 5 * len(tasks)
    needed_minutes = total_duration + buffer

    task_summary = ", ".join(
        f"{t['department']}({t['est_duration_min']}min/{t['severity']})" for t in tasks
    )
    train_summary = "\n".join(
        f"  Train {t.get('number','?')} | priority={t.get('priority','low')} | "
        f"pass={t.get('actual_pass_time','?')} | late={t.get('is_late',False)} | "
        f"slack={t.get('slack_minutes',0)}min"
        for t in trains
    )

    system_prompt = """You are RailBlock AI Block Planning Specialist.

CRITICAL: Respond with ONLY valid JSON. No markdown, no text outside JSON.

Return exactly:
{
  "recommended_start": "<HH:MM on today>",
  "recommended_end": "<HH:MM on today>",
  "confidence": "<HIGH|MEDIUM|LOW>",
  "justification": "<1-2 sentence justification>",
  "reasoning_bullets": ["<bullet>", "<bullet>", "<bullet>"],
  "alternative_windows": [
    {"start": "<HH:MM>", "end": "<HH:MM>", "note": "<why this is alternative>"}
  ]
}

Rules you MUST follow:
1. Never overlap with HIGH-priority train pass times ± 5 minutes
2. Never block a LATE train
3. Prefer minimum total disruption (shortest window that fits all tasks sequentially)
4. Window must start no earlier than 08:00 and end by 16:00
5. Consider traffic density — LOW-traffic windows are preferred"""

    user_prompt = f"""Section: {section}
Total maintenance time needed: {needed_minutes} minutes
Tasks: {task_summary}

Train schedule today:
{train_summary}

Recommend the best block window. Return ONLY JSON."""

    try:
        result = await _call_groq(system_prompt, user_prompt, max_tokens=800)
        # Normalise times to full ISO datetimes
        today = day_start.date()
        for key in ("recommended_start", "recommended_end"):
            val = result.get(key, "")
            if val and "T" not in val:
                try:
                    t = datetime.strptime(val, "%H:%M").replace(
                        year=today.year, month=today.month, day=today.day
                    )
                    result[key] = t.isoformat()
                except Exception:
                    pass
        for alt in result.get("alternative_windows", []):
            for key in ("start", "end"):
                val = alt.get(key, "")
                if val and "T" not in val:
                    try:
                        t = datetime.strptime(val, "%H:%M").replace(
                            year=today.year, month=today.month, day=today.day
                        )
                        alt[key] = t.isoformat()
                    except Exception:
                        pass
        return result
    except Exception as exc:
        logger.warning("Groq recommend_block failed: %s — using deterministic fallback", exc)
        return _fallback_recommend_block(day_start, needed_minutes)


def _fallback_recommend_block(day_start: datetime, needed_minutes: int) -> dict:
    from datetime import timedelta
    start = day_start.replace(hour=10, minute=0, second=0, microsecond=0)
    end = start + timedelta(minutes=needed_minutes)
    return {
        "recommended_start": start.isoformat(),
        "recommended_end": end.isoformat(),
        "confidence": "LOW",
        "justification": "Deterministic fallback: standard 10:00 AM window (Groq unavailable).",
        "reasoning_bullets": [
            "Groq AI unavailable — deterministic fallback applied",
            "Window set to standard 10:00 maintenance slot",
            "Validate manually against live RTIS data",
        ],
        "alternative_windows": [],
    }


# ── 3. Conflict Explanation ────────────────────────────────────────────────────

async def explain_conflict(alert: dict, train: dict | None, block: dict) -> dict:
    """
    Explain a detected conflict in operational railway terms.

    Returns:
      { root_cause: str, operational_impact: str, recommended_action: str,
        severity_assessment: str }
    """
    section = block.get("section", "SEC-14")
    block_window = (
        f"{_fmt_time(block.get('start_time'))} – {_fmt_time(block.get('end_time'))}"
    )
    train_number = (train or {}).get("number", alert.get("train_id", "Unknown"))
    priority = (train or {}).get("priority", "unknown")
    is_late = (train or {}).get("is_late", False)
    slack = (train or {}).get("slack_minutes", 0)

    system_prompt = """You are RailBlock AI, Indian Railways Operations Specialist.

CRITICAL: Respond with ONLY valid JSON. No markdown outside JSON.

Return exactly:
{
  "root_cause": "<1-2 sentences on why this conflict occurred>",
  "operational_impact": "<impact on train punctuality, passenger safety, section throughput>",
  "recommended_action": "<immediate steps for maintenance team and signal controller>",
  "severity_assessment": "<CRITICAL|HIGH|MODERATE>"
}"""

    user_prompt = f"""Conflict detected in section {section}:
- Alert: "{alert.get('message', '')}"
- Action taken: "{alert.get('action_taken', '')}"
- Train: {train_number} | Priority: {priority} | Late: {is_late} | Slack: {slack}min
- Active block window: {block_window}

Explain this conflict for the Section Controller. Return ONLY JSON."""

    try:
        return await _call_groq(system_prompt, user_prompt, max_tokens=600)
    except Exception as exc:
        logger.warning("Groq explain_conflict failed: %s", exc)
        return {
            "root_cause": alert.get("message", "Conflict detected."),
            "operational_impact": "Train movement through the maintenance section is affected.",
            "recommended_action": alert.get("action_taken", "Follow standard operating procedure."),
            "severity_assessment": "HIGH",
        }


# ── 4. Schedule Risk Analysis ─────────────────────────────────────────────────

async def analyze_schedule_risk(tasks: list, block: dict | None) -> dict:
    """
    Analyze overall risk of the current maintenance backlog.

    Returns:
      { risk_score: int (0-100), risk_level: str, top_risk: str,
        reasoning: str, sequence_recommendation: str }
    """
    task_lines = "\n".join(
        f"- {t['department'].upper()} | {t['defect_desc']} | Severity:{t['severity']} | "
        f"Overdue:{t['overdue_days']}d | Score:{round(t.get('priority_score',0), 2)}"
        for t in tasks
    )
    block_window = "No active block" if not block else (
        f"{_fmt_time(block.get('start_time'))} – {_fmt_time(block.get('end_time'))}"
    )

    system_prompt = """You are RailBlock AI Chief Safety Risk Auditor for Indian Railways.

CRITICAL: Respond with ONLY valid JSON. No markdown outside JSON.

Return exactly:
{
  "risk_score": <integer 0-100>,
  "risk_level": "<CRITICAL|HIGH|MODERATE|LOW>",
  "top_risk": "<single most critical vulnerability in 1 sentence>",
  "reasoning": "<2-3 sentences of risk reasoning>",
  "sequence_recommendation": "<is current execution sequence optimal? What to change?>"
}"""

    user_prompt = f"""Maintenance backlog for section SEC-14:
{task_lines}

Active/Planned Block Window: {block_window}

Provide the AI Risk Report. Return ONLY JSON."""

    try:
        return await _call_groq(system_prompt, user_prompt, max_tokens=700)
    except Exception as exc:
        logger.warning("Groq analyze_schedule_risk failed: %s", exc)
        max_score = max((t.get("priority_score", 0) for t in tasks), default=0)
        return {
            "risk_score": int(max_score * 100),
            "risk_level": "HIGH" if max_score > 0.6 else "MODERATE",
            "top_risk": "Deterministic fallback: highest priority task needs immediate attention.",
            "reasoning": "Groq AI unavailable. Scores derived from weighted formula (severity + overdue + dept risk).",
            "sequence_recommendation": "Proceed with CP-SAT optimized sequence.",
        }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fmt_time(iso_str: str | None) -> str:
    if not iso_str:
        return "N/A"
    try:
        return datetime.fromisoformat(iso_str).strftime("%H:%M")
    except Exception:
        return str(iso_str)
