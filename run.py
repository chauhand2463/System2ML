import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "src"))

import argparse
import json
from agent.planner import DesignAgent, ConstraintSpec


def main():
    parser = argparse.ArgumentParser(description="System2ML - Constraint-Based Pipeline Design")
    
    # Required inputs
    parser.add_argument("--data-type", required=True, choices=["tabular", "text", "image", "time-series"])
    parser.add_argument("--task", required=True, choices=["classification", "regression", "ranking", "generation"])
    parser.add_argument("--objective", required=True, choices=["accuracy", "f1", "recall", "latency", "cost", "carbon"])
    parser.add_argument("--max-cost", type=float, required=True)
    parser.add_argument("--max-carbon", type=float, required=True)
    parser.add_argument("--max-latency", type=int, required=True)
    parser.add_argument("--deployment", required=True, choices=["batch", "realtime", "edge"])
    parser.add_argument("--compliance", required=True, choices=["regulated", "non-regulated"])
    parser.add_argument("--retraining", required=True, choices=["schedule", "drift", "none"])
    
    # Optional
    parser.add_argument("--hardware", choices=["CPU-only", "GPU-allowed"])
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--target", default="target")
    parser.add_argument("--data-path", default="./data/train.csv")
    
    args = parser.parse_args()
    
    print("=" * 70)
    print("  System2ML - Constraint-Based Pipeline Design")
    print("=" * 70)
    
    print("\n--- USER CONSTRAINTS (Hard) ---")
    print(f"  Data Type:     {args.data_type}")
    print(f"  Task:          {args.task}")
    print(f"  Objective:     {args.objective}")
    print(f"  Max Cost:      ${args.max_cost}")
    print(f"  Max Carbon:    {args.max_carbon} kg")
    print(f"  Max Latency:   {args.max_latency} ms")
    print(f"  Deployment:    {args.deployment}")
    print(f"  Compliance:    {args.compliance}")
    print(f"  Retraining:    {args.retraining}")
    
    if args.hardware:
        print(f"  Hardware:      {args.hardware}")
    
    constraints = ConstraintSpec(
        data_type=args.data_type,
        task=args.task,
        objective=args.objective,
        max_cost=args.max_cost,
        max_carbon=args.max_carbon,
        max_latency=args.max_latency,
        deployment=args.deployment,
        compliance=args.compliance,
        retraining=args.retraining,
        hardware=args.hardware,
    )
    
    print("\n" + "=" * 70)
    print("  Validating Constraints & Generating Pipelines...")
    print("=" * 70)
    
    agent = DesignAgent()
    result = agent.generate_designs(constraints)
    
    if result["status"] == "infeasible":
        print("\n[ERROR] Input constraints are infeasible!")
        print("\nViolations:")
        for v in result["feasibility"]["violations"]:
            print(f"  - {v}")
        print("\nSuggestions:")
        for s in result["feasibility"]["suggestions"]:
            print(f"  - {s}")
        return
    
    if result["status"] == "no_feasible":
        print("\n[ERROR] No pipeline meets all constraints!")
        print("\nViolations:")
        for v in result["feasibility"]["violations"]:
            print(f"  - {v}")
        print("\nSuggestions to relax constraints:")
        for s in result["feasibility"]["suggestions"]:
            print(f"  - {s}")
        return
    
    print(f"\n[OK] {len(result['designs'])} feasible pipelines found")
    print("  All designs meet your cost, carbon, and latency limits.")
    
    print("\n" + "=" * 70)
    print("  FEASIBLE PIPELINES (Ranked by " + args.objective.upper() + ")")
    print("=" * 70)
    
    for i, design in enumerate(result["designs"], 1):
        meets = "YES" if design.get("meets_constraints", True) else "NO"
        print(f"\n--- Rank {i} ---")
        print(f"  Model:           {design['model']}")
        print(f"  Model Family:    {design['model_family']}")
        print(f"  Estimated Cost:   ${design['estimated_cost']}")
        print(f"  Estimated Carbon: {design['estimated_carbon']} kg")
        print(f"  Estimated Latency: {design['estimated_latency']} ms")
        print(f"  Estimated Accuracy: {design['estimated_accuracy']}")
        print(f"  Meets Constraints: {meets}")
        
        if not design.get("meets_constraints", True):
            print(f"  Violation: {design.get('violation', 'N/A')}")
        
        print(f"  Explanation: {design['explanation']}")
    
    print("\n" + "=" * 70)
    
    if args.execute:
        print("\n[READY TO EXECUTE]")
        print(f"  Pipeline: {result['designs'][0]['model']}")
        print(f"  Estimated Cost: ${result['designs'][0]['estimated_cost']}")
        print(f"  Estimated Carbon: {result['designs'][0]['estimated_carbon']} kg")
        print("\n  Note: Execution would use real ML training with provided data.")
        print("  Use --data-path to specify your data file.")
    
    print("\n" + "=" * 70)
    print("  Done!")
    print("=" * 70)


if __name__ == "__main__":
    main()
