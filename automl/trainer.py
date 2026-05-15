"""AutoML Model Training Module"""

import pandas as pd
import numpy as np
import logging
import joblib
import os
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

try:
    from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge, Lasso
    from sklearn.ensemble import (
        RandomForestClassifier,
        RandomForestRegressor,
        GradientBoostingClassifier,
        GradientBoostingRegressor,
    )
    from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
    from sklearn.svm import SVC, SVR
    from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
    from sklearn.naive_bayes import GaussianNB
    from sklearn.neural_network import MLPClassifier, MLPRegressor
    from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
    from sklearn.preprocessing import LabelEncoder
except ImportError:
    logger.warning("sklearn not fully available")

try:
    import xgboost as xgb

    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    logger.warning("XGBoost not available")

try:
    import lightgbm as lgb

    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False
    logger.warning("LightGBM not available")


MODELS_FOR_CLASSIFICATION = {
    "Logistic Regression": LogisticRegression,
    "Random Forest": RandomForestClassifier,
    "XGBoost": lambda: (
        xgb.XGBClassifier(eval_metric="logloss", verbosity=0) if HAS_XGBOOST else None
    ),
    "SVM": SVC,
    "KNN": KNeighborsClassifier,
    "Decision Tree": DecisionTreeClassifier,
    "Naive Bayes": GaussianNB,
    "Gradient Boosting": GradientBoostingClassifier,
}

MODELS_FOR_REGRESSION = {
    "Linear Regression": LinearRegression,
    "Ridge Regression": Ridge,
    "Lasso Regression": Lasso,
    "Random Forest": RandomForestRegressor,
    "XGBoost": lambda: xgb.XGBRegressor(verbosity=0) if HAS_XGBOOST else None,
    "SVR": SVR,
    "KNN": KNeighborsRegressor,
    "Decision Tree": DecisionTreeRegressor,
    "Gradient Boosting": GradientBoostingRegressor,
}


@dataclass
class TrainingConfig:
    """Configuration for model training"""

    test_size: float = 0.2
    random_state: int = 42
    cross_validation_folds: int = 5
    hyperparameter_tuning: bool = False
    max_iter: int = 1000


@dataclass
class ModelResult:
    """Result of model training"""

    model_id: str
    model_name: str
    model_type: str
    task_type: str
    trained_model: Any
    hyperparameters: Dict[str, Any]
    training_time: float
    cross_val_score: Optional[float] = None
    feature_importance: Optional[Dict[str, float]] = None
    label_encoder: Optional[LabelEncoder] = None
    scaler: Optional[Any] = None


