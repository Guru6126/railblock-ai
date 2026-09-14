"""
Data model for the AI-Based Railway Maintenance Block Planning prototype.

These schemas mirror what would eventually come from real BDMS/TMS/SMMS/TDMS/COA/RTIS
systems, but for this prototype are populated by the synthetic data generator
(data_generator.py). Keeping the same shape means swapping in real data sources
later is a data-source change, not a redesign.
"""
from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
import enum
import uuid

Base = declarative_base()


def new_id():
    return str(uuid.uuid4())[:8]


class Department(str, enum.Enum):
    TRACK = "track"
    SIGNAL = "signal"
    OHE = "ohe"


class Severity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class BlockStatus(str, enum.Enum):
    REQUESTED = "requested"
    OPTIMIZED = "optimized"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


class TrainPriority(str, enum.Enum):
    HIGH = "high"
    LOW = "low"


class Task(Base):
    """A single maintenance request from a department (Track / Signal / OHE)."""
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, default=new_id)
    department = Column(Enum(Department), nullable=False)
    section = Column(String, nullable=False)          # e.g. "SEC-14"
    defect_desc = Column(String, nullable=False)
    severity = Column(Enum(Severity), nullable=False)
    overdue_days = Column(Integer, default=0)
    est_duration_min = Column(Integer, nullable=False)
    priority_score = Column(Float, default=0.0)        # filled in by priority_engine.py
    block_id = Column(String, ForeignKey("blocks.id"), nullable=True)

    block = relationship("Block", back_populates="tasks")


class Block(Base):
    """An optimized (possibly merged) maintenance block covering one or more tasks."""
    __tablename__ = "blocks"

    id = Column(String, primary_key=True, default=new_id)
    section = Column(String, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(Enum(BlockStatus), default=BlockStatus.REQUESTED)

    tasks = relationship("Task", back_populates="block")


class Train(Base):
    """A train relevant to a section, with scheduled vs. simulated-live position."""
    __tablename__ = "trains"

    id = Column(String, primary_key=True, default=new_id)
    number = Column(String, nullable=False)            # e.g. "12345"
    section = Column(String, nullable=False)
    priority = Column(Enum(TrainPriority), nullable=False)
    scheduled_pass_time = Column(DateTime, nullable=False)   # from COA
    actual_pass_time = Column(DateTime, nullable=True)       # updated live by RTIS simulator
    slack_minutes = Column(Integer, default=0)          # buffer before this train itself becomes "late"
    is_late = Column(Boolean, default=False)            # true once actual > scheduled + slack


class Alert(Base):
    """A conflict alert raised when a train's live position threatens an active block."""
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=new_id)
    block_id = Column(String, ForeignKey("blocks.id"))
    train_id = Column(String, ForeignKey("trains.id"))
    message = Column(String, nullable=False)
    action_taken = Column(String, nullable=True)        # e.g. "block_paused", "held_5_min", "revised_window"
    created_at = Column(DateTime, nullable=False)


def get_engine(db_path="sqlite:///railway_prototype.db"):
    return create_engine(db_path, echo=False)


def init_db(engine):
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)
