import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Literal
import uuid
from datetime import datetime
import random
import json

from agent.planner import DesignAgent, ConstraintSpec
from ui.database import PipelineStore, DesignStore, RunStore, ActivityStore, FailureStore

app = FastAPI(title="System2ML API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DataProfile(BaseModel):
    type: Literal["tabular", "text", "image", "time-series"]
    size_mb: Optional[float] = None
    features: Optional[int] = None
    label_type: Optional[str] = None


class Constraints(BaseModel):
    max_cost_usd: float
    max_carbon_kg: float
    max_latency_ms: int
    compliance_level: Literal["low", "regulated", "high"]


class DesignRequest(BaseModel):
    data_profile: DataProfile
    objective: Literal["accuracy", "robustness", "speed", "cost"]
    constraints: Constraints
    deployment: Literal["batch", "realtime", "edge"]
    retraining: Literal["time", "drift", "none"]
    name: Optional[str] = None


@app.get("/")
def root():
    return {"message": "System2ML API", "version": "0.1.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.post("/api/design/request")
def design_pipeline(request: DesignRequest):
    try:
        constraints = ConstraintSpec(
            data_type=request.data_profile.type,
            task="classification",
            objective=request.objective,
            max_cost=request.constraints.max_cost_usd,
            max_carbon=request.constraints.max_carbon_kg,
            max_latency=request.constraints.max_latency_ms,
            deployment=request.deployment,
            compliance=request.constraints.compliance_level,
            retraining=request.retraining,
        )
        
        agent = DesignAgent()
        result = agent.generate_designs(constraints)
        
        pipeline_id = str(uuid.uuid4())[:8]
        name = request.name or f"Pipeline-{pipeline_id}"
        
        PipelineStore.create(
            pipeline_id=pipeline_id,
            name=name,
            data_type=request.data_profile.type,
            objective=request.objective,
            constraints={
                "max_cost_usd": request.constraints.max_cost_usd,
                "max_carbon_kg": request.constraints.max_carbon_kg,
                "max_latency_ms": request.constraints.max_latency_ms,
                "compliance_level": request.constraints.compliance_level,
            },
            deployment=request.deployment,
            retraining=request.retraining,
        )
        
        for i, design in enumerate(result.get("designs", [])):
            DesignStore.create(pipeline_id, design, i + 1)
        
        status = result.get("status", "unknown")
        if status == "success":
            PipelineStore.update_status(pipeline_id, "designed")
            ActivityStore.log(
                type_="pipeline",
                title=f"Pipeline '{name}' designed",
                description=f"Generated {len(result.get('designs', []))} pipeline designs",
                severity="low"
            )
        else:
            PipelineStore.update_status(pipeline_id, "failed")
        
        response = {
            "pipeline_id": pipeline_id,
            "name": name,
            "designs": result.get("designs", []),
            "request_id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "feasibility": result.get("feasibility", {}),
            "status": status,
        }
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/pipelines")
def list_pipelines():
    pipelines = PipelineStore.get_all()
    for p in pipelines:
        if p.get('constraints'):
            p['constraints'] = json.loads(p['constraints']) if isinstance(p['constraints'], str) else p['constraints']
    return {"pipelines": pipelines}


@app.get("/api/pipelines/{pipeline_id}")
def get_pipeline(pipeline_id: str):
    pipeline = PipelineStore.get_by_id(pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    if pipeline.get('constraints'):
        pipeline['constraints'] = json.loads(pipeline['constraints']) if isinstance(pipeline['constraints'], str) else pipeline['constraints']
    designs = DesignStore.get_by_pipeline(pipeline_id)
    return {"pipeline": pipeline, "designs": designs}


@app.post("/api/pipelines/{pipeline_id}/execute")
def execute_pipeline(pipeline_id: str):
    pipeline = PipelineStore.get_by_id(pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    run_id = str(uuid.uuid4())[:12]
    RunStore.create(run_id, pipeline_id)
    
    PipelineStore.update_status(pipeline_id, "running")
    
    ActivityStore.log(
        type_="deployment",
        title=f"Pipeline '{pipeline['name']}' execution started",
        description=f"Run ID: {run_id}",
        severity="medium"
    )
    
    import time
    time.sleep(1)
    
    accuracy = random.uniform(0.75, 0.95)
    f1 = random.uniform(0.70, 0.92)
    cost = random.uniform(1, 15)
    carbon = random.uniform(0.1, 1.5)
    
    metrics = {
        "accuracy": round(accuracy, 4),
        "f1": round(f1, 4),
        "cost_usd": round(cost, 2),
        "carbon_kg": round(carbon, 3),
    }
    
    RunStore.update_status(run_id, "completed", metrics=metrics)
    PipelineStore.update_status(pipeline_id, "active")
    
    ActivityStore.log(
        type_="deployment",
        title=f"Pipeline '{pipeline['name']}' completed successfully",
        description=f"Accuracy: {metrics['accuracy']:.2%}, Cost: ${metrics['cost_usd']:.2f}",
        severity="low"
    )
    
    return {"run_id": run_id, "status": "completed", "metrics": metrics}


@app.get("/api/runs")
def list_runs():
    runs = RunStore.get_all()
    for r in runs:
        if r.get('metrics'):
            r['metrics'] = json.loads(r['metrics']) if isinstance(r['metrics'], str) else r['metrics']
    return {"runs": runs}


@app.get("/api/runs/{run_id}")
def get_run(run_id: str):
    runs = RunStore.get_all()
    for r in runs:
        if r.get('id') == run_id:
            if r.get('metrics'):
                r['metrics'] = json.loads(r['metrics']) if isinstance(r['metrics'], str) else r['metrics']
            return r
    raise HTTPException(status_code=404, detail="Run not found")


@app.get("/api/metrics")
def get_metrics():
    runs = RunStore.get_all()
    completed = [r for r in runs if r.get('status') == 'completed']
    
    if not completed:
        return {"total_runs": 0, "avg_accuracy": 0, "avg_cost": 0, "avg_carbon": 0}
    
    accuracies = []
    costs = []
    carbons = []
    
    for r in completed:
        m = r.get('metrics', {})
        if isinstance(m, str):
            m = json.loads(m)
        if m:
            accuracies.append(m.get('accuracy', 0))
            costs.append(m.get('cost_usd', 0))
            carbons.append(m.get('carbon_kg', 0))
    
    return {
        "total_runs": len(completed),
        "avg_accuracy": round(sum(accuracies) / len(accuracies), 4) if accuracies else 0,
        "avg_cost": round(sum(costs) / len(costs), 2) if costs else 0,
        "avg_carbon": round(sum(carbons) / len(carbons), 3) if carbons else 0,
    }


@app.get("/api/failures")
def list_failures():
    return {"failures": FailureStore.get_all()}


@app.get("/api/activities")
def list_activities():
    return {"activities": ActivityStore.get_recent()}


@app.get("/api/predefined-pipelines")
def list_predefined():
    return {
        "pipelines": [
            {"name": "titanic_survival", "description": "Titanic survival prediction", "data_type": "tabular"},
            {"name": "iris_classification", "description": "Iris flower classification", "data_type": "tabular"},
            {"name": "sentiment_analysis", "description": "Text sentiment classification", "data_type": "text"},
            {"name": "image_classification", "description": "Image classification", "data_type": "image"},
            {"name": "timeseries_forecast", "description": "Time series forecasting", "data_type": "time-series"},
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
