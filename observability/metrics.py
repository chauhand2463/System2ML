from dataclasses import dataclass
from typing import Optional
import time


@dataclass
class MetricsCollector:
    tracking_uri: str = "http://localhost:5000"
    experiment_name: str = "system2ml"
    
    def log_metric(self, run_id: str, metric: str, value: float):
        print(f"[MLflow] Run {run_id}: {metric} = {value}")
    
    def log_param(self, run_id: str, param: str, value: str):
        print(f"[MLflow] Run {run_id}: param {param} = {value}")
    
    def log_artifact(self, run_id: str, artifact_path: str):
        print(f"[MLflow] Run {run_id}: artifact saved to {artifact_path}")
    
    def start_run(self, run_name: Optional[str] = None) -> str:
        run_id = f"run_{int(time.time())}"
        print(f"[MLflow] Started run: {run_id}")
        return run_id
    
    def end_run(self, run_id: str, status: str = "completed"):
        print(f"[MLflow] Ended run: {run_id} with status: {status}")


__all__ = ["MetricsCollector"]
