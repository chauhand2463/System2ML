from pydantic import BaseModel, Field
from typing import Literal, Optional, Any
from pathlib import Path
import os


def _get_env(key: str, default: Any, value_type: type = str) -> Any:
    """Get environment variable with type conversion."""
    value = os.environ.get(key, default)
    if value is None:
        return default
    try:
        return value_type(value)
    except (ValueError, TypeError):
        return default


class DataConfig(BaseModel):
    data_type: Literal["tabular", "text", "image", "time-series"]
    path: str = Field(default_factory=lambda: _get_env("DATA_PATH", "./data"))
    target_column: Optional[str] = None
    test_size: float = Field(default_factory=lambda: _get_env("TEST_SIZE", "0.2", float))
    validation_size: float = Field(
        default_factory=lambda: _get_env("VALIDATION_SIZE", "0.1", float)
    )
    random_seed: int = Field(default_factory=lambda: _get_env("RANDOM_SEED", "42", int))


class ConstraintsConfig(BaseModel):
    budget: float = Field(default_factory=lambda: _get_env("BUDGET", "100.0", float))
    carbon_limit_kg: float = Field(
        default_factory=lambda: _get_env("CARBON_LIMIT_KG", "1.0", float)
    )
    max_latency_ms: int = Field(default_factory=lambda: _get_env("MAX_LATENCY_MS", "1000", int))
    max_retries: int = Field(default_factory=lambda: _get_env("MAX_RETRIES", "3", int))
    compliance_rules: list[str] = []


class ObjectiveConfig(BaseModel):
    primary_metric: Literal["accuracy", "f1", "precision", "recall", "mae", "rmse"]
    target_score: float = Field(default_factory=lambda: _get_env("TARGET_SCORE", "0.9", float))
    secondary_metrics: list[str] = []


class MLflowConfig(BaseModel):
    tracking_uri: str = Field(
        default_factory=lambda: _get_env("MLFLOW_TRACKING_URI", "http://localhost:5000")
    )
    experiment_name: str = "system2ml_default"
    artifact_location: str = Field(
        default_factory=lambda: _get_env("MLFLOW_ARTIFACT_LOCATION", "./mlruns")
    )


class CarbonConfig(BaseModel):
    enabled: bool = True
    save_to_file: bool = True
    output_dir: str = Field(
        default_factory=lambda: _get_env("CARBON_OUTPUT_DIR", "./carbon_reports")
    )


class PrometheusConfig(BaseModel):
    enabled: bool = True
    port: int = Field(default_factory=lambda: _get_env("PROMETHEUS_PORT", "9090", int))
    push_gateway: Optional[str] = None


class DatabaseConfig(BaseModel):
    url: str = Field(default_factory=lambda: _get_env("DATABASE_URL", "sqlite:///system2ml.db"))
    pool_size: int = Field(default_factory=lambda: _get_env("DB_POOL_SIZE", "5", int))


class System2MLConfig(BaseModel):
    project_name: str = "System2ML"
    data: DataConfig
    constraints: ConstraintsConfig
    objective: ObjectiveConfig
    mlflow: MLflowConfig = Field(default_factory=MLflowConfig)
    carbon: CarbonConfig = Field(default_factory=CarbonConfig)
    prometheus: PrometheusConfig = Field(default_factory=PrometheusConfig)
    database: DatabaseConfig = Field(default_factory=DatabaseConfig)

    class Config:
        env_prefix = "SYSTEM2ML_"


default_config = System2MLConfig(
    data=DataConfig(data_type="tabular", path="./data"),
    constraints=ConstraintsConfig(),
    objective=ObjectiveConfig(primary_metric="accuracy"),
)


__all__ = [
    "DataConfig",
    "ConstraintsConfig",
    "ObjectiveConfig",
    "MLflowConfig",
    "CarbonConfig",
    "PrometheusConfig",
    "DatabaseConfig",
    "System2MLConfig",
    "default_config",
]
