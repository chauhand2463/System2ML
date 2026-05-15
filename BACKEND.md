# System2ML Backend Documentation

This document provides a comprehensive overview of the System2ML backend architecture from scratch.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Core Data Models](#core-data-models)
3. [Configuration System](#configuration-system)
4. [ML Model Backends](#ml-model-backends)
5. [API Layer](#api-layer)
6. [Database Layer](#database-layer)
7. [Lifecycle State Machine](#lifecycle-state-machine)
8. [ML Pipelines](#ml-pipelines)
9. [Governance & Audit](#governance--audit)
10. [Memory & Embeddings](#memory--embeddings)
11. [Observability](#observability)
12. [Validation System](#validation-system)
13. [Orchestration](#orchestration)

---

## Project Structure

```
System2ML/
├── src/system2ml/           # Main package
│   ├── __init__.py          # Package initializer
│   ├── core.py              # Core data models & factory
│   ├── config.py            # Configuration management
│   ├── logger.py           # Logging utilities
│   ├── backends/           # ML model backends
│   │   ├── __init__.py
│   │   ├── hf_transformers.py
│   │   └── ollama.py
├── ui/                      # User interface/API
│   ├── api.py              # FastAPI application
│   ├── database.py         # SQLite database layer
│   ├── approval_workflow.py
│   └── alerts.py
├── lib/                     # Core libraries
│   ├── state_machine.py     # Lifecycle state machine
│   ├── validation/         # Validation system
│   ├── eligibility/       # Eligibility checking
│   ├── feasibility/       # Feasibility analysis
│   └── safety/           # Safety gates
├── pipelines/                # ML pipelines
│   ├── tabular/
│   ├── nlp/
│   └── vision/
├── governance/              # Governance & compliance
│   ├── audit_logger.py
│   ├── policies.yaml
├── memory/                  # Memory & embeddings
│   ├── embeddings.py
│   └── failure_store.py
├── observability/            # Observability
│   ├── metrics.py
│   ├── carbon.py
│   └── drift.py
├── orchestrator/             # Pipeline orchestration
│   ├── executor.py
│   └── kubeflow_templates/
├── tests/                   # Test suite
└── ui/database.py          # SQLite database
```

---

## Core Data Models

**File:** `src/system2ml/core.py`

### Enums

```python
class PipelineStatus(Enum):
    PENDING = "pending"
    DESIGNING = "designing"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class DataType(Enum):
    TABULAR = "tabular"
    TEXT = "text"
    IMAGE = "image"
    TIME_SERIES = "time-series"
```

### Dataclasses

```python
@dataclass
class PipelineStep:
    name: str
    type: str
    params: dict = field(default_factory=dict)
    input: Optional[str] = None
    output: Optional[str] = None

@dataclass
class Pipeline:
    id: str
    name: str
    data_type: DataType
    steps: list[PipelineStep]
    status: PipelineStatus = PipelineStatus.PENDING
    accuracy: Optional[float] = None
    cost: Optional[float] = None
    carbon_kg: Optional[float] = None
    latency_ms: Optional[float] = None

@dataclass
class ProblemSpec:
    data_type: DataType
    constraints: dict
    objective: dict
    dataset_path: str
    target_column: Optional[str] = None
    evaluation_metric: str = "accuracy"

@dataclass
class ExecutionResult:
    pipeline_id: str
    status: PipelineStatus
    metrics: dict
    logs: str
    error_message: Optional[str] = None
    execution_time_ms: float = 0.0
    carbon_kg: float = 0.0
    cost_usd: float = 0.0

@dataclass
class FailureRecord:
    id: str
    pipeline_id: str
    error_type: str
    error_message: str
    root_cause: str
    stack_trace: str
    timestamp: str
    context: dict = field(default_factory=dict)
    resolved: bool = False
    resolution: Optional[str] = None
```

### Factory Function

```python
def create_backend(name: str, **kwargs):
    """Factory that returns a model backend instance."""
    name = name.lower()
    if name == "hf":
        return HFTransformersBackend()
    if name == "ollama":
        return OllamaBackend()
    raise ValueError(f"Unknown backend '{name}'. Available: hf, ollama")
```

---

## Configuration System

**File:** `src/system2ml/config.py`

Uses Pydantic `BaseModel` for configuration with environment variable support.

### Main Config Classes

```python
class DataConfig(BaseModel):
    data_type: Literal["tabular", "text", "image", "time-series"]
    path: str
    target_column: Optional[str] = None
    test_size: float = 0.2
    validation_size: float = 0.1
    random_seed: int = 42

class ConstraintsConfig(BaseModel):
    budget: float = 100.0
    carbon_limit_kg: float = 1.0
    max_latency_ms: int = 1000
    max_retries: int = 3
    compliance_rules: list[str] = []

class ObjectiveConfig(BaseModel):
    primary_metric: Literal["accuracy", "f1", "precision", "recall", "mae", "rmse"]
    target_score: float = 0.9
    secondary_metrics: list[str] = []

class MLflowConfig(BaseModel):
    tracking_uri: str = "http://localhost:5000"
    experiment_name: str = "system2ml_default"
    artifact_location: str = "./mlruns"

class CarbonConfig(BaseModel):
    enabled: bool = True
    save_to_file: bool = True
    output_dir: str = "./carbon_reports"

class PrometheusConfig(BaseModel):
    enabled: bool = True
    port: int = 9090
    push_gateway: Optional[str] = None

class CeleryConfig(BaseModel):
    broker_url: str = "redis://localhost:6379/0"
    result_backend: str = "redis://localhost:6379/0"
    task_serializer: str = "json"
    result_serializer: str = "json"
    accept_content: list[str] = ["json"]
    timezone: str = "UTC"
    enable_utc: bool = True

class DatabaseConfig(BaseModel):
    url: str = "sqlite:///system2ml.db"
    pool_size: int = 5

class System2MLConfig(BaseModel):
    project_name: str = "System2ML"
    data: DataConfig
    constraints: ConstraintsConfig
    objective: ObjectiveConfig
    mlflow: MLflowConfig = Field(default_factory=MLflowConfig)
    carbon: CarbonConfig = Field(default_factory=CarbonConfig)
    prometheus: PrometheusConfig = Field(default_factory=PrometheusConfig)
    celery: CeleryConfig = Field(default_factory=CeleryConfig)
    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
```

### Environment Variable Helper

```python
def _get_env(key: str, default: Any, value_type: type = str) -> Any:
    """Get environment variable with type conversion."""
    value = os.environ.get(key, default)
    if value is None:
        return default
    try:
        return value_type(value)
    except (ValueError, TypeError):
        return default
```

---

## ML Model Backends

**Files:** `src/system2ml/backends/hf_transformers.py` and `src/system2ml/backends/ollama.py`

### Abstract Interface

All backends implement a common interface:

```python
class BaseBackend:
    def __init__(self):
        self.model = None

    def load_model(self, model_name: str, **kwargs):
        """Load the model"""
        pass

    def predict(self, text: str, **kwargs) -> Any:
        """Make predictions"""
        raise NotImplementedError

    def __call__(self, text: str, **kwargs) -> Any:
        return self.predict(text, **kwargs)
```

### HuggingFace Transformers Backend

```python
class HFTransformersBackend:
    def __init__(self):
        self.model = None
        self.tokenizer = None

    def load_model(self, model_name: str, **kwargs):
        logger.info(f"Loading HuggingFace model: {model_name}")
        self.model_name = model_name

    def predict(self, text: str, **kwargs) -> Any:
        raise NotImplementedError("Prediction not implemented")
```

### Ollama Backend

```python
class OllamaBackend:
    def __init__(self):
        self.model = None

    def load_model(self, model_name: str, **kwargs):
        logger.info(f"Loading Ollama model: {model_name}")
        self.model_name = model_name

    def predict(self, text: str, **kwargs) -> Any:
        raise NotImplementedError("Prediction not implemented")
```

---

## API Layer

**File:** `ui/api.py`

Built with FastAPI, providing RESTful endpoints for the System2ML platform.

### App Initialization

```python
app = FastAPI(title="System2ML API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### WebSocket Support

```python
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {
            "dashboard": set(),
            "training": set(),
            "pipeline": set(),
        }

    async def connect(self, websocket: WebSocket, channel: str = "dashboard"):
        await websocket.accept()
        self.active_connections[channel].add(websocket)

    def disconnect(self, websocket: WebSocket, channel: str = "dashboard"):
        self.active_connections[channel].discard(websocket)

    async def broadcast(self, message: dict, channel: str = "dashboard"):
        for connection in self.active_connections[channel]:
            await connection.send_json(message)

@app.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str = "dashboard"):
    await manager.connect(websocket, channel)
    # Handle messages...
```

### Key API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

#### Projects
- `POST /api/projects` - Create project
- `GET /api/projects` - List projects
- `GET /api/projects/{project_id}` - Get project details

#### Lifecycle State
- `GET /api/lifecycle/state/{project_id}` - Get lifecycle state
- `POST /api/lifecycle/transition/{project_id}` - Transition state
- `GET /api/lifecycle/validate/{project_id}` - Validate access

#### Datasets
- `POST /api/datasets/profile` - Profile dataset
- `POST /api/datasets/validate-v2` - Validate dataset

#### Training
- `POST /api/training/plan` - Plan training
- `POST /api/training/start` - Start training
- `GET /api/training/status/{project_id}` - Get training status
- `POST /api/training/stop/{project_id}` - Stop training
- `POST /api/training/complete/{project_id}` - Complete training

#### Pipelines
- `POST /api/design/request` - Design pipeline
- `GET /api/pipelines` - List pipelines
- `GET /api/pipelines/{pipeline_id}` - Get pipeline
- `POST /api/pipelines/{pipeline_id}/execute` - Execute pipeline

#### Runs
- `GET /api/runs` - List runs
- `GET /api/runs/{run_id}` - Get run details

#### Metrics
- `GET /api/metrics` - Get aggregated metrics

#### Health
- `GET /health` - Health check

---

## Database Layer

**File:** `ui/database.py`

Uses SQLite for persistent storage.

### Database Schema

```sql
-- Users
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    provider TEXT DEFAULT 'email',
    role TEXT DEFAULT 'viewer',
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)

-- Sessions
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
)

-- Pipelines
CREATE TABLE pipelines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    data_type TEXT NOT NULL,
    objective TEXT NOT NULL,
    constraints TEXT NOT NULL,
    deployment TEXT NOT NULL,
    retraining TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    nodes TEXT,
    edges TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)

-- Pipeline Designs
CREATE TABLE pipeline_designs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pipeline_id TEXT NOT NULL,
    rank INTEGER NOT NULL,
    model TEXT NOT NULL,
    model_family TEXT,
    estimated_accuracy REAL,
    estimated_cost REAL,
    estimated_carbon REAL,
    estimated_latency REAL,
    meets_constraints INTEGER,
    explanation TEXT,
    pipeline_spec TEXT,
    score REAL,
    FOREIGN KEY (pipeline_id) REFERENCES pipelines(id)
)

-- Runs
CREATE TABLE runs (
    id TEXT PRIMARY KEY,
    pipeline_id TEXT NOT NULL,
    design_id INTEGER,
    status TEXT DEFAULT 'pending',
    metrics TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    error_message TEXT,
    FOREIGN KEY (pipeline_id) REFERENCES pipelines(id)
)

-- Failures
CREATE TABLE failures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pipeline_id TEXT,
    run_id TEXT,
    error_type TEXT,
    error_message TEXT,
    stack_trace TEXT,
    suggested_fix TEXT,
    frequency INTEGER DEFAULT 1,
    is_resolved INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
)

-- Activities
CREATE TABLE activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    actor TEXT,
    severity TEXT DEFAULT 'low',
    created_at TEXT NOT NULL
)

-- Projects
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id INTEGER,
    status TEXT DEFAULT 'draft',
    budget_limit REAL DEFAULT 100,
    current_spend REAL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id)
)

-- Dataset Versions
CREATE TABLE dataset_versions (
    id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    data BLOB,
    metadata TEXT,
    parent_version_id TEXT,
    pipeline_id TEXT,
    created_by INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
)

-- Models
CREATE TABLE models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    pipeline_id TEXT,
    dataset_version_id TEXT,
    metrics TEXT,
    artifacts TEXT,
    deployment_status TEXT DEFAULT 'unused',
    owner_id INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id)
)
```

### Data Access Objects (DAOs)

```python
class PipelineStore:
    @staticmethod
    def create(pipeline_id, name, data_type, objective, constraints, deployment, retraining):
        # Create pipeline...
    
    @staticmethod
    def get_all():
        # Get all pipelines...
    
    @staticmethod
    def get_by_id(pipeline_id):
        # Get pipeline by ID...
    
    @staticmethod
    def update_status(pipeline_id, status):
        # Update status...

class DesignStore:
    @staticmethod
    def create(pipeline_id, design, rank):
        # Create design...
    
    @staticmethod
    def get_by_pipeline(pipeline_id):
        # Get designs by pipeline...

class RunStore:
    @staticmethod
    def create(run_id, pipeline_id, design_id=None):
        # Create run...
    
    @staticmethod
    def update(run_id, status, metrics=None, error=None):
        # Update run...
    
    @staticmethod
    def get_all():
        # Get all runs...
    
    @staticmethod
    def get_by_id(run_id):
        # Get run by ID...

class ActivityStore:
    @staticmethod
    def log(type_, title, description="", actor="System", severity="low"):
        # Log activity...

class FailureStore:
    @staticmethod
    def create(pipeline_id, run_id, error_type, error_message, stack_trace="", suggested_fix=""):
        # Create failure record...

class UserStore:
    @staticmethod
    def create(email, password, name, provider="email"):
        # Create user...
    
    @staticmethod
    def get_by_email(email):
        # Get user by email...
    
    @staticmethod
    def verify_login(email, password):
        # Verify login...

class SessionStore:
    @staticmethod
    def create(user_id, token, expires_in_days=7):
        # Create session...
    
    @staticmethod
    def get_user_by_token(token):
        # Get user by token...
    
    @staticmethod
    def delete(token):
        # Delete session...
```

### Security Utilities

```python
def hash_password(password: str) -> str:
    salt = os.environ.get("PASSWORD_SALT", "system2ml-default-salt-change-in-production")
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000).hex()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def generate_token() -> str:
    return secrets.token_urlsafe(32)
