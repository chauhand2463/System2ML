import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Literal, List, Dict, Any
from fastapi.responses import JSONResponse
import uuid
from datetime import datetime
import random
import json

from agent.planner import DesignAgent, ConstraintSpec
from ui.database import PipelineStore, DesignStore, RunStore, ActivityStore, FailureStore, UserStore, SessionStore, generate_token
from lib.state_machine import LifecycleState, ProjectState, ProjectStore, ValidationError, ConstraintViolation, PAGE_TO_STATE

app = FastAPI(title="System2ML API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str


class AuthResponse(BaseModel):
    user: dict
    token: str


@app.post("/api/auth/register", response_model=AuthResponse)
def register(request: RegisterRequest):
    if not request.email or not request.password or not request.name:
        raise HTTPException(status_code=400, detail="All fields are required")
    
    if len(request.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    
    user = UserStore.create(request.email, request.password, request.name)
    
    if not user:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    token = SessionStore.create(user['id'], generate_token())
    
    return AuthResponse(user=user, token=token)


# ===== LIFECYCLE STATE MACHINE API =====

@app.get("/api/lifecycle/state/{project_id}")
def get_lifecycle_state(project_id: str):
    project = ProjectStore.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {
        "project_id": project.id,
        "name": project.name,
        "current_state": project.current_state.value if project.current_state else None,
        "allowed_next_states": [s.value for s in project.get_allowed_next_states()],
        "is_blocked": project.is_blocked(),
        "blocking_errors": [{"code": e.code, "message": e.message, "action": e.action} for e in project.get_blocking_errors()],
        "validation_errors": [{"code": e.code, "message": e.message, "action": e.action} for e in project.validation_errors],
        "constraints": project.constraints,
        "profile_info": project.profile_info,
        "dataset_info": project.dataset_info,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }


@app.post("/api/lifecycle/transition/{project_id}")
def transition_state(project_id: str, target_state: str, metadata: Optional[Dict[str, Any]] = None):
    project = ProjectStore.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        target = LifecycleState(target_state)
        project.transition_to(target, metadata or {})
        return {"success": True, "current_state": project.current_state.value}
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid target state: {target_state}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/lifecycle/validate/{project_id}")
def validate_state_access(project_id: str, requested_page: str):
    project = ProjectStore.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    required_state = PAGE_TO_STATE.get(requested_page)
    if not required_state:
        return {"allowed": True, "reason": "Page has no state requirement"}
    
    can_access = project.can_transition_to(required_state) or project.current_state == required_state
    
    return {
        "allowed": can_access,
        "required_state": required_state.value,
        "current_state": project.current_state.value if project.current_state else None,
        "allowed_states": [s.value for s in project.get_allowed_next_states()],
        "is_blocked": project.is_blocked(),
        "blocking_errors": [{"code": e.code, "message": e.message, "action": e.action} for e in project.get_blocking_errors()],
    }


@app.post("/api/projects")
def create_project(name: str):
    project = ProjectStore.create(name)
    return {"project_id": project.id, "name": project.name, "current_state": project.current_state.value}


@app.get("/api/projects")
def list_projects():
    projects = ProjectStore.get_all()
    return [
        {"project_id": p.id, "name": p.name, "current_state": p.current_state.value if p.current_state else None}
        for p in projects
    ]


@app.get("/api/projects/{project_id}")
def get_project(project_id: str):
    project = ProjectStore.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "project_id": project.id,
        "name": project.name,
        "current_state": project.current_state.value if project.current_state else None,
        "constraints": project.constraints,
        "profile_info": project.profile_info,
        "candidates": project.candidates,
        "selected_pipeline": project.selected_pipeline,
        "training_plan": project.training_plan,
        "training_result": project.training_result,
    }


# ===== DATASET VALIDATION GATE =====

class DatasetProfileRequest(BaseModel):
    project_id: Optional[str] = None
    source: str = "upload"
    file_name: Optional[str] = "dataset"
    file_type: Optional[str] = "csv"
    file_size_mb: float = 1.0
    dataset_type: str = "tabular"
    rows: int = 1000
    columns: int = 10
    has_labels: bool = True
    pii_detected: bool = False
    connection_config: Optional[Dict[str, Any]] = None
    dataset_id: Optional[str] = None


class DatasetValidationRequest(BaseModel):
    project_id: Optional[str] = None
    compliance_level: Literal["low", "regulated", "high"] = "low"


@app.post("/api/datasets/profile")
def profile_dataset(request: DatasetProfileRequest):
    project_id = request.project_id
    
    # Create project if not exists
    project = None
    if project_id:
        project = ProjectStore.get(project_id)
    
    if not project:
        project = ProjectStore.create(f"Project-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}")
        project_id = project.id
    
    # Map frontend format to profile data
    profile_data = {
        "name": request.file_name or request.dataset_id or "dataset",
        "source": request.source or "upload",
        "type": request.dataset_type or "tabular",
        "rows": request.rows or 1000,
        "columns": request.columns or 10,
        "has_labels": True if request.has_labels is None else request.has_labels,
        "pii_detected": request.pii_detected or False,
        "file_size_mb": request.file_size_mb or 0.0,
    }
    
    project.profile_info = profile_data
    project.dataset_info = profile_data
    
    try:
        project.transition_to(LifecycleState.DATASET_PROFILED, profile_data)
    except:
        pass  # If already transitioned
    
    return {
        "status": "success",
        "profile": profile_data,
        "dataset": profile_data,
        "current_state": project.current_state.value if project.current_state else None,
        "project_id": project.id,
    }


@app.post("/api/datasets/validate")
def validate_dataset(request: DatasetValidationRequest):
    project_id = request.project_id
    
    # Get or create project
    project = None
    if project_id:
        project = ProjectStore.get(project_id)
    
    if not project:
        project = ProjectStore.create(f"Project-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}")
        project_id = project.id
    
    # Create default profile if none exists
    if not project.profile_info:
        project.profile_info = {
            "name": "dataset",
            "source": "upload",
            "type": "tabular",
            "rows": 1000,
            "columns": 10,
            "has_labels": True,
            "pii_detected": False,
            "file_size_mb": 10.0,
        }
        project.dataset_info = project.profile_info
    
    if project.current_state != LifecycleState.DATASET_PROFILED:
        try:
            project.transition_to(LifecycleState.DATASET_PROFILED, project.profile_info)
        except:
            pass  # Transition might fail if already in valid state
    
    errors = []
    
    profile = project.profile_info or {}
    
    if not profile.get("has_labels", True):
        errors.append(ValidationError(
            code="BLOCK_NO_LABELS",
            message="Dataset has no labels for supervised learning",
            action="add_label_column"
        ))
    
    if profile.get("pii_detected", False) and request.compliance_level == "low":
        errors.append(ValidationError(
            code="BLOCK_PII_DETECTED",
            message="PII detected but compliance level is not regulated",
            action="anonymize_or_upgrade_compliance"
        ))
    
    if profile.get("file_size_mb", 0) > 1000:
        errors.append(ValidationError(
            code="BLOCK_DATASET_TOO_LARGE",
            message="Dataset exceeds 1GB limit",
            action="sample_or_compress"
        ))
    
    project.validation_errors = errors
    
    if errors:
        try:
            project.transition_to(LifecycleState.TRAINING_BLOCKED, {"errors": [{"code": e.code, "message": e.message, "action": e.action} for e in errors]})
        except:
            pass
        return {
            "status": "blocked",
            "errors": [{"code": e.code, "message": e.message, "action": e.action} for e in errors],
            "current_state": project.current_state.value if project.current_state else None,
        }
    
    try:
        project.transition_to(LifecycleState.DATASET_VALIDATED, {"errors": []})
    except:
        pass
    
    return {
        "status": "valid",
        "errors": [],
        "current_state": project.current_state.value if project.current_state else None,
    }


# ===== TRAINING PLANNING GATE =====

class TrainingPlanRequest(BaseModel):
    project_id: str
    pipeline_id: Optional[str] = None
    model_type: str = "random_forest"
    dataset_rows: int = 10000
    estimated_epochs: int = 100


@app.post("/api/training/plan")
def plan_training(request: TrainingPlanRequest):
    project = ProjectStore.get(request.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.current_state not in [LifecycleState.EXECUTION_APPROVED, LifecycleState.CANDIDATES_GENERATED]:
        raise HTTPException(status_code=400, detail="Pipeline must be approved before planning training")
    
    constraints = project.constraints
    max_cost = constraints.get("max_cost_usd", 100)
    max_carbon = constraints.get("max_carbon_kg", 10)
    max_latency = constraints.get("max_latency_ms", 60000)
    
    estimated_cost = (request.dataset_rows / 10000) * 0.05 * (request.estimated_epochs / 100)
    estimated_carbon = estimated_cost * 0.5
    estimated_time_ms = (request.dataset_rows / 1000) * 1000 * (request.estimated_epochs / 100)
    peak_memory_mb = (request.dataset_rows / 10000) * 512
    
    violations = []
    
    if estimated_cost > max_cost:
        violations.append(ConstraintViolation(
            metric="cost",
            estimated=estimated_cost,
            limit=max_cost,
            suggestion="sample_data or switch_model_family"
        ))
    
    if estimated_carbon > max_carbon:
        violations.append(ConstraintViolation(
            metric="carbon",
            estimated=estimated_carbon,
            limit=max_carbon,
            suggestion="reduce_epochs or use_smaller_model"
        ))
    
    if estimated_time_ms > max_latency:
        violations.append(ConstraintViolation(
            metric="latency",
            estimated=estimated_time_ms,
            limit=max_latency,
            suggestion="reduce_dataset_size or optimize_model"
        ))
    
    training_plan = {
        "estimated_cost_usd": round(estimated_cost, 2),
        "estimated_carbon_kg": round(estimated_carbon, 2),
        "estimated_time_ms": int(estimated_time_ms),
        "peak_memory_mb": int(peak_memory_mb),
        "model_type": request.model_type,
        "dataset_rows": request.dataset_rows,
        "violations": [
            {"metric": v.metric, "estimated": v.estimated, "limit": v.limit, "suggestion": v.suggestion}
            for v in violations
        ],
    }
    
    project.training_plan = training_plan
    
    if violations:
        project.transition_to(LifecycleState.TRAINING_BLOCKED, {"violations": violations, "plan": training_plan})
        return {
            "status": "blocked",
            "violations": [{"metric": v.metric, "estimated": v.estimated, "limit": v.limit, "suggestion": v.suggestion} for v in violations],
            "plan": training_plan,
            "current_state": project.current_state.value,
        }
    
    return {
        "status": "approved",
        "plan": training_plan,
        "current_state": project.current_state.value,
    }


# ===== LIVE TRAINING WITH KILL-SWITCH =====

class TrainingStartRequest(BaseModel):
    project_id: str
    pipeline_id: str


@app.post("/api/training/start")
def start_training(request: TrainingStartRequest):
    project = ProjectStore.get(request.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.current_state != LifecycleState.EXECUTION_APPROVED:
        raise HTTPException(status_code=400, detail="Training must be planned and approved before starting")
    
    training_config = {
        "pipeline_id": request.pipeline_id,
        "started_at": datetime.utcnow().isoformat(),
        "status": "running",
        "cost_used": 0.0,
        "carbon_used": 0.0,
    }
    
    project.transition_to(LifecycleState.TRAINING_RUNNING, training_config)
    
    return {
        "status": "started",
        "training_id": str(uuid.uuid4())[:8],
        "current_state": project.current_state.value,
    }


@app.get("/api/training/status/{project_id}")
def get_training_status(project_id: str):
    project = ProjectStore.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.current_state != LifecycleState.TRAINING_RUNNING:
        return {
            "status": project.current_state.value if project.current_state else "not_running",
            "training_result": project.training_result,
        }
    
    constraints = project.constraints
    max_cost = constraints.get("max_cost_usd", 100)
    max_carbon = constraints.get("max_carbon_kg", 10)
    
    running_plan = project.training_plan
    cost_used = running_plan.get("estimated_cost_usd", 0) * random.uniform(0.3, 0.7)
    carbon_used = running_plan.get("estimated_carbon_kg", 0) * random.uniform(0.3, 0.7)
    
    kill_reason = None
    if cost_used > max_cost:
        kill_reason = "COST_LIMIT_EXCEEDED"
    elif carbon_used > max_carbon:
        kill_reason = "CARBON_LIMIT_EXCEEDED"
    
    if kill_reason:
        project.transition_to(LifecycleState.TRAINING_KILLED, {
            "reason": kill_reason,
            "cost_used": cost_used,
            "carbon_used": carbon_used,
        })
        return {
            "status": "killed",
            "reason": kill_reason,
            "cost_used": round(cost_used, 2),
            "carbon_used": round(carbon_used, 2),
            "current_state": project.current_state.value,
        }
    
    return {
        "status": "running",
        "progress": random.randint(30, 70),
        "cost_used": round(cost_used, 2),
        "carbon_used": round(carbon_used, 2),
        "current_state": project.current_state.value,
    }


@app.post("/api/training/stop/{project_id}")
def stop_training(project_id: str):
    project = ProjectStore.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.current_state != LifecycleState.TRAINING_RUNNING:
        raise HTTPException(status_code=400, detail="No training running to stop")
    
    project.transition_to(LifecycleState.TRAINING_KILLED, {"reason": "USER_REQUESTED"})
    
    return {
        "status": "stopped",
        "current_state": project.current_state.value,
    }


@app.post("/api/training/complete/{project_id}")
def complete_training(project_id: str, metrics: Optional[Dict[str, Any]] = None):
    project = ProjectStore.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.current_state != LifecycleState.TRAINING_RUNNING:
        raise HTTPException(status_code=400, detail="No training running to complete")
    
    result = {
        "status": "completed",
        "completed_at": datetime.utcnow().isoformat(),
        "metrics": metrics or {},
        "cost_total": project.training_plan.get("estimated_cost_usd", 0),
        "carbon_total": project.training_plan.get("estimated_carbon_kg", 0),
    }
    
    project.transition_to(LifecycleState.TRAINING_COMPLETED, result)
    
    return {
        "status": "completed",
        "result": result,
        "current_state": project.current_state.value,
    }


@app.post("/api/auth/login", response_model=AuthResponse)
def login(request: LoginRequest):
    if not request.email or not request.password:
        raise HTTPException(status_code=400, detail="Email and password are required")
    
    user = UserStore.verify_login(request.email, request.password)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = SessionStore.create(user['id'], generate_token())
    
    return AuthResponse(user=user, token=token)


@app.post("/api/auth/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        SessionStore.delete(token)
    return {"message": "Logged out successfully"}


@app.get("/api/auth/me")
def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization[7:]
    user = SessionStore.get_user_by_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return user


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
    return {"message": "System2ML API", "version": "0.2.0"}


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
    cost = random.uniform(0.5, 5.0)
    carbon = random.uniform(0.01, 0.5)
    
    RunStore.update(
        run_id,
        status="completed",
        metrics={
            "accuracy": accuracy,
            "f1": f1,
            "cost": cost,
            "carbon": carbon,
        }
    )
    
    PipelineStore.update_status(pipeline_id, "active")
    
    ActivityStore.log(
        type_="deployment",
        title=f"Pipeline '{pipeline['name']}' completed successfully",
        description=f"Run ID: {run_id} - Accuracy: {accuracy:.2%}",
        severity="low"
    )
    
    return {
        "run_id": run_id,
        "pipeline_id": pipeline_id,
        "status": "completed",
        "metrics": {
            "accuracy": accuracy,
            "f1": f1,
            "cost": cost,
            "carbon": carbon,
        }
    }


@app.get("/api/runs")
def list_runs():
    runs = RunStore.get_all()
    return {"runs": runs}


@app.get("/api/runs/{run_id}")
def get_run(run_id: str):
    run = RunStore.get_by_id(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"run": run}


@app.get("/api/metrics")
def get_metrics():
    pipelines = PipelineStore.get_all()
    runs = RunStore.get_all()
    
    total_pipelines = len(pipelines)
    active_pipelines = len([p for p in pipelines if p.get('status') == 'active'])
    
    completed_runs = [r for r in runs if r.get('status') == 'completed']
    total_runs = len(runs)
    
    avg_accuracy = sum(r.get('metrics', {}).get('accuracy', 0) for r in completed_runs) / max(len(completed_runs), 1)
    avg_cost = sum(r.get('metrics', {}).get('cost', 0) for r in completed_runs) / max(len(completed_runs), 1)
    avg_carbon = sum(r.get('metrics', {}).get('carbon', 0) for r in completed_runs) / max(len(completed_runs), 1)
    avg_latency = random.uniform(50, 500)
    
    return {
        "total_pipelines": total_pipelines,
        "active_pipelines": active_pipelines,
        "total_runs": total_runs,
        "completed_runs": len(completed_runs),
        "avg_accuracy": avg_accuracy,
        "avg_cost": avg_cost,
        "avg_carbon": avg_carbon,
        "avg_latency": avg_latency,
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


# ============================================
# VALIDATION & FEASIBILITY ENDPOINTS
# ============================================

@app.post("/api/validate")
def validate_constraints(request: dict):
    """Validate user input constraints before design"""
    constraints = request.get("constraints", {})
    violations = []
    suggestions = []
    
    max_cost = constraints.get("max_cost_usd", 10)
    max_carbon = constraints.get("max_carbon_kg", 1.0)
    max_latency = constraints.get("max_latency_ms", 200)
    deployment = request.get("deployment", "batch")
    
    if max_cost < 0.1:
        violations.append({
            "constraint": "max_cost_usd",
            "value": max_cost,
            "required": 0.1,
            "severity": "hard",
            "message": "Cost must be at least $0.10"
        })
    
    if max_cost < 5 and deployment == "realtime":
        violations.append({
            "constraint": "max_cost_usd",
            "value": max_cost,
            "required": 5.0,
            "severity": "hard",
            "message": "Real-time deployment requires at least $5 budget"
        })
    
    if max_cost < 1:
        suggestions.append({
            "constraint": "max_cost_usd",
            "current_value": max_cost,
            "suggested_value": 5.0,
            "reason": "Accuracy optimization typically requires more compute",
            "priority": 1
        })
    
    feasibility_score = 1.0 - (len(violations) * 0.3)
    
    return {
        "is_valid": len([v for v in violations if v["severity"] == "hard"]) == 0,
        "violations": violations,
        "suggestions": suggestions,
        "feasibility_score": max(0.0, feasibility_score),
    }


@app.post("/api/feasibility/policy")
def get_feasibility_policy(request: dict):
    """Generate feasibility policy based on constraints"""
    constraints = request.get("constraints", {})
    deployment = request.get("deployment", "batch")
    compliance = constraints.get("compliance_level", "standard")
    
    eligible = ["classical", "small_deep", "compressed"]
    
    if compliance in ["regulated", "highly_regulated"]:
        eligible = ["classical", "compressed"]
    elif deployment != "edge":
        eligible.append("transformer")
    
    return {
        "request_id": str(uuid.uuid4()),
        "eligible_model_families": eligible,
        "hard_constraints": ["max_cost_usd", "max_carbon_kg"] + 
                           (["max_latency_ms"] if deployment == "realtime" else []),
        "soft_constraints": ["min_accuracy", "max_latency_ms"],
        "required_monitors": ["cost", "latency"] + 
                           (["carbon"] if constraints.get("max_carbon_kg", 1) < 1 else []),
    }


@app.post("/api/feasibility/generate")
def generate_pipeline_candidates(request: dict):
    """Generate pipeline candidates based on constraints"""
    constraints = request.get("constraints", {})
    max_cost = constraints.get("max_cost_usd", 10)
    max_carbon = constraints.get("max_carbon_kg", 1.0)
    max_latency = constraints.get("max_latency_ms", 200)
    
    profiles = {
        "classical": {"cost": 0.5, "carbon": 0.01, "latency": 100, "accuracy": 0.82},
        "small_deep": {"cost": 2.0, "carbon": 0.1, "latency": 500, "accuracy": 0.88},
        "compressed": {"cost": 0.8, "carbon": 0.03, "latency": 200, "accuracy": 0.85},
        "transformer": {"cost": 8.0, "carbon": 0.5, "latency": 2000, "accuracy": 0.95},
    }
    
    candidates = []
    for family, p in profiles.items():
        violates = []
        if p["cost"] > max_cost:
            violates.append({"constraint": "max_cost_usd", "message": f"${p['cost']} exceeds ${max_cost}"})
        if p["carbon"] > max_carbon:
            violates.append({"constraint": "max_carbon_kg", "message": f"{p['carbon']}kg exceeds {max_carbon}kg"})
        if p["latency"] > max_latency:
            violates.append({"constraint": "max_latency_ms", "message": f"{p['latency']}ms exceeds {max_latency}ms"})
        
        candidates.append({
            "id": str(uuid.uuid4()),
            "name": f"{family.title()} ML Pipeline",
            "description": f"Pipeline using {family} models",
            "model_families": [family],
            "estimated_cost": p["cost"],
            "estimated_carbon": p["carbon"],
            "estimated_latency_ms": p["latency"],
            "estimated_accuracy": p["accuracy"],
            "violates_constraints": violates,
        })
    
    feasible = [c for c in candidates if not c["violates_constraints"]]
    return {"candidates": candidates, "feasible_count": len(feasible), "total_count": len(candidates)}


@app.post("/api/safety/validate-execution")
def validate_execution(request: dict):
    """Validate pipeline for safe execution"""
    constraints = request.get("constraints", {})
    pipeline = request.get("pipeline", {})
    
    max_cost = constraints.get("max_cost_usd", 10)
    max_carbon = constraints.get("max_carbon_kg", 1.0)
    max_latency = constraints.get("max_latency_ms", 200)
    
    est_cost = pipeline.get("estimated_cost", 0)
    est_carbon = pipeline.get("estimated_carbon", 0)
    est_latency = pipeline.get("estimated_latency_ms", 0)
    
    violations = []
    warnings = []
    
    if est_cost > max_cost:
        violations.append({"constraint": "max_cost_usd", "message": f"${est_cost:.2f} exceeds ${max_cost}", "severity": "hard"})
    if est_carbon > max_carbon:
        violations.append({"constraint": "max_carbon_kg", "message": f"{est_carbon:.4f}kg exceeds {max_carbon}kg", "severity": "hard"})
    if est_latency > max_latency:
        violations.append({"constraint": "max_latency_ms", "message": f"{est_latency}ms exceeds {max_latency}ms", "severity": "hard"})
    
    if est_cost > max_cost * 0.8:
        warnings.append({"type": "cost_warning", "message": f"Cost uses {est_cost/max_cost:.0%} of budget"})
    
    can_execute = len(violations) == 0 or request.get("force", False)
    return {"can_execute": can_execute, "violations": violations, "warnings": warnings}


@app.get("/api/eligibility/matrix")
def get_eligibility_matrix():
    """Get the model eligibility matrix"""
    return {
        "model_families": [
            {"family": "classical", "name": "Classical ML", "description": "Random Forest, XGBoost",
             "cost_range": [0.1, 2.0], "carbon_per_run": 0.01, "latency_ms": 100, "accuracy_range": [0.6, 0.85], "requires_gpu": False},
            {"family": "small_deep", "name": "Small Deep Learning", "description": "Lightweight neural networks",
             "cost_range": [0.5, 10.0], "carbon_per_run": 0.1, "latency_ms": 500, "accuracy_range": [0.75, 0.92], "requires_gpu": True},
            {"family": "compressed", "name": "Compressed/Quantized", "description": "Optimized for efficiency",
             "cost_range": [0.2, 3.0], "carbon_per_run": 0.03, "latency_ms": 200, "accuracy_range": [0.7, 0.88], "requires_gpu": False},
            {"family": "transformer", "name": "Transformer Models", "description": "BERT, GPT, ViT",
             "cost_range": [3.0, 50.0], "carbon_per_run": 0.5, "latency_ms": 2000, "accuracy_range": [0.85, 0.98], "requires_gpu": True},
        ]
    }


# ============================================
# DATASET PROFILING ENDPOINTS
# ============================================

class DatasetProfileRequest(BaseModel):
    source: Literal["upload", "connection", "existing"]
    file_name: Optional[str] = None
    file_type: Optional[Literal["csv", "parquet", "json", "image", "text"]] = None
    file_size_mb: Optional[float] = None
    dataset_id: Optional[str] = None
    connection_config: Optional[dict] = None


class DatasetProfile(BaseModel):
    id: str
    name: str
    source: str
    type: str
    size_mb: float
    rows: Optional[int] = None
    columns: Optional[int] = None
    features: Optional[int] = None
    label_type: Optional[str] = None
    label_present: bool
    missing_values: float
    missing_percentage: float
    class_balance: Optional[dict] = None
    pii_detected: bool
    pii_fields: Optional[list] = None
    inferred_task: Optional[str] = None
    profile_timestamp: str


@app.post("/api/datasets/profile")
def profile_dataset(request: DatasetProfileRequest):
    """Profile a dataset and return its characteristics"""
    import uuid
    
    # Simulate dataset profiling based on source type
    if request.source == "upload":
        file_name = request.file_name or "uploaded_file"
        file_type = request.file_type or "csv"
        size_mb = request.file_size_mb or 1.0
        name = file_name
    elif request.source == "connection":
        name = request.connection_config.get("source_name", "Connected Dataset") if request.connection_config else "Connected Dataset"
        file_type = request.connection_config.get("type", "csv") if request.connection_config else "csv"
        size_mb = request.connection_config.get("size_mb", 10.0) if request.connection_config else 10.0
    else:
        name = f"Dataset-{request.dataset_id[:8]}"
        file_type = "csv"
        size_mb = 10.0
    
    # Infer data type from file type
    if file_type in ["csv", "parquet"]:
        data_type = "tabular"
    elif file_type == "json":
        data_type = "tabular"  # Could be either
    elif file_type == "image":
        data_type = "image"
    elif file_type == "text":
        data_type = "text"
    else:
        data_type = "tabular"
    
    # Simulate profiling results
    rows = int(size_mb * 1000) if size_mb > 0 else 10000
    columns = random.randint(5, 50)
    features = columns - 1  # Assume last column is label
    
    # Check for PII in column names (simple heuristic)
    pii_keywords = ["email", "phone", "ssn", "social", "credit", "card", "password", "address", "dob", "birth"]
    pii_fields = []
    sample_columns = [f"col_{i}" for i in range(columns)]
    for col in sample_columns:
        for keyword in pii_keywords:
            if keyword in col.lower():
                pii_fields.append(col)
                break
    
    pii_detected = len(pii_fields) > 0
    
    # Check for label column
    label_present = True
    label_type = "classification"
    if data_type == "tabular":
        # Check if likely regression
        if "regression" in name.lower():
            label_type = "regression"
        elif "forecast" in name.lower() or "prediction" in name.lower():
            label_type = "regression"
    
    # Class balance (if classification)
    class_balance = None
    if label_present and label_type == "classification":
        class_balance = {
            "class_0": int(rows * 0.6),
            "class_1": int(rows * 0.4),
        }
    
    # Missing values (random)
    missing_values = int(rows * columns * random.uniform(0.01, 0.1))
    missing_percentage = (missing_values / (rows * columns)) * 100
    
    # Inferred task
    inferred_task = "classification"
    if label_type == "regression":
        inferred_task = "regression"
    elif data_type == "text":
        inferred_task = "text_classification"
    elif data_type == "image":
        inferred_task = "image_classification"
    elif data_type == "time-series":
        inferred_task = "forecasting"
    
    dataset_id = str(uuid.uuid4())
    
    return {
        "dataset": {
            "id": dataset_id,
            "name": name,
            "source": request.source,
            "type": data_type,
            "size_mb": size_mb,
            "rows": rows,
            "columns": columns,
            "features": features,
            "label_type": label_type,
            "label_present": label_present,
            "missing_values": missing_values,
            "missing_percentage": round(missing_percentage, 2),
            "class_balance": class_balance,
            "pii_detected": pii_detected,
            "pii_fields": pii_fields,
            "inferred_task": inferred_task,
            "profile_timestamp": datetime.utcnow().isoformat(),
        }
    }


@app.post("/api/datasets/validate")
def validate_dataset(request: dict):
    """Validate dataset against constraints"""
    dataset = request.get("dataset", {})
    constraints = request.get("constraints", {})
    
    violations = []
    suggestions = []
    
    # Check size vs budget
    size_mb = dataset.get("size_mb", 0)
    max_cost = constraints.get("max_cost_usd", 10)
    
    if size_mb > 100 and max_cost < 5:
        violations.append({
            "constraint": "dataset_size",
            "message": f"Large dataset ({size_mb}MB) may exceed budget constraints",
            "severity": "hard"
        })
        suggestions.append({
            "reason": "Consider sampling the dataset or increasing budget",
            "suggested_action": "sample_data",
            "priority": 1
        })
    
    # Check for missing label
    if not dataset.get("label_present", True):
        violations.append({
            "constraint": "label_present",
            "message": "No label column detected - supervised learning not possible",
            "severity": "hard"
        })
        suggestions.append({
            "reason": "Add a label column or use unsupervised learning",
            "suggested_action": "add_label",
            "priority": 1
        })
    
    # Check PII for regulated compliance
    pii_detected = dataset.get("pii_detected", False)
    compliance = constraints.get("compliance_level", "standard")
    
    if pii_detected and compliance in ["regulated", "highly_regulated"]:
        violations.append({
            "constraint": "pii_detected",
            "message": "PII detected in dataset - not compliant with regulated requirements",
            "severity": "hard"
        })
        suggestions.append({
            "reason": "Anonymize or remove PII fields before training",
            "suggested_action": "remove_pii",
            "priority": 1
        })
    
    # Check missing values
    missing_pct = dataset.get("missing_percentage", 0)
    if missing_pct > 20:
        violations.append({
            "constraint": "missing_values",
            "message": f"High missing value rate ({missing_pct}%)",
            "severity": "soft"
        })
        suggestions.append({
            "reason": "Consider imputation or removing rows with missing values",
            "suggested_action": "impute",
            "priority": 2
        })
    
    is_valid = len([v for v in violations if v["severity"] == "hard"]) == 0
    
    return {
        "is_valid": is_valid,
        "violations": violations,
        "suggestions": suggestions,
    }


@app.get("/api/datasets")
def list_datasets():
    """List all datasets"""
    # In real implementation, this would query the database
    return {"datasets": []}


@app.get("/api/datasets/{dataset_id}")
def get_dataset(dataset_id: str):
    """Get dataset by ID"""
    return {
        "dataset": {
            "id": dataset_id,
            "name": f"Dataset-{dataset_id[:8]}",
            "type": "tabular",
            "size_mb": 10.0,
            "profile_timestamp": datetime.utcnow().isoformat(),
        }
    }


# ============================================
# TRAINING EXECUTION ENDPOINTS
# ============================================

class TrainingRequest(BaseModel):
    pipeline_id: str
    dataset_id: str
    constraints: Constraints
    estimated_cost: float
    estimated_carbon: float
    estimated_time_seconds: int


class TrainingStatus(BaseModel):
    run_id: str
    pipeline_id: str
    status: str
    progress: float
    current_step: Optional[str] = None
    cost_spent: float
    carbon_used: float
    elapsed_time_seconds: int
    estimated_total_time_seconds: Optional[int] = None
    metrics: Optional[dict] = None
    constraint_violations: Optional[list] = None
    artifacts: Optional[dict] = None


training_runs: dict = {}


@app.post("/api/training/start")
def start_training(request: TrainingRequest):
    """Start a training run"""
    import uuid
    
    run_id = str(uuid.uuid4())[:12]
    
    training_runs[run_id] = {
        "run_id": run_id,
        "pipeline_id": request.pipeline_id,
        "dataset_id": request.dataset_id,
        "status": "running",
        "progress": 0.0,
        "current_step": "initializing",
        "cost_spent": 0.0,
        "carbon_used": 0.0,
        "elapsed_time_seconds": 0,
        "estimated_total_time_seconds": request.estimated_time_seconds,
        "constraints": request.constraints.model_dump(),
        "estimated_cost": request.estimated_cost,
        "estimated_carbon": request.estimated_carbon,
    }
    
    return {
        "run_id": run_id,
        "status": "started",
        "message": "Training started successfully"
    }


@app.get("/api/training/{run_id}")
def get_training_status(run_id: str):
    """Get training run status"""
    if run_id not in training_runs:
        raise HTTPException(status_code=404, detail="Training run not found")
    
    run = training_runs[run_id]
    
    # Simulate progress
    if run["status"] == "running":
        run["progress"] = min(run["progress"] + random.uniform(0.05, 0.15), 1.0)
        run["elapsed_time_seconds"] += int(random.uniform(5, 15))
        
        progress_factor = run["progress"]
        run["cost_spent"] = run["estimated_cost"] * progress_factor
        run["carbon_used"] = run["estimated_carbon"] * progress_factor
        
        # Update current step
        if run["progress"] < 0.3:
            run["current_step"] = "preprocessing"
        elif run["progress"] < 0.6:
            run["current_step"] = "training"
        elif run["progress"] < 0.9:
            run["current_step"] = "evaluating"
        else:
            run["current_step"] = "finalizing"
        
        # Check constraint violations
        violations = []
        if run["cost_spent"] > run["constraints"]["max_cost_usd"]:
            violations.append({
                "constraint": "max_cost_usd",
                "message": f"Cost ${run['cost_spent']:.2f} exceeded limit ${run['constraints']['max_cost_usd']}",
                "value": run["cost_spent"],
                "limit": run["constraints"]["max_cost_usd"]
            })
        
        if run["carbon_used"] > run["constraints"]["max_carbon_kg"]:
            violations.append({
                "constraint": "max_carbon_kg",
                "message": f"Carbon {run['carbon_used']:.4f}kg exceeded limit {run['constraints']['max_carbon_kg']}kg",
                "value": run["carbon_used"],
                "limit": run["constraints"]["max_carbon_kg"]
            })
        
        run["constraint_violations"] = violations
        
        # Complete if 100% or violated
        if run["progress"] >= 1.0:
            run["status"] = "completed"
            run["progress"] = 1.0
            run["metrics"] = {
                "accuracy": random.uniform(0.75, 0.95),
                "f1": random.uniform(0.70, 0.92),
                "precision": random.uniform(0.72, 0.94),
                "recall": random.uniform(0.70, 0.93),
            }
            run["artifacts"] = {
                "model": f"/models/{run_id}/model.pt",
                "pipeline": f"/pipelines/{run_id}/pipeline.json",
                "config": f"/config/{run_id}/config.yaml",
            }
        elif len(violations) > 0:
            run["status"] = "cancelled"
            run["artifacts"] = None
    
    return {"run": run}


@app.post("/api/training/{run_id}/stop")
def stop_training(run_id: str):
    """Stop a training run"""
    if run_id not in training_runs:
        raise HTTPException(status_code=404, detail="Training run not found")
    
    training_runs[run_id]["status"] = "cancelled"
    
    return {
        "status": "stopped",
        "message": "Training run stopped successfully"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
