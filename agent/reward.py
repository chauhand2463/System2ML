from dataclasses import dataclass
from typing import Optional


@dataclass
class RewardCalculator:
    primary_metric_weight: float = 0.5
    cost_weight: float = 0.2
    carbon_weight: float = 0.15
    latency_weight: float = 0.15
    
    def calculate(self, metrics: dict, constraints: dict, execution_time_ms: float = 0.0) -> float:
        primary_score = metrics.get("accuracy", 0.0) or metrics.get("f1", 0.0)
        
        cost_penalty = 0.0
        if "budget" in constraints:
            cost_ratio = metrics.get("cost", 0.0) / constraints["budget"]
            cost_penalty = max(0.0, cost_ratio - 0.8) * self.cost_weight
        
        carbon_penalty = 0.0
        if "carbon_limit_kg" in constraints:
            carbon_ratio = metrics.get("carbon_kg", 0.0) / constraints["carbon_limit_kg"]
            carbon_penalty = max(0.0, carbon_ratio - 0.8) * self.carbon_weight
        
        latency_penalty = 0.0
        if "max_latency_ms" in constraints:
            latency_ratio = execution_time_ms / constraints["max_latency_ms"]
            latency_penalty = max(0.0, latency_ratio - 0.8) * self.latency_weight
        
        reward = (
            self.primary_metric_weight * primary_score -
            cost_penalty -
            carbon_penalty -
            latency_penalty
        )
        
        return max(0.0, min(1.0, reward))

    def calculate_penalty(self, error_type: str, failure_context: dict) -> float:
        penalties = {
            "data_error": 0.5,
            "model_error": 0.3,
            "timeout": 0.4,
            "resource_exceeded": 0.6,
            "unknown": 0.2,
        }
        return penalties.get(error_type, penalties["unknown"])

    def calculate_improvement_reward(
        self,
        current_metrics: dict,
        previous_metrics: dict,
    ) -> float:
        if not previous_metrics:
            return 0.0
        
        accuracy_improvement = current_metrics.get("accuracy", 0.0) - previous_metrics.get("accuracy", 0.0)
        cost_improvement = (previous_metrics.get("cost", 100.0) - current_metrics.get("cost", 0.0)) / 100.0
        
        return accuracy_improvement * 0.7 + cost_improvement * 0.3


__all__ = ["RewardCalculator"]