```

---

## Lifecycle State Machine

**File:** `lib/state_machine.py`

Manages the project lifecycle with a state machine.

### States

```python
class LifecycleState(str, Enum):
    DATASET_UPLOADED = "DATASET_UPLOADED"
    DATASET_PROFILED = "DATASET_PROFILED"
    DATASET_VALIDATED = "DATASET_VALIDATED"
    CONSTRAINTS_VALIDATED = "CONSTRAINTS_VALIDATED"
    FEASIBILITY_APPROVED = "FEASIBILITY_APPROVED"
    CANDIDATES_GENERATED = "CANDIDATES_GENERATED"
    EXECUTION_APPROVED = "EXECUTION_APPROVED"
    TRAINING_RUNNING = "TRAINING_RUNNING"
    TRAINING_COMPLETED = "TRAINING_COMPLETED"
    TRAINING_BLOCKED = "TRAINING_BLOCKED"
    TRAINING_KILLED = "TRAINING_KILLED"
```

### Valid Transitions

```python
VALID_TRANSITIONS = {
    None: [LifecycleState.DATASET_UPLOADED],
    LifecycleState.DATASET_UPLOADED: [LifecycleState.DATASET_PROFILED],
    LifecycleState.DATASET_PROFILED: [
        LifecycleState.DATASET_VALIDATED,
        LifecycleState.DATASET_UPLOADED,
    ],
    LifecycleState.DATASET_VALIDATED: [LifecycleState.CONSTRAINTS_VALIDATED],
    LifecycleState.CONSTRAINTS_VALIDATED: [
        LifecycleState.FEASIBILITY_APPROVED,
        LifecycleState.DATASET_PROFILED,
    ],
    LifecycleState.FEASIBILITY_APPROVED: [LifecycleState.CANDIDATES_GENERATED],
    LifecycleState.CANDIDATES_GENERATED: [
        LifecycleState.EXECUTION_APPROVED,
        LifecycleState.TRAINING_BLOCKED,
    ],
    LifecycleState.EXECUTION_APPROVED: [
        LifecycleState.TRAINING_RUNNING,
        LifecycleState.TRAINING_BLOCKED,
    ],
    LifecycleState.TRAINING_RUNNING: [
        LifecycleState.TRAINING_COMPLETED,
        LifecycleState.TRAINING_KILLED,
    ],
    LifecycleState.TRAINING_COMPLETED: [],
    LifecycleState.TRAINING_BLOCKED: [
        LifecycleState.DATASET_UPLOADED,
        LifecycleState.EXECUTION_APPROVED,
    ],
    LifecycleState.TRAINING_KILLED: [LifecycleState.DATASET_UPLOADED],
}
```

### Page to State Mapping

```python
PAGE_TO_STATE = {
    "/datasets/new": LifecycleState.DATASET_UPLOADED,
    "/datasets/profile": LifecycleState.DATASET_PROFILED,
    "/datasets/validate": LifecycleState.DATASET_VALIDATED,
    "/design/constraints": LifecycleState.CONSTRAINTS_VALIDATED,
    "/design/results": LifecycleState.CANDIDATES_GENERATED,
    "/train/confirm": LifecycleState.EXECUTION_APPROVED,
    "/train/running": LifecycleState.TRAINING_RUNNING,
    "/train/result": LifecycleState.TRAINING_COMPLETED,
}
```

### Project State Class

```python
@dataclass
class ProjectState:
    id: str
    name: str
    current_state: Optional[LifecycleState] = None
    dataset_info: Dict[str, Any] = field(default_factory=dict)
    profile_info: Dict[str, Any] = field(default_factory=dict)
    validation_errors: List[ValidationError] = field(default_factory=list)
    constraints: Dict[str, Any] = field(default_factory=dict)
    candidates: List[Dict[str, Any]] = field(default_factory=list)
    selected_pipeline: Optional[Dict[str, Any]] = None
    training_plan: Dict[str, Any] = field(default_factory=dict)
    training_result: Optional[Dict[str, Any]] = None
    owner_id: Optional[str] = None
    workspace_id: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def can_transition_to(self, target: LifecycleState) -> bool:
        allowed = VALID_TRANSITIONS.get(self.current_state, [])
        return target in allowed

    def transition_to(self, target: LifecycleState, metadata: Dict[str, Any] = None) -> bool:
        if not self.can_transition_to(target):
            raise InvalidTransitionError(self.current_state, target)
        # Update state and metadata...

    def get_allowed_next_states(self) -> List[LifecycleState]:
        return VALID_TRANSITIONS.get(self.current_state, [])

    def get_blocking_errors(self) -> List[ValidationError]:
        return [e for e in self.validation_errors if e.code.startswith("BLOCK_")]

    def is_blocked(self) -> bool:
        return len(self.get_blocking_errors()) > 0
