"""
FastAPI backend — RailBlock AI hybrid deterministic + AI pipeline.

Existing endpoints (unchanged):
  GET  /              -> health check
  GET  /api/tasks     -> tasks (scored)
  GET  /api/trains    -> trains
  POST /api/optimize  -> CP-SAT optimizer, creates a Block
  GET  /api/blocks    -> current blocks
  POST /api/check-conflicts -> conflict monitor
  GET  /api/alerts    -> alerts
  POST /api/reset     -> reseed demo scenario

New endpoints (hybrid AI-deterministic pipeline):
  POST /api/ai/prioritize        -> Groq risk scoring → merge with deterministic scores
  POST /api/ai/recommend-block   -> Groq window recommendation → constraint validation
  POST /api/ai/risk              -> Groq schedule risk analysis
  POST /api/ai/explain-conflict  -> Groq structured conflict explanation
  POST /api/simulate             -> What-if disruption simulation
  POST /api/settings/groq-key    -> Set Groq API key at runtime
  GET  /api/settings/groq-key/status -> Check if key is configured

Pipeline order for all schedule requests:
  Raw Data → Groq AI Recommendation → Python Constraint Validation → Approved or Fallback
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app", "core"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app", "services"))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional

from models import get_engine, init_db, Task, Train, Block, Alert, BlockStatus
from data_generator import seed_demo_scenario
from priority_engine import score_all
from optimizer import optimize_into_single_block
from conflict_monitor import run_monitor_once

# New modules
from app.core.constraints import validate_block_window, check_headway_separation
from app.services import groq_service

app = FastAPI(title="RailBlock AI — Railway Block Planning API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = get_engine()
Session = init_db(engine)


def get_session():
    return Session()


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _task_to_dict(t: Task) -> dict:
    return {
        "id": t.id,
        "department": t.department.value,
        "section": t.section,
        "defect_desc": t.defect_desc,
        "severity": t.severity.value,
        "overdue_days": t.overdue_days,
        "est_duration_min": t.est_duration_min,
        "priority_score": t.priority_score,
        "block_id": t.block_id,
    }


def _train_to_dict(tr: Train) -> dict:
    return {
        "id": tr.id,
        "number": tr.number,
        "section": tr.section,
        "priority": tr.priority.value,
        "scheduled_pass_time": tr.scheduled_pass_time.isoformat(),
        "actual_pass_time": tr.actual_pass_time.isoformat() if tr.actual_pass_time else None,
        "slack_minutes": tr.slack_minutes,
        "is_late": tr.is_late,
    }


# ─── Existing Endpoints (preserved exactly) ───────────────────────────────────

@app.post("/api/reset")
def reset():
    session = get_session()
    tasks, trains = seed_demo_scenario(session)
    session.close()
    return {"status": "reseeded", "tasks": len(tasks), "trains": len(trains)}


@app.get("/api/tasks")
def get_tasks():
    session = get_session()
    tasks = session.query(Task).all()
    if not tasks:
        session.close()
        return []
    score_all(tasks)
    session.commit()
    result = [_task_to_dict(t) for t in tasks]
    session.close()
    return result


class TaskCreate(BaseModel):
    department: str
    section: str
    defect_desc: str
    severity: str
    overdue_days: int = 0
    est_duration_min: int

@app.post("/api/tasks")
def create_task(body: TaskCreate):
    from models import Department, Severity
    session = get_session()
    try:
        new_task = Task(
            department=Department(body.department.lower()),
            section=body.section,
            defect_desc=body.defect_desc,
            severity=Severity(body.severity.lower()),
            overdue_days=body.overdue_days,
            est_duration_min=body.est_duration_min
        )
        session.add(new_task)
        session.commit()
        session.refresh(new_task)
        res = _task_to_dict(new_task)
        session.close()
        return res
    except Exception as e:
        session.close()
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: str):
    session = get_session()
    task = session.query(Task).filter(Task.id == task_id).first()
    if not task:
        session.close()
        raise HTTPException(404, "Task not found")
    
    session.delete(task)
    session.commit()
    session.close()
    return {"status": "success"}

@app.get("/api/trains")
def get_trains():
    session = get_session()
    trains = session.query(Train).all()
    result = [_train_to_dict(tr) for tr in trains]
    session.close()
    return result


@app.post("/api/optimize")
def run_optimize(section: str = "SEC-14"):
    session = get_session()
    tasks = session.query(Task).filter(Task.section == section).all()
    if not tasks:
        session.close()
        raise HTTPException(404, f"No tasks found for section {section}")

    score_all(tasks)
    session.commit()

    # Task Deferral: Only pack urgent tasks into the immediate block.
    # We defer low-priority tasks to future blocks (unassigned).
    urgent_tasks = [t for t in tasks if t.priority_score >= 0.4]
    if not urgent_tasks:
        urgent_tasks = tasks  # fallback if all tasks are low priority

    day_start = datetime.now().replace(hour=10, minute=0, second=0, microsecond=0)
    result = optimize_into_single_block(urgent_tasks, day_start)
    if result is None:
        session.close()
        raise HTTPException(500, "Solver could not find a feasible schedule")

    block_start, block_end, ordered_ids = result

    # Clear previous block for this section
    old_blocks = session.query(Block).filter(Block.section == section).all()
    for ob in old_blocks:
        session.query(Task).filter(Task.block_id == ob.id).update({"block_id": None})
        session.delete(ob)
    session.commit()

    block = Block(section=section, start_time=block_start, end_time=block_end, status=BlockStatus.OPTIMIZED)
    session.add(block)
    session.flush()
    for tid in ordered_ids:
        session.query(Task).filter(Task.id == tid).update({"block_id": block.id})
    session.commit()

    response = {
        "block_id": block.id,
        "section": section,
        "start_time": block_start.isoformat(),
        "end_time": block_end.isoformat(),
        "task_count_before": len(tasks),
        "block_count_after": 1,
        "reduction_pct": round((1 - 1 / len(tasks)) * 100),
        "ordered_task_ids": ordered_ids,
    }
    session.close()
    return response


@app.get("/api/blocks")
def get_blocks():
    session = get_session()
    blocks = session.query(Block).all()
    result = [
        {
            "id": b.id, "section": b.section, "status": b.status.value,
            "start_time": b.start_time.isoformat(), "end_time": b.end_time.isoformat(),
            "task_ids": [t.id for t in b.tasks],
        }
        for b in blocks
    ]
    session.close()
    return result


@app.post("/api/check-conflicts")
def check_conflicts(section: str = "SEC-14"):
    session = get_session()
    block = session.query(Block).filter(Block.section == section).first()
    if not block:
        session.close()
        raise HTTPException(404, "No active block — run /api/optimize first")

    trains = session.query(Train).filter(Train.section == section).all()
    
    # Clear old alerts for this block
    session.query(Alert).filter(Alert.block_id == block.id).delete()
    session.commit()
    
    alerts = run_monitor_once(session, block, trains)
    result = [
        {"id": a.id, "train_id": a.train_id, "action": a.action_taken, "message": a.message}
        for a in alerts
    ]
    session.close()
    return result


@app.get("/api/alerts")
def get_alerts():
    session = get_session()
    alerts = session.query(Alert).order_by(Alert.created_at.desc()).all()
    result = [
        {
            "id": a.id, "block_id": a.block_id, "train_id": a.train_id,
            "message": a.message, "action_taken": a.action_taken,
            "created_at": a.created_at.isoformat(),
        }
        for a in alerts
    ]
    session.close()
    return result


@app.get("/")
def root():
    return {"status": "ok", "message": "RailBlock AI — Railway Block Planning prototype API"}


@app.post("/api/blocks/{block_id}/approve")
def approve_block(block_id: str):
    session = get_session()
    block = session.query(Block).filter(Block.id == block_id).first()
    if not block:
        session.close()
        raise HTTPException(404, "Block not found")
    
    block.status = BlockStatus.ACTIVE
    session.commit()
    session.close()
    return {"status": "success"}


# ── Artificial Intelligence Endpoints (via Groq) ───────────────────────────────────────────────────────

class GroqKeyRequest(BaseModel):
    api_key: str


@app.post("/api/settings/groq-key")
def set_groq_key(body: GroqKeyRequest):
    """Store the Groq API key server-side. Never returned to the client."""
    if not body.api_key or len(body.api_key.strip()) < 10:
        raise HTTPException(400, "Invalid API key format.")
    groq_service.set_groq_key(body.api_key)
    return {"status": "ok", "configured": True}


@app.get("/api/settings/groq-key/status")
def get_groq_key_status():
    return {"configured": groq_service.is_groq_configured()}


# ─── AI Endpoints — all pass through Groq → Constraint Validation ─────────────

@app.post("/api/ai/prioritize")
async def ai_prioritize(section: str = "SEC-14"):
    """
    Pipeline: Groq risk scoring → merge with deterministic scores → return unified result.
    """
    session = get_session()
    tasks = session.query(Task).filter(Task.section == section).all()
    if not tasks:
        session.close()
        return []

    score_all(tasks)
    session.commit()
    task_dicts = [_task_to_dict(t) for t in tasks]
    session.close()

    ai_scores = await groq_service.prioritize_tasks(task_dicts)

    # Merge AI scores into task dicts
    ai_map = {item["task_id"]: item for item in ai_scores}
    merged = []
    for t in task_dicts:
        ai = ai_map.get(t["id"], {})
        merged.append({
            **t,
            "ai_risk_score": ai.get("ai_risk_score", int(t.get("priority_score", 0) * 100)),
            "risk_level": ai.get("risk_level", "MODERATE"),
            "priority_rank": ai.get("priority_rank", 999),
            "reasoning_bullets": ai.get("reasoning_bullets", []),
        })

    merged.sort(key=lambda x: x["priority_rank"])
    return merged


@app.post("/api/ai/recommend-block")
async def ai_recommend_block(section: str = "SEC-14"):
    """
    Pipeline: Groq block recommendation → Python constraint validation → approved or fallback.
    """
    session = get_session()
    tasks = session.query(Task).filter(Task.section == section).all()
    trains = session.query(Train).filter(Train.section == section).all()

    if not tasks:
        session.close()
        raise HTTPException(404, f"No tasks found for section {section}")

    score_all(tasks)
    session.commit()

    task_dicts = [_task_to_dict(t) for t in tasks]
    train_dicts = [_train_to_dict(tr) for tr in trains]
    existing_blocks = session.query(Block).all()
    session.close()

    day_start = datetime.now().replace(hour=10, minute=0, second=0, microsecond=0)

    # Step 1: Groq AI recommendation
    recommendation = await groq_service.recommend_block(task_dicts, train_dicts, section, day_start)

    # Step 2: Constraint validation on the recommended window
    rec_start_str = recommendation.get("recommended_start", "")
    rec_end_str = recommendation.get("recommended_end", "")

    validation_result = None
    if rec_start_str and rec_end_str:
        try:
            rec_start = datetime.fromisoformat(rec_start_str)
            rec_end = datetime.fromisoformat(rec_end_str)
            validation_result = validate_block_window(rec_start, rec_end, train_dicts, [])
        except Exception:
            validation_result = None

    return {
        "recommendation": recommendation,
        "validation": validation_result.to_dict() if validation_result else None,
        "pipeline_status": "AI_RECOMMENDED_CONSTRAINT_VALIDATED",
    }


@app.post("/api/ai/risk")
async def ai_risk(section: str = "SEC-14"):
    """
    Groq schedule risk analysis for the current backlog and active block.
    """
    session = get_session()
    tasks = session.query(Task).filter(Task.section == section).all()
    block = session.query(Block).filter(Block.section == section).first()

    if not tasks:
        session.close()
        return {"risk_score": 0, "risk_level": "LOW", "top_risk": "No tasks found.", "reasoning": "", "sequence_recommendation": ""}

    score_all(tasks)
    session.commit()
    task_dicts = [_task_to_dict(t) for t in tasks]
    block_dict = None
    if block:
        block_dict = {
            "section": block.section,
            "start_time": block.start_time.isoformat(),
            "end_time": block.end_time.isoformat(),
        }
    session.close()

    return await groq_service.analyze_schedule_risk(task_dicts, block_dict)


class ExplainConflictRequest(BaseModel):
    alert_id: Optional[str] = None
    train_id: Optional[str] = None
    # Fallback: accept the alert/train data directly if IDs not available
    alert_message: Optional[str] = None
    alert_action: Optional[str] = None


@app.post("/api/ai/explain-conflict")
async def ai_explain_conflict(body: ExplainConflictRequest):
    """
    Groq structured conflict explanation — called by the frontend instead of direct Groq calls.
    """
    session = get_session()
    block = session.query(Block).first()

    alert_dict = {}
    train_dict = None

    if body.alert_id:
        alert_obj = session.query(Alert).filter(Alert.id == body.alert_id).first()
        if alert_obj:
            alert_dict = {
                "id": alert_obj.id,
                "message": alert_obj.message,
                "action_taken": alert_obj.action_taken,
                "train_id": alert_obj.train_id,
            }
    else:
        alert_dict = {
            "message": body.alert_message or "",
            "action_taken": body.alert_action or "",
        }

    if body.train_id:
        train_obj = session.query(Train).filter(
            (Train.id == body.train_id) | (Train.number == body.train_id)
        ).first()
        if train_obj:
            train_dict = _train_to_dict(train_obj)

    block_dict = {}
    if block:
        block_dict = {
            "section": block.section,
            "start_time": block.start_time.isoformat(),
            "end_time": block.end_time.isoformat(),
        }
    session.close()

    return await groq_service.explain_conflict(alert_dict, train_dict, block_dict)


# ─── What-If Simulation Endpoint ─────────────────────────────────────────────

class SimulationRequest(BaseModel):
    disruption_type: str           # "train_delay" | "emergency_track_fault" | "signal_failure" | "ohe_outage"
    section: str = "SEC-14"
    train_id: Optional[str] = None
    delay_minutes: Optional[int] = None
    fault_location: Optional[str] = None
    emergency_duration_min: Optional[int] = None


@app.post("/api/simulate")
async def simulate_disruption(body: SimulationRequest):
    """
    What-if disruption simulation:
    1. Apply the disruption to in-memory copies of trains/block
    2. Re-run constraint validation on the current block with disrupted state
    3. If conflicts: call Groq for a new block recommendation
    4. Return: original schedule, disruption applied, conflict list, AI alternative window
    """
    session = get_session()
    tasks = session.query(Task).filter(Task.section == body.section).all()
    trains = session.query(Train).filter(Train.section == body.section).all()
    block = session.query(Block).filter(Block.section == body.section).first()

    if not tasks:
        session.close()
        raise HTTPException(404, f"No tasks found for section {body.section}")

    score_all(tasks)
    session.commit()
    task_dicts = [_task_to_dict(t) for t in tasks]
    original_train_dicts = [_train_to_dict(tr) for tr in trains]
    session.close()

    # Step 1: Apply disruption to a working copy of trains
    disrupted_trains = [dict(t) for t in original_train_dicts]

    disruption_summary = ""

    if body.disruption_type == "train_delay" and body.train_id and body.delay_minutes:
        for tr in disrupted_trains:
            if tr["number"] == body.train_id or tr["id"] == body.train_id:
                # Shift actual_pass_time by delay_minutes
                actual = datetime.fromisoformat(tr["actual_pass_time"])
                scheduled = datetime.fromisoformat(tr["scheduled_pass_time"])
                new_actual = actual + timedelta(minutes=body.delay_minutes)
                tr["actual_pass_time"] = new_actual.isoformat()
                # Mark as late if now past scheduled + original slack
                tr["is_late"] = new_actual > scheduled + timedelta(minutes=tr.get("slack_minutes", 0))
                disruption_summary = (
                    f"Train {tr['number']} delayed by {body.delay_minutes} min "
                    f"(new pass: {new_actual.strftime('%H:%M')})"
                )
                break

    elif body.disruption_type == "emergency_track_fault":
        duration = body.emergency_duration_min or 60
        disruption_summary = f"Emergency track fault at {body.fault_location or body.section} — {duration} min clearance required."
        # For prototype: treat as additional 60-min block duration requirement
        for t in task_dicts:
            if t["department"] == "track":
                t["est_duration_min"] += duration

    elif body.disruption_type == "signal_failure":
        duration = body.emergency_duration_min or 45
        disruption_summary = f"Signal failure at {body.fault_location or body.section} — {duration} min recovery."
        for t in task_dicts:
            if t["department"] == "signal":
                t["est_duration_min"] += duration

    elif body.disruption_type == "ohe_outage":
        duration = body.emergency_duration_min or 30
        disruption_summary = f"OHE (traction) outage at {body.fault_location or body.section} — {duration} min recovery."
        for t in task_dicts:
            if t["department"] == "ohe":
                t["est_duration_min"] += duration

    # Step 2: Re-run constraint validation on existing block with disrupted trains
    original_validation = None
    disrupted_validation = None
    if block:
        block_start = block.start_time
        block_end = block.end_time
        original_validation = validate_block_window(block_start, block_end, original_train_dicts).to_dict()
        disrupted_validation = validate_block_window(block_start, block_end, disrupted_trains).to_dict()

    # Step 3: If disrupted state has new conflicts, get Groq recommendation for new window
    day_start = datetime.now().replace(hour=10, minute=0, second=0, microsecond=0)
    ai_recommendation = None

    has_new_conflicts = (
        disrupted_validation is not None
        and not disrupted_validation.get("approved", True)
    )

    if has_new_conflicts or block is None:
        ai_recommendation = await groq_service.recommend_block(
            task_dicts, disrupted_trains, body.section, day_start
        )
        # Validate the AI recommendation too
        if ai_recommendation:
            rec_start_str = ai_recommendation.get("recommended_start", "")
            rec_end_str = ai_recommendation.get("recommended_end", "")
            if rec_start_str and rec_end_str:
                try:
                    rec_start = datetime.fromisoformat(rec_start_str)
                    rec_end = datetime.fromisoformat(rec_end_str)
                    rec_validation = validate_block_window(rec_start, rec_end, disrupted_trains)
                    ai_recommendation["constraint_validation"] = rec_validation.to_dict()
                except Exception:
                    pass

    # Step 4: Headway check on disrupted train set
    headway_conflicts = check_headway_separation(disrupted_trains)

    return {
        "disruption_type": body.disruption_type,
        "disruption_summary": disruption_summary,
        "original_schedule": {
            "train_positions": original_train_dicts,
            "block": {
                "start": block.start_time.isoformat() if block else None,
                "end": block.end_time.isoformat() if block else None,
            },
            "constraint_validation": original_validation,
        },
        "disrupted_schedule": {
            "train_positions": disrupted_trains,
            "constraint_validation": disrupted_validation,
            "headway_conflicts": [
                {
                    "train_a": hc.train_a,
                    "train_b": hc.train_b,
                    "actual_gap_minutes": hc.actual_gap_minutes,
                    "required_gap_minutes": hc.required_gap_minutes,
                    "description": hc.description,
                }
                for hc in headway_conflicts
            ],
        },
        "ai_recommended_window": ai_recommendation,
        "pipeline_status": "DISRUPTION_SIMULATED_CONSTRAINTS_VALIDATED_AI_RESCHEDULED",
    }
