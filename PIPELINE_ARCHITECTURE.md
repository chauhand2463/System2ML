# System2ML - Pipeline Architecture Guide

## How Pipeline is Built from Scratch

This document explains how System2ML generates ML pipelines from user constraints.

---

## 1. User Input Flow

```
User uploads Dataset
        ↓
Set Constraints (cost, carbon, latency)
        ↓
Select Objective (accuracy, cost, speed)
        ↓
Choose Deployment (batch, realtime, edge)
        ↓
Select Compliance Level
```

---

## 2. Pipeline Generation Process

### Step 1: Constraint Validation

The system validates user constraints before generating pipelines:

```python
@dataclass
class ConstraintSpec:
    data_type: Literal["tabular", "text", "image", "time-series"]
    task: Literal["classification", "regression"]
    objective: Literal["accuracy", "cost", "latency", "carbon"]
    max_cost: float          # Budget in USD
    max_carbon: float       # Carbon footprint in kg
    max_latency: int        # Latency in ms
    deployment: Literal["batch", "realtime", "edge"]
    compliance: Literal["regulated", "non-regulated"]
    retraining: Literal["schedule", "drift", "none"]
```

### Step 2: Algorithm Selection

Based on data type, the system selects from algorithm library:

```python
ALGORITHM_LIBRARY = {
    "tabular": {
        "preprocessing": ["StandardScaler", "MinMaxScaler", "RobustScaler"],
        "models": {
            "LogisticRegression": {"cost": 3, "carbon": 0.1, "latency": 50, "accuracy": 0.75},
            "RandomForest": {"cost": 8, "carbon": 0.3, "latency": 100, "accuracy": 0.82},
            "XGBoost": {"cost": 10, "carbon": 0.4, "latency": 120, "accuracy": 0.85},
            "LightGBM": {"cost": 7, "carbon": 0.25, "latency": 80, "accuracy": 0.84},
            "CatBoost": {"cost": 12, "carbon": 0.5, "latency": 150, "accuracy": 0.86},
        },
    },
    "text": {
        "preprocessing": ["Tokenizer", "TF-IDF"],
        "models": {
            "TF-IDF + LogisticRegression": {"cost": 2, "carbon": 0.08, "latency": 30, "accuracy": 0.72},
            "DistilBERT": {"cost": 25, "carbon": 1.2, "latency": 300, "accuracy": 0.88},
            "BERT": {"cost": 40, "carbon": 2.0, "latency": 500, "accuracy": 0.90},
        },
    },
    "image": {
        "preprocessing": ["Resize", "Normalize"],
        "models": {
            "ResNet50": {"cost": 50, "carbon": 3.0, "latency": 800, "accuracy": 0.88},
            "EfficientNet": {"cost": 35, "carbon": 2.0, "latency": 500, "accuracy": 0.87},
            "MobileNet": {"cost": 15, "carbon": 0.8, "latency": 150, "accuracy": 0.82},
        },
    },
}
```

### Step 3: Feasibility Check

The system filters out pipelines that violate constraints:

```
For each model:
    IF estimated_cost > max_cost → REJECT
    IF estimated_carbon > max_carbon → REJECT
    IF estimated_latency > max_latency → REJECT
```

### Step 4: Ranking

Remaining pipelines are ranked by objective:

```python
if objective == "accuracy":
    score = estimated_accuracy
elif objective == "cost":
    score = 1.0 - (cost / 50.0)
elif objective == "carbon":
    score = 1.0 - (carbon / 5.0)
elif objective == "latency":
    score = 1.0 - (latency / 1000.0)
```

---

## 3. Generated Pipeline Structure

```json
{
  "rank": 1,
  "model": "XGBoost",
  "model_family": "classical",
  "estimated_accuracy": 0.85,
  "estimated_cost": 10,
  "estimated_carbon": 0.4,
  "estimated_latency": 120,
  "meets_constraints": true,
  "pipeline_spec": {
    "data": {
      "cleaning": ["dedup", "impute"],
      "split": "stratified"
    },
    "model": {
      "type": "XGBoost",
      "training": "batch"
    },
    "deployment": {
      "mode": "batch"
    },
    "monitoring": {
      "drift": true,
      "performance": true
    },
    "governance": {
      "requires_approval": false,
      "audit": true
    }
  },
  "explanation": "XGBoost selected as it meets all constraints and optimizes for accuracy"
}
```