```

### Project Store

```python
class ProjectStore:
    _projects: Dict[str, ProjectState] = {}
    _initialized = False

    @classmethod
    def _ensure_initialized(cls):
        if not cls._initialized:
            init_projects_table()
            cls._load_all()
            cls._initialized = True

    @classmethod
    def create(cls, name: str, owner_id: str = None, workspace_id: str = None) -> ProjectState:
        # Create new project...

    @classmethod
    def get(cls, project_id: str) -> Optional[ProjectState]:
        # Get project by ID...

    @classmethod
    def get_all(cls) -> List[ProjectState]:
        # Get all projects...

    @classmethod
    def save(cls, project: ProjectState):
        # Save project to database...

    @classmethod
    def delete(cls, project_id: str) -> bool:
        # Delete project...
```

### Exceptions

```python
class InvalidTransitionError(Exception):
    def __init__(self, current: LifecycleState, target: LifecycleState):
        self.current = current
        self.target = target
        super().__init__(f"Cannot transition from {current.value} to {target.value}")

@dataclass
class ValidationError:
    code: str
    message: str
    action: str

@dataclass
class ConstraintViolation:
    metric: str
    estimated: float
    limit: float
    suggestion: str
```

---

## ML Pipelines

**File:** `pipelines/tabular/pipeline.py`

### Tabular Pipeline

```python
@dataclass
class TabularPipeline:
    """Base class for tabular ML pipelines"""

    name: str = "tabular_pipeline"
    model_type: str = "RandomForest"
    target_column: Optional[str] = None
    model: Optional[RandomForestClassifier] = None
    label_encoder: Optional[LabelEncoder] = None
    feature_columns: Optional[list] = None

    def fit(self, df: pd.DataFrame, target: str) -> dict:
        """Fit the pipeline and return metrics"""
        self.target_column = target
        feature_cols = [c for c in df.columns if c != target]
        self.feature_columns = feature_cols

        X = df[feature_cols].copy()
        y = df[target].copy()

        # Encode categorical features
        for col in X.select_dtypes(include=["object"]).columns:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))

        X = X.fillna(0)

        # Encode target if needed
        if y.dtype == "object":
            self.label_encoder = LabelEncoder()
            y = self.label_encoder.fit_transform(y)

        # Train/test split
        X_train, _, y_train, _ = train_test_split(X, y, test_size=0.2, random_state=42)

        # Train model
        self.model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
        self.model.fit(X_train, y_train)

        return {"status": "fitted", "rows": len(df)}

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        """Make predictions"""
        if self.model is None:
            return np.zeros(len(df))

        X = df.copy()
        if self.feature_columns:
            X = X[self.feature_columns]

        # Encode categorical features
        for col in X.select_dtypes(include=["object"]).columns:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))

        X = X.fillna(0)
        preds = self.model.predict(X)

        if self.label_encoder:
            preds = self.label_encoder.inverse_transform(preds)

        return preds

    def evaluate(self, df: pd.DataFrame, target: str) -> dict:
        """Evaluate the pipeline"""
        if self.model is None:
            raise RuntimeError("Model not fitted. Call fit() first.")

        X = df[[c for c in df.columns if c != target]].copy()
        y_true = df[target].copy()

        # Encode features
        for col in X.select_dtypes(include=["object"]).columns:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))

        X = X.fillna(0)
        preds = self.model.predict(X)

        if self.label_encoder:
            y_true = self.label_encoder.transform(y_true)

        accuracy = accuracy_score(y_true, preds)
        return {"accuracy": round(accuracy, 4)}
