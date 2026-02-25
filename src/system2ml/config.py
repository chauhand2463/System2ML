from pydantic import BaseModel, Field
from typing import Literal, Optional
from pathlib import Path


class DataConfig(BaseModel):
    data_type: Literal["tabular", "text", "image", "time-series"]
    path: str
    target_column: Optional[str] = None
    test_size: float = 0.2
    validation_size: float = 0.1
    random_seed: int = 42


class ConstraintsConfig(BaseModel):
    budget: float = 100.0
    carbon_limit_kg: float = 1.0
    max_latency_ms: int = 1000
    max_retries: int = 3
    compliance_rules: list[str] = []


class ObjectiveConfig(BaseModel):
    primary_metric: Literal["accuracy", "f1", "precision", "recall", "mae", "rmse"]
    target_score: float = 0.9
    secondary_metrics: list[str] = []


class MLflowConfig(BaseModel):
    tracking_uri: str = "http://localhost:5000"
    experiment_name: str = "system2ml_default"
    artifact_location: str = "./mlruns"


class CarbonConfig(BaseModel):
    enabled: bool = True
    save_to_file: bool = True
    output_dir: str = "./carbon_reports"


class PrometheusConfig(BaseModel):
    enabled: bool = True
    port: int = 9090
    push_gateway: Optional[str] = None


class DatabaseConfig(BaseModel):
    url: str = "sqlite:///system2ml.db"
    pool_size: int = 5


class System2MLConfig(BaseModel):
    project_name: str = "System2ML"
    data: DataConfig
    constraints: ConstraintsConfig
    objective: ObjectiveConfig
    mlflow: MLflowConfig = MLflowConfig()
    carbon: CarbonConfig = CarbonConfig()
    prometheus: PrometheusConfig = PrometheusConfig()
    database: DatabaseConfig = DatabaseConfig()

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
