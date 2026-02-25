# System2ML

AI-driven ML pipeline design, execution, and optimization system.

## Overview

System2ML is a closed-loop ML pipeline automation system where AI designs pipelines, executes them automatically, and learns from failures to improve over time.

## Features

- **Pipeline Design Agent**: AI-powered pipeline architecture generation
- **Multi-objective Optimization**: Balance accuracy, cost, carbon, and latency
- **Failure Memory**: Learn from failures and avoid repeated mistakes
- **Observability**: MLflow metrics, carbon tracking, drift detection
- **Governance**: Policy engine and audit logging

## Quick Start

```bash
pip install -e .
```

## Usage

```python
from agent import DesignAgent
from core import ProblemSpec, DataType

problem = ProblemSpec(
    data_type=DataType.TABULAR,
    dataset_path="./data/train.csv",
    target_column="target",
    constraints={"budget": 100, "carbon_limit_kg": 1.0},
    objective={"primary_metric": "accuracy", "target_score": 0.9},
)

agent = DesignAgent()
designs = agent.generate_designs(problem)
```

## API

```bash
uvicorn ui.api:app --reload
```

## Project Structure

```
System2ML/
├── agent/           # AI planning and RL
├── pipelines/       # ML pipelines (tabular, nlp, vision)
├── orchestrator/   # Airflow & Kubeflow
├── observability/  # Metrics, carbon, drift
├── memory/         # Failure store
├── governance/     # Policies, audit
├── benchmarks/     # Evaluation benchmarks
└── ui/            # FastAPI
```

## License

MIT
