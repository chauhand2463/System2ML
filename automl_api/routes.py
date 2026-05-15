"""AutoML API Routes"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import uuid
import json
import logging
import pandas as pd
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/automl", tags=["AutoML"])

EXPERIMENTS_DIR = "experiments"
os.makedirs(EXPERIMENTS_DIR, exist_ok=True)

MODELS_DIR = "models"
os.makedirs(MODELS_DIR, exist_ok=True)


class DatasetUploadResponse(BaseModel):
    dataset_id: str
    name: str
    rows: int
    columns: int
    features: List[str]
    target_column: Optional[str] = None
    task_type: str
    analysis: Dict[str, Any]


class ExperimentRequest(BaseModel):
    dataset_id: str
    target_column: str
    task_type: str = Field(..., description="classification, regression, or clustering")
    models: List[str] = Field(default=["Random Forest", "Logistic Regression", "XGBoost"])
    test_size: float = 0.2
    random_state: int = 42


class ExperimentResponse(BaseModel):
    experiment_id: str
    status: str
    dataset_id: str
    task_type: str
    models_trained: List[str]
    results: Dict[str, Any]
    best_model: Dict[str, Any]
    created_at: str


class ModelComparisonResponse(BaseModel):
    experiment_id: str
    models: List[Dict[str, Any]]
    comparison_table: Dict[str, Any]
    rankings: Dict[str, List[str]]
    best_model: str


class PredictionRequest(BaseModel):
    deployment_id: str
    features: Dict[str, Any]


class PredictionResponse(BaseModel):
    prediction: str
    probabilities: Optional[List[float]] = None
    timestamp: str


from automl.preprocessing import DataPreprocessor
from automl.trainer import ModelTrainer, TrainingConfig
from automl.evaluator import ModelEvaluator
from automl.compare import ModelComparator
from automl.recommender import ModelRecommender
from automl.deployer import ModelDeployer
from automl.reporter import ReportGenerator


def load_dataset(dataset_id: str) -> Optional[pd.DataFrame]:
    """Load dataset from file"""
    dataset_path = os.path.join("uploads", f"{dataset_id}.csv")
    if os.path.exists(dataset_path):
        return pd.read_csv(dataset_path)

    dataset_file = os.path.join(EXPERIMENTS_DIR, f"{dataset_id}.csv")
    if os.path.exists(dataset_file):
        return pd.read_csv(dataset_file)

    return None


@router.post("/datasets/upload", response_model=DatasetUploadResponse)
async def upload_dataset(file: UploadFile = File(...)):
    """Upload and analyze a dataset"""
    try:
        if not file.filename.endswith(".csv"):
            raise HTTPException(status_code=400, detail="Only CSV files are supported")

        dataset_id = str(uuid.uuid4())[:12]
        file_path = os.path.join(EXPERIMENTS_DIR, f"{dataset_id}.csv")

        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        df = pd.read_csv(file_path)

        preprocessor = DataPreprocessor()
        analysis = preprocessor.analyze_data(df)

        target_candidates = [
            col
            for col in df.columns
            if any(x in col.lower() for x in ["target", "label", "class", "y"])
        ]
        target_column = target_candidates[0] if target_candidates else None

        if target_column:
            task_type = preprocessor.infer_task_type(df, target_column)
        else:
            task_type = "classification"

        return DatasetUploadResponse(
            dataset_id=dataset_id,
            name=file.filename,
            rows=len(df),
            columns=len(df.columns),
            features=list(df.columns),
            target_column=target_column,
            task_type=task_type,
            analysis=analysis,
        )

    except Exception as e:
        logger.error(f"Error uploading dataset: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/datasets/{dataset_id}")
async def get_dataset_info(dataset_id: str):
    """Get dataset information"""
    df = load_dataset(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    preprocessor = DataPreprocessor()
    analysis = preprocessor.analyze_data(df)

    return {
        "dataset_id": dataset_id,
        "rows": len(df),
        "columns": len(df.columns),
        "features": list(df.columns),
        "analysis": analysis,
    }


@router.get("/datasets")
async def list_datasets():
    """List all datasets"""
    datasets = []
    if os.path.exists(EXPERIMENTS_DIR):
        for file in os.listdir(EXPERIMENTS_DIR):
            if file.endswith(".csv"):
                dataset_id = file.replace(".csv", "")
                df = pd.read_csv(os.path.join(EXPERIMENTS_DIR, file))
                datasets.append(
                    {
                        "dataset_id": dataset_id,
                        "name": file,
                        "rows": len(df),
                        "columns": len(df.columns),
                    }
                )
    return {"datasets": datasets}


@router.post("/experiments", response_model=ExperimentResponse)
async def run_experiment(request: ExperimentRequest):
    """Run ML experiment with multiple models"""
    try:
        experiment_id = str(uuid.uuid4())[:12]

        df = load_dataset(request.dataset_id)
        if df is None:
            raise HTTPException(status_code=404, detail="Dataset not found")

        if request.target_column not in df.columns:
            raise HTTPException(status_code=400, detail="Target column not found")

        preprocessor = DataPreprocessor()
        preprocessing_result = preprocessor.preprocess(
            df,
            target_column=request.target_column,
            task_type=request.task_type,
            scaler_type="standard",
            encoder_type="label",
        )

        config = TrainingConfig(
            test_size=request.test_size,
            random_state=request.random_state,
            cross_validation_folds=5,
        )

        trainer = ModelTrainer(config=config)
        training_results = trainer.train_multiple_models(
            preprocessing_result.data,
            target_column=request.target_column,
            model_names=request.models,
            task_type=request.task_type,
        )

        evaluator = ModelEvaluator()
        evaluation_results = []

        for result in training_results:
            eval_result = evaluator.evaluate(
                result.trained_model,
                preprocessing_result.data,
                target_column=request.target_column,
                model_id=result.model_id,
                model_name=result.model_name,
                task_type=request.task_type,
                label_encoder=result.label_encoder,
            )
            evaluation_results.append(eval_result)

        for result in training_results:
            model_path = os.path.join(MODELS_DIR, f"{result.model_id}.joblib")
            trainer.save_model(result, model_path)

        recommender = ModelRecommender()
        recommendation = recommender.recommend(evaluation_results)

        experiment_data = {
            "experiment_id": experiment_id,
            "dataset_id": request.dataset_id,
            "task_type": request.task_type,
            "target_column": request.target_column,
            "models": [r.model_name for r in training_results],
            "results": {
                r.model_id: {
                    "model_name": r.model_name,
                    "metrics": e.metrics,
                    "feature_importance": e.feature_importance,
                }
                for r, e in zip(training_results, evaluation_results)
            },
            "best_model": {
                "model_name": recommendation.recommended_model,
                "reason": recommendation.recommendation_reason,
                "confidence": recommendation.confidence_score,
            },
            "created_at": datetime.utcnow().isoformat(),
        }

        experiment_file = os.path.join(EXPERIMENTS_DIR, f"experiment_{experiment_id}.json")
        with open(experiment_file, "w") as f:
            json.dump(experiment_data, f, indent=2)

        results = {r.model_name: e.metrics for r, e in zip(training_results, evaluation_results)}

        return ExperimentResponse(
            experiment_id=experiment_id,
            status="completed",
            dataset_id=request.dataset_id,
            task_type=request.task_type,
            models_trained=[r.model_name for r in training_results],
            results=results,
            best_model={
                "model_name": recommendation.recommended_model,
                "reason": recommendation.recommendation_reason,
                "confidence": recommendation.confidence_score,
            },
            created_at=datetime.utcnow().isoformat(),
        )

    except Exception as e:
        logger.error(f"Error running experiment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/experiments/{experiment_id}")
async def get_experiment(experiment_id: str):
    """Get experiment results"""
    experiment_file = os.path.join(EXPERIMENTS_DIR, f"experiment_{experiment_id}.json")

    if not os.path.exists(experiment_file):
        raise HTTPException(status_code=404, detail="Experiment not found")

    with open(experiment_file, "r") as f:
        experiment_data = json.load(f)

    return experiment_data


@router.get("/experiments")
async def list_experiments():
    """List all experiments"""
    experiments = []
    if os.path.exists(EXPERIMENTS_DIR):
        for file in os.listdir(EXPERIMENTS_DIR):
            if file.startswith("experiment_") and file.endswith(".json"):
                with open(os.path.join(EXPERIMENTS_DIR, file), "r") as f:
                    data = json.load(f)
                    experiments.append(
                        {
                            "experiment_id": data.get("experiment_id"),
                            "dataset_id": data.get("dataset_id"),
                            "task_type": data.get("task_type"),
                            "models": data.get("models", []),
                            "best_model": data.get("best_model", {}).get("model_name"),
                            "created_at": data.get("created_at"),
                        }
                    )
    return {"experiments": experiments}


@router.post("/compare/{experiment_id}")
async def compare_models(experiment_id: str):
    """Compare models from an experiment"""
    experiment_file = os.path.join(EXPERIMENTS_DIR, f"experiment_{experiment_id}.json")

    if not os.path.exists(experiment_file):
        raise HTTPException(status_code=404, detail="Experiment not found")

    with open(experiment_file, "r") as f:
        experiment_data = json.load(f)

    results = experiment_data.get("results", {})

    class MockEvaluation:
        def __init__(self, model_id, model_name, task_type, metrics, feature_importance=None):
            self.model_id = model_id
            self.model_name = model_name
            self.task_type = task_type
            self.metrics = metrics
            self.feature_importance = feature_importance

    evaluations = []
    for model_id, data in results.items():
        eval_obj = MockEvaluation(
            model_id=model_id,
            model_name=data.get("model_name"),
            task_type=experiment_data.get("task_type"),
            metrics=data.get("metrics"),
            feature_importance=data.get("feature_importance"),
        )
        evaluations.append(eval_obj)

    comparator = ModelComparator()
    comparison = comparator.compare_models(evaluations, experiment_data.get("task_type"))

    return {
        "experiment_id": experiment_id,
        "models": comparison.models,
        "comparison_table": comparison.comparison_table.to_dict()
        if not comparison.comparison_table.empty
        else {},
        "rankings": comparison.rankings,
    }


@router.post("/deploy/{model_id}")
async def deploy_model(model_id: str):
    """Deploy a trained model"""
    model_file = os.path.join(MODELS_DIR, f"{model_id}.joblib")

    if not os.path.exists(model_file):
        raise HTTPException(status_code=404, detail="Model not found")

    import joblib

    model_data = joblib.load(model_file)
    model_name = model_data.get("model_name", "Unknown")

    deployer = ModelDeployer(models_dir=MODELS_DIR)
    deployment = deployer.deploy(model_id, model_name)

    return {
        "deployment_id": deployment.deployment_id,
        "model_id": model_id,
        "model_name": model_name,
        "endpoint": deployment.endpoint,
        "status": deployment.status,
    }


@router.get("/deployments")
async def list_deployments():
    """List all deployments"""
    deployer = ModelDeployer(models_dir=MODELS_DIR)
    return {"deployments": deployer.list_deployments()}


@router.post("/predict")
async def predict(request: PredictionRequest):
    """Make prediction using deployed model"""
    deployer = ModelDeployer(models_dir=MODELS_DIR)

    try:
        result = deployer.predict(request.deployment_id, request.features)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/deployments/{deployment_id}")
async def get_deployment(deployment_id: str):
    """Get deployment info"""
    deployer = ModelDeployer(models_dir=MODELS_DIR)
    deployment = deployer.get_deployment_status(deployment_id)

    if deployment is None:
        raise HTTPException(status_code=404, detail="Deployment not found")

    return deployment


@router.post("/reports/{experiment_id}")
async def generate_report(experiment_id: str, format: str = "html"):
    """Generate experiment report"""
    experiment_file = os.path.join(EXPERIMENTS_DIR, f"experiment_{experiment_id}.json")

    if not os.path.exists(experiment_file):
        raise HTTPException(status_code=404, detail="Experiment not found")

    with open(experiment_file, "r") as f:
        experiment_data = json.load(f)

    dataset_info = experiment_data.get("results", {})
    models_list = []
    for model_id, data in dataset_info.items():
        primary_metric = (
            "accuracy" if experiment_data.get("task_type") == "classification" else "r2_score"
        )
        models_list.append(
            {
                "model_name": data.get("model_name"),
                "primary_metric": primary_metric,
                "primary_value": data.get("metrics", {}).get(primary_metric, 0),
            }
        )

    report_data = {
        "dataset": {
            "name": experiment_data.get("dataset_id"),
            "rows": "N/A",
            "columns": "N/A",
            "features": "N/A",
            "task_type": experiment_data.get("task_type"),
            "target_column": experiment_data.get("target_column"),
        },
        "models": models_list,
        "best_model": experiment_data.get("best_model", {}),
        "recommendation": experiment_data.get("best_model", {}),
    }

    reporter = ReportGenerator(output_dir=os.path.join(EXPERIMENTS_DIR, "reports"))
    report_paths = reporter.generate_full_report(report_data, experiment_id, format)

    if format == "html":
        return {"report_path": report_paths.get("html")}
    elif format == "json":
        return {"report_path": report_paths.get("json")}
    elif format == "markdown":
        return {"report_path": report_paths.get("markdown")}

    return {"reports": report_paths}


@router.get("/reports/{experiment_id}/download")
async def download_report(experiment_id: str, format: str = "html"):
    """Download experiment report"""
    report_dir = os.path.join(EXPERIMENTS_DIR, "reports")
    report_file = os.path.join(report_dir, f"report_{experiment_id}.{format}")

    if not os.path.exists(report_file):
        raise HTTPException(status_code=404, detail="Report not found")

    return FileResponse(
        report_file,
        media_type="application/octet-stream",
        filename=f"report_{experiment_id}.{format}",
    )


@router.get("/models/available")
async def get_available_models():
    """Get list of available models"""
    return {
        "classification": [
            "Logistic Regression",
            "Random Forest",
            "XGBoost",
            "SVM",
            "KNN",
            "Decision Tree",
            "Naive Bayes",
            "Gradient Boosting",
        ],
        "regression": [
            "Linear Regression",
            "Ridge Regression",
            "Lasso Regression",
            "Random Forest",
            "XGBoost",
            "SVR",
            "KNN",
            "Decision Tree",
            "Gradient Boosting",
        ],
    }
