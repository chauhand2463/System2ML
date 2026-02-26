from enum import Enum
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime
import uuid


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
    LifecycleState.DATASET_PROFILED: [LifecycleState.DATASET_VALIDATED, LifecycleState.DATASET_UPLOADED],
    LifecycleState.DATASET_VALIDATED: [LifecycleState.CONSTRAINTS_VALIDATED],
    LifecycleState.CONSTRAINTS_VALIDATED: [LifecycleState.FEASIBILITY_APPROVED, LifecycleState.DATASET_PROFILED],
    LifecycleState.FEASIBILITY_APPROVED: [LifecycleState.CANDIDATES_GENERATED],
    LifecycleState.CANDIDATES_GENERATED: [LifecycleState.EXECUTION_APPROVED],
    LifecycleState.EXECUTION_APPROVED: [LifecycleState.TRAINING_RUNNING],
    LifecycleState.TRAINING_RUNNING: [LifecycleState.TRAINING_COMPLETED, LifecycleState.TRAINING_KILLED],
    LifecycleState.TRAINING_COMPLETED: [],
    LifecycleState.TRAINING_BLOCKED: [LifecycleState.DATASET_UPLOADED],
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
        super().__init__(f"Cannot transition from {current.value} to {target.value}")


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
            elif target == LifecycleState.TRAINING_COMPLETED:
                self.training_result = metadata
        return True
    
    def get_allowed_next_states(self) -> List[LifecycleState]:
        return VALID_TRANSITIONS.get(self.current_state, [])
    
    def get_blocking_errors(self) -> List[ValidationError]:
        return [e for e in self.validation_errors if e.code.startswith("BLOCK_")]
    
    def is_blocked(self) -> bool:
        return len(self.get_blocking_errors()) > 0


class ProjectStore:
    _projects: Dict[str, ProjectState] = {}
    
    @classmethod
    def create(cls, name: str) -> ProjectState:
        project = ProjectState(
            id=str(uuid.uuid4())[:8],
            name=name,
            current_state=LifecycleState.DATASET_UPLOADED
        )
        cls._projects[project.id] = project
        return project
    
    @classmethod
    def get(cls, project_id: str) -> Optional[ProjectState]:
        return cls._projects.get(project_id)
    
    @classmethod
    def get_all(cls) -> List[ProjectState]:
        return list(cls._projects.values())
    
    @classmethod
    def update(cls, project_id: str, **kwargs) -> Optional[ProjectState]:
        project = cls._projects.get(project_id)
        if project:
            for key, value in kwargs.items():
                if hasattr(project, key):
                    setattr(project, key, value)
            project.updated_at = datetime.utcnow().isoformat()
        return project
    
    @classmethod
    def delete(cls, project_id: str) -> bool:
        if project_id in cls._projects:
            del cls._projects[project_id]
            return True
        return False


__all__ = [
    "LifecycleState",
    "VALID_TRANSITIONS",
    "PAGE_TO_STATE",
    "InvalidTransitionError",
    "ValidationError",
    "ConstraintViolation",
    "ProjectState",
    "ProjectStore",
]