```

---

## Governance & Audit

**File:** `governance/audit_logger.py`

### Policy Engine

```python
class PolicyEngine:
    def check_policy(self, action: str, context: dict) -> bool:
        high_risk_actions = ["deploy_production", "delete_pipeline", "modify_policy"]
        if action in high_risk_actions:
            return context.get("approved", False)
        return True

    def require_approval(self, action: str) -> bool:
        return action in ["deploy_production", "modify_policy", "delete_pipeline"]
```

### Audit Logger

```python
@dataclass
class AuditLogger:
    log_path: str = "./governance/audit.log"
    _db_path: str = "./system2ml_audit.db"

    def _init_db(self):
        conn = sqlite3.connect(self._db_path)
        c = conn.cursor()
        c.execute("""CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            user TEXT,
            action TEXT NOT NULL,
            resource TEXT,
            result TEXT,
            details TEXT,
            ip_address TEXT,
            user_agent TEXT
        )""")
        conn.commit()
        conn.close()

    def log(self, user: str, action: str, resource: str, result: str, 
           details: dict = None, ip_address: str = None, user_agent: str = None):
        """Log an audit event"""
        # Insert into database and write to log file...

    def get_logs(self, filter_criteria: dict = None) -> list:
        """Get audit logs with optional filtering"""

    def get_user_activity(self, user: str) -> List[Dict]:
        """Get all activity for a specific user"""

    def get_resource_history(self, resource: str) -> List[Dict]:
        """Get history for a specific resource"""
