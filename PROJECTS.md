# System2ML - Final Year Project Documentation

## Project Overview

**Project Name:** System2ML - Intelligent ML Automation Platform  
**Duration:** Final Year Engineering Project  
**Domain:** Machine Learning / MLOps / AutoML

---

## 1. Problem Statement

Traditional machine learning workflows require significant expertise and manual effort:
- Data preprocessing is time-consuming and error-prone
- Selecting the right model requires extensive trial and error
- Hyperparameter tuning is computationally expensive
- Model deployment and serving need DevOps skills
- Results comparison and reporting are manual processes

**Goal:** Build an intelligent AutoML platform that automates the end-to-end ML pipeline from dataset upload to model deployment.

---

## 2. Solution Architecture

### 2.1 System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐    │
│  │Dashboard │ │ AutoML   │ │Pipelines │ │   Visualizations │    │
│  │          │ │   Lab    │ │          │ │                  │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST API
┌───────────────────────────┴─────────────────────────────────────┐
│                      Backend (FastAPI)                          │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────────┐   │
│  │   AutoML API   │ │  Pipeline API  │ │  Training Engine    │     │
│  │  - Datasets    │ │  - Design      │ │  - Execution        │     │
│  │  - Experiments │ │  - Execution   │ │  - Monitoring       │     │
│  └────────────────┘ └────────────────┘ └────────────────────┘   │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────────┐   │
│  │  Auth System   │ │   Database    │ │    ML Engine        │    │
│  │  - JWT         │ │  - SQLite     │ │  - Trainer          │    │
│  │  - Sessions    │ │  - Models     │ │  - Evaluator        │    │
│  └────────────────┘ └────────────────┘ └────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 AutoML Engine

```
Input Dataset → Preprocessing → Model Training → Evaluation → Comparison
                                              ↓
                                      Model Recommendation
                                              ↓
                                        Deployment
```

---

## 3. Features Implemented

### 3.1 Authentication System
- User registration with email/password
- JWT-based authentication
- Password hashing with PBKDF2
- Session management
- Protected routes

### 3.2 Dataset Management
- CSV file upload
- Automatic data profiling
- Missing value detection
- PII detection
- Feature type inference
- Task type inference (classification/regression)

### 3.3 AutoML Pipeline
- **Preprocessing:**
  - Missing value handling
  - Categorical encoding (Label/OneHot)
  - Feature scaling (Standard/MinMax/Robust)

- **Model Training:**
  - Classification: Logistic Regression, Random Forest, XGBoost, SVM, KNN, Decision Tree, Naive Bayes, Gradient Boosting
  - Regression: Linear Regression, Ridge, Lasso, Random Forest, XGBoost, SVR, KNN, Decision Tree

- **Evaluation:**
  - Classification: Accuracy, Precision, Recall, F1-Score, ROC-AUC
  - Regression: MSE, RMSE, MAE, R² Score
  - Feature importance visualization

- **Comparison:**
  - Multi-model comparison
  - Ranking by different metrics
  - Visualization data preparation

- **Recommendation:**
  - Best model selection
  - Confidence scoring
  - Reasoning generation

### 3.4 Model Deployment
- Save trained models to disk
- REST API endpoint generation
- Prediction functionality
- Deployment management

### 3.5 Report Generation
- JSON reports
- HTML reports (styled)
- Markdown reports
- Downloadable formats

### 3.6 Visualization Dashboard
- Real-time metrics
- Model comparison charts
- Feature importance plots
- Training progress

---

## 4. Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16, TypeScript, TailwindCSS |
| UI Components | shadcn/ui, Recharts, Framer Motion |
| Backend | FastAPI, Python 3.11 |
| Database | SQLite |
| ML Libraries | Scikit-learn, XGBoost, LightGBM, Pandas |
| Authentication | JWT, PBKDF2 |
| Deployment | Docker, Docker Compose |

---

## 5. API Endpoints

### AutoML API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/automl/datasets/upload` | Upload dataset |
| GET | `/api/automl/datasets` | List datasets |
| GET | `/api/automl/datasets/{id}` | Get dataset info |
| POST | `/api/automl/experiments` | Run experiment |
| GET | `/api/automl/experiments` | List experiments |
| GET | `/api/automl/experiments/{id}` | Get experiment |
| POST | `/api/automl/compare/{id}` | Compare models |
| POST | `/api/automl/deploy/{id}` | Deploy model |
| GET | `/api/automl/deployments` | List deployments |
| POST | `/api/automl/predict` | Make prediction |
| POST | `/api/automl/reports/{id}` | Generate report |

---

## 6. Database Schema

### Tables

- **users**: User authentication
- **sessions**: JWT tokens
- **pipelines**: ML pipeline definitions
- **runs**: Training runs
- **datasets**: Uploaded datasets
- **experiments**: ML experiments

---

## 7. Deployment

### Local Development
```bash
# Frontend
npm run dev

# Backend
python -m uvicorn ui.api:app --reload --port 8000
```

### Docker
```bash
docker-compose up --build
```

---

## 8. Sample Datasets

The project includes sample datasets in the `data/` directory:
- `sample_dataset.csv` - Sample tabular data

---

## 9. Future Enhancements

1. **Advanced Preprocessing:**
   - Feature engineering
   - Data augmentation
   - Outlier detection

2. **More ML Models:**
   - Deep learning support
   - Time-series models
   - NLP models

3. **Hyperparameter Tuning:**
   - Grid search
   - Random search
   - Bayesian optimization (Optuna)

4. **Model Explainability:**
   - SHAP values
   - LIME explanations

5. **Cloud Deployment:**
   - Kubernetes support
   - AWS/GCP/Azure integration

---

## 10. Conclusion

System2ML provides a comprehensive AutoML solution that:
- ✅ Automates end-to-end ML pipeline
- ✅ Supports multiple algorithms
- ✅ Provides model comparison and recommendation
- ✅ Enables easy model deployment
- ✅ Generates detailed reports
- ✅ Offers intuitive UI/UX

This project demonstrates:
- Full-stack development skills
- ML/MLOps knowledge
- System design capabilities
- Production-ready code quality
- Documentation and presentation skills

---

## References

- Scikit-learn Documentation: https://scikit-learn.org/
- FastAPI Documentation: https://fastapi.tiangolo.com/
- Next.js Documentation: https://nextjs.org/docs
- XGBoost Documentation: https://xgboost.readthedocs.io/

---

*Built with ❤️ for Final Year Project*
*© 2026 System2ML*