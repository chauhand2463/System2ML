from enum import Enum
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field, asdict
from datetime import datetime
import uuid
import sqlite3
import json
import os


DB_PATH = os.environ.get("DATABASE_URL", "system2ml.db").replace("sqlite:///", "")
if not DB_PATH:
    DB_PATH = "system2ml.db"


def get_db():
    return sqlite3.connect(DB_PATH)


def init_projects_table():
    conn = get_db()
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            current_state TEXT,
            dataset_info TEXT,
            profile_info TEXT,
            validation_errors TEXT,
            constraints TEXT,
            candidates TEXT,
            selected_pipeline TEXT,
            training_plan TEXT,
            training_result TEXT,
            owner_id TEXT,
            workspace_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


class LifecycleState(str, Enum):
    DATASET_UPLOADED = "DATASET_UPLOADED"
    DATASET_PROFILED = "DATASET_PROFILED"
    DATASET_VALIDATED = "DATASET_VALIDATED"
    CONSTRAINTS_VALIDATED = "CONSTRAINTS_VALIDATED"
    FEASIBILITY_APPROVED = "FEASIBILITY_APPROVED"
    CANDIDATES_GENERATED = "CANDIDATES_GENERATED"
    EXECUTION_APPROVED = "EXECUTION_APPROVED"
    TRAINING_RUNNING = "TRAINING_RUNNING"
    TRAINING_COMPLETED = "TRAINING_COMPLETED"
    TRAINING_BLOCKED = "TRAINING_BLOCKED"
    TRAINING_KILLED = "TRAINING_KILLED"


VALID_TRANSITIONS = {
    None: [LifecycleState.DATASET_UPLOADED],
    LifecycleState.DATASET_UPLOADED: [LifecycleState.DATASET_PROFILED],
    LifecycleState.DATASET_PROFILED: [
        LifecycleState.DATASET_VALIDATED,
        LifecycleState.DATASET_UPLOADED,
    ],
    LifecycleState.DATASET_VALIDATED: [LifecycleState.CONSTRAINTS_VALIDATED],
    LifecycleState.CONSTRAINTS_VALIDATED: [
        LifecycleState.FEASIBILITY_APPROVED,
        LifecycleState.DATASET_PROFILED,
    ],
    LifecycleState.FEASIBILITY_APPROVED: [LifecycleState.CANDIDATES_GENERATED],
    LifecycleState.CANDIDATES_GENERATED: [
        LifecycleState.EXECUTION_APPROVED,
        LifecycleState.TRAINING_BLOCKED,
    ],
    LifecycleState.EXECUTION_APPROVED: [
        LifecycleState.TRAINING_RUNNING,
        LifecycleState.TRAINING_BLOCKED,
    ],
    LifecycleState.TRAINING_RUNNING: [
        LifecycleState.TRAINING_COMPLETED,
        LifecycleState.TRAINING_KILLED,
    ],
    LifecycleState.TRAINING_COMPLETED: [],
    LifecycleState.TRAINING_BLOCKED: [
        LifecycleState.DATASET_UPLOADED,
        LifecycleState.EXECUTION_APPROVED,
    ],
    LifecycleState.TRAINING_KILLED: [LifecycleState.DATASET_UPLOADED],
}


PAGE_TO_STATE = {
    "/datasets/new": LifecycleState.DATASET_UPLOADED,
    "/datasets/profile": LifecycleState.DATASET_PROFILED,
    "/datasets/validate": LifecycleState.DATASET_VALIDATED,
    "/design/constraints": LifecycleState.CONSTRAINTS_VALIDATED,
    "/design/results": LifecycleState.CANDIDATES_GENERATED,
    "/train/confirm": LifecycleState.EXECUTION_APPROVED,
    "/train/running": LifecycleState.TRAINING_RUNNING,
    "/train/result": LifecycleState.TRAINING_COMPLETED,
}


class InvalidTransitionError(Exception):
    def __init__(self, current: LifecycleState, target: LifecycleState):
        self.current = current
        self.target = target
        current_str = current.value if current else "None"
        super().__init__(f"Cannot transition from {current_str} to {target.value}")