```

---

## Memory & Embeddings

**File:** `memory/embeddings.py`

```python
class EmbeddingStore:
    """Store and retrieve embeddings for semantic search"""
    
    def add_embedding(self, key: str, text: str, metadata: dict = None):
        # Add embedding...

    def search(self, query: str, top_k: int = 5) -> List[dict]:
        # Search embeddings...

    def get_similar(self, key: str, top_k: int = 5) -> List[dict]:
        # Get similar embeddings...
```

**File:** `memory/failure_store.py`

```python
class FailureStore:
    """Store and analyze failure patterns"""
    
    def log_failure(self, failure: FailureRecord):
        # Log failure...

    def get_failures(self, pipeline_id: str = None) -> List[FailureRecord]:
        # Get failures...

    def analyze_patterns(self) -> dict:
        # Analyze failure patterns...

    def suggest_fix(self, error_type: str) -> str:
        # Suggest fix based on historical failures...
```

---

## Observability

### Metrics (`observability/metrics.py`)

```python
class MetricsCollector:
    def record_metric(self, name: str, value: float, tags: dict = None):
        # Record metric...

    def get_metrics(self, name: str = None, tags: dict = None) -> list:
        # Get metrics...

    def get_aggregated(self, name: str, aggregation: str = "avg") -> float:
        # Get aggregated metric...
