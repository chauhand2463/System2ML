# 🔧 How System2ML Pipeline is Built from Scratch

## Overview

System2ML builds ML pipelines from user constraints through a systematic process:

```
User Input → Dataset → Constraints → AI Design → Training → Model
```

---

## Step-by-Step Process

### Step 1: User Input
```
User visits /datasets/new
    ↓
Uploads dataset (CSV, JSON, Image, Text)
    ↓
Or connects to external source (S3, Database)
```

### Step 2: Dataset Profiling
Backend (`ui/api.py`) profiles the dataset:
```python
# Detect data type
if file_type in ["csv", "parquet"]:
    data_type = "tabular"
elif file_type == "image":
    data_type = "image"
elif file_type == "text":
    data_type = "text"

# Calculate metrics
rows = int(size_mb * 1000)
features = columns - 1

# Check for PII
pii_fields = detect_pii(column_names)
```

### Step 3: Set Constraints
User defines:
- **Max Cost**: $10
- **Max Carbon**: 1kg
- **Max Latency**: 200ms
- **Objective**: accuracy / cost / speed
- **Deployment**: batch / realtime / edge

### Step 4: Design Agent Generates Pipelines
Core logic in `agent/planner.py`:

```python
# Algorithm Library - Pre-defined models with specs
ALGORITHM_LIBRARY = {
    "tabular": {
        "XGBoost": {"cost": 10, "carbon": 0.4, "latency": 120, "accuracy": 0.85},
        "RandomForest": {"cost": 8, "carbon": 0.3, "latency": 100, "accuracy": 0.82},
        "LightGBM": {"cost": 7, "carbon": 0.25, "latency": 80, "accuracy": 0.84},
    },
    "text": {
        "BERT": {"cost": 40, "carbon": 2.0, "latency": 500, "accuracy": 0.90},
        "DistilBERT": {"cost": 25, "carbon": 1.2, "latency": 300, "accuracy": 0.88},
    },
    "image": {
        "ResNet50": {"cost": 50, "carbon": 3.0, "latency": 800, "accuracy": 0.88},
        "MobileNet": {"cost": 15, "carbon": 0.8, "latency": 150, "accuracy": 0.82},
    },
}
```

### Step 5: Feasibility Check
Filter pipelines that violate constraints:
```python
for model in candidates:
    if model.cost > max_cost:
        reject(model)
    if model.carbon > max_carbon:
        reject(model)
    if model.latency > max_latency:
        reject(model)
```

### Step 6: Ranking
Sort by objective:
```python
if objective == "accuracy":
    score = model.accuracy
elif objective == "cost":
    score = 1.0 - (model.cost / 50)
```

### Step 7: Output - Pipeline Design
```json
{
  "rank": 1,
  "model": "XGBoost",
  "estimated_accuracy": 0.85,
  "estimated_cost": 10,
  "estimated_carbon": 0.4,
  "estimated_latency": 120,
  "meets_constraints": true,
  "pipeline_spec": {
    "data": {"cleaning": ["dedup", "impute"]},
    "model": {"type": "XGBoost"},
    "monitoring": {"drift": true}
  }
}
```

### Step 8: Training with Live Monitoring
Training runs with constraint enforcement:
```python
while training:
    if cost_spent > max_cost:
        stop("Budget exceeded")
    if carbon_used > max_carbon:
        stop("Carbon limit exceeded")
    progress += 0.1
```

---

## Visual Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE                           │
│  /datasets/new  →  /design/constraints  →  /design/results │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                        │
│                                                             │
│  1. profile_dataset()     → Dataset profiling             │
│  2. validate_constraints() → Constraint validation         │
│  3. generate_candidates() → Pipeline generation           │
│  4. validate_execution()   → Safety gate                  │
│  5. start_training()      → Training execution            │
│  6. get_training_status() → Live monitoring               │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 DESIGN AGENT (agent/planner.py)            │
│                                                             │
│  ALGORITHM_LIBRARY → ConstraintValidator → PipelineRanking │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Files

| File | Purpose |
|------|---------|
| `ui/api.py` | All API endpoints |
| `agent/planner.py` | Pipeline generation logic |
| `lib/validation/` | Constraint validation |
| `lib/feasibility/` | Feasibility policy |
| `lib/safety/gate.py` | Safety validation |

---

## Example Run

**Input:**
- Dataset: employee_data.csv (tabular)
- Max Cost: $10
- Max Carbon: 1kg
- Max Latency: 200ms
- Objective: accuracy

**Processing:**
1. Profile: tabular data, 15 rows, 8 features
2. Select models: XGBoost, LightGBM, RandomForest
3. Filter: All meet constraints
4. Rank: XGBoost (85%) > LightGBM (84%) > RandomForest (82%)

**Output:**
```json
{
  "designs": [
    {"model": "XGBoost", "accuracy": 0.85, "cost": 10},
    {"model": "LightGBM", "accuracy": 0.84, "cost": 7},
    {"model": "RandomForest", "accuracy": 0.82, "cost": 8}
  ]
}
```

---

## Summary

1. **Upload Dataset** → Profile analyzes type, size, labels
2. **Set Constraints** → User defines limits
3. **AI Design Agent** → Generates candidate pipelines
4. **Feasibility Check** → Filters invalid pipelines
5. **Ranking** → Sorts by objective
6. **Safety Gate** → Final validation
7. **Training** → Live monitoring with auto-stop
8. **Model Output** → Artifacts generated

---

**Built by Chandan Kumar** 🚀