@dataclass
class ValidationError:
    code: str
    message: str
    action: str


@dataclass
class ConstraintViolation:
    metric: str
    estimated: float
    limit: float
    suggestion: str


@dataclass
class ProjectState:
    id: str
    name: str
    current_state: Optional[LifecycleState] = None
    dataset_info: Dict[str, Any] = field(default_factory=dict)
    profile_info: Dict[str, Any] = field(default_factory=dict)
    validation_errors: List[ValidationError] = field(default_factory=list)
    constraints: Dict[str, Any] = field(default_factory=dict)
    candidates: List[Dict[str, Any]] = field(default_factory=list)
    selected_pipeline: Optional[Dict[str, Any]] = None
    training_plan: Dict[str, Any] = field(default_factory=dict)
    training_result: Optional[Dict[str, Any]] = None
    owner_id: Optional[str] = None
    workspace_id: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def can_transition_to(self, target: LifecycleState) -> bool:
        allowed = VALID_TRANSITIONS.get(self.current_state, [])
        return target in allowed

    def transition_to(self, target: LifecycleState, metadata: Dict[str, Any] = None) -> bool:
        if not self.can_transition_to(target):
            raise InvalidTransitionError(self.current_state, target)

        self.current_state = target
        self.updated_at = datetime.utcnow().isoformat()

        if metadata:
            if target == LifecycleState.DATASET_PROFILED:
                self.profile_info = metadata
            elif target == LifecycleState.DATASET_VALIDATED:
                self.validation_errors = metadata.get("errors", [])
            elif target == LifecycleState.CONSTRAINTS_VALIDATED:
                self.constraints = metadata
            elif target == LifecycleState.CANDIDATES_GENERATED:
                self.candidates = metadata.get("candidates", [])
            elif target == LifecycleState.EXECUTION_APPROVED:
                self.selected_pipeline = metadata
            elif target == LifecycleState.TRAINING_RUNNING:
                self.training_plan = metadata
            elif target == LifecycleState.TRAINING_BLOCKED:
                self.training_plan = metadata.get("plan", {})
                self.validation_errors = metadata.get("violations", [])
            elif target == LifecycleState.TRAINING_COMPLETED:
                self.training_result = metadata

        ProjectStore.save(self)
        return True

    def get_allowed_next_states(self) -> List[LifecycleState]:
        return VALID_TRANSITIONS.get(self.current_state, [])

    def get_blocking_errors(self) -> List[ValidationError]:
        return [e for e in self.validation_errors if e.code.startswith("BLOCK_")]

    def is_blocked(self) -> bool:
        return len(self.get_blocking_errors()) > 0

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "current_state": self.current_state.value if self.current_state else None,
            "dataset_info": self.dataset_info,
            "profile_info": self.profile_info,
            "validation_errors": [asdict(e) for e in self.validation_errors],
            "constraints": self.constraints,
            "candidates": self.candidates,
            "selected_pipeline": self.selected_pipeline,
            "training_plan": self.training_plan,
            "training_result": self.training_result,
            "owner_id": self.owner_id,
            "workspace_id": self.workspace_id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "ProjectState":
        validation_errors = []
        for err in data.get("validation_errors", []):
            if isinstance(err, dict):
                validation_errors.append(ValidationError(**err))

        return cls(
            id=data["id"],
            name=data["name"],
            current_state=LifecycleState(data["current_state"])
            if data.get("current_state")
            else None,
            dataset_info=data.get("dataset_info", {}),
            profile_info=data.get("profile_info", {}),
            validation_errors=validation_errors,
            constraints=data.get("constraints", {}),
            candidates=data.get("candidates", []),
            selected_pipeline=data.get("selected_pipeline"),
            training_plan=data.get("training_plan", {}),
            training_result=data.get("training_result"),
            owner_id=data.get("owner_id"),
            workspace_id=data.get("workspace_id"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )


class ProjectStore:
    _projects: Dict[str, ProjectState] = {}
    _initialized = False

    @classmethod
    def _ensure_initialized(cls):
        if not cls._initialized:
            init_projects_table()
            cls._load_all()
            cls._initialized = True

    @classmethod
    def _load_all(cls):
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT id FROM projects")
        rows = c.fetchall()
        conn.close()

        for (row_id,) in rows:
            project = cls._load_from_db(row_id)
            if project:
                cls._projects[project.id] = project

    @classmethod
    def _load_from_db(cls, project_id: str) -> Optional[ProjectState]:
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        row = c.fetchone()
        conn.close()

        if not row:
            return None

        columns = [col[0] for col in c.description]
        data = dict(zip(columns, row))

        for field in [
            "dataset_info",
            "profile_info",
            "constraints",
            "candidates",
            "selected_pipeline",
            "training_plan",
            "training_result",
        ]:
            if data.get(field):
                try:
                    data[field] = json.loads(data[field])
                except (json.JSONDecodeError, TypeError):
                    data[field] = {}

        if data.get("validation_errors"):
            try:
                data["validation_errors"] = json.loads(data["validation_errors"])
            except (json.JSONDecodeError, TypeError):
                data["validation_errors"] = []

        return ProjectState.from_dict(data)

    @classmethod
    def save(cls, project: ProjectState):
        conn = get_db()
        c = conn.cursor()
        now = datetime.utcnow().isoformat()

        c.execute(
            """
            INSERT OR REPLACE INTO projects 
            (id, name, current_state, dataset_info, profile_info, validation_errors, 
             constraints, candidates, selected_pipeline, training_plan, training_result,
             owner_id, workspace_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                project.id,
                project.name,
                project.current_state.value if project.current_state else None,
                json.dumps(project.dataset_info),
                json.dumps(project.profile_info),
                json.dumps([asdict(e) for e in project.validation_errors]),
                json.dumps(project.constraints),
                json.dumps(project.candidates),
                json.dumps(project.selected_pipeline) if project.selected_pipeline else None,
                json.dumps(project.training_plan),
                json.dumps(project.training_result) if project.training_result else None,
                project.owner_id,
                project.workspace_id,
                project.created_at,
                now,
            ),
        )
        conn.commit()
        conn.close()
        cls._projects[project.id] = project

    @classmethod
    def create(cls, name: str, owner_id: str = None, workspace_id: str = None) -> ProjectState:
        cls._ensure_initialized()
        project = ProjectState(
            id=str(uuid.uuid4())[:12],
            name=name,
            current_state=LifecycleState.DATASET_UPLOADED,
            owner_id=owner_id,
            workspace_id=workspace_id,
        )
        cls.save(project)
        return project

    @classmethod
    def get(cls, project_id: str) -> Optional[ProjectState]:
        cls._ensure_initialized()
        return cls._projects.get(project_id)

    @classmethod
    def get_all(cls) -> List[ProjectState]:
        cls._ensure_initialized()
        return list(cls._projects.values())

    @classmethod
    def get_by_workspace(cls, workspace_id: str) -> List[ProjectState]:
        cls._ensure_initialized()
        return [p for p in cls._projects.values() if p.workspace_id == workspace_id]

    @classmethod
    def get_by_owner(cls, owner_id: str) -> List[ProjectState]:
        cls._ensure_initialized()
        return [p for p in cls._projects.values() if p.owner_id == owner_id]

    @classmethod
    def update(cls, project_id: str, **kwargs) -> Optional[ProjectState]:
        cls._ensure_initialized()
        project = cls._projects.get(project_id)
        if project:
            for key, value in kwargs.items():
                if hasattr(project, key):
                    setattr(project, key, value)
            project.updated_at = datetime.utcnow().isoformat()
            cls.save(project)
        return project

    @classmethod
    def delete(cls, project_id: str) -> bool:
        cls._ensure_initialized()
        if project_id in cls._projects:
            del cls._projects[project_id]
            conn = get_db()
            c = conn.cursor()
            c.execute("DELETE FROM projects WHERE id = ?", (project_id,))
            conn.commit()
            conn.close()
            return True
        return False


init_projects_table()


__all__ = [
    "LifecycleState",
    "VALID_TRANSITIONS",
    "PAGE_TO_STATE",
    "InvalidTransitionError",
    "ValidationError",
    "ConstraintViolation",
    "ProjectState",
    "ProjectStore",
    "init_projects_table",
]
