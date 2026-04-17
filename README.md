# 🚀 System2ML - AI-Driven ML Pipeline Design System

<p align="center">
  <a href="https://system2-ml.vercel.app/">
    <img src="https://img.shields.io/badge/Live-Demo-blueviolet.svg" alt="Live Demo" />
  </a>
  <a href="https://github.com/chauhand2463/System2ML">
    <img src="https://img.shields.io/badge/version-0.2.0-blue.svg" alt="Version" />
  </a>
  <a href="https://github.com/chauhand2463/System2ML">
    <img src="https://img.shields.io/badge/python-3.10+-green.svg" alt="Python" />
  </a>
  <a href="https://github.com/chauhand2463/System2ML">
    <img src="https://img.shields.io/badge/nextjs-16-orange.svg" alt="Next.js" />
  </a>
  <a href="https://github.com/chauhand2463/System2ML/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="License" />
  </a>
</p>

---

<p align="center">
  <b>Built by <a href="https://github.com/chauhand2463">Dhairy Chauhan</a></b>
</p>

---

## 🌟 Live Demo

**Frontend (Vercel):** https://system2-ml.vercel.app/

**Backend (Render):** https://system2ml-api.onrender.com

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Getting Started](#getting-started)
6. [API Endpoints](#api-endpoints)
7. [Project Structure](#project-structure)
8. [Deployment](#deployment)
9. [License](#license)

---

## 🎯 Overview

**System2ML** is a comprehensive, production-ready platform for designing, executing, and governing ML pipelines with AI-powered intelligence. It enforces user-defined constraints (cost, carbon, latency) throughout the entire ML lifecycle.

### What Makes It Special?

- 🔒 **Constraint-Driven**: Every pipeline validated against user constraints before execution
- 📊 **Real Dataset Profiling**: Accepts real data with auto type inference & PII detection  
- ⚡ **Live Monitoring**: Real-time training with auto-stop capabilities
- 🎯 **Feasibility Engine**: Only generates pipelines that can actually run
- 🏢 **Enterprise-Ready**: OAuth, approvals, and complete audit trails
- 🤖 **AI-Powered Design**: Groq Llama-3.3 powered pipeline synthesis
- ☁️ **Colab Integration**: Auto-generate and download training notebooks

---

## ✨ Features

### Dataset Management
- 📁 Upload datasets (CSV, Parquet, JSON, images, text)
- 🔗 Connect to external sources (S3, GCS, Database, API)
- 🔍 Automatic profiling: data type, labels, size, class balance, PII detection

### Design Wizard Flow
1. **Input** - Review dataset summary
2. **Constraints** - Set cost, carbon, latency limits
3. **Preferences** - Configure objective, deployment, retraining
4. **Review** - Validate constraints & generate candidates
5. **Results** - Select feasible pipeline

### AI Architect
- 🧠 Groq Llama-3.3 powered pipeline synthesis
- 📝 Self-critique and explainability
- ✅ Schema validation
- 🎯 Model eligibility matrix

### Training Pipeline
1. **Pre-Training Gate** - Final feasibility check
2. **Live Training** - Real-time progress & constraint monitoring
3. **Results** - Post-training metrics & model artifacts

### Training Options
- 💻 **Local GPU Training** - Train on your machine
- ☁️ **Google Colab** - Auto-generate notebooks for cloud GPU training
- 🎯 **On-Platform Fine-Tuning** - Real-time training with Celery/Redis (optional)

### Pipeline Designer
- 🎨 Visual DAG editor with drag-and-drop
- 📦 10+ node types (Source, Transform, Model, Sink, Monitor)

### Enterprise Features
- 🔐 OAuth (Google, GitHub)
- ✅ Approval workflows
- 📝 Complete audit logs
- 💡 Failure memory with AI-suggested fixes
- 📈 Real-time drift detection

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | FastAPI, Python 3.11, Pydantic |
| **Database** | SQLite |
| **Deployment** | Vercel (Frontend), Render (Backend) |
| **Authentication** | OAuth (Google, GitHub) |
| **AI** | Groq Llama-3.3 |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐     │
│  │ Datasets │  │  Design  │  │  Train   │  │   Pipeline   │     │
│  │  Pages   │  │  Wizard  │  │  Pages   │  │   Designer   │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘     │ 
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐     │
│  │ AI Arch. │  │ Colab    │  │Monitoring│  │  Governance  │     │
│  │          │  │ Notebook │  │          │  │              │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘     │ 
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST API
┌───────────────────────────┴─────────────────────────────────────┐
│                      Backend (FastAPI)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │  Validation  │  │ Feasibility  │  │   Training Engine  │     │
│  │    API       │  │    Policy    │  │                    │     │
│  └──────────────┘  └──────────────┘  └────────────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │  Dataset     │  │    Safety    │  │   Eligibility      │     │
│  │  Profiling   │  │     Gate     │  │      Matrix        │     │
│  └──────────────┘  └──────────────┘  └────────────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │  Groq LLM    │  │  Colab       │  │   State Machine    │     │
│  │  Pipeline    │  │  Service     │  │                    │     │
│  └──────────────┘  └──────────────┘  └────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- npm or pnpm
- Redis (for on-platform fine-tuning)
- GPU (optional, for local training)

### Installation

```bash
# Clone the repository
git clone https://github.com/chauhand2463/System2ML.git
cd System2ML

# Install Python dependencies
pip install -e ".[all]"

# Install frontend dependencies
npm install
# or
pnpm install
```

### Optional: On-Platform Fine-Tuning

For real on-platform fine-tuning (requires Redis + Celery):

```bash
# Install Celery and Redis dependencies
pip install celery redis

# Start Redis
redis-server

# Start Celery worker (separate terminal)
celery -A agent.tasks worker --loglevel=info
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000

# Groq API (for AI Architect)
GROQ_API_KEY=your_groq_api_key

# OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### Development Mode

```bash
# Run both frontend and backend
npm run dev:all

# Or run them separately:
# Terminal 1 - Backend  
python -m uvicorn ui.api:app --reload --port 8000

# Terminal 2 - Frontend
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 📡 API Endpoints

### Dataset API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/datasets/profile` | Profile a dataset |
| POST | `/api/datasets/validate` | Validate against constraints |
| POST | `/api/datasets/upload` | Upload dataset file |
| GET | `/api/datasets` | List all datasets |

### Design & Validation API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/validate` | Validate constraints |
| POST | `/api/feasibility/policy` | Get feasibility policy |
| POST | `/api/feasibility/generate` | Generate pipeline candidates |
| POST | `/api/design/request` | Full design request |
| GET | `/api/eligibility/matrix` | Model eligibility matrix |

### Training API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/training/start` | Start training |
| GET | `/api/training/{run_id}` | Get training status |
| POST | `/api/training/{run_id}/stop` | Stop training |
| POST | `/api/training/plan` | Plan training |
| POST | `/api/training/colab/create` | Create Colab notebook |
| GET | `/api/training/gpu-status` | Check GPU availability |

### Fine-Tuning API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/finetuning/start-platform` | Start on-platform fine-tuning (requires Celery) |
| GET | `/api/finetuning/status/{task_id}` | Get training progress |

### Monitoring API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/monitoring/drift` | Get drift monitoring data |

### Pipeline API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pipelines` | List pipelines |
| GET | `/api/pipelines/{id}` | Get pipeline |
| PUT | `/api/pipelines/{id}/nodes` | Save pipeline nodes/edges |
| POST | `/api/pipelines/{id}/execute` | Execute pipeline |
| GET | `/api/runs` | List runs |

### Lifecycle API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lifecycle/state/{project_id}` | Get project state |
| POST | `/api/lifecycle/transition/{project_id}` | Transition state |
| GET | `/api/lifecycle/validate/{project_id}` | Validate state access |

---

## 📂 Project Structure

```
system2ml/
├── app/                          # Next.js App Router
│   ├── api/                      # OAuth callbacks, internal APIs
│   │   └── training/colab/       # Colab notebook generation
│   ├── datasets/new/             # Dataset intake
│   ├── design/                   # Design wizard
│   │   ├── input/               # Dataset input
│   │   ├── constraints/         # Constraint setting
│   │   ├── preferences/         # User preferences
│   │   ├── review/              # Review & validate
│   │   ├── results/             # Pipeline selection
│   │   └── ai-architect/        # AI-powered design
│   ├── train/                    # Training pages
│   │   ├── confirm/             # Pre-training confirmation
│   │   ├── running/             # Live training
│   │   └── result/              # Training results
│   ├── pipelines/                # Pipeline management
│   ├── runs/                    # Run history
│   ├── failures/                # Failure memory
│   ├── monitoring/              # Drift detection
│   ├── approvals/               # Approval workflow
│   ├── governance/              # Audit logs
│   ├── login/                   # Authentication
│   └── register/                # Registration
│
├── components/                   # React components
│   ├── layout/                  # Layout (sidebar, header)
│   ├── pipelines/                # Pipeline designer
│   ├── dashboard/                # Dashboard widgets
│   ├── design/                   # Design components
│   └── ui/                      # shadcn/ui components
│
├── hooks/                        # React hooks
│   ├── use-auth.tsx            # Authentication
│   ├── use-design.tsx          # Design flow state
│   └── use-workflow.tsx       # Workflow state
│
├── lib/                          # Core libraries
│   ├── api.ts                   # API client
│   ├── types.ts                 # TypeScript types
│   ├── utils.ts                 # Utilities
│   ├── state_machine.py         # Lifecycle state machine
│   ├── feasibility/             # Policy engine
│   └── safety/                  # Safety gate
│
├── agent/                        # AI Agent
│   ├── planner.py               # Design planner
│   ├── colab_service.py         # Colab notebook generation
│   └── training_engine.py       # Training execution
│
├── ui/                          # FastAPI Backend
│   ├── api.py                   # All API routes
│   └── database.py              # SQLite database
│
├── governance/                   # Governance
│   ├── policies.yaml            # Governance policies
│   └── audit_logger.py          # Audit logging
│
├── memory/                       # Memory
│   ├── embeddings.py             # Vector embeddings
│   └── failure_store.py         # Failure memory
│
├── public/                      # Static assets
├── pyproject.toml               # Python config
├── package.json                 # Node config
└── README.md                    # This file
```

---

## 🌐 Deployment

### Frontend (Vercel)

```bash
# Build and deploy
npm run build
```

**Environment Variables:**
| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://system2ml-api.onrender.com` |

### Backend (Render)

| Setting | Value |
|---------|-------|
| Build Command | `pip install -e ".[all]"` |
| Start Command | `uvicorn ui.api:app --host 0.0.0.0 --port $PORT` |
| Python Version | `3.11` |

---

## 🤝 Connect With Me

<p align="center">
  <a href="https://github.com/chauhand2463">
    <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
  </a>
  <a href="https://linkedin.com/in/dhairy-chauhan">
    <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" />
  </a>
  <a href="https://twitter.com/chauhand2463">
    <img src="https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white" alt="Twitter" />
  </a>
</p>

---

<p align="center">
  ⭐️ If you like this project, please give it a star on GitHub!
</p>

---

<p align="center">
  <b>Built with ❤️ by <a href="https://github.com/chauhand2463">Dhairy Chauhan</a></b><br>
  © 2026 System2ML - All rights reserved
</p>
#