class ModelTrainer:
    """Handles ML model training for multiple algorithms"""

    def __init__(self, config: Optional[TrainingConfig] = None):
        self.config = config or TrainingConfig()
        self.results: Dict[str, ModelResult] = {}
        self.preprocessor = None

    def get_available_models(self, task_type: str) -> Dict[str, Any]:
        """Get available models for a task type"""
        if task_type == "classification":
            return MODELS_FOR_CLASSIFICATION
        elif task_type == "regression":
            return MODELS_FOR_REGRESSION
        return {}

    def get_default_hyperparameters(self, model_name: str, task_type: str) -> Dict[str, Any]:
        """Get default hyperparameters for a model"""
        defaults = {
            "Logistic Regression": {"max_iter": 1000, "C": 1.0},
            "Random Forest": {"n_estimators": 100, "max_depth": 10, "random_state": 42},
            "XGBoost": {"n_estimators": 100, "max_depth": 6, "learning_rate": 0.1},
            "SVM": {"C": 1.0, "kernel": "rbf"},
            "KNN": {"n_neighbors": 5},
            "Decision Tree": {"max_depth": 10, "random_state": 42},
            "Naive Bayes": {},
            "Gradient Boosting": {"n_estimators": 100, "max_depth": 5},
            "Linear Regression": {},
            "Ridge Regression": {"alpha": 1.0},
            "Lasso Regression": {"alpha": 1.0},
            "SVR": {"C": 1.0},
            "KNN Regressor": {"n_neighbors": 5},
            "Decision Tree Regressor": {"max_depth": 10},
            "Gradient Boosting Regressor": {"n_estimators": 100},
        }
        return defaults.get(model_name, {})

    def _prepare_data(
        self, df: pd.DataFrame, target_column: str, task_type: str
    ) -> Tuple[pd.DataFrame, pd.Series, Any]:
        """Prepare data for training"""
        X = df.drop(columns=[target_column])
        y = df[target_column]

        label_encoder = None
        if task_type == "classification" and not pd.api.types.is_numeric_dtype(y):
            label_encoder = LabelEncoder()
            y = label_encoder.fit_transform(y)

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=self.config.test_size, random_state=self.config.random_state
        )

        return X_train, X_test, y_train, y_test, label_encoder

    def train_model(
        self,
        df: pd.DataFrame,
        target_column: str,
        model_name: str,
        task_type: str,
        hyperparameters: Optional[Dict[str, Any]] = None,
    ) -> ModelResult:
        """Train a single model"""
        import time

        start_time = time.time()

        logger.info(f"Training {model_name} for {task_type} task")

        X_train, X_test, y_train, y_test, label_encoder = self._prepare_data(
            df, target_column, task_type
        )

        if hyperparameters is None:
            hyperparameters = self.get_default_hyperparameters(model_name, task_type)

        if task_type == "classification":
            model_class = MODELS_FOR_CLASSIFICATION.get(model_name)
        else:
            model_class = MODELS_FOR_REGRESSION.get(model_name)

        if model_class is None:
            raise ValueError(f"Unknown model: {model_name}")

        model = model_class() if callable(model_class) else model_class
        if model is None:
            raise ValueError(f"Model {model_name} not available (missing dependency)")

        model.set_params(**hyperparameters)
        model.fit(X_train, y_train)

        training_time = time.time() - start_time

        cross_val_score = None
        if self.config.cross_validation_folds > 0:
            try:
                cv_scores = cross_val_score(
                    model,
                    X_train,
                    y_train,
                    cv=self.config.cross_validation_folds,
                    scoring="accuracy" if task_type == "classification" else "r2",
                )
                cross_val_score = float(np.mean(cv_scores))
            except Exception as e:
                logger.warning(f"Cross-validation failed: {e}")

        feature_importance = None
        if hasattr(model, "feature_importances_"):
            feature_importance = {
                feat: float(imp) for feat, imp in zip(X_train.columns, model.feature_importances_)
            }
        elif hasattr(model, "coef_"):
            if len(model.coef_.shape) == 1:
                feature_importance = {
                    feat: float(abs(coef)) for feat, coef in zip(X_train.columns, model.coef_)
                }
            else:
                feature_importance = {
                    feat: float(np.mean(abs(coefs)))
                    for feat, coefs in zip(X_train.columns, model.coef_)
                }

        model_id = str(uuid.uuid4())[:12]

        result = ModelResult(
            model_id=model_id,
            model_name=model_name,
            model_type=model_name,
            task_type=task_type,
            trained_model=model,
            hyperparameters=hyperparameters,
            training_time=round(training_time, 2),
            cross_val_score=cross_val_score,
            feature_importance=feature_importance,
            label_encoder=label_encoder,
        )

        self.results[model_id] = result
        logger.info(f"Trained {model_name} in {training_time:.2f}s")

        return result

    def train_multiple_models(
        self,
        df: pd.DataFrame,
        target_column: str,
        model_names: List[str],
        task_type: str,
    ) -> List[ModelResult]:
        """Train multiple models"""
        results = []
        for model_name in model_names:
            try:
                result = self.train_model(df, target_column, model_name, task_type)
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to train {model_name}: {e}")

        return results

    def save_model(self, model_result: ModelResult, filepath: str) -> str:
        """Save trained model to disk"""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        model_data = {
            "model": model_result.trained_model,
            "model_name": model_result.model_name,
            "model_type": model_result.model_type,
            "task_type": model_result.task_type,
            "hyperparameters": model_result.hyperparameters,
            "feature_importance": model_result.feature_importance,
            "label_encoder": model_result.label_encoder,
            "scaler": model_result.scaler,
        }
        joblib.dump(model_data, filepath)
        logger.info(f"Saved model to {filepath}")
        return filepath

    def load_model(self, filepath: str) -> ModelResult:
        """Load trained model from disk"""
        model_data = joblib.load(filepath)
        return ModelResult(
            model_id=os.path.basename(filepath).split(".")[0],
            model_name=model_data.get("model_name", "unknown"),
            model_type=model_data.get("model_type", "unknown"),
            task_type=model_data.get("task_type", "unknown"),
            trained_model=model_data.get("model"),
            hyperparameters=model_data.get("hyperparameters", {}),
            training_time=0,
            feature_importance=model_data.get("feature_importance"),
            label_encoder=model_data.get("label_encoder"),
            scaler=model_data.get("scaler"),
        )
