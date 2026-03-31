from dataclasses import dataclass, field
from typing import Optional
from enum import Enum
import numpy as np
from .logger import logger

# Model backend factory
from system2ml.backends.hf_transformers import HFTransformersBackend
from system2ml.backends.ollama import OllamaBackend

def create_backend(name: str, **kwargs):
    """Factory that returns a model backend instance.

    Parameters
    ----------
    name: str
        Either "hf" for HuggingFaceTransformersBackend or "ollama" for the
        OllamaBackend.
    **kwargs:
        Backend‑specific configuration passed directly to the backend's
        ``load_model`` method.
    """
    name = name.lower()
    if name == "hf":
        return HFTransformersBackend()
    if name == "ollama":
        return OllamaBackend()
    raise ValueError(f"Unknown backend '{name}'. Available: hf, ollama")



class PipelineError(RuntimeError):
    """Base class for pipeline‑related errors.

    Subclass this for more specific failure modes.  Using a dedicated
    exception hierarchy makes error handling clearer and allows callers to
    distinguish pipeline issues from generic runtime errors.
    """
    pass

class PipelineStatus(Enum):
    PENDING = "pending"
    DESIGNING = "designing"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class DataType(Enum):
    TABULAR = "tabular"
    TEXT = "text"
    IMAGE = "image"
    TIME_SERIES = "time-series"


@dataclass
class PipelineStep:
    name: str
    type: str
    params: dict = field(default_factory=dict)
    input: Optional[str] = None
    output: Optional[str] = None


@dataclass
class Pipeline:
    id: str
    name: str
    data_type: DataType
    steps: list[PipelineStep]
    status: PipelineStatus = PipelineStatus.PENDING
    accuracy: Optional[float] = None
    cost: Optional[float] = None
    carbon_kg: Optional[float] = None
    latency_ms: Optional[float] = None
    config: dict = field(default_factory=dict)

    def __post_init__(self):
        logger.info(f"Pipeline created: {self.id} ({self.name}) with status {self.status.value}")
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class PipelineDesign:
    pipeline: Pipeline
    score: float
    estimated_accuracy: float
    estimated_cost: float
    estimated_carbon: float
    estimated_latency: float
    tradeoffs: dict = field(default_factory=dict)
    reasoning: str = ""


@dataclass
class ProblemSpec:
    data_type: DataType
    constraints: dict
    objective: dict
    dataset_path: str
    target_column: Optional[str] = None
    evaluation_metric: str = "accuracy"


@dataclass
class ExecutionResult:
    pipeline_id: str
    status: PipelineStatus
    metrics: dict
    logs: str
    error_message: Optional[str] = None
    execution_time_ms: float = 0.0
    carbon_kg: float = 0.0
    cost_usd: float = 0.0


@dataclass
class FailureRecord:
    id: str
    pipeline_id: str
    error_type: str
    error_message: str
    root_cause: str
    stack_trace: str
    timestamp: str
    context: dict = field(default_factory=dict)
    resolved: bool = False
    resolution: Optional[str] = None


__all__ = [
    "PipelineStatus",
    "DataType", 
    "PipelineStep",
    "Pipeline",
    "PipelineDesign",
    "ProblemSpec",
    "ExecutionResult",
    "FailureRecord",
]
