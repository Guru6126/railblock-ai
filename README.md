# AI-Based Railway Maintenance Block Planning \u2014 Internal Hackathon Prototype

Prototype for SIH PS-26027: an AI layer that sits on top of BDMS-style block
requests, combining overlapping Track/Signal/OHE maintenance requests into
optimized blocks and reacting live to train movement.

## Stack
- **Backend:** FastAPI + SQLAlchemy (SQLite)
- **Optimizer:** Google OR-Tools (CP-SAT) \u2014 exact constraint solving, not ML
- **Priority scoring:** transparent weighted formula
- **Frontend:** Streamlit
- **Data:** fully synthetic (mocks TMS/SMMS/TDMS defect logs + COA/RTIS train feed)

## Setup

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\\Scripts\\activate
pip install -r requirements.txt
```

## Running the demo

**Terminal 1 \u2014 backend:**
```bash
cd backend
uvicorn main:app --reload
```
Runs at http://127.0.0.1:8000. Interactive API docs at http://127.0.0.1:8000/docs

**Terminal 2 \u2014 dashboard:**
```bash
cd frontend
streamlit run app.py
```
Opens at http://localhost:8501

## Demo script (matches the locked scenario)

1. Click **Reset demo scenario** \u2014 seeds 3 tasks (Track/Signal/OHE) and 4 trains in SEC-14.
2. Click **Run optimizer** \u2014 watch the 3 separate requests (115 min total) collapse into
   **1 merged block** (10:00\u201311:55), ordered by priority score. This is the headline
   "3 requests \u2192 1 block, 67% fewer blocks" number.
3. Click **Check live conflicts** \u2014 the 4 seeded trains each demonstrate one of the
   finalized priority/slack rules:
   - Train 11111 (low priority, enough slack) \u2192 held until section clears
   - Train 22222 (low priority, insufficient slack) \u2192 short hold + revised window proposed
   - Train 54321 (high priority) \u2192 block pauses immediately, no exceptions
   - Train 99999 (running late) \u2192 passes immediately regardless of priority
4. Point to the **Live Alert Feed** \u2014 this is the "system reacts, not just alerts" moment.

## Files

```
backend/
  models.py             # Task / Block / Train / Alert schema
  data_generator.py      # synthetic TMS/SMMS/TDMS/COA/RTIS mock data
  priority_engine.py     # weighted priority scoring
  optimizer.py            # OR-Tools CP-SAT block combination
  conflict_monitor.py     # live train-priority/slack conflict rules
  main.py                  # FastAPI endpoints
frontend/
  app.py                   # Streamlit dashboard
```

## What's simulated vs. what would be real

All data (task defects, train positions) is synthetic for this prototype stage,
but built with the same interface shape a real integration with BDMS/TMS/SMMS/
TDMS/COA/RTIS would use \u2014 so extending this later is a data-source swap, not
a redesign. The "live" RTIS feed here is fixed seed data rather than a rolling
WebSocket stream (that upgrade is planned for the real SIH round, not this
internal prototype).
