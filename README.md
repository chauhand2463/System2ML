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

### Training Pipeline
1. **Pre-Training Gate** - Final feasibility check
2. **Live Training** - Real-time progress & constraint monitoring
3. **Results** - Post-training metrics & model artifacts

### Pipeline Designer
- 🎨 Visual DAG editor with drag-and-drop
- 📦 10 node types (Source, Transform, Model, Sink, Monitor)

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

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Datasets │  │  Design  │  │  Train   │  │   Pipeline   │  │
│  │  Pages   │  │  Wizard  │  │  Pages   │  │   Designer   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST API
┌───────────────────────────┴─────────────────────────────────────┐
│                      Backend (FastAPI)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │  Validation │  │ Feasibility  │  │   Training Engine  │   │
│  │    API      │  │    Policy    │  │                    │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │  Dataset    │  │    Safety    │  │   Eligibility     │   │
│  │  Profiling  │  │     Gate     │  │      Matrix       │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- pnpm or npm

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

### Development Mode

```bash
# Run both frontend and backend
npm run dev:all
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

---

## 📡 API Endpoints

### Dataset API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/datasets/profile` | Profile a dataset |
| POST | `/api/datasets/validate` | Validate against constraints |
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

### Pipeline API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pipelines` | List pipelines |
| GET | `/api/pipelines/{id}` | Get pipeline |
| POST | `/api/pipelines/{id}/execute` | Execute pipeline |
| GET | `/api/runs` | List runs |

---

## 📂 Project Structure

```
system2ml/
├── app/                          # Next.js App Router
│   ├── api/                      # OAuth callbacks
│   ├── datasets/new/             # Dataset intake
│   ├── design/                   # Design wizard
│   ├── train/                    # Training pages
│   ├── pipelines/                # Pipeline management
│   ├── runs/                     # Run history
│   ├── failures/                 # Failure memory
│   ├── monitoring/               # Drift detection
│   ├── design-agent/              # AI proposals
│   ├── approvals/                # Approval workflow
│   ├── governance/               # Audit logs
│   └── login/                    # Authentication
│
├── components/                   # React components
│   ├── layout/                   # Layout (sidebar, header)
│   ├── pipelines/                # Pipeline designer
│   ├── dashboard/                # Dashboard widgets
│   └── ui/                       # shadcn/ui components
│
├── hooks/                        # React hooks
│   ├── use-auth.tsx             # Authentication
│   └── use-design.tsx           # Design flow state
│
├── lib/                          # Core libraries
│   ├── api.ts                   # API client
│   ├── types.ts                 # TypeScript types
│   ├── validation/              # Constraint validation
│   ├── feasibility/             # Policy engine
│   └── safety/                  # Safety gate
│
├── agent/                        # AI Agent
│   ├── planner.py               # Design planner
│   └── rl_policy.py            # RL policy
│
├── ui/                          # FastAPI Backend
│   ├── api.py                   # All API routes
│   └── database.py              # SQLite database
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

## 📄 License

MIT License - Copyright (c) 2026

---

## 🤝 Connect With Me

<p align="center">
  <a href="https://github.com/chauhand2463">
    <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
  </a>
  <a href="https://linkedin.com/in/">
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