```

### Carbon Tracking (`observability/carbon.py`)

```python
class CarbonTracker:
    def track_training(self, model_name: str, dataset_size: int, duration_seconds: float):
        # Track carbon emissions...

    def get_carbon_report(self, project_id: str = None) -> dict:
        # Get carbon report...

    def estimate_carbon(self, model_name: str, dataset_size: int, epochs: int) -> float:
        # Estimate carbon emissions...
```

### Drift Detection (`observability/drift.py`)

```python
class DriftDetector:
    def detect_data_drift(self, reference_data: pd.DataFrame, 
                       current_data: pd.DataFrame) -> dict:
        # Detect data drift...

    def detect_model_drift(self, predictions: np.ndarray, 
                       actuals: np.ndarray) -> dict:
        # Detect model drift...

    def alert_on_drift(self, drift_score: float, threshold: float = 0.1):
        # Alert if drift exceeds threshold...
```

---

## Validation System

**File:** `lib/validation/validator.py`

```python
class DatasetValidator:
    def validate(self, dataset: pd.DataFrame, rules: ValidationRules) -> ValidationResult:
        # Validate dataset...

    def check_schema(self, dataset: pd.DataFrame, schema: dict) -> List[ValidationError]:
        # Check schema...

    def check_quality(self, dataset: pd.DataFrame, thresholds: dict) -> List[ValidationError]:
        # Check data quality...

    def check_compliance(self, dataset: pd.DataFrame, 
                        level: str) -> List[ValidationError]:
        # Check compliance requirements...
