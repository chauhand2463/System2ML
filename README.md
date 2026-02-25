# System2ML - AI-Driven ML Pipeline Design System

<p align="center">
  <img src="public/icon.svg" alt="System2ML Logo" width="120" />
</p>

<p align="center">
  <a href="https://github.com/your-org/system2ml">
    <img src="https://img.shields.io/badge/version-0.2.0-blue.svg" alt="Version" />
  </a>
  <a href="https://github.com/your-org/system2ml">
    <img src="https://img.shields.io/badge/python-3.10+-green.svg" alt="Python" />
  </a>
  <a href="https://github.com/your-org/system2ml">
    <img src="https://img.shields.io/badge/nextjs-16-orange.svg" alt="Next.js" />
  </a>
  <a href="https://github.com/your-org/system2ml">
    <img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="License" />
  </a>
</p>

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Getting Started](#getting-started)
5. [Frontend Guide](#frontend-guide)
6. [Backend Guide](#backend-guide)
7. [API Endpoints](#api-endpoints)
8. [Project Structure](#project-structure)
9. [Configuration](#configuration)
10. [Development](#development)

---

## Overview

**System2ML** is a comprehensive, production-ready platform for designing, executing, and governing ML pipelines with AI-powered intelligence. It enforces user-defined constraints (cost, carbon, latency) throughout the entire ML lifecycle and ensures compliance at every step.

### Key Differentiators

- **Constraint-Driven Design**: Every pipeline is validated against user-defined constraints before execution
- **Real Dataset Profiling**: Accepts real user data with automatic type inference, PII detection, and validation
- **Live Constraint Monitoring**: Training runs are monitored in real-time with auto-stop capabilities
- **Feasibility Policy Engine**: Only generates pipelines that can actually execute within constraints
- **Enterprise-Ready**: OAuth authentication, approval workflows, and complete audit trails

---

## Features

### Dataset Management (`/datasets/new`)
- Upload datasets (CSV, Parquet, JSON, images, text files)
- Connect to external sources (S3, GCS, Database, API)
- Reference existing datasets by ID
- Automatic dataset profiling:
  - Data type inference (tabular, text, image, time-series)
  - Label detection and type identification
  - Size metrics (rows, columns, MB)
  - Class balance analysis
  - Missing value detection
  - PII field scanning

### Design Wizard Flow
1. **Input** (`/design/input`) - Review dataset summary
2. **Constraints** (`/design/constraints`) - Set cost, carbon, latency limits
3. **Preferences** (`/design/preferences`) - Configure objective, deployment, retraining
4. **Review** (`/design/review`) - Validate constraints and generate candidates
5. **Results** (`/design/results`) - Select feasible pipeline

### Training Pipeline
1. **Pre-Training Gate** (`/train/confirm`) - Final feasibility check before execution
2. **Live Training** (`/train/running`) - Real-time progress and constraint monitoring
3. **Results** (`/train/result/[run_id]`) - Post-training metrics and model artifacts

### Pipeline Designer (`/pipelines/[id]`)
- Visual DAG editor with drag-and-drop nodes
- 10 node types with extensive configuration:
  - Source nodes (DataLoader, DatabaseSource, APISource)
  - Transform nodes (Scaler, Encoder, Imputer, FeatureEngineer)
  - Model nodes (RandomForest, XGBoost, NeuralNet, etc.)
  - Sink nodes (ModelStorage, DatabaseSink, APISink)
  - Monitor nodes (DriftDetector, PerformanceMonitor)

### Enterprise Features
- **OAuth Authentication** - Google and GitHub login
- **Approval Workflows** - Multi-stage pipeline change approvals
- **Governance & Audit** - Complete audit trail of all operations
- **Failure Memory** - Centralized knowledge base of failures with AI-suggested fixes
- **Monitoring & Drift** - Real-time data drift detection with alerts

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 16)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Datasets │  │  Design  │  │  Train   │  │   Pipeline   │   │
│  │  Pages   │  │  Wizard  │  │  Pages   │  │   Designer   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST API
┌───────────────────────────┴─────────────────────────────────────┐
│                      Backend (FastAPI)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  Validation │  │ Feasibility  │  │   Training Engine  │  │
│  │    API      │  │    Policy    │  │    (Simulated)    │  │
│  └──────────────┘  └──────────────┘  └────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  Dataset    │  │    Safety    │  │   Eligibility     │  │
│  │  Profiling  │  │     Gate     │  │      Matrix       │  │
│  └──────────────┘  └──────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ 
- **Python** 3.10+
- **pnpm** (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/system2ml.git
cd system2ml

# Install Python dependencies
pip install -e ".[all]"

# Install frontend dependencies
npm install
# or
pnpm install
```

### Running the Application

#### Development Mode (Both Frontend + Backend)

```bash
npm run dev:all
```

This starts:
- Frontend at http://localhost:3000
- Backend API at http://localhost:8000

#### Frontend Only

```bash
npm run dev
```

#### Backend Only

```bash
python -m ui.api
# or
uvicorn ui.api:app --reload --port 8000
```

---

## Frontend Guide

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Context + localStorage

### Key Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | OAuth login (Google, GitHub) |
| `/dashboard` | KPI overview and activity |
| `/datasets/new` | Dataset intake and profiling |
| `/design/input` | Design wizard - dataset review |
| `/design/constraints` | Design wizard - constraint setup |
| `/design/preferences` | Design wizard - preferences |
| `/design/review` | Design wizard - validation |
| `/design/results` | Design wizard - pipeline selection |
| `/train/confirm` | Pre-training resource planning |
| `/train/running` | Live training monitoring |
| `/train/result/[run_id]` | Training results and artifacts |
| `/pipelines` | Pipeline list |
| `/pipelines/[id]` | Pipeline detail with designer |
| `/runs` | Run history |
| `/failures` | Failure knowledge base |
| `/monitoring` | Drift detection and alerts |
| `/design-agent` | AI optimization proposals |
| `/approvals` | Approval workflow |
| `/governance` | Audit logs |
| `/settings` | Configuration |

### Design Context (`use-design` hook)

The `useDesign` hook provides centralized state management for the design flow:

```typescript
import { useDesign } from '@/hooks/use-design'

const { 
  dataset,           // Current dataset profile
  constraints,       // User-defined constraints
  selectedPipeline, // Chosen pipeline candidate
  trainingRun,       // Current training run
  pipelineCandidates, // Generated candidates
  feasibilityPassed, // Validation status
  safetyGatePassed, // Safety gate status
  setDataset,
  setConstraints,
  setSelectedPipeline,
  // ... more methods
} = useDesign()
```

### Route Guards

Protected routes require:
1. **Authentication**: Valid user in localStorage (`system2ml_user`)
2. **Dataset**: For `/design/*` routes, valid dataset in localStorage (`system2ml_design_state`)

---

## Backend Guide

### Tech Stack
- **Framework**: FastAPI
- **Database**: SQLite (system2ml.db)
- **Validation**: Pydantic

### Core Modules

| Module | Location | Description |
|--------|----------|-------------|
| Validation | `lib/validation/` | Constraint validation logic |
| Feasibility | `lib/feasibility/` | Policy engine for pipeline eligibility |
| Eligibility | `lib/eligibility/` | Model family eligibility matrix |
| Safety | `lib/safety/` | Execution safety gate |
| Agent | `agent/planner.py` | AI design proposal generation |

### Key Validation Rules

1. **Cost Constraints**
   - Minimum: $0.10
   - Real-time deployment: Minimum $5.00

2. **Carbon Constraints**
   - User-defined limits enforced during training

3. **Compliance Levels**
   - `none` - No restrictions
   - `standard` - Basic validation
   - `regulated` - No PII allowed, limited model families
   - `highly_regulated` - Strict compliance required

---

## API Endpoints

### Dataset API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/datasets/profile` | Profile a dataset |
| POST | `/api/datasets/validate` | Validate against constraints |
| GET | `/api/datasets` | List all datasets |
| GET | `/api/datasets/{id}` | Get dataset by ID |

### Design & Validation API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/validate` | Validate user constraints |
| POST | `/api/feasibility/policy` | Get feasibility policy |
| POST | `/api/feasibility/generate` | Generate pipeline candidates |
| POST | `/api/design/request` | Full design request |
| GET | `/api/eligibility/matrix` | Model eligibility matrix |

### Training API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/training/start` | Start training run |
| GET | `/api/training/{run_id}` | Get training status |
| POST | `/api/training/{run_id}/stop` | Stop training run |

### Safety & Execution API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/safety/validate-execution` | Validate pipeline for execution |

### Pipeline API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pipelines` | List all pipelines |
| GET | `/api/pipelines/{id}` | Get pipeline details |
| POST | `/api/pipelines/{id}/execute` | Execute pipeline |
| GET | `/api/runs` | List all runs |
| GET | `/api/runs/{id}` | Get run details |

### Metrics API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/metrics` | System metrics |
| GET | `/api/activities` | Recent activities |
| GET | `/api/failures` | Failure cases |

---

## Project Structure

```
system2ml/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes (OAuth callbacks)
│   │   └── auth/callback/
│   ├── datasets/new/             # Dataset intake page
│   ├── design/                   # Design wizard pages
│   │   ├── input/
│   │   ├── constraints/
│   │   ├── preferences/
│   │   ├── review/
│   │   └── results/
│   ├── train/                    # Training pages
│   │   ├── confirm/
│   │   ├── running/
│   │   └── result/[run_id]/
│   ├── pipelines/                # Pipeline management
│   │   └── [id]/
│   ├── runs/                     # Run history
│   ├── failures/                 # Failure memory
│   ├── monitoring/               # Drift detection
│   ├── design-agent/             # AI proposals
│   ├── approvals/                # Approval workflow
│   ├── governance/               # Audit logs
│   ├── settings/                 # Configuration
│   ├── login/                    # Login page
│   └── layout.tsx                # Root layout
│
├── components/                    # React components
│   ├── layout/                   # Layout components
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── dashboard-layout.tsx
│   ├── pipelines/                # Pipeline components
│   │   ├── pipeline-designer.tsx
│   │   └── pipeline-card.tsx
│   ├── dashboard/                # Dashboard components
│   │   ├── kpi-card.tsx
│   │   └── activity-timeline.tsx
│   └── ui/                       # shadcn/ui components
│
├── hooks/                        # React hooks
│   ├── use-auth.tsx             # Authentication
│   ├── use-design.tsx           # Design flow state
│   └── use-mobile.ts
│
├── lib/                          # Core libraries
│   ├── api.ts                   # API client
│   ├── types.ts                 # TypeScript types
│   ├── utils.ts                 # Utilities
│   ├── validation/              # Validation modules
│   │   ├── schemas.py
│   │   └── validator.py
│   ├── feasibility/             # Feasibility engine
│   │   └── engine.py
│   ├── eligibility/             # Model eligibility
│   │   └── matrix.py
│   └── safety/                  # Safety gate
│       └── gate.py
│
├── agent/                       # AI Agent
│   ├── planner.py               # Design planner
│   ├── reward.py                # Reward functions
│   └── rl_policy.py             # RL policy
│
├── ui/                          # FastAPI Backend
│   ├── api.py                   # Main API routes
│   └── database.py              # SQLite database
│
├── public/                      # Static assets
│   └── icon.svg
│
├── system2ml.db                # SQLite database
├── pyproject.toml              # Python configuration
├── package.json                # Node configuration
├── tailwind.config.ts         # Tailwind config
├── tsconfig.json              # TypeScript config
└── next.config.mjs            # Next.js config
```

---

## Configuration

### Environment Variables

Create a `.env.local` file:

```env
# Backend
NEXT_PUBLIC_API_URL=http://localhost:8000

# OAuth (optional)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_GITHUB_CLIENT_ID=your-github-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
GITHUB_CLIENT_SECRET=your-github-secret

# Database
DATABASE_URL=sqlite:///./system2ml.db
```

### Python Dependencies

| Group | Packages |
|-------|----------|
| Core | numpy, pandas, scikit-learn, pyyaml, pydantic, fastapi, uvicorn, loguru |
| ML | mlflow, evidently |
| Observability | prometheus-client, codecarbon |
| Storage | sqlalchemy, redis |
| Dev | black, ruff, mypy, pytest |

---

## Development

### Running Tests

```bash
# Python tests
pytest

# Lint Python
ruff check .

# Type check Python
mypy .

# Lint frontend
npm run lint

# Build frontend
npm run build
```

### Adding New Features

1. **Backend**: Add endpoint to `ui/api.py`
2. **API Client**: Add function to `lib/api.ts`
3. **Types**: Define types in `lib/types.ts`
4. **State**: Add to `hooks/use-design.tsx` if needed
5. **UI**: Create component in `components/`
6. **Page**: Add route in `app/`

### Code Style

- **Python**: Black formatting, Ruff linting
- **TypeScript**: ESLint + Prettier
- **Components**: Functional components with hooks
- **Styling**: Tailwind CSS classes

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Support

- Documentation: [docs.system2ml.com](https://docs.system2ml.com)
- Issues: [github.com/your-org/system2ml/issues](https://github.com/your-org/system2ml/issues)
- Discord: [discord.system2ml.com](https://discord.system2ml.com)

---

<p align="center">
  Built with ❤️ by the System2ML Team
</p>
