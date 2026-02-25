from dataclasses import dataclass, field
from typing import Optional
import numpy as np
from collections import defaultdict


@dataclass
class RLPolicy:
    state_dim: int = 128
    action_dim: int = 64
    learning_rate: float = 0.001
    gamma: float = 0.99
    epsilon: float = 0.1
    q_table: dict = field(default_factory=lambda: defaultdict(lambda: np.zeros(64)))
    memory: list = field(default_factory=list)
    batch_size: int = 32

    def get_action(self, state: np.ndarray) -> int:
        if np.random.random() < self.epsilon:
            return int(np.random.randint(self.action_dim))
        state_hash = hash(state.tobytes())
        if state_hash not in self.q_table:
            self.q_table[state_hash] = np.zeros(self.action_dim)
        return int(np.argmax(self.q_table[state_hash]))

    def update(self, state: np.ndarray, action: int, reward: float, next_state: np.ndarray, done: bool):
        state_hash = hash(state.tobytes())
        if state_hash not in self.q_table:
            self.q_table[state_hash] = np.zeros(self.action_dim)
        
        next_state_hash = hash(next_state.tobytes())
        if next_state_hash not in self.q_table:
            self.q_table[next_state_hash] = np.zeros(self.action_dim)
        
        current_q = self.q_table[state_hash][action]
        max_next_q = float(np.max(self.q_table[next_state_hash]))
        
        target_q = reward + self.gamma * max_next_q * (1.0 if done else 0.0)
        
        self.q_table[state_hash][action] += self.learning_rate * (target_q - current_q)
        
        self.memory.append((state, action, reward, next_state, done))
        if len(self.memory) > 10000:
            self.memory = self.memory[-5000:]

    def get_policy_state(self) -> dict:
        return {
            "q_table_size": len(self.q_table),
            "memory_size": len(self.memory),
            "avg_q_value": float(np.mean([np.mean(v) for v in self.q_table.values()])) if self.q_table else 0.0,
        }


@dataclass
class MultiObjectiveOptimizer:
    weights: dict = field(default_factory=lambda: {
        "accuracy": 0.4,
        "cost": 0.2,
        "carbon": 0.2,
        "latency": 0.2,
    })
    
    def optimize(self, designs: list, constraints: dict) -> list:
        pareto_front = []
        
        for design in designs:
            score = self._compute_score(design, constraints)
            design.score = score
            pareto_front.append(design)
        
        pareto_front.sort(key=lambda x: x.score, reverse=True)
        return pareto_front

    def _satisfies_constraints(self, design, constraints: dict) -> bool:
        if "budget" in constraints and design.estimated_cost > constraints["budget"]:
            return False
        if "carbon_limit_kg" in constraints and design.estimated_carbon > constraints["carbon_limit_kg"]:
            return False
        if "max_latency_ms" in constraints and design.estimated_latency > constraints["max_latency_ms"]:
            return False
        return True

    def _compute_score(self, design, constraints: dict = None) -> float:
        score = 0.0
        score += self.weights.get("accuracy", 0.0) * design.estimated_accuracy
        score += self.weights.get("cost", 0.0) * (1.0 - design.estimated_cost / 100.0)
        score += self.weights.get("carbon", 0.0) * (1.0 - design.estimated_carbon)
        score += self.weights.get("latency", 0.0) * (1.0 - design.estimated_latency / 5000.0)
        
        if constraints:
            if "budget" in constraints and design.estimated_cost > constraints["budget"]:
                score -= 0.3
            if "carbon_limit_kg" in constraints and design.estimated_carbon > constraints["carbon_limit_kg"]:
                score -= 0.3
            if "max_latency_ms" in constraints and design.estimated_latency > constraints["max_latency_ms"]:
                score -= 0.3
        
        return score

    def update_weights(self, feedback: dict):
        for key in feedback:
            if key in self.weights:
                self.weights[key] = feedback[key]


__all__ = ["RLPolicy", "MultiObjectiveOptimizer"]
