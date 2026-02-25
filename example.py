import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from agent import DesignAgent, MultiObjectiveOptimizer, RLPolicy, RewardCalculator
from system2ml.core import ProblemSpec, DataType, PipelineStatus
import json


def run_example():
    print("=== System2ML Example ===\n")
    
    problem = ProblemSpec(
        data_type=DataType.TABULAR,
        dataset_path="./data/train.csv",
        target_column="target",
        constraints={"budget": 100, "carbon_limit_kg": 1.0, "max_latency_ms": 1000},
        objective={"primary_metric": "accuracy", "target_score": 0.9},
        evaluation_metric="accuracy",
    )
    
    print(f"Problem: {problem.data_type.value} classification")
    print(f"Target: {problem.target_column}")
    print(f"Constraints: {problem.constraints}\n")
    
    agent = DesignAgent(max_designs=3)
    designs = agent.generate_designs(problem)
    
    print(f"Generated {len(designs)} pipeline designs:\n")
    for i, design in enumerate(designs):
        print(f"Design {i+1}: {design.pipeline.name}")
        print(f"  Score: {design.score:.3f}")
        print(f"  Est. Accuracy: {design.estimated_accuracy:.3f}")
        print(f"  Est. Cost: ${design.estimated_cost:.2f}")
        print(f"  Est. Carbon: {design.estimated_carbon:.3f} kg")
        print(f"  Steps: {[s.name for s in design.pipeline.steps]}")
        print()
    
    optimizer = MultiObjectiveOptimizer()
    best_designs = optimizer.optimize(designs, problem.constraints)
    
    print(f"Best design after optimization: {best_designs[0].pipeline.name}")
    print(f"  Score: {best_designs[0].score:.3f}")
    
    print("\n=== RL Policy State ===")
    policy = RLPolicy()
    state = policy.get_policy_state()
    print(f"Q-table size: {state['q_table_size']}")
    print(f"Memory size: {state['memory_size']}")
    
    print("\n=== Reward Calculation ===")
    reward_calc = RewardCalculator()
    metrics = {"accuracy": 0.85, "cost": 50.0, "carbon_kg": 0.5}
    reward = reward_calc.calculate(metrics, problem.constraints)
    print(f"Reward for accuracy=0.85, cost=$50, carbon=0.5kg: {reward:.3f}")


if __name__ == "__main__":
    run_example()
