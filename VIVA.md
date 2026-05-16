# System2ML - Viva Questions & Answers

## Section 1: Project Overview

**Q1: What is System2ML?**
A: System2ML is an intelligent machine learning automation platform (AutoML) that allows users to upload datasets, automatically preprocess data, train multiple ML models, compare results, recommend the best model, visualize metrics, and deploy trained models as APIs.

**Q2: What is the main objective of this project?**
A: The main objective is to build a production-ready AutoML platform that automates the end-to-end ML pipeline from dataset upload to model deployment, making ML accessible to non-experts.

**Q3: How does System2ML differ from traditional ML workflows?**
A: Traditional ML requires manual data preprocessing, model selection, hyperparameter tuning, and deployment. System2ML automates all these steps while providing recommendations and visualizations.

---

## Section 2: Architecture & Technology

**Q4: What is the architecture of System2ML?**
A: The system has a frontend built with Next.js 16 and a backend built with FastAPI. The frontend communicates with the backend via REST API. The backend includes an AutoML engine for preprocessing, training, evaluation, and deployment.

**Q5: What technologies are used in this project?**
A:
- Frontend: Next.js 16, TypeScript, TailwindCSS, shadcn/ui, Recharts
- Backend: FastAPI, Python 3.11, Pydantic
- ML: Scikit-learn, XGBoost, LightGBM, Pandas, NumPy
- Database: SQLite
- Auth: JWT, PBKDF2
- Deployment: Docker, Docker Compose

**Q6: Why did you choose FastAPI for the backend?**
A: FastAPI is modern, fast (built on Starlette), provides automatic Swagger documentation, has native async support, and integrates well with Python ML libraries.

**Q7: Why Next.js for the frontend?**
A: Next.js provides server-side rendering, static site generation, automatic code splitting, and excellent developer experience with React ecosystem.

---

## Section 3: AutoML Features

**Q8: What preprocessing steps does System2ML perform?**
A:
1. Missing value detection and handling (mean/median for numerical, "Unknown" for categorical)
2. Categorical encoding (Label encoding, One-hot encoding)
3. Feature scaling (Standard, MinMax, Robust)
4. Feature type detection (numerical vs categorical)

**Q9: What ML models does System2ML support?**
A:
- Classification: Logistic Regression, Random Forest, XGBoost, SVM, KNN, Decision Tree, Naive Bayes, Gradient Boosting
- Regression: Linear Regression, Ridge, Lasso, Random Forest, XGBoost, SVR, KNN, Decision Tree

**Q10: How does the model recommendation work?**
A: The ModelRecommender class scores each model based on primary metrics (accuracy for classification, R² for regression) and secondary metrics. It then ranks models and provides reasoning for the recommendation.

**Q11: How is model deployment handled?**
A: Models are saved to disk using joblib. The ModelDeployer class creates deployment endpoints and allows predictions via REST API.

---

## Section 4: Database & Authentication

**Q12: What database is used and why?**
A: SQLite is used for its simplicity, zero-configuration, and file-based nature. It's suitable for development and small-scale deployments.

**Q13: How is authentication implemented?**
A: The system uses JWT (JSON Web Tokens) for authentication. User passwords are hashed using PBKDF2 with 100,000 iterations. Sessions are stored in the database with expiration times.

**Q14: What security measures are implemented?**
A:
- Password hashing with PBKDF2
- JWT token-based authentication
- CORS configuration
- Rate limiting (optional with slowapi)
- Input validation with Pydantic

---

## Section 5: Frontend & UI

**Q15: How is the frontend structured?**
A: The frontend uses Next.js App Router with pages for Dashboard, AutoML Lab, Pipelines, Runs, and more. It uses Zustand for state management and React Hook Form for form handling.

**Q16: What UI components are used?**
A: The project uses shadcn/ui components (Button, Card, Tabs, Select, etc.) which are built on Radix UI primitives with TailwindCSS styling.

