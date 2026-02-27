import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from dataclasses import dataclass, field
from typing import Optional, Literal
import uuid
from datetime import datetime

from system2ml.core import Pipeline, PipelineStep, PipelineDesign, ProblemSpec, DataType, PipelineStatus


ALGORITHM_LIBRARY = {
    "tabular": {
        "preprocessing": ["StandardScaler", "MinMaxScaler", "RobustScaler"],
        "models": {
            "LogisticRegression": {"cost": 3, "carbon": 0.1, "latency": 50, "accuracy": 0.75},
            "RandomForest": {"cost": 8, "carbon": 0.3, "latency": 100, "accuracy": 0.82},
            "XGBoost": {"cost": 10, "carbon": 0.4, "latency": 120, "accuracy": 0.85},
            "LightGBM": {"cost": 7, "carbon": 0.25, "latency": 80, "accuracy": 0.84},
            "CatBoost": {"cost": 12, "carbon": 0.5, "latency": 150, "accuracy": 0.86},
            "SVM": {"cost": 5, "carbon": 0.15, "latency": 60, "accuracy": 0.78},
            "MLP": {"cost": 15, "carbon": 0.6, "latency": 200, "accuracy": 0.83},
        },
    },
    "text": {
        "preprocessing": ["Tokenizer", "TF-IDF"],
        "models": {
            "TF-IDF + LogisticRegression": {"cost": 2, "carbon": 0.08, "latency": 30, "accuracy": 0.72},
            "TF-IDF + RandomForest": {"cost": 5, "carbon": 0.15, "latency": 60, "accuracy": 0.78},
            "DistilBERT": {"cost": 25, "carbon": 1.2, "latency": 300, "accuracy": 0.88},
            "BERT": {"cost": 40, "carbon": 2.0, "latency": 500, "accuracy": 0.90},
            "RoBERTa": {"cost": 45, "carbon": 2.5, "latency": 600, "accuracy": 0.91},
        },
    },
    "image": {
        "preprocessing": ["Resize", "Normalize"],
        "models": {
            "ResNet50": {"cost": 50, "carbon": 3.0, "latency": 800, "accuracy": 0.88},
            "EfficientNet": {"cost": 35, "carbon": 2.0, "latency": 500, "accuracy": 0.87},
            "ViT": {"cost": 60, "carbon": 4.0, "latency": 1000, "accuracy": 0.91},
            "MobileNet": {"cost": 15, "carbon": 0.8, "latency": 150, "accuracy": 0.82},
        },
    },
    "time-series": {
        "preprocessing": ["Detrend", "Differencing"],
        "models": {
            "ARIMA": {"cost": 3, "carbon": 0.1, "latency": 40, "accuracy": 0.70},
            "Prophet": {"cost": 8, "carbon": 0.3, "latency": 100, "accuracy": 0.75},
            "LSTM": {"cost": 30, "carbon": 1.5, "latency": 400, "accuracy": 0.82},
            "XGBoostTimeSeries": {"cost": 10, "carbon": 0.4, "latency": 120, "accuracy": 0.80},
        },
    },
}


@dataclass
class ConstraintSpec:
    data_type: Literal["tabular", "text", "image", "time-series"]
    task: Literal["classification", "regression", "ranking", "generation"]
    objective: Literal["accuracy", "f1", "recall", "latency", "cost", "carbon", "robustness", "speed"]
    max_cost: float
    max_carbon: float
    max_latency: int
    deployment: Literal["batch", "realtime", "edge"]
    compliance: Literal["regulated", "non-regulated", "low", "high"]
    retraining: Literal["schedule", "drift", "none", "time", "performance"]
    
    model_preference: Optional[str] = None
    explainability: Optional[Literal["required", "optional"]] = None
    privacy: Optional[Literal["local-only", "cloud-ok"]] = None
    open_source_only: Optional[bool] = None
    hardware: Optional[Literal["CPU-only", "GPU-allowed"]] = None


@dataclass
class FeasibilityResult:
    is_feasible: bool
    violations: list = field(default_factory=list)
    suggestions: list = field(default_factory=list)


class ConstraintValidator:
    def __init__(self):
        self.infeasibility_log = []
    
    def validate(self, constraints: ConstraintSpec) -> FeasibilityResult:
        violations = []
        suggestions = []
        
        if constraints.deployment == "realtime" and constraints.max_latency < 100:
            violations.append(f"Realtime deployment requires latency >= 100ms, got {constraints.max_latency}ms")
            suggestions.append("Increase max latency to at least 100ms for realtime")
        
        if constraints.deployment == "edge" and constraints.max_cost > 5:
            violations.append("Edge deployment typically costs < $5")
            suggestions.append("Reduce max cost to $5 or less for edge")
        
        if constraints.data_type == "image" and constraints.deployment == "edge":
            if constraints.max_latency < 200:
                violations.append("Image models on edge require at least 200ms latency")
                suggestions.append("Increase max latency for image edge deployment")
        
        if constraints.data_type == "text" and constraints.objective == "latency":
            if constraints.max_latency < 50:
                violations.append("Text models require at least 50ms latency")
                suggestions.append("Increase max latency for text processing")
        
        if constraints.max_cost < 3 and constraints.data_type in ["text", "image"]:
            violations.append(f"${constraints.max_cost} is too low for {constraints.data_type} models")
            suggestions.append(f"Increase budget to at least $5 for {constraints.data_type}")
        
        if constraints.max_carbon < 0.1 and constraints.data_type in ["text", "image"]:
            violations.append(f"{constraints.max_carbon}kg is too low for {constraints.data_type} models")
            suggestions.append(f"Increase carbon limit to at least 0.5kg for {constraints.data_type}")
        
        if constraints.objective == "cost" and constraints.max_cost > 50:
            suggestions.append("For cost optimization, consider setting max_cost < 20")
        
        is_feasible = len(violations) == 0
        
        if not is_feasible:
            self.infeasibility_log.append({
                "constraints": constraints.__dict__,
                "violations": violations,
                "timestamp": datetime.utcnow().isoformat(),
            })
        
        return FeasibilityResult(
            is_feasible=is_feasible,
            violations=violations,
            suggestions=suggestions,
        )


@dataclass
class DesignAgent:
    max_designs: int = 5
    validator: ConstraintValidator = field(default_factory=ConstraintValidator)
    
    def generate_designs(self, constraints: ConstraintSpec) -> dict:
        feasibility = self.validator.validate(constraints)
        
        if not feasibility.is_feasible:
            return {
                "status": "infeasible",
                "feasibility": {
                    "is_feasible": False,
                    "violations": feasibility.violations,
                    "suggestions": feasibility.suggestions,
                },
                "designs": [],
            }
        
        algorithms = ALGORITHM_LIBRARY.get(constraints.data_type, ALGORITHM_LIBRARY["tabular"])
        models = algorithms.get("models", {})
        
        candidates = []
        for model_name, model_specs in models.items():
            if self._check_hardware_constraint(model_name, constraints):
                if self._check_deployment_constraint(model_specs, constraints):
                    candidate = self._create_pipeline_design(model_name, model_specs, constraints)
                    candidates.append(candidate)
        
        filtered = self._apply_hard_filters(candidates, constraints)
        
        if not filtered:
            return {
                "status": "no_feasible",
                "feasibility": {
                    "is_feasible": False,
                    "violations": ["No pipeline meets all constraints"],
                    "suggestions": [
                        f"Increase budget from ${constraints.max_cost}",
                        f"Increase latency from {constraints.max_latency}ms",
                        f"Increase carbon from {constraints.max_carbon}kg",
                    ],
                },
                "designs": [],
            }
        
        ranked = self._rank_pipelines(filtered, constraints)
        
        return {
            "status": "success",
            "feasibility": {"is_feasible": True},
            "constraints_used": constraints.__dict__,
            "designs": ranked[:self.max_designs],
        }
    
    def _check_hardware_constraint(self, model_name: str, constraints: ConstraintSpec) -> bool:
        if constraints.hardware == "CPU-only":
            expensive_models = ["BERT", "RoBERTa", "ViT", "ResNet50", "EfficientNet", "LSTM", "DistilBERT", "Prophet"]
            if any(m in model_name for m in expensive_models):
                return False
        return True
    
    def _check_deployment_constraint(self, model_specs: dict, constraints: ConstraintSpec) -> bool:
        if constraints.deployment == "edge":
            if model_specs.get("latency", 1000) > 200:
                return False
            if model_specs.get("cost", 0) > 10:
                return False
        if constraints.deployment == "realtime":
            if model_specs.get("latency", 1000) > constraints.max_latency:
                return False
        return True
    
    def _apply_hard_filters(self, candidates: list, constraints: ConstraintSpec) -> list:
        filtered = []
        for candidate in candidates:
            if candidate["estimated_cost"] <= constraints.max_cost:
                if candidate["estimated_carbon"] <= constraints.max_carbon:
                    if candidate["estimated_latency"] <= constraints.max_latency:
                        candidate["meets_constraints"] = True
                        filtered.append(candidate)
                    else:
                        candidate["meets_constraints"] = False
                        candidate["violation"] = f"latency {candidate['estimated_latency']}ms > {constraints.max_latency}ms"
                else:
                    candidate["meets_constraints"] = False
                    candidate["violation"] = f"carbon {candidate['estimated_carbon']}kg > {constraints.max_carbon}kg"
            else:
                candidate["meets_constraints"] = False
                candidate["violation"] = f"cost ${candidate['estimated_cost']} > ${constraints.max_cost}"
        return filtered
    
    def _rank_pipelines(self, candidates: list, constraints: ConstraintSpec) -> list:
        for c in candidates:
            if constraints.objective == "accuracy":
                c["score"] = c["estimated_accuracy"]
            elif constraints.objective == "cost":
                c["score"] = 1.0 - (c["estimated_cost"] / 50.0)
            elif constraints.objective == "carbon":
                c["score"] = 1.0 - (c["estimated_carbon"] / 5.0)
            elif constraints.objective == "latency":
                c["score"] = 1.0 - (c["estimated_latency"] / 1000.0)
            else:
                c["score"] = c["estimated_accuracy"]
        
        return sorted(candidates, key=lambda x: x["score"], reverse=True)
    
    def _create_pipeline_design(self, model_name: str, model_specs: dict, constraints: ConstraintSpec) -> dict:
        return {
            "rank": 0,
            "model": model_name,
            "model_family": "transformer" if "BERT" in model_name or "RoBERTa" in model_name else "classical",
            "estimated_accuracy": model_specs.get("accuracy", 0.8),
            "estimated_cost": model_specs.get("cost", 10),
            "estimated_carbon": model_specs.get("carbon", 0.5),
            "estimated_latency": model_specs.get("latency", 100),
            "pipeline_spec": {
                "data": {
                    "cleaning": ["dedup", "impute"],
                    "split": "stratified" if constraints.task == "classification" else "random",
                },
                "model": {
                    "type": model_name,
                    "training": constraints.deployment,
                },
                "deployment": {
                    "mode": constraints.deployment,
                },
                "monitoring": {
                    "drift": constraints.retraining == "drift",
                    "performance": True,
                },
                "governance": {
                    "requires_approval": constraints.compliance == "regulated",
                    "audit": True,
                },
            },
            "explanation": f"{model_name} selected as it meets all constraints and optimizes for {constraints.objective}",
        }


__all__ = ["DesignAgent", "ConstraintSpec", "ConstraintValidator", "FeasibilityResult"]
