from pydantic import BaseModel, Field, validator
from typing import Optional, List, Literal, Any
from enum import Enum


class DataType(str, Enum):
    TABULAR = "tabular"
    TEXT = "text"
    IMAGE = "image"
    TIME_SERIES = "time-series"
    VIDEO = "video"
    AUDIO = "audio"


class TaskType(str, Enum):
    CLASSIFICATION = "classification"
    REGRESSION = "regression"
    CLUSTERING = "clustering"
    NER = "ner"
    SUMMARIZATION = "summarization"
    TRANSLATION = "translation"
    OBJECT_DETECTION = "object_detection"
    SEGMENTATION = "segmentation"
    FORECASTING = "forecasting"
    RECOMMENDATION = "recommendation"


class ObjectiveType(str, Enum):
    ACCURACY = "accuracy"
    F1 = "f1"
    PRECISION = "precision"
    RECALL = "recall"
    COST = "cost"
    SPEED = "speed"
    CARBON = "carbon"
    BALANCED = "balanced"


class DeploymentType(str, Enum):
    BATCH = "batch"
    REALTIME = "realtime"
    EDGE = "edge"
    STREAMING = "streaming"


class RetrainingType(str, Enum):
    TIME = "time"
    DRIFT = "drift"
    MANUAL = "manual"
    NONE = "none"


class ComplianceLevel(str, Enum):
    NONE = "none"
    STANDARD = "standard"
    REGULATED = "regulated"
    HIGHLY_REGULATED = "highly_regulated"


class HardwareType(str, Enum):
    CPU = "cpu"
    GPU = "gpu"
    TPU = "tpu"
    EDGE_DEVICE = "edge_device"
    HYBRID = "hybrid"


class DataProfile(BaseModel):
    type: DataType
    size_mb: Optional[int] = Field(None, ge=1, le=1000000)
    features: Optional[int] = Field(None, ge=1)
    num_samples: Optional[int] = Field(None, ge=1)
    is_time_series: Optional[bool] = False
    has_text: Optional[bool] = False
    has_images: Optional[bool] = False


class Constraints(BaseModel):
    max_cost_usd: float = Field(..., ge=0, le=10000)
    max_carbon_kg: float = Field(..., ge=0, le=1000)
    max_latency_ms: int = Field(..., ge=1, le=60000)
    min_accuracy: Optional[float] = Field(0.5, ge=0, le=1.0)
    compliance_level: ComplianceLevel = ComplianceLevel.STANDARD
    max_model_size_mb: Optional[int] = Field(None, ge=1)
    hardware: HardwareType = HardwareType.CPU
    
    @validator('max_carbon_kg')
    def validate_carbon(cls, v):
        if v > 100:
            raise ValueError('Carbon constraint above 100kg requires special approval')
        return v


class DesignRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    data_profile: DataProfile
    objective: ObjectiveType = ObjectiveType.ACCURACY
    task: Optional[TaskType] = None
    constraints: Constraints
    deployment: DeploymentType = DeploymentType.BATCH
    retraining: RetrainingType = RetrainingType.DRIFT
    preferences: Optional[dict] = None


class ConstraintViolation(BaseModel):
    constraint: str
    value: Any
    required: Any
    severity: Literal["hard", "soft"] = "hard"
    message: str


class RelaxationSuggestion(BaseModel):
    constraint: str
    current_value: Any
    suggested_value: Any
    reason: str
    priority: int = 1


class ValidationResult(BaseModel):
    is_valid: bool
    violations: List[ConstraintViolation] = []
    suggestions: List[RelaxationSuggestion] = []
    feasibility_score: float = 0.0


class ModelFamily(str, Enum):
    CLASSICAL = "classical"
    SMALL_DEEP = "small_deep"
    COMPRESSED = "compressed"
    TRANSFORMER = "transformer"
    LEGACY = "legacy"


class PipelineCandidate(BaseModel):
    id: str
    name: str
    description: str
    model_families: List[ModelFamily]
    estimated_cost: float
    estimated_carbon: float
    estimated_latency_ms: int
    estimated_accuracy: float
    components: List[dict]
    feasibility_score: float = 0.0
    violates_constraints: List[ConstraintViolation] = []


class ExecutionRequest(BaseModel):
    pipeline_id: str
    run_name: Optional[str] = None
    force_execution: bool = False


class ExecutionResult(BaseModel):
    run_id: str
    status: Literal["pending", "running", "completed", "failed"]
    pipeline_id: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    actual_cost: Optional[float] = None
    actual_carbon: Optional[float] = None
    actual_latency: Optional[float] = None
    actual_accuracy: Optional[float] = None
    logs: Optional[str] = None
    error: Optional[str] = None