**Q17: How is data visualization implemented?**
A: Recharts library is used for creating interactive charts like bar charts, line charts, and comparison visualizations.

---

## Section 6: Deployment & DevOps

**Q18: How is the application deployed?**
A: Docker and Docker Compose are used for containerization. The setup includes services for frontend, backend, Redis, and optional Nginx reverse proxy.

**Q19: What are the environment variables required?**
A:
- GROQ_API_KEY: For AI-powered pipeline design
- NEXT_PUBLIC_API_URL: Frontend API endpoint
- DATABASE_URL: Database connection string

**Q20: How do you run the application locally?**
A:
```bash
# Frontend
npm run dev

# Backend
python -m uvicorn ui.api:app --reload --port 8000

# Or both
npm run dev:all
```

---

## Section 7: Challenges & Solutions

**Q21: What challenges did you face during development?**
A:
1. Handling different data types and missing values
2. Managing model state across requests
3. Implementing real-time training progress updates
4. Ensuring compatibility between frontend and backend APIs
5. Dockerizing the application with all dependencies

**Q22: How did you handle model persistence?**
A: Trained models are saved to disk using joblib serialization. Model metadata (hyperparameters, feature importance, label encoders) is stored alongside the model.

---

## Section 8: Future Work & Improvements

**Q23: What future enhancements are planned?**
A:
1. Add hyperparameter tuning with Optuna
2. Add SHAP for model explainability
3. Add more model types (deep learning, time-series)
4. Implement Kubernetes deployment
5. Add cloud storage integration (AWS S3, GCP)

**Q24: How can this project be extended?**
A: The project can be extended with:
- AutoML hyperparameter optimization
- Model versioning and registry
- A/B testing for deployed models
- Integration with MLflow for experiment tracking
- Real-time streaming for predictions

---

## Section 9: Technical Questions

**Q25: Explain the flow of an AutoML experiment in System2ML.**
A: 
1. User uploads dataset (CSV)
2. System analyzes data (rows, columns, feature types)
3. User selects target column and task type
4. User selects models to train
5. System preprocesses data (encoding, scaling)
6. System trains multiple models in parallel
7. System evaluates all models
8. System compares and recommends best model
9. User can deploy best model or generate reports

**Q26: How does the evaluation metrics calculation work?**
A: For classification: Accuracy, Precision, Recall, F1-Score are calculated using sklearn's metrics. For regression: MSE, RMSE, MAE, R² Score are calculated. Cross-validation is performed for robustness.

**Q27: What is the role of each AutoML module?**
A:
- Preprocessing: Data cleaning and transformation
- Trainer: Model training with multiple algorithms
- Evaluator: Computing metrics and performance
- Comparator: Comparing multiple models
- Recommender: Selecting best model
- Deployer: Saving and serving models
- Reporter: Generating downloadable reports

---

## Section 10: Project Management

**Q28: What is the project folder structure?**
A:
```
system2ml/
├── app/              # Next.js pages
├── components/       # React components
├── automl/           # ML engine modules
├── automl_api/       # AutoML API routes
├── ui/               # FastAPI backend
├── lib/              # Utilities and types
├── hooks/            # React hooks
├── pipelines/        # ML pipelines
├── agent/            # AI agent
├── models/           # Saved ML models
├── experiments/     # Experiment data
└── reports/         # Generated reports
```

**Q29: How do you ensure code quality?**
A:
- TypeScript for frontend type safety
- Pydantic for backend validation
- ESLint and Prettier for code formatting
- Ruff for Python linting
- Modular architecture with clear separation of concerns

**Q30: What testing strategy is used?**
A: The project uses pytest for Python backend testing. Integration tests verify API endpoints work correctly. Manual testing is performed for UI/UX validation.

---

*Prepared for Final Year Viva Voce*
*System2ML - Intelligent ML Automation Platform*