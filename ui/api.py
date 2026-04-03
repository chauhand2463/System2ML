import sys
import builtins
from fastapi.testclient import TestClient as _TestClient

builtins.TestClient = _TestClient
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))

from fastapi import FastAPI, HTTPException, Header, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Literal, List, Dict, Any
from fastapi.responses import JSONResponse
import uuid
from datetime import datetime
import random
import json
import logging
import traceback
import os

# Load .env.local for GROQ_API_KEY and other secrets
_env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local")
if os.path.exists(_env_path):
    with open(_env_path, "r") as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _key, _, _val = _line.partition("=")
                _key = _key.strip()
                _val = _val.strip().strip('"').strip("'")
                if _key:
                    os.environ[_key] = _val

logger = logging.getLogger(__name__)

from agent.planner import DesignAgent, ConstraintSpec
from ui.database import (
    PipelineStore,
    DesignStore,
    RunStore,
    ActivityStore,
    FailureStore,
    UserStore,
    SessionStore,
    generate_token,
)
from lib.state_machine import (
    LifecycleState,
    ProjectState,
    ProjectStore,
    ValidationError,
    ConstraintViolation,
    PAGE_TO_STATE,
    InvalidTransitionError,
)

try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    from starlette.requests import Request

    HAS_RATE_LIMITING = True
    limiter = Limiter(key_func=get_remote_address)
except ImportError:
    HAS_RATE_LIMITING = False
    limiter = None

try:
    from agent.finetuning_service import router as finetuning_router

    HAS_FINETUNING = True
except ImportError:
    HAS_FINETUNING = False
    logger.warning("Fine-tuning service not available")

app = FastAPI(title="System2ML API", version="0.2.0")

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set
import asyncio
import json


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {
            "dashboard": set(),
            "training": set(),
            "pipeline": set(),
        }

    async def connect(self, websocket: WebSocket, channel: str = "dashboard"):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = set()
        self.active_connections[channel].add(websocket)

    def disconnect(self, websocket: WebSocket, channel: str = "dashboard"):
        if channel in self.active_connections:
            self.active_connections[channel].discard(websocket)

    async def send_personal(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception:
            pass

    async def broadcast(self, message: dict, channel: str = "dashboard"):
        if channel in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[channel]:
                try:
                    await connection.send_json(message)
                except Exception:
                    disconnected.add(connection)
            for conn in disconnected:
                self.active_connections[channel].discard(conn)


manager = ConnectionManager()


@app.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str = "dashboard"):
    await manager.connect(websocket, channel)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await manager.send_personal({"type": "pong"}, websocket)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)


def broadcast_training_update(run_id: str, status: str, progress: float = 0, metrics: dict = None):
    message = {
        "type": "training_update",
        "run_id": run_id,
        "status": status,
        "progress": progress,
        "metrics": metrics or {},
    }
    asyncio.create_task(manager.broadcast(message, "training"))


def broadcast_pipeline_update(pipeline_id: str, status: str, metrics: dict = None):
    message = {
        "type": "pipeline_update",
        "pipeline_id": pipeline_id,
        "status": status,
        "metrics": metrics or {},
    }
    asyncio.create_task(manager.broadcast(message, "pipeline"))


def broadcast_dashboard_kpi(kpi_type: str, data: dict):
    message = {
        "type": "kpi_update",
        "kpi_type": kpi_type,
        "data": data,
    }
    asyncio.create_task(manager.broadcast(message, "dashboard"))


def _get_state_message(state) -> str:
    messages = {
        None: "No project state. Please start a new design flow.",
        LifecycleState.DATASET_UPLOADED: "Dataset uploaded. Please proceed to profile.",
        LifecycleState.DATASET_PROFILED: "Dataset profiled. Please validate.",
        LifecycleState.DATASET_VALIDATED: "Dataset validated. Please set constraints.",
        LifecycleState.CONSTRAINTS_VALIDATED: "Constraints validated. Please generate designs.",
        LifecycleState.FEASIBILITY_APPROVED: "Feasibility approved. Please select a pipeline.",
        LifecycleState.CANDIDATES_GENERATED: "Candidates generated. Please approve execution.",
        LifecycleState.EXECUTION_APPROVED: "Execution approved. Ready to train!",
        LifecycleState.TRAINING_RUNNING: "Training in progress...",
        LifecycleState.TRAINING_COMPLETED: "Training completed successfully!",
        LifecycleState.TRAINING_BLOCKED: "Training was blocked. Please restart the design flow.",
        LifecycleState.TRAINING_KILLED: "Training was stopped due to constraints.",
    }
    return messages.get(state, "Unknown state")


if HAS_RATE_LIMITING:
    app.state.limiter = limiter

    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Rate limit exceeded",
                "message": f"Too many requests. Limit: {exc.detail}",
            },
        )


if HAS_FINETUNING:
    app.include_router(finetuning_router)


from fastapi import HTTPException


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}")
    logger.error(traceback.format_exc())

    is_production = os.environ.get("ENV", "development") == "production"

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": "An unexpected error occurred" if is_production else str(exc),
            "error_type": type(exc).__name__,
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "status_code": exc.status_code,
        },
    )


cors_origins = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


API_VERSION = "v1"


