import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "src"))

import requests
import json
import argparse

BASE_URL = "http://localhost:8000"


def design_pipeline(data_type="tabular", objective="accuracy", max_cost=10, max_carbon=1.0, max_latency=200, compliance="regulated", deployment="batch", retraining="drift"):
    """Design a new pipeline"""
    payload = {
        "data_profile": {
            "type": data_type,
            "size_mb": 1200,
            "features": 45,
            "label_type": "binary"
        },
        "objective": objective,
        "constraints": {
            "max_cost_usd": max_cost,
            "max_carbon_kg": max_carbon,
            "max_latency_ms": max_latency,
            "compliance_level": compliance
        },
        "deployment": deployment,
        "retraining": retraining
    }
    
    response = requests.post(f"{BASE_URL}/api/design/request", json=payload)
    return response.json()


def execute_pipeline(pipeline_id, data_path="./data/train.csv", target_column="target"):
    """Execute a pipeline"""
    payload = {
        "data_path": data_path,
        "target_column": target_column
    }
    response = requests.post(f"{BASE_URL}/api/pipelines/{pipeline_id}/execute", json=payload)
    return response.json()


def get_metrics():
    """Get system metrics"""
    response = requests.get(f"{BASE_URL}/api/metrics")
    return response.json()


def list_pipelines():
    """List all pipelines"""
    response = requests.get(f"{BASE_URL}/api/pipelines")
    return response.json()


def list_runs():
    """List all runs"""
    response = requests.get(f"{BASE_URL}/api/runs")
    return response.json()


def list_predefined():
    """List predefined pipelines"""
    response = requests.get(f"{BASE_URL}/api/predefined-pipelines")
    return response.json()


def main():
    parser = argparse.ArgumentParser(description="System2ML CLI")
    parser.add_argument("command", choices=["design", "execute", "metrics", "list", "runs", "predefined"])
    parser.add_argument("--data-type", default="tabular")
    parser.add_argument("--objective", default="accuracy")
    parser.add_argument("--max-cost", type=float, default=10)
    parser.add_argument("--max-carbon", type=float, default=1.0)
    parser.add_argument("--max-latency", type=int, default=200)
    parser.add_argument("--compliance", default="regulated")
    parser.add_argument("--deployment", default="batch")
    parser.add_argument("--retraining", default="drift")
    parser.add_argument("--pipeline-id", help="Pipeline ID for execute command")
    parser.add_argument("--data-path", default="./data/train.csv")
    parser.add_argument("--target", default="target")
    
    args = parser.parse_args()
    
    if args.command == "design":
        result = design_pipeline(
            data_type=args.data_type,
            objective=args.objective,
            max_cost=args.max_cost,
            max_carbon=args.max_carbon,
            max_latency=args.max_latency,
            compliance=args.compliance,
            deployment=args.deployment,
            retraining=args.retraining,
        )
        print(json.dumps(result, indent=2))
        
    elif args.command == "execute":
        if not args.pipeline_id:
            print("Error: --pipeline-id required for execute command")
            return
        result = execute_pipeline(args.pipeline_id, args.data_path, args.target)
        print(json.dumps(result, indent=2))
        
    elif args.command == "metrics":
        print(json.dumps(get_metrics(), indent=2))
        
    elif args.command == "list":
        print(json.dumps(list_pipelines(), indent=2))
        
    elif args.command == "runs":
        print(json.dumps(list_runs(), indent=2))
        
    elif args.command == "predefined":
        print(json.dumps(list_predefined(), indent=2))


if __name__ == "__main__":
    main()
