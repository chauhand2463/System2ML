"""AutoML Model Evaluation Module"""

import pandas as pd
import numpy as np
import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report,
    mean_squared_error,
    mean_absolute_error,
    r2_score,
    silhouette_score,
)
import json

logger = logging.getLogger(__name__)


@dataclass
class EvaluationMetrics:
    """Container for model evaluation metrics"""

    model_id: str
    model_name: str
    task_type: str
    metrics: Dict[str, float]
    confusion_matrix: Optional[List[List[int]]] = None
    classification_report: Optional[Dict] = None
    predictions: Optional[List[Any]] = None
    probabilities: Optional[List[float]] = None
    feature_importance: Optional[Dict[str, float]] = None
    training_time: float = 0


class ModelEvaluator:
    """Handles model evaluation and metrics computation"""

    def __init__(self):
        self.evaluation_results: Dict[str, EvaluationMetrics] = {}

    def _prepare_data(self, df: pd.DataFrame, target_column: str) -> Tuple[pd.DataFrame, pd.Series]:
        """Prepare data for evaluation"""
        X = df.drop(columns=[target_column])
        y = df[target_column]
        return X, y

    def evaluate_classification(
        self,
        model: Any,
        df: pd.DataFrame,
        target_column: str,
        model_id: str,
        model_name: str,
        label_encoder: Optional[Any] = None,
    ) -> EvaluationMetrics:
        """Evaluate a classification model"""
        X, y_true = self._prepare_data(df, target_column)

        X_train, X_test, y_train, y_test = train_test_split(
            X, y_true, test_size=0.2, random_state=42
        )

        y_pred = model.predict(X_test)

        if label_encoder is not None:
            y_true_encoded = label_encoder.transform(y_test)
            y_pred_encoded = label_encoder.transform(y_pred)
            has_proba = hasattr(model, "predict_proba")
            y_proba = model.predict_proba(X_test)[:, 1] if has_proba else None
        else:
            y_true_encoded = y_test
            y_pred_encoded = y_pred
            y_proba = None

        metrics = {
            "accuracy": round(accuracy_score(y_true_encoded, y_pred_encoded), 4),
            "precision": round(
                precision_score(
                    y_true_encoded, y_pred_encoded, average="weighted", zero_division=0
                ),
                4,
            ),
            "recall": round(
                recall_score(y_true_encoded, y_pred_encoded, average="weighted", zero_division=0), 4
            ),
            "f1_score": round(
                f1_score(y_true_encoded, y_pred_encoded, average="weighted", zero_division=0), 4
            ),
        }

        try:
            if y_proba is not None and len(np.unique(y_true_encoded)) == 2:
                metrics["roc_auc"] = round(roc_auc_score(y_true_encoded, y_proba), 4)
        except Exception as e:
            logger.warning(f"Could not compute ROC-AUC: {e}")

        cm = confusion_matrix(y_true_encoded, y_pred_encoded).tolist()

        try:
            report = classification_report(
                y_true_encoded, y_pred_encoded, output_dict=True, zero_division=0
            )
        except:
            report = {}

        feature_importance = None
        if hasattr(model, "feature_importances_"):
            feature_importance = {
                feat: float(imp) for feat, imp in zip(X.columns, model.feature_importances_)
            }
        elif hasattr(model, "coef_"):
            if len(model.coef_.shape) == 1:
                feature_importance = {
                    feat: float(abs(coef)) for feat, coef in zip(X.columns, model.coef_)
                }

        result = EvaluationMetrics(
            model_id=model_id,
            model_name=model_name,
            task_type="classification",
            metrics=metrics,
            confusion_matrix=cm,
            classification_report=report,
            predictions=y_pred.tolist(),
            probabilities=y_proba.tolist() if y_proba is not None else None,
            feature_importance=feature_importance,
        )

        self.evaluation_results[model_id] = result
        return result

    def evaluate_regression(
        self,
        model: Any,
        df: pd.DataFrame,
        target_column: str,
        model_id: str,
        model_name: str,
    ) -> EvaluationMetrics:
        """Evaluate a regression model"""
        X, y_true = self._prepare_data(df, target_column)

        X_train, X_test, y_train, y_test = train_test_split(
            X, y_true, test_size=0.2, random_state=42
        )

        y_pred = model.predict(X_test)

        mse = mean_squared_error(y_test, y_pred)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)

        metrics = {
            "mse": round(mse, 4),
            "rmse": round(rmse, 4),
            "mae": round(mae, 4),
            "r2_score": round(r2, 4),
        }

        feature_importance = None
        if hasattr(model, "feature_importances_"):
            feature_importance = {
                feat: float(imp) for feat, imp in zip(X.columns, model.feature_importances_)
            }
        elif hasattr(model, "coef_"):
            if len(model.coef_.shape) == 1:
                feature_importance = {
                    feat: float(abs(coef)) for feat, coef in zip(X.columns, model.coef_)
                }

        result = EvaluationMetrics(
            model_id=model_id,
            model_name=model_name,
            task_type="regression",
            metrics=metrics,
            predictions=y_pred.tolist(),
            feature_importance=feature_importance,
        )

        self.evaluation_results[model_id] = result
        return result

    def evaluate_clustering(
        self,
        model: Any,
        df: pd.DataFrame,
        target_column: Optional[str],
        model_id: str,
        model_name: str,
    ) -> EvaluationMetrics:
        """Evaluate a clustering model"""
        if target_column and target_column in df.columns:
            X = df.drop(columns=[target_column])
            y_true = df[target_column]
        else:
            X = df

        y_pred = model.predict(X)

        try:
            silhouette = silhouette_score(X, y_pred)
        except:
            silhouette = 0

        metrics = {
            "silhouette_score": round(silhouette, 4),
            "n_clusters": int(len(np.unique(y_pred))),
        }

        result = EvaluationMetrics(
            model_id=model_id,
            model_name=model_name,
            task_type="clustering",
            metrics=metrics,
            predictions=y_pred.tolist(),
        )

        self.evaluation_results[model_id] = result
        return result

    def evaluate(
        self,
        model: Any,
        df: pd.DataFrame,
        target_column: str,
        model_id: str,
        model_name: str,
        task_type: str,
        label_encoder: Optional[Any] = None,
    ) -> EvaluationMetrics:
        """Evaluate model based on task type"""
        if task_type == "classification":
            return self.evaluate_classification(
                model, df, target_column, model_id, model_name, label_encoder
            )
        elif task_type == "regression":
            return self.evaluate_regression(model, df, target_column, model_id, model_name)
        elif task_type == "clustering":
            return self.evaluate_clustering(model, df, target_column, model_id, model_name)
        else:
            raise ValueError(f"Unknown task type: {task_type}")

    def get_feature_importance(self, evaluation: EvaluationMetrics) -> List[Dict[str, Any]]:
        """Get feature importance as sorted list"""
        if not evaluation.feature_importance:
            return []

        sorted_features = sorted(
            evaluation.feature_importance.items(), key=lambda x: x[1], reverse=True
        )

        return [{"feature": feat, "importance": round(imp, 4)} for feat, imp in sorted_features]

    def generate_evaluation_summary(self, evaluations: List[EvaluationMetrics]) -> Dict[str, Any]:
        """Generate summary of multiple evaluations"""
        if not evaluations:
            return {}

        task_type = evaluations[0].task_type
        summary = {
            "task_type": task_type,
            "models": [],
            "best_model": None,
            "best_metric": None,
        }

        if task_type == "classification":
            key_metric = "accuracy"
        elif task_type == "regression":
            key_metric = "r2_score"
        else:
            key_metric = "silhouette_score"

        best_score = -float("inf")
        best_model = None

        for eval_result in evaluations:
            model_summary = {
                "model_id": eval_result.model_id,
                "model_name": eval_result.model_name,
                "metrics": eval_result.metrics,
            }
            summary["models"].append(model_summary)

            if key_metric in eval_result.metrics:
                score = eval_result.metrics[key_metric]
                if task_type == "regression":
                    score = max(0, score)

                if score > best_score:
                    best_score = score
                    best_model = eval_result.model_name

        if best_model:
            summary["best_model"] = best_model
            summary["best_metric"] = round(best_score, 4)

        return summary