---

## 4. Visual Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INPUTS                                  │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌────────────┐   │
│  │ Dataset │  │Constraints│  │Objective│  │ Deployment │   │
│  │ (CSV)   │  │$10, 1kg   │  │accuracy │  │   batch    │   │
│  └─────────┘  └──────────┘  └─────────┘  └────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                  DESIGN AGENT                                    │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │   Validation    │───▶│   Algorithm     │                    │
│  │   Check         │    │   Selection     │                    │
│  └─────────────────┘    └─────────────────┘                    │
│         ↓                          ↓                            │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │  Feasibility    │───▶│     Ranking     │                    │
│  │  Filter          │    │   (by objective)│                    │
│  └─────────────────┘    └─────────────────┘                    │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                  OUTPUT: PIPELINE DESIGN                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Pipeline #1: XGBoost (Score: 0.85)                   │    │
│  │  Pipeline #2: LightGBM (Score: 0.84)                   │    │
│  │  Pipeline #3: RandomForest (Score: 0.82)              │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Key Components

### DesignAgent
Main class that orchestrates pipeline generation:

```python
class DesignAgent:
    def generate_designs(self, constraints: ConstraintSpec) -> dict:
        # 1. Validate constraints
        feasibility = self.validator.validate(constraints)
        
        # 2. Get algorithms for data type
        algorithms = ALGORITHM_LIBRARY[constraints.data_type]
        
        # 3. Filter by hardware/deployment
        candidates = self._filter_candidates(algorithms, constraints)
        
        # 4. Apply hard constraints
        filtered = self._apply_hard_filters(candidates, constraints)
        
        # 5. Rank by objective
        ranked = self._rank_pipelines(filtered, constraints)
        
        return {"designs": ranked}
```

### ConstraintValidator
Validates user constraints:

```python
class ConstraintValidator:
    def validate(self, constraints):
        violations = []
        
        # Check realtime latency
        if constraints.deployment == "realtime" and constraints.max_latency < 100:
            violations.append("Realtime requires latency >= 100ms")
        
        # Check edge cost
        if constraints.deployment == "edge" and constraints.max_cost > 5:
            violations.append("Edge deployment typically costs < $5")
        
        # Check image on edge
        if constraints.data_type == "image" and constraints.deployment == "edge":
            if constraints.max_latency < 200:
                violations.append("Image on edge requires >= 200ms latency")
        
        return FeasibilityResult(is_feasible=len(violations) == 0)
```

---

## 6. Dataset Profiling

Before pipeline design, the system profiles the dataset:

```python
def profile_dataset(file_type, size_mb):
    # Detect data type
    if file_type in ["csv", "parquet"]:
        data_type = "tabular"
    elif file_type == "image":
        data_type = "image"
    elif file_type == "text":
        data_type = "text"
    
    # Estimate rows from size
    rows = int(size_mb * 1000)
    
    # Check for PII
    pii_fields = detect_pii(columns)
    
    # Detect label column
    label_present = detect_label(columns)
    
    return {
        "type": data_type,
        "rows": rows,
        "pii_detected": len(pii_fields) > 0,
        "label_present": label_present
    }
```

---

## 7. Training Execution

After pipeline selection, training runs with constraint monitoring:

```python
class TrainingRunner:
    def train(self, pipeline, constraints):
        while training:
            # Monitor cost
            if cost_spent > constraints.max_cost:
                self.stop("Cost limit exceeded")
            
            # Monitor carbon
            if carbon_used > constraints.max_carbon:
                self.stop("Carbon limit exceeded")
            
            # Update progress
            progress += 0.1
            
        return {
            "status": "completed",
            "metrics": accuracy,
            "artifacts": model_file
        }
```

---

## 8. Summary

System2ML pipeline generation:

1. **User uploads dataset** → System profiles and detects type
2. **User sets constraints** → System validates feasibility
3. **System generates candidates** → Filters by constraints
4. **User selects pipeline** → System validates safety
5. **Training begins** → Live constraint monitoring
6. **Training complete** → Model artifacts generated

---

**Built by Chandan Kumar** 🚀