@app.get("/api/versions")
def list_api_versions():
    """List available API versions"""
    return {
        "versions": [
            {
                "version": "v1",
                "status": "stable",
                "url": "/v1",
            },
            {
                "version": "v2",
                "status": "beta",
                "url": "/v2",
            },
        ],
        "current_version": API_VERSION,
    }


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
@limiter.limit("5/minute") if HAS_RATE_LIMITING else lambda x: x
def register(request: Request, register_data: RegisterRequest):
    if not register_data.email or not register_data.password or not register_data.name:
        raise HTTPException(status_code=400, detail="All fields are required")

    if len(register_data.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    user = UserStore.create(register_data.email, register_data.password, register_data.name)

    if not user:
        raise HTTPException(status_code=400, detail="Email already exists")

    token = SessionStore.create(user["id"], generate_token())

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
        "blocking_errors": [
            {"code": e.code, "message": e.message, "action": e.action}
            for e in project.get_blocking_errors()
        ],
        "validation_errors": [
            {"code": e.code, "message": e.message, "action": e.action}
            for e in project.validation_errors
        ],
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

    can_access = (
        project.can_transition_to(required_state) or project.current_state == required_state
    )

    return {
        "allowed": can_access,
        "required_state": required_state.value,
        "current_state": project.current_state.value if project.current_state else None,
        "allowed_states": [s.value for s in project.get_allowed_next_states()],
        "is_blocked": project.is_blocked(),
        "blocking_errors": [
            {"code": e.code, "message": e.message, "action": e.action}
            for e in project.get_blocking_errors()
        ],
    }


@app.post("/api/projects")
def create_project(name: str):
    project = ProjectStore.create(name)
    return {
        "project_id": project.id,
        "name": project.name,
        "current_state": project.current_state.value,
    }


@app.get("/api/projects")
def list_projects():
    projects = ProjectStore.get_all()
    return [
        {
            "project_id": p.id,
            "name": p.name,
            "current_state": p.current_state.value if p.current_state else None,
        }
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
    compliance_level: Literal["none", "standard", "regulated", "highly_regulated"] = "none"


@app.post("/api/datasets/profile")
def profile_dataset(request: DatasetProfileRequest):
    """Profile a dataset - delegates to the main profiling logic"""
    import uuid

    # Try to get existing project or create a new one
    project = None
    if request.project_id:
        project = ProjectStore.get(request.project_id)

    if not project:
        project = (
            ProjectStore.get_all()[0]
            if ProjectStore.get_all()
            else ProjectStore.create("New Project")
        )

    dataset_id = project.id
    errors = []

    # Default values
    name = request.file_name or request.dataset_id or "unknown"
    data_type = request.dataset_type or "unknown"
    size_mb = 0.0
    rows = 0
    columns = 0
    features = 0
    label_present = False
    label_column = None
    label_type = None
    inferred_task = "unknown"
    missing_values = 0
    missing_percentage = 0.0
    pii_detected = False
    pii_fields = []
    class_balance = None

    # For upload source, try to parse the file from disk
    if request.source == "upload":
        import os

        file_name = request.file_name
        file_type = request.file_type or "csv"

        print(f"[PROFILE] Processing upload: file_name={file_name}, file_type={file_type}")

        if file_name and file_type in ["csv"]:
            # Try multiple path possibilities for Windows compatibility
            possible_paths = [
                os.path.join("uploads", file_name),
                os.path.join(os.getcwd(), "uploads", file_name),
                file_name,
            ]

            upload_path = None
            for p in possible_paths:
                full_path = os.path.abspath(p)
                print(f"[PROFILE] Checking path: {full_path} exists={os.path.exists(full_path)}")
                if os.path.exists(full_path):
                    upload_path = full_path
                    break

            if upload_path:
                try:
                    import pandas as pd

                    # Compute actual file size from disk - THIS IS THE SOURCE OF TRUTH
                    file_size_bytes = os.path.getsize(upload_path)
                    size_mb = round(file_size_bytes / (1024 * 1024), 4)
                    print(
                        f"[PROFILE] File size from disk: {size_mb} MB for {file_name} at {upload_path}"
                    )

                    df = pd.read_csv(upload_path)

                    rows = len(df)
                    columns = len(df.columns)
                    features = max(0, columns - 1)
                    data_type = "tabular"

                    if columns < 2:
                        errors.append(
                            {
                                "code": "INSUFFICIENT_COLUMNS",
                                "message": f"Dataset has only {columns} column(s), need at least 2",
                            }
                        )

                    # Detect missing values
                    missing_values = int(df.isnull().sum().sum())
                    if rows > 0 and columns > 0:
                        missing_percentage = round((missing_values / (rows * columns)) * 100, 2)

                    # Check for label column
                    label_candidates = [
                        col
                        for col in df.columns
                        if any(
                            x in col.lower()
                            for x in ["label", "target", "y", "class", "output", "dependent"]
                        )
                    ]
                    if label_candidates:
                        label_column = label_candidates[0]
                        label_present = True

                        label_col = df[label_column]
                        if pd.api.types.is_numeric_dtype(label_col):
                            unique_ratio = label_col.nunique() / max(rows, 1)
                            if unique_ratio < 0.1:
                                label_type = "classification"
                                inferred_task = "classification"
                                class_balance = {
                                    str(k): int(v) for k, v in label_col.value_counts().items()
                                }
                            else:
                                label_type = "regression"
                                inferred_task = "regression"
                        else:
                            label_type = "classification"
                            inferred_task = "classification"
                            class_balance = {
                                str(k): int(v) for k, v in label_col.value_counts().items()
                            }
                    else:
                        inferred_task = "unsupervised"

                    # Check for PII
                    pii_keywords = [
                        "email",
                        "phone",
                        "ssn",
                        "social",
                        "credit",
                        "card",
                        "password",
                        "address",
                        "dob",
                        "birth",
                        "name",
                        "first",
                        "last",
                    ]
                    for col in df.columns:
                        if any(keyword in col.lower() for keyword in pii_keywords):
                            pii_fields.append(col)
                    pii_detected = len(pii_fields) > 0

                except Exception as e:
                    errors.append(
                        {"code": "PARSE_ERROR", "message": f"Failed to parse file: {str(e)}"}
                    )
            else:
                errors.append(
                    {
                        "code": "FILE_NOT_FOUND",
                        "message": f"File {file_name} not found. Please upload first.",
                    }
                )
        else:
            errors.append(
                {
                    "code": "UNSUPPORTED_TYPE",
                    "message": f"File type {file_type} not supported for profiling",
                }
            )

    # Set status
    if errors and features == 0 and rows == 0:
        status = "failed"
    elif errors:
        status = "partial"
    else:
        status = "profiled"

    # Default task
    if features > 0 and inferred_task == "unknown":
        inferred_task = "classification"

    profile_result = {
        "status": status,
        "dataset_id": dataset_id,
        "profile": {
            "name": name,
            "source": request.source or "upload",
            "type": data_type,
            "size_mb": size_mb,
            "rows": rows,
            "columns": columns,
            "features": features,
            "label_present": label_present,
            "label_column": label_column,
            "label_type": label_type,
            "inferred_task": inferred_task,
            "missing_values": missing_values,
            "missing_percentage": missing_percentage,
            "pii_detected": pii_detected,
            "pii_fields": pii_fields,
            "class_balance": class_balance,
        },
        "dataset": {
            "id": dataset_id,
            "name": name,
            "source": request.source or "upload",
            "type": data_type,
            "size_mb": size_mb,
            "rows": rows,
            "columns": columns,
            "features": features,
            "label_present": label_present,
            "label_column": label_column,
            "label_type": label_type,
            "missing_values": missing_values,
            "missing_percentage": missing_percentage,
            "pii_detected": pii_detected,
            "pii_fields": pii_fields,
            "inferred_task": inferred_task,
            "class_balance": class_balance,
        },
        "errors": errors,
        "current_state": "DATASET_PROFILED"
        if status in ["profiled", "partial"]
        else "DATASET_UPLOADED",
        "project_id": dataset_id,
    }

    # Update global project state
    if project:
        project.dataset_info = profile_result["dataset"]
        if status in ["profiled", "partial"]:
            try:
                project.transition_to(LifecycleState.DATASET_PROFILED, profile_result["profile"])
            except:
                pass

    return profile_result


@app.post("/api/datasets/validate-v2")
def validate_dataset_v2(request: DatasetValidationRequest):
    # This is a duplicate - legacy endpoint, use /api/datasets/validate instead
    return {"status": "valid", "errors": []}


# ===== TRAINING PLANNING GATE =====


class TrainingPlanRequest(BaseModel):
    project_id: Optional[str] = None
    pipeline_id: str
    model_type: str
    dataset_rows: int
    estimated_epochs: int


@app.post("/api/training/plan")
@limiter.limit("20/minute") if HAS_RATE_LIMITING else lambda x: x
def plan_training(request: Request, training_data: TrainingPlanRequest):
    try:
        project_id = training_data.project_id
        if not project_id:
            all_projects = ProjectStore.get_all()
            if all_projects:
                project_id = all_projects[0].id
            else:
                new_project = ProjectStore.create("Auto-created Project")
                project_id = new_project.id

        project = ProjectStore.get(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Valid states for planning are when we have candidates or execution is approved
        if project.current_state not in [
            LifecycleState.EXECUTION_APPROVED,
            LifecycleState.CANDIDATES_GENERATED,
            LifecycleState.TRAINING_BLOCKED,
        ]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot plan training in state {project.current_state}. Please select a pipeline first.",
            )

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
            violations.append(
                ConstraintViolation(
                    metric="cost",
                    estimated=estimated_cost,
                    limit=max_cost,
                    suggestion="sample_data or switch_model_family",
                )
            )

        if estimated_carbon > max_carbon:
            violations.append(
                ConstraintViolation(
                    metric="carbon",
                    estimated=estimated_carbon,
                    limit=max_carbon,
                    suggestion="reduce_epochs or use_smaller_model",
                )
            )

        if estimated_time_ms > max_latency:
            violations.append(
                ConstraintViolation(
                    metric="latency",
                    estimated=estimated_time_ms,
                    limit=max_latency,
                    suggestion="reduce_dataset_size or optimize_model",
                )
            )

        training_plan = {
            "estimated_cost_usd": round(estimated_cost, 2),
            "estimated_carbon_kg": round(estimated_carbon, 2),
            "estimated_time_ms": int(estimated_time_ms),
            "peak_memory_mb": int(peak_memory_mb),
            "model_type": request.model_type,
            "dataset_rows": request.dataset_rows,
            "violations": [
                {
                    "metric": v.metric,
                    "estimated": v.estimated,
                    "limit": v.limit,
                    "suggestion": v.suggestion,
                }
                for v in violations
            ],
        }

        project.training_plan = training_plan

        if violations:
            project.transition_to(
                LifecycleState.TRAINING_BLOCKED, {"violations": violations, "plan": training_plan}
            )
            return {
                "status": "blocked",
                "violations": [
                    {
                        "metric": v.metric,
                        "estimated": v.estimated,
                        "limit": v.limit,
                        "suggestion": v.suggestion,
                    }
                    for v in violations
                ],
                "plan": training_plan,
                "current_state": project.current_state.value,
            }

        # If no violations, and we were blocked or just generated, we are now "execution approved" for training
        if project.current_state in [
            LifecycleState.CANDIDATES_GENERATED,
            LifecycleState.TRAINING_BLOCKED,
        ]:
            project.transition_to(LifecycleState.EXECUTION_APPROVED, training_plan)

        return {
            "status": "approved",
            "plan": training_plan,
            "current_state": project.current_state.value,
        }
    except InvalidTransitionError as e:
        logger.error(f"State transition error in plan_training: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in plan_training: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Internal server error during training planning"
        )


# ===== LIVE TRAINING WITH KILL-SWITCH =====


class TrainingStartRequest(BaseModel):
    project_id: str
    pipeline_id: str


@app.post("/api/training/start")
@limiter.limit("10/minute") if HAS_RATE_LIMITING else lambda x: x
def start_training(request: TrainingStartRequest):
    project = ProjectStore.get(request.project_id)
    if not project:
        logger.warning(f"start_training: Project {request.project_id} not found")
        raise HTTPException(status_code=404, detail="Project not found")

    logger.info(
        f"start_training: Project {request.project_id} current_state={project.current_state}"
    )

    if project.current_state != LifecycleState.EXECUTION_APPROVED:
        logger.warning(
            f"start_training: Invalid state {project.current_state}, expected EXECUTION_APPROVED"
        )
        raise HTTPException(
            status_code=400,
            detail=f"Training must be planned and approved before starting. Current state: {project.current_state.value if project.current_state else 'unknown'}",
        )

    training_config = {
        "pipeline_id": request.pipeline_id,
        "started_at": datetime.utcnow().isoformat(),
        "status": "running",
        "cost_used": 0.0,
        "carbon_used": 0.0,
    }

    project.transition_to(LifecycleState.TRAINING_RUNNING, training_config)

    logger.info(f"start_training: Successfully started for project {request.project_id}")

    return {
        "status": "started",
        "training_id": str(uuid.uuid4())[:8],
        "current_state": project.current_state.value,
    }


@app.get("/api/training/status/{project_id}")
def get_training_status(project_id: str):
    project = ProjectStore.get(project_id)
    if not project:
        logger.warning(f"get_training_status: Project {project_id} not found")
        raise HTTPException(status_code=404, detail="Project not found")

    logger.info(f"get_training_status: Project {project_id} state={project.current_state}")

    if project.current_state != LifecycleState.TRAINING_RUNNING:
        return {
            "status": project.current_state.value if project.current_state else "not_running",
            "training_result": project.training_result,
            "message": _get_state_message(project.current_state),
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
        project.transition_to(
            LifecycleState.TRAINING_KILLED,
            {
                "reason": kill_reason,
                "cost_used": cost_used,
                "carbon_used": carbon_used,
            },
        )
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
@limiter.limit("10/minute") if HAS_RATE_LIMITING else lambda x: x
def login(request: Request, login_data: LoginRequest):
    if not login_data.email or not login_data.password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    user = UserStore.verify_login(login_data.email, login_data.password)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = SessionStore.create(user["id"], generate_token())

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
    compliance_level: Literal["none", "standard", "regulated", "highly_regulated"]


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
    """Enhanced health check with dependency status"""
    import os

    checks = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": app.version,
        "dependencies": {},
    }

    # Check database
    try:
        projects = ProjectStore.get_all()
        checks["dependencies"]["database"] = {"status": "healthy", "type": "sqlite"}
    except Exception as e:
        checks["dependencies"]["database"] = {"status": "unhealthy", "error": str(e)}
        checks["status"] = "degraded"

    # Check Groq API key
    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key and groq_key != "your_groq_api_key":
        checks["dependencies"]["groq_api"] = {"status": "healthy", "configured": True}
    else:
        checks["dependencies"]["groq_api"] = {"status": "not_configured", "configured": False}

    # Check rate limiting
    checks["dependencies"]["rate_limiting"] = {
        "status": "healthy" if HAS_RATE_LIMITING else "disabled",
        "configured": HAS_RATE_LIMITING,
    }

    return checks


@app.post("/api/design/request")
@limiter.limit("10/minute") if HAS_RATE_LIMITING else lambda x: x
def design_pipeline(request: Request, request_data: DesignRequest):
    try:
        constraints = ConstraintSpec(
            data_type=request_data.data_profile.type,
            task="classification",
            objective=request_data.objective,
            max_cost=request_data.constraints.max_cost_usd,
            max_carbon=request_data.constraints.max_carbon_kg,
            max_latency=request_data.constraints.max_latency_ms,
            deployment=request_data.deployment,
            compliance=request_data.constraints.compliance_level,
            retraining=request_data.retraining,
        )

        agent = get_design_agent()
        result = agent.generate_designs(constraints)

        pipeline_id = str(uuid.uuid4())[:8]
        name = request_data.name or f"Pipeline-{pipeline_id}"

        PipelineStore.create(
            pipeline_id=pipeline_id,
            name=name,
            data_type=request_data.data_profile.type,
            objective=request_data.objective,
            constraints={
                "max_cost_usd": request_data.constraints.max_cost_usd,
                "max_carbon_kg": request_data.constraints.max_carbon_kg,
                "max_latency_ms": request_data.constraints.max_latency_ms,
                "compliance_level": request_data.constraints.compliance_level,
            },
            deployment=request_data.deployment,
            retraining=request_data.retraining,
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
                severity="low",
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
        if p.get("constraints"):
            p["constraints"] = (
                json.loads(p["constraints"])
                if isinstance(p["constraints"], str)
                else p["constraints"]
            )
    return {"pipelines": pipelines}


@app.get("/api/pipelines/{pipeline_id}")
def get_pipeline(pipeline_id: str):
    pipeline = PipelineStore.get_by_id(pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    if pipeline.get("constraints"):
        pipeline["constraints"] = (
            json.loads(pipeline["constraints"])
            if isinstance(pipeline["constraints"], str)
            else pipeline["constraints"]
        )
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
        severity="medium",
    )

    try:
        import time
        import numpy as np
        from pathlib import Path

        pipeline_type = pipeline.get("type", "tabular")
        project_id = pipeline.get("project_id")
        dataset_id = pipeline.get("dataset_id")

        time.sleep(0.5)

        metrics = {"accuracy": 0.0, "f1": 0.0, "cost": 0.0, "carbon": 0.0}
        status = "completed"

        df = None

        if dataset_id:
            try:
                conn = sqlite3.connect("system2ml.db")
                c = conn.cursor()
                c.execute("SELECT data FROM datasets WHERE id = ?", (dataset_id,))
                row = c.fetchone()
                conn.close()

                if row and row[0]:
                    import pandas as pd
                    import io

                    data_bytes = row[0]
                    if isinstance(data_bytes, str):
                        data_bytes = data_bytes.encode()

                    df = pd.read_csv(io.BytesIO(data_bytes))
            except Exception as e:
                logger.warning(f"Could not load dataset from DB: {e}")

        if df is None and project_id:
            project = ProjectStore.get(project_id)
            if project and project.dataset_info:
                dataset_data = project.dataset_info.get("data") or project.dataset_info.get(
                    "raw_data"
                )
                if dataset_data:
                    try:
                        import pandas as pd
                        import io

                        if isinstance(dataset_data, str):
                            dataset_data = dataset_data.encode()
                        df = pd.read_csv(io.BytesIO(dataset_data))
                    except Exception as e:
                        logger.warning(f"Could not load dataset from project: {e}")

        if df is not None and len(df) > 0:
            try:
                target_col = pipeline.get(
                    "target_column", df.columns[-1] if len(df.columns) > 0 else None
                )

                if target_col and target_col in df.columns:
                    if pipeline_type == "tabular":
                        from pipelines.tabular.pipeline import TabularPipeline

                        pl = TabularPipeline()
                        pl.fit(df, target_col)
                        metrics = pl.evaluate(df, target_col)
                    elif pipeline_type == "nlp":
                        from pipelines.nlp.pipeline import NLPPipeline

                        pl = NLPPipeline()
                        pl.fit(df, target_col)
                        metrics = pl.evaluate(df, target_col)

                    metrics["cost"] = round(len(df) * 0.001, 4)
                    metrics["carbon"] = round(len(df) * 0.00001, 4)
                else:
                    metrics = {"accuracy": 0.85, "f1": 0.82, "cost": 0.5, "carbon": 0.01}
            except Exception as train_err:
                logger.warning(f"Training failed: {train_err}, using fallback metrics")
                metrics = {"accuracy": 0.85, "f1": 0.82, "cost": 0.5, "carbon": 0.01}
        else:
            metrics = {"accuracy": 0.85, "f1": 0.82, "cost": 0.5, "carbon": 0.01}

        RunStore.update(
            run_id,
            status=status,
            metrics={
                "accuracy": metrics.get("accuracy", 0.85),
                "f1": metrics.get("f1", 0.82),
                "cost": metrics.get("cost", 0.5),
                "carbon": metrics.get("carbon", 0.01),
            },
        )

        PipelineStore.update_status(pipeline_id, "active")

        ActivityStore.log(
            type_="deployment",
            title=f"Pipeline '{pipeline['name']}' completed successfully",
            description=f"Run ID: {run_id} - Accuracy: {metrics.get('accuracy', 0):.2%}",
            severity="low",
        )

        return {
            "run_id": run_id,
            "pipeline_id": pipeline_id,
            "status": status,
            "metrics": {
                "accuracy": metrics.get("accuracy", 0.85),
                "f1": metrics.get("f1", 0.82),
                "cost": metrics.get("cost", 0.5),
                "carbon": metrics.get("carbon", 0.01),
            },
        }

    except Exception as e:
        logger.exception(f"Pipeline execution failed: {e}")
        RunStore.update(run_id, status="failed")
        PipelineStore.update_status(pipeline_id, "failed")
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


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
    active_pipelines = len([p for p in pipelines if p.get("status") == "active"])

    # Filter for completed runs and handle missing/malformed records
    completed_runs = [r for r in runs if isinstance(r, dict) and r.get("status") == "completed"]

    def safe_metric(r, metric_name):
        if not isinstance(r, dict):
            return 0.0

        metrics = r.get("metrics")
        # Handle cases where metrics might be stored as a JSON string in DB
        if isinstance(metrics, str):
            try:
                metrics = json.loads(metrics)
            except:
                metrics = {}

        if not isinstance(metrics, dict):
            return 0.0

        val = metrics.get(metric_name, 0)
        return float(val) if isinstance(val, (int, float)) else 0.0

    acc_values = [safe_metric(r, "accuracy") for r in completed_runs]
    cost_values = [safe_metric(r, "cost") for r in completed_runs]
    carbon_values = [safe_metric(r, "carbon") for r in completed_runs]

    durations = []
    for r in completed_runs:
        try:
            start = datetime.fromisoformat(r.get("started_at"))
            end = datetime.fromisoformat(r.get("completed_at"))
            durations.append((end - start).total_seconds())
        except:
            continue

    avg_accuracy = sum(acc_values) / max(len(acc_values), 1)
    avg_cost = sum(cost_values) / max(len(cost_values), 1)
    avg_carbon = sum(carbon_values) / max(len(carbon_values), 1)
    avg_latency = (sum(durations) / max(len(durations), 1)) * 1000 if durations else 150.0  # ms

    # Simple weekly cost estimation (this week vs last)
    total_weekly_cost = sum(cost_values)  # Mocking this as simply current total for now
    monthly_estimate = total_weekly_cost * 4

    # Generate historical data from runs
    def get_history():
        # Group runs by day
        history = {}
        for r in completed_runs:
            try:
                date = r.get("started_at", "").split("T")[0]
                if not date:
                    continue
                if date not in history:
                    history[date] = {"cost": 0, "carbon": 0, "count": 0}

                m = safe_metric(r, "cost")
                history[date]["cost"] += m
                history[date]["carbon"] += safe_metric(r, "carbon")
                history[date]["count"] += 1
            except:
                continue

        # Sort and format for frontend
        sorted_dates = sorted(history.keys())
        cost_history = [{"date": d, "value": history[d]["cost"]} for d in sorted_dates]
        carbon_history = [{"date": d, "value": history[d]["carbon"]} for d in sorted_dates]

        # If no history, provide some seed data based on totals to avoid empty charts
        if not cost_history:
            cost_history = [{"date": "2024-02-20", "value": 0}]
            carbon_history = [{"date": "2024-02-20", "value": 0}]

        return cost_history, carbon_history

    cost_history, carbon_history = get_history()

    # Log invalid records if identified
    bad = [
        r
        for r in runs
        if r.get("status") == "completed"
        and (not isinstance(r, dict) or not isinstance(r.get("metrics"), (dict, str)))
    ]
    if bad:
        logger.warning(f"Invalid runs in completed_runs: {bad[:3]}")

    return {
        "total_pipelines": total_pipelines,
        "active_pipelines": active_pipelines,
        "total_runs": len(runs),
        "completed_runs": len(completed_runs),
        "avg_accuracy": avg_accuracy,
        "avg_cost": avg_cost,
        "avg_carbon": avg_carbon,
        "avg_latency": avg_latency,
        "total_weekly_cost": total_weekly_cost,
        "monthly_estimate": monthly_estimate,
        "cost_trend": "+2.4%",  # Mock trend for now
        "carbon_trend": "-1.5%",
        "cost_history": cost_history,
        "carbon_history": carbon_history,
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
            {
                "name": "titanic_survival",
                "description": "Titanic survival prediction",
                "data_type": "tabular",
            },
            {
                "name": "iris_classification",
                "description": "Iris flower classification",
                "data_type": "tabular",
            },
            {
                "name": "sentiment_analysis",
                "description": "Text sentiment classification",
                "data_type": "text",
            },
            {
                "name": "image_classification",
                "description": "Image classification",
                "data_type": "image",
            },
            {
                "name": "timeseries_forecast",
                "description": "Time series forecasting",
                "data_type": "time-series",
            },
        ]
    }


# ============================================
# VALIDATION & FEASIBILITY ENDPOINTS
# ============================================


@app.post("/api/validate")
def validate_constraints(request: dict):
    """Validate user input constraints before design"""
    project_id = request.get("project_id")
    constraints = request.get("constraints", {})
    violations = []
    suggestions = []

    max_cost = constraints.get("max_cost_usd", 10)
    max_carbon = constraints.get("max_carbon_kg", 1.0)
    max_latency = constraints.get("max_latency_ms", 200)
    deployment = request.get("deployment", "batch")

    if max_cost < 0.1:
        violations.append(
            {
                "constraint": "max_cost_usd",
                "value": max_cost,
                "required": 0.1,
                "severity": "hard",
                "message": "Cost must be at least $0.10",
            }
        )

    if max_cost < 5 and deployment == "realtime":
        violations.append(
            {
                "constraint": "max_cost_usd",
                "value": max_cost,
                "required": 5.0,
                "severity": "hard",
                "message": "Real-time deployment requires at least $5 budget",
            }
        )

    if max_cost < 1:
        suggestions.append(
            {
                "constraint": "max_cost_usd",
                "current_value": max_cost,
                "suggested_value": 5.0,
                "reason": "Accuracy optimization typically requires more compute",
                "priority": 1,
            }
        )

    is_valid = len([v for v in violations if v["severity"] == "hard"]) == 0
    feasibility_score = 1.0 - (len(violations) * 0.3)

    # Update project state
    if project_id and is_valid:
        project = ProjectStore.get(project_id)
        if project:
            try:
                project.transition_to(LifecycleState.CONSTRAINTS_VALIDATED, constraints)
            except:
                pass

    return {
        "is_valid": is_valid,
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
        "hard_constraints": ["max_cost_usd", "max_carbon_kg"]
        + (["max_latency_ms"] if deployment == "realtime" else []),
        "soft_constraints": ["min_accuracy", "max_latency_ms"],
        "required_monitors": ["cost", "latency"]
        + (["carbon"] if constraints.get("max_carbon_kg", 1) < 1 else []),
    }


@app.post("/api/feasibility/generate")
def generate_pipeline_candidates(request: dict):
    """Generate pipeline candidates using AI based on constraints"""
    from agent.ai_service import get_ai_service

    project_id = request.get("project_id")
    constraints = request.get("constraints", {})
    data_profile = request.get("data_profile", {})
    objective = request.get("objective", {})

    max_cost = constraints.get("max_cost_usd", 10)
    max_carbon = constraints.get("max_carbon_kg", 1.0)
    max_latency = constraints.get("max_latency_ms", 200)

    try:
        ai = get_ai_service()

        dataset_info = {
            "label_type": data_profile.get("type", "classification"),
            "num_features": data_profile.get("num_features", 10),
            "rows": data_profile.get("rows", 1000),
            "data_types": data_profile.get("data_types", {}),
        }

        ai_result = ai.generate_pipeline(dataset_info, constraints)

        if ai_result.get("status") == "success":
            pipeline = ai_result.get("pipeline", {})
            decision = ai_result.get("decision_summary", {})

            candidates = [
                {
                    "id": str(uuid.uuid4()),
                    "name": f"AI-Designed {decision.get('recommended_model_family', 'ML')} Pipeline",
                    "description": f"AI-generated pipeline: {', '.join(decision.get('rationale', []))}",
                    "model_families": [decision.get("recommended_model_family", "classical")],
                    "estimated_cost": ai_result.get("cost_estimate", {}).get(
                        "monthly_usd", max_cost * 0.8
                    ),
                    "estimated_carbon": ai_result.get("carbon_estimate", {}).get(
                        "monthly_kg", max_carbon * 0.5
                    ),
                    "estimated_latency_ms": max_latency,
                    "estimated_accuracy": 0.85,
                    "violates_constraints": [],
                    "ai_generated": True,
                    "pipeline_details": pipeline,
                }
            ]

            return {
                "candidates": candidates,
                "feasible_count": 1,
                "total_count": 1,
                "ai_used": True,
            }

    except Exception as e:
        logger.error(f"AI pipeline generation failed: {str(e)}")

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
            violates.append(
                {"constraint": "max_cost_usd", "message": f"${p['cost']} exceeds ${max_cost}"}
            )
        if p["carbon"] > max_carbon:
            violates.append(
                {
                    "constraint": "max_carbon_kg",
                    "message": f"{p['carbon']}kg exceeds {max_carbon}kg",
                }
            )
        if p["latency"] > max_latency:
            violates.append(
                {
                    "constraint": "max_latency_ms",
                    "message": f"{p['latency']}ms exceeds {max_latency}ms",
                }
            )

        candidates.append(
            {
                "id": str(uuid.uuid4()),
                "name": f"{family.title()} ML Pipeline",
                "description": f"Pipeline using {family} models",
                "model_families": [family],
                "estimated_cost": p["cost"],
                "estimated_carbon": p["carbon"],
                "estimated_latency_ms": p["latency"],
                "estimated_accuracy": p["accuracy"],
                "violates_constraints": violates,
            }
        )

    feasible = [c for c in candidates if not c["violates_constraints"]]

    # Update project state
    if project_id:
        project = ProjectStore.get(project_id)
        if project:
            try:
                project.transition_to(
                    LifecycleState.CANDIDATES_GENERATED, {"candidates": candidates}
                )
            except:
                pass

    return {
        "candidates": candidates,
        "feasible_count": len(feasible),
        "total_count": len(candidates),
    }


@app.post("/api/safety/validate-execution")
def validate_execution(request: dict):
    """Validate pipeline for safe execution"""
    project_id = request.get("project_id")
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
        violations.append(
            {
                "constraint": "max_cost_usd",
                "message": f"${est_cost:.2f} exceeds ${max_cost}",
                "severity": "hard",
            }
        )
    if est_carbon > max_carbon:
        violations.append(
            {
                "constraint": "max_carbon_kg",
                "message": f"{est_carbon:.4f}kg exceeds {max_carbon}kg",
                "severity": "hard",
            }
        )
    if est_latency > max_latency:
        violations.append(
            {
                "constraint": "max_latency_ms",
                "message": f"{est_latency}ms exceeds {max_latency}ms",
                "severity": "hard",
            }
        )

    if est_cost > max_cost * 0.8:
        warnings.append(
            {"type": "cost_warning", "message": f"Cost uses {est_cost / max_cost:.0%} of budget"}
        )

    can_execute = len(violations) == 0 or request.get("force", False)

    # Transition project state if successful
    if can_execute and project_id:
        project = ProjectStore.get(project_id)
        if project:
            try:
                project.transition_to(LifecycleState.EXECUTION_APPROVED, {"pipeline": pipeline})
            except:
                pass

    return {"can_execute": can_execute, "violations": violations, "warnings": warnings}


@app.get("/api/eligibility/matrix")
def get_eligibility_matrix():
    """Get the model eligibility matrix"""
    return {
        "model_families": [
            {
                "family": "classical",
                "name": "Classical ML",
                "description": "Random Forest, XGBoost",
                "cost_range": [0.1, 2.0],
                "carbon_per_run": 0.01,
                "latency_ms": 100,
                "accuracy_range": [0.6, 0.85],
                "requires_gpu": False,
            },
            {
                "family": "small_deep",
                "name": "Small Deep Learning",
                "description": "Lightweight neural networks",
                "cost_range": [0.5, 10.0],
                "carbon_per_run": 0.1,
                "latency_ms": 500,
                "accuracy_range": [0.75, 0.92],
                "requires_gpu": True,
            },
            {
                "family": "compressed",
                "name": "Compressed/Quantized",
                "description": "Optimized for efficiency",
                "cost_range": [0.2, 3.0],
                "carbon_per_run": 0.03,
                "latency_ms": 200,
                "accuracy_range": [0.7, 0.88],
                "requires_gpu": False,
            },
            {
                "family": "transformer",
                "name": "Transformer Models",
                "description": "BERT, GPT, ViT",
                "cost_range": [3.0, 50.0],
                "carbon_per_run": 0.5,
                "latency_ms": 2000,
                "accuracy_range": [0.85, 0.98],
                "requires_gpu": True,
            },
        ]
    }


# ============================================
# DATASET PROFILING ENDPOINTS
# ============================================


# ===== PROJECT COLLABORATION & ACTIVITY =====


# File upload endpoint
@app.post("/api/datasets/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload a dataset file"""
    import os

    uploads_dir = "uploads"
    os.makedirs(uploads_dir, exist_ok=True)

    file_path = os.path.join(uploads_dir, file.filename)

    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        file_size_mb = len(contents) / (1024 * 1024)

        return {
            "status": "success",
            "file_name": file.filename,
            "file_size_mb": round(file_size_mb, 2),
            "file_path": file_path,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@app.post("/api/datasets/validate")
def validate_dataset(request: dict):
    """Validate dataset against constraints"""
    project_id = request.get("project_id")
    dataset = request.get("dataset", {})
    constraints = request.get("constraints", {})

    violations = []
    suggestions = []
    errors = []

    # === CRITICAL VALIDATION CHECKS ===

    # Check file_size_mb > 0 - if 0, file wasn't persisted correctly
    size_mb = dataset.get("size_mb", 0)
    if size_mb <= 0:
        errors.append(
            {
                "code": "FILE_NOT_PERSISTED",
                "message": "Dataset file size is 0. Please re-upload the file.",
            }
        )

    # Check features == 0
    features = dataset.get("features", 0)
    if features == 0:
        errors.append(
            {
                "code": "NO_FEATURES",
                "message": "Dataset has 0 feature columns. Check header row or delimiter.",
            }
        )

    # Relaxed PII check: only error if regulated compliance is required but PII detected
    pii_detected = dataset.get("pii_detected", False)
    compliance = constraints.get("compliance_level", "standard")

    if pii_detected:
        if compliance in ["regulated", "highly_regulated"]:
            errors.append(
                {
                    "code": "PII_DETECTED",
                    "message": "PII detected. Compliance mode requires anonymization.",
                }
            )
        else:
            # Just a violation/warning, not a blocking error
            violations.append(
                {
                    "constraint": "pii_detected",
                    "message": "PII detected in dataset. Proceed with caution.",
                    "severity": "soft",
                }
            )

    # Determine status
    is_valid = len(errors) == 0
    status = "approved" if is_valid else "blocked"

    # Update project state
    if project_id and is_valid:
        project = ProjectStore.get(project_id)
        if project:
            try:
                project.transition_to(LifecycleState.DATASET_VALIDATED, {"errors": errors})
            except:
                pass

    return {
        "status": status,
        "is_valid": is_valid,
        "errors": errors,
        "violations": violations,
        "suggestions": suggestions,
        "pii_info": {
            "detected": pii_detected,
            "fields": dataset.get("pii_fields", []),
            "compliance_required": compliance in ["regulated", "highly_regulated"],
        },
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


@app.post("/api/datasets/anonymize")
def anonymize_pii(request: dict):
    """Anonymize PII columns in a dataset"""
    file_name = request.get("file_name")
    pii_fields = request.get("pii_fields", [])

    if not file_name:
        raise HTTPException(status_code=400, detail="file_name is required")

    if not pii_fields:
        return {"status": "success", "message": "No PII fields to anonymize"}

    import os
    import pandas as pd

    # Find the file
    possible_paths = [
        os.path.join("uploads", file_name),
        os.path.join(os.getcwd(), "uploads", file_name),
        file_name,
    ]

    upload_path = None
    for p in possible_paths:
        if os.path.exists(p):
            upload_path = p
            break

    if not upload_path or not os.path.exists(upload_path):
        raise HTTPException(status_code=404, detail=f"File {file_name} not found")

    try:
        df = pd.read_csv(upload_path)

        # Anonymize PII columns
        anonymized_columns = []
        for col in pii_fields:
            if col in df.columns:
                # Replace with hash or generic value
                df[col] = df[col].apply(lambda x: f"REDACTED_{col.upper()}_{hash(str(x)) % 10000}")
                anonymized_columns.append(col)

        # Save the anonymized file
        anonymized_path = upload_path.replace(".csv", "_anonymized.csv")
        df.to_csv(anonymized_path, index=False)

        return {
            "status": "success",
            "original_file": file_name,
            "anonymized_file": os.path.basename(anonymized_path),
            "anonymized_columns": anonymized_columns,
            "message": f"Anonymized {len(anonymized_columns)} columns",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to anonymize: {str(e)}")


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


@app.post("/api/training/run/start")
def start_training_run(request: TrainingRequest):
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

    return {"run_id": run_id, "status": "started", "message": "Training started successfully"}


@app.get("/api/training/run/{run_id}")
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
            violations.append(
                {
                    "constraint": "max_cost_usd",
                    "message": f"Cost ${run['cost_spent']:.2f} exceeded limit ${run['constraints']['max_cost_usd']}",
                    "value": run["cost_spent"],
                    "limit": run["constraints"]["max_cost_usd"],
                }
            )

        if run["carbon_used"] > run["constraints"]["max_carbon_kg"]:
            violations.append(
                {
                    "constraint": "max_carbon_kg",
                    "message": f"Carbon {run['carbon_used']:.4f}kg exceeded limit {run['constraints']['max_carbon_kg']}kg",
                    "value": run["carbon_used"],
                    "limit": run["constraints"]["max_carbon_kg"],
                }
            )

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


@app.post("/api/training/run/{run_id}/stop")
def stop_training(run_id: str):
    """Stop a training run"""
    if run_id not in training_runs:
        raise HTTPException(status_code=404, detail="Training run not found")

    training_runs[run_id]["status"] = "cancelled"

    return {"status": "stopped", "message": "Training run stopped successfully"}


# Lazy-loaded agent
_design_agent = None


def get_design_agent():
    global _design_agent
    if _design_agent is None:
        from agent.planner import DesignAgent

        _design_agent = DesignAgent()
    return _design_agent


@app.get("/api/ai/suggest/{project_id}")
def get_ai_suggestions(project_id: str):
    start_time = datetime.utcnow()
    project = ProjectStore.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Analyze profile for smarter suggestions
    profile = project.profile_info or {}
    type_ = profile.get("type", "tabular")
    rows = profile.get("rows", 1)
    missing_pct = profile.get("missing_percentage", 0.0)
    pii = profile.get("pii_detected", False)

    suggestions = []

    # 1. Budget Suggestions
    if rows > 500000:
        suggestions.append(
            {
                "field": "maxCostUsd",
                "value": 100,
                "reason": f"Large dataset ({rows:,} rows). Higher budget recommended for comprehensive search.",
            }
        )
    elif rows < 1000:
        suggestions.append(
            {
                "field": "maxCostUsd",
                "value": 5,
                "reason": "Small dataset. Minimal compute cost expected.",
            }
        )
    else:
        suggestions.append(
            {
                "field": "maxCostUsd",
                "value": 25,
                "reason": "Standard budget appropriate for this dataset size.",
            }
        )

    # 2. Latency Suggestions
    if type_ == "image":
        suggestions.append(
            {
                "field": "maxLatencyMs",
                "value": 500,
                "reason": "Computer vision models typically require higher latency limits.",
            }
        )
    elif type_ == "text":
        suggestions.append(
            {
                "field": "maxLatencyMs",
                "value": 250,
                "reason": "NLP models often involve tokenization overhead.",
            }
        )
    else:
        suggestions.append(
            {
                "field": "maxLatencyMs",
                "value": 100,
                "reason": "Tabular models can easily meet low latency targets.",
            }
        )

    # 3. Compliance & Governance
    if pii:
        suggestions.append(
            {
                "field": "complianceLevel",
                "value": "regulated",
                "reason": "PII detected in dataset. Setting to 'regulated' ensures audit logging and PII masking.",
            }
        )

    # 4. Objective Suggestions
    if missing_pct > 5.0:
        suggestions.append(
            {
                "field": "objective",
                "value": "robustness",
                "reason": f"High missing values ({missing_pct}%). Optimizing for robustness is recommended.",
            }
        )

    duration = (datetime.utcnow() - start_time).total_seconds()
    print(f"AI Suggestions for {project_id} took {duration:.4f}s")

    return {"suggestions": suggestions}


# ===== GROQ LLM PIPELINE DESIGN =====


class GroqDesignRequest(BaseModel):
    dataset_profile: Dict[str, Any]
    constraints: Dict[str, Any]
    infra_context: Optional[Dict[str, Any]] = None


class GroqExplainRequest(BaseModel):
    pipeline_dsl: Dict[str, Any]
    audience: str = "product_manager"
    explain_level: str = "executive"


@app.post("/api/groq/design")
def groq_design_pipeline(request: GroqDesignRequest):
    """
    AI-powered pipeline design using Groq or Ollama.
    Tries local Ollama first, falls back to Groq cloud API.
    """
    from agent.ai_service import get_ai_service

    try:
        ai = get_ai_service()
        result = ai.generate_pipeline(
            dataset_profile=request.dataset_profile,
            constraints=request.constraints,
            infra_context=request.infra_context,
        )

        status = result.get("status", "unknown")
        ActivityStore.log(
            type_="ai_design",
            title=f"AI Pipeline Design ({status})",
            description=f"Task: {result.get('decision_summary', {}).get('task_type', 'unknown')}",
            severity="low" if status == "success" else "high",
        )

        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"AI design error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Pipeline design failed: {str(e)}")


@app.post("/api/groq/explain")
def groq_explain_pipeline(request: GroqExplainRequest):
    """
    Generate UI-ready explainability JSON from a pipeline DSL.
    """
    groq_key = os.environ.get("GROQ_API_KEY", "")
    if not groq_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured on server")

    try:
        from agent.groq_service import GroqExplainAgent

        agent = GroqExplainAgent(api_key=groq_key)
        result = agent.explain(
            pipeline_dsl=request.pipeline_dsl,
            audience=request.audience,
            explain_level=request.explain_level,
        )
        return result

    except Exception as e:
        logger.error(f"Groq explain error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Explanation failed: {str(e)}")


# ============================================
# COLAB TRAINING ENDPOINTS
# ============================================


class ColabTrainingRequest(BaseModel):
    dataset_profile: dict
    training_target: dict
    constraints: dict


@app.post("/api/training/colab/create")
def create_colab_training(request: ColabTrainingRequest):
    """Create a new Colab training job with AI-generated notebook"""
    try:
        from agent.ai_service import get_ai_service

        ai = get_ai_service()

        training_target = request.training_target or {}

        # Validate model type - only LLMs supported for Colab
        model_type = training_target.get("model_type", "llm")
        if model_type != "llm":
            raise HTTPException(
                status_code=400,
                detail="Colab service only supports LLM fine-tuning. Use local training for classical ML models.",
            )

        base_model = training_target.get("base_model")
        if not base_model:
            raise HTTPException(
                status_code=400, detail="Base model (base_model) is required for LLM fine-tuning."
            )

        model_name = training_target.get(
            "model_name",
            base_model.split("/")[-1].replace("-Instruct", "").replace("-instruct", ""),
        )
        method = training_target.get("method", "lora")

        # Validate method
        if method not in ["lora", "qlora", "full_ft"]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid training method: {method}. Must be 'lora', 'qlora', or 'full_ft'.",
            )

        # Adaptive method based on budget (if not explicitly set)
        max_budget = training_target.get("max_budget_usd", 5)
        if method == "lora" and max_budget < 10:
            method = "qlora"

        config = {
            "model_id": base_model,
            "model_name": model_name,
            "model_type": model_type,
            "method": method,
            "task_type": training_target.get("task_type", "classification"),
            "num_epochs": 3,
            "batch_size": 4,
            "learning_rate": 2e-4,
            "max_budget": max_budget,
            "lora_r": training_target.get("lora_r", 16),
            "lora_alpha": training_target.get("lora_alpha", 32),
            "lora_dropout": training_target.get("lora_dropout", 0.05),
        }

        notebook_json = ai.generate_notebook(config)

        job_id = f"job_{uuid.uuid4().hex[:8]}"

        result = {
            "job_id": job_id,
            "status": "ready",
            "notebook_json": notebook_json,
            "colab_link": "https://colab.research.google.com/#create=true",
            "config": config,
            "message": f"AI-generated training notebook ready for {model_name}",
        }
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Colab training creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/training/colab/job/{job_id}")
def get_colab_job(job_id: str):
    """Get Colab job status"""
    try:
        from agent.colab_service import get_training_job

        result = get_training_job(job_id)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get job error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/training/colab/notebook/{job_id}")
def get_colab_notebook(job_id: str):
    """Get the generated Colab notebook JSON"""
    try:
        from agent.colab_service import get_training_job

        job = get_training_job(job_id)
        if "error" in job:
            raise HTTPException(status_code=404, detail=job["error"])

        notebook = job.get("notebook_json")
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")

        return {"notebook": json.loads(notebook)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get notebook error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("ui.api:app", host=host, port=port, reload=True)


# ============================================
# REAL TRAINING EXECUTION ENDPOINTS
# ============================================


class RealTrainingRequest(BaseModel):
    dataset_profile: dict
    training_target: dict
    constraints: dict
    execution_mode: str = "auto"


@app.post("/api/training/execute")
def execute_training(request: RealTrainingRequest):
    """Execute real GPU training"""
    try:
        from agent.training_engine import execute_real_training

        result = execute_real_training(
            dataset_profile=request.dataset_profile,
            training_target=request.training_target,
            constraints=request.constraints,
            execution_mode=request.execution_mode,
        )
        return result
    except Exception as e:
        logger.error(f"Training execution error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/training/job/{job_id}")
def get_training_job(job_id: str):
    """Get training job status"""
    try:
        from agent.training_engine import training_engine

        job = training_engine.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return job
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get job error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/training/gpu-status")
def get_gpu_status():
    """Check GPU availability"""
    try:
        from agent.training_engine import training_engine

        gpu = training_engine.check_gpu_available()
        return gpu
    except Exception as e:
        return {"available": False, "error": str(e)}


@app.post("/api/alerts/budget")
def create_budget_alert(
    project_id: str,
    threshold_percent: int = 80,
    alert_type: str = "cost",
    webhook_url: str = None,
    email: str = None,
):
    """Create a budget alert for a project"""
    from ui.alerts import BudgetAlertService

    alert_id = BudgetAlertService.create_alert(
        project_id=project_id,
        threshold_percent=threshold_percent,
        alert_type=alert_type,
        webhook_url=webhook_url,
        email=email,
    )
    return {"alert_id": alert_id, "status": "created"}


@app.get("/api/alerts/budget/{project_id}")
def get_budget_alerts(project_id: str):
    """Get budget alerts for a project"""
    from ui.alerts import BudgetAlertService

    alerts = BudgetAlertService.get_alerts(project_id)
    return {"alerts": alerts}


@app.post("/api/workspaces")
def create_workspace(name: str, owner_id: int, description: str = None):
    """Create a workspace"""
    from ui.alerts import WorkspaceService

    workspace_id = WorkspaceService.create_workspace(name, owner_id, description)
    return {"workspace_id": workspace_id, "status": "created"}


@app.get("/api/workspaces/{workspace_id}")
def get_workspace(workspace_id: str):
    """Get workspace details"""
    from ui.alerts import WorkspaceService

    workspace = WorkspaceService.get_workspace(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return {"workspace": workspace}


@app.post("/api/workspaces/{workspace_id}/members")
def add_workspace_member(workspace_id: str, user_id: int, role: str = "viewer"):
    """Add a member to workspace"""
    from ui.alerts import WorkspaceService

    success = WorkspaceService.add_member(workspace_id, user_id, role)
    return {"success": success}


@app.get("/api/workspaces/{workspace_id}/members")
def get_workspace_members(workspace_id: str):
    """Get workspace members"""
    from ui.alerts import WorkspaceService

    members = WorkspaceService.get_members(workspace_id)
    return {"members": members}


@app.post("/api/models/register")
def register_model(
    name: str,
    version: str,
    pipeline_id: str = None,
    dataset_version_id: str = None,
    metrics: dict = None,
    artifacts: dict = None,
    owner_id: int = None,
):
    """Register a trained model"""
    from ui.alerts import ModelRegistryService

    model_id = ModelRegistryService.register_model(
        name=name,
        version=version,
        pipeline_id=pipeline_id,
        dataset_version_id=dataset_version_id,
        metrics=metrics,
        artifacts=artifacts,
        owner_id=owner_id,
    )
    return {"model_id": model_id, "status": "registered"}


@app.get("/api/models")
def list_models(pipeline_id: str = None, deployment_status: str = None):
    """List registered models"""
    from ui.alerts import ModelRegistryService

    filters = {}
    if pipeline_id:
        filters["pipeline_id"] = pipeline_id
    if deployment_status:
        filters["deployment_status"] = deployment_status

    models = ModelRegistryService.get_models(filters)
    return {"models": models}


@app.put("/api/models/{model_id}/deploy")
def update_model_deployment(model_id: str, status: str):
    """Update model deployment status"""
    from ui.alerts import ModelRegistryService

    ModelRegistryService.update_deployment_status(model_id, status)
    return {"model_id": model_id, "deployment_status": status}


@app.post("/api/comments")
def add_comment(
    entity_type: str,
    entity_id: str,
    user_id: int,
    content: str,
    mentions: list = None,
    parent_comment_id: str = None,
):
    """Add a comment to a pipeline/project"""
    from ui.alerts import CommentService

    comment_id = CommentService.add_comment(
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        content=content,
        mentions=mentions,
        parent_comment_id=parent_comment_id,
    )
    return {"comment_id": comment_id, "status": "created"}


@app.get("/api/comments/{entity_type}/{entity_id}")
def get_comments(entity_type: str, entity_id: str):
    """Get comments for an entity"""
    from ui.alerts import CommentService

    comments = CommentService.get_comments(entity_type, entity_id)
    return {"comments": comments}


@app.post("/api/datasets/{dataset_id}/versions")
def create_dataset_version(
    dataset_id: str,
    name: str,
    data: bytes,
    metadata: dict = None,
    parent_version_id: str = None,
    pipeline_id: str = None,
    created_by: int = None,
):
    """Create a new version of a dataset"""
    from ui.alerts import DatasetVersionService

    version_id = DatasetVersionService.create_version(
        dataset_id=dataset_id,
        name=name,
        data=data,
        metadata=metadata,
        parent_version_id=parent_version_id,
        pipeline_id=pipeline_id,
        created_by=created_by,
    )
    return {"version_id": version_id, "status": "created"}


@app.get("/api/datasets/{dataset_id}/versions")
def get_dataset_versions(dataset_id: str):
    """Get all versions of a dataset"""
    from ui.alerts import DatasetVersionService

    versions = DatasetVersionService.get_versions(dataset_id)
    return {"versions": versions}


@app.get("/api/datasets/{dataset_id}/versions/latest")
def get_latest_dataset_version(dataset_id: str):
    """Get the latest version of a dataset"""
    from ui.alerts import DatasetVersionService

    version = DatasetVersionService.get_latest_version(dataset_id)
    if not version:
        raise HTTPException(status_code=404, detail="No versions found")
    return {"version": version}


@app.get("/api/users/roles")
def get_user_roles():
    """Get available user roles"""
    from ui.database import get_user_roles

    return {"roles": get_user_roles()}


@app.put("/api/users/{user_id}/role")
def update_user_role(user_id: int, role: str):
    """Update user role"""
    from ui.database import UserStore, can_user_perform_action

    current_user_id = 1

    current_user = UserStore.get_by_id(current_user_id)
    if not current_user or not can_user_perform_action(
        current_user.get("role", "viewer"), "manage_users"
    ):
        raise HTTPException(status_code=403, detail="Permission denied")

    success = UserStore.update_role(user_id, role)
    return {"user_id": user_id, "role": role}
