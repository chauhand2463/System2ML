from dataclasses import dataclass, field
from typing import Optional, Callable
import time
import uuid
import threading
from enum import Enum


class ExecutionStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    KILLED = "killed"


class ResourceLimitExceeded(Exception):
    def __init__(self, resource_type: str, limit: float, current: float):
        self.resource_type = resource_type
        self.limit = limit
        self.current = current
        super().__init__(f"{resource_type} limit exceeded: {current:.2f}/{limit:.2f}")


@dataclass
class ExecutionMetrics:
    cost_usd: float = 0.0
    carbon_kg: float = 0.0
    memory_mb: float = 0.0
    duration_ms: float = 0.0
    steps_completed: int = 0
    total_steps: int = 0


@dataclass
class ResourceLimits:
    max_cost_usd: float = 100.0
    max_carbon_kg: float = 10.0
    max_memory_mb: float = 4096.0
    max_duration_ms: float = 3600000.0  # 1 hour
    max_step_duration_ms: float = 600000.0  # 10 minutes per step


@dataclass
class PipelineExecutor:
    backend: str = "local"
    limits: ResourceLimits = field(default_factory=ResourceLimits)
    on_progress: Optional[Callable[[ExecutionMetrics], None]] = None
    
    def __post_init__(self):
        self._running_executions: dict[str, dict] = {}
        self._lock = threading.Lock()
    
    def _check_limits(self, metrics: ExecutionMetrics) -> None:
        if metrics.cost_usd > self.limits.max_cost_usd:
            raise ResourceLimitExceeded("cost", self.limits.max_cost_usd, metrics.cost_usd)
        
        if metrics.carbon_kg > self.limits.max_carbon_kg:
            raise ResourceLimitExceeded("carbon", self.limits.max_carbon_kg, metrics.carbon_kg)
        
        if metrics.memory_mb > self.limits.max_memory_mb:
            raise ResourceLimitExceeded("memory", self.limits.max_memory_mb, metrics.memory_mb)
        
        if metrics.duration_ms > self.limits.max_duration_ms:
            raise ResourceLimitExceeded("duration", self.limits.max_duration_ms, metrics.duration_ms)
    
    def _estimate_step_cost(self, step: dict) -> float:
        step_type = step.get("type", "unknown")
        cost_map = {
            "source": 0.001,
            "transform": 0.005,
            "model": 0.05,
            "sink": 0.001,
            "monitor": 0.002,
            "default": 0.01
        }
        return cost_map.get(step_type, cost_map["default"])
    
    def _estimate_step_carbon(self, step: dict, duration_ms: float) -> float:
        carbon_per_ms = 0.00001
        return (duration_ms * carbon_per_ms) / 1000
    
    def execute(self, pipeline_id: str, steps: list, limits: Optional[ResourceLimits] = None) -> dict:
        execution_id = str(uuid.uuid4())
        start_time = time.time()
        
        if limits:
            self.limits = limits
        
        metrics = ExecutionMetrics(total_steps=len(steps))
        
        with self._lock:
            self._running_executions[execution_id] = {
                "status": ExecutionStatus.RUNNING,
                "pipeline_id": pipeline_id,
                "start_time": start_time,
                "metrics": metrics
            }
        
        try:
            results = {
                "pipeline_id": pipeline_id,
                "execution_id": execution_id,
                "steps_completed": [],
                "status": ExecutionStatus.COMPLETED.value
            }
            
            for i, step in enumerate(steps):
                with self._lock:
                    exec_data = self._running_executions.get(execution_id)
                    if not exec_data or exec_data["status"] != ExecutionStatus.RUNNING:
                        results["status"] = ExecutionStatus.CANCELLED.value
                        break
                
                step_start = time.time()
                
                try:
                    step_result = self._execute_step(step, execution_id)
                    step_duration = (time.time() - step_start) * 1000
                    
                    step_cost = self._estimate_step_cost(step)
                    step_carbon = self._estimate_step_carbon(step, step_duration)
                    
                    metrics.cost_usd += step_cost
                    metrics.carbon_kg += step_carbon
                    metrics.duration_ms += step_duration
                    metrics.steps_completed = i + 1
                    
                    self._check_limits(metrics)
                    
                    step_result.update({
                        "status": "completed",
                        "duration_ms": step_duration,
                        "cost_usd": step_cost,
                        "carbon_kg": step_carbon
                    })
                    results["steps_completed"].append(step_result)
                    
                    if self.on_progress:
                        self.on_progress(metrics)
                        
                except ResourceLimitExceeded as e:
                    results["status"] = ExecutionStatus.KILLED.value
                    results["killed_reason"] = str(e)
                    results["metrics_at_kill"] = {
                        "cost_usd": metrics.cost_usd,
                        "carbon_kg": metrics.carbon_kg,
                        "memory_mb": metrics.memory_mb,
                        "duration_ms": metrics.duration_ms
                    }
                    raise
                    
            results["total_duration_ms"] = (time.time() - start_time) * 1000
            results["total_cost_usd"] = metrics.cost_usd
            results["total_carbon_kg"] = metrics.carbon_kg
            
        except Exception as e:
            results["status"] = ExecutionStatus.FAILED.value
            results["error"] = str(e)
            
        finally:
            with self._lock:
                if execution_id in self._running_executions:
                    self._running_executions[execution_id]["status"] = ExecutionStatus(results.get("status", "failed"))
                    self._running_executions[execution_id]["metrics"] = metrics
        
        return results
    
    def _execute_step(self, step: dict, execution_id: str) -> dict:
        step_name = step.get("name", step.get("type", "unknown"))
        
        time.sleep(0.1)
        
        return {"step": step_name, "type": step.get("type", "unknown")}
    
    def cancel(self, execution_id: str) -> bool:
        with self._lock:
            if execution_id in self._running_executions:
                self._running_executions[execution_id]["status"] = ExecutionStatus.CANCELLED
                return True
        return False
    
    def get_status(self, execution_id: str) -> Optional[dict]:
        with self._lock:
            exec_data = self._running_executions.get(execution_id)
            if exec_data:
                return {
                    "status": exec_data["status"].value,
                    "metrics": exec_data["metrics"],
                    "elapsed_ms": (time.time() - exec_data["start_time"]) * 1000
                }
        return None


ORCHESTRATORS = ["airflow", "kubeflow", "local"]

__all__ = [
    "PipelineExecutor", 
    "ORCHESTRATORS", 
    "ExecutionStatus",
    "ResourceLimitExceeded",
    "ResourceLimits",
    "ExecutionMetrics"
]
