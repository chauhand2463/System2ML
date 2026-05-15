"""AutoML Model Recommendation Module"""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ModelRecommendation:
    """Recommendation for best model"""

    recommended_model: str
    recommendation_reason: str
    confidence_score: float
    alternatives: List[Dict[str, Any]]
    reasoning: List[str]


class ModelRecommender:
    """Recommends best model based on evaluation results"""

    def __init__(self):
        self.task_metrics = {
            "classification": {
                "primary": "accuracy",
                "secondary": ["f1_score", "precision", "recall", "roc_auc"],
                "higher_is_better": True,
            },
            "regression": {
                "primary": "r2_score",
                "secondary": ["mae", "rmse", "mse"],
                "higher_is_better": True,
            },
            "clustering": {
                "primary": "silhouette_score",
                "secondary": [],
                "higher_is_better": True,
            },
        }

    def recommend(
        self,
        evaluation_results: List[Any],
        user_preferences: Optional[Dict[str, Any]] = None,
    ) -> ModelRecommendation:
        """Recommend the best model based on evaluation results"""
        if not evaluation_results:
            return ModelRecommendation(
                recommended_model="",
                recommendation_reason="No models to evaluate",
                confidence_score=0,
                alternatives=[],
                reasoning=[],
            )

        task_type = evaluation_results[0].task_type
        config = self.task_metrics.get(task_type, self.task_metrics["classification"])

        primary_metric = config["primary"]
        higher_is_better = config["higher_is_better"]

        scored_models = []
        for eval_result in evaluation_results:
            score = eval_result.metrics.get(primary_metric, 0)
            if not higher_is_better:
                score = -score

            secondary_score = 0
            for metric in config["secondary"]:
                if metric in eval_result.metrics:
                    secondary_score += eval_result.metrics[metric]
            secondary_score /= max(len(config["secondary"]), 1)

            scored_models.append(
                {
                    "model_id": eval_result.model_id,
                    "model_name": eval_result.model_name,
                    "primary_score": eval_result.metrics.get(primary_metric, 0),
                    "secondary_score": secondary_score,
                    "total_score": score + (secondary_score * 0.3),
                    "metrics": eval_result.metrics,
                }
            )

        scored_models.sort(key=lambda x: x["total_score"], reverse=True)

        best_model = scored_models[0]
        confidence = self._calculate_confidence(scored_models, primary_metric)

        reasoning = self._generate_reasoning(best_model, scored_models, task_type, primary_metric)

        alternatives = []
        for model in scored_models[1:4]:
            alternatives.append(
                {
                    "model_name": model["model_name"],
                    "score": round(model["total_score"], 4),
                    "reason": f"Alternative with {primary_metric}: {model['primary_score']:.4f}",
                }
            )

        return ModelRecommendation(
            recommended_model=best_model["model_name"],
            recommendation_reason=f"Best overall performance with {primary_metric} of {best_model['primary_score']:.4f}",
            confidence_score=round(confidence, 2),
            alternatives=alternatives,
            reasoning=reasoning,
        )

    def _calculate_confidence(self, scored_models: List[Dict], primary_metric: str) -> float:
        """Calculate confidence score for the recommendation"""
        if len(scored_models) < 2:
            return 0.9

        best_score = scored_models[0]["primary_score"]
        second_score = scored_models[1]["primary_score"]

        if best_score == 0:
            return 0.5

        gap = (best_score - second_score) / best_score if best_score != 0 else 0

        confidence = min(0.95, 0.6 + (gap * 2))
        return confidence

    def _generate_reasoning(
        self,
        best_model: Dict,
        all_models: List[Dict],
        task_type: str,
        primary_metric: str,
    ) -> List[str]:
        """Generate reasoning for the recommendation"""
        reasoning = []

        reasoning.append(
            f"'{best_model['model_name']}' achieved the highest {primary_metric} "
            f"score of {best_model['primary_score']:.4f}"
        )

        if len(all_models) > 1:
            avg_secondary = sum(m["secondary_score"] for m in all_models) / len(all_models)
            if best_model["secondary_score"] > avg_secondary:
                reasoning.append(
                    f"Secondary metrics also outperform average by "
                    f"{((best_model['secondary_score'] - avg_secondary) / avg_secondary * 100):.1f}%"
                )

        if task_type == "classification":
            if "precision" in best_model["metrics"]:
                reasoning.append(
                    f"High precision ({best_model['metrics']['precision']:.4f}) ensures few false positives"
                )
            if "recall" in best_model["metrics"]:
                reasoning.append(
                    f"Good recall ({best_model['metrics']['recall']:.4f}) ensures most positives are captured"
                )
        elif task_type == "regression":
            if "rmse" in best_model["metrics"]:
                reasoning.append(
                    f"Low RMSE ({best_model['metrics']['rmse']:.4f}) indicates accurate predictions"
                )
            if "r2_score" in best_model["metrics"]:
                reasoning.append(
                    f"R² score of {best_model['metrics']['r2_score']:.4f} explains variance well"
                )

        return reasoning

    def get_model_suitability(
        self, task_type: str, dataset_size: int, num_features: int
    ) -> Dict[str, Any]:
        """Get model suitability recommendations based on dataset characteristics"""
        suitability = {}

        if task_type == "classification":
            if dataset_size < 1000:
                suitability["recommended"] = [
                    "Logistic Regression",
                    "Decision Tree",
                    "Naive Bayes",
                    "KNN",
                ]
                suitability["caution"] = ["Random Forest", "XGBoost", "SVM"]
            elif dataset_size < 10000:
                suitability["recommended"] = [
                    "Random Forest",
                    "XGBoost",
                    "Logistic Regression",
                    "Gradient Boosting",
                ]
                suitability["caution"] = ["SVM", "KNN"]
            else:
                suitability["recommended"] = ["XGBoost", "LightGBM", "Random Forest"]
                suitability["caution"] = ["KNN", "SVM"]

        elif task_type == "regression":
            if dataset_size < 1000:
                suitability["recommended"] = ["Linear Regression", "Ridge", "Decision Tree"]
                suitability["caution"] = ["Random Forest", "XGBoost"]
            elif dataset_size < 10000:
                suitability["recommended"] = [
                    "Random Forest",
                    "XGBoost",
                    "Ridge",
                    "Gradient Boosting",
                ]
                suitability["caution"] = []
            else:
                suitability["recommended"] = ["XGBoost", "LightGBM", "Random Forest"]
                suitability["caution"] = ["KNN"]

        return suitability