```

---

## Orchestration

**File:** `orchestrator/executor.py`

```python
class PipelineExecutor:
    def __init__(self, backend: str = "local"):
        self.backend = backend

    def execute(self, pipeline: Pipeline, dataset: pd.DataFrame) -> ExecutionResult:
        # Execute pipeline...

    def execute_async(self, pipeline: Pipeline, dataset: pd.DataFrame) -> str:
        # Execute pipeline asynchronously...

    def cancel_execution(self, execution_id: str):
        # Cancel execution...

    def get_status(self, execution_id: str) -> ExecutionStatus:
        # Get execution status...
```

**File:** `orchestrator/kubeflow_templates/pipeline_generator.py`

Generates Kubeflow pipelines for cloud orchestration.

```python
class KubeflowPipelineGenerator:
    def generate_pipeline(self, pipeline: Pipeline) -> str:
        # Generate Kubeflow pipeline YAML...

    def compile(self, pipeline_yaml: str, output_path: str):
        # Compile pipeline...
```

---

## Summary

The System2ML backend is a comprehensive ML platform that provides:

1. **Core Models** - Data classes for pipelines, executions, failures
2. **Config Management** - Pydantic-based configuration with env var support
3. **Model Backends** - Abstraction for different ML frameworks
4. **API Layer** - FastAPI with REST and WebSocket support
5. **Database** - SQLite with full schema for users, pipelines, runs
6. **State Machine** - Lifecycle management with validation
7. **ML Pipelines** - Tabular, NLP, Vision pipelines
8. **Governance** - Audit logging and policy enforcement
9. **Memory** - Embeddings and failure analysis
10. **Observability** - Metrics, carbon tracking, drift detection
11. **Validation** - Dataset and model validation
12. **Orchestration** - Local and Kubeflow execution

This architecture enables full ML lifecycle management from dataset upload through training, validation, and deployment with governance and observability built in.