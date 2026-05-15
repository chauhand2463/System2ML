"""AutoML Model Comparison Module"""

import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class ModelComparison:
    """Comparison results for multiple models"""

    models: List[Dict[str, Any]]
    comparison_table: pd.DataFrame
    rankings: Dict[str, List[str]]
    visualizations: Dict[str, Any]


class ModelComparator:
    """Handles comparison of multiple ML models"""

    def __init__(self):
        pass

    def compare_models(
        self,
        evaluation_results: List[Any],
        task_type: str,
    ) -> ModelComparison:
        """Compare multiple model evaluation results"""
        if not evaluation_results:
            return ModelComparison(
                models=[], comparison_table=pd.DataFrame(), rankings={}, visualizations={}
            )

        models_data = []
        for eval_result in evaluation_results:
            model_info = {
                "model_id": eval_result.model_id,
                "model_name": eval_result.model_name,
                "task_type": eval_result.task_type,
                "metrics": eval_result.metrics,
            }
            models_data.append(model_info)

        comparison_data = []
        for model in models_data:
            row = {"Model": model["model_name"]}
            for metric, value in model["metrics"].items():
                row[metric] = value
            comparison_data.append(row)

        comparison_table = pd.DataFrame(comparison_data)

        rankings = self._rank_models(models_data, task_type)

        visualizations = self._prepare_visualizations(models_data, task_type)

        return ModelComparison(
            models=models_data,
            comparison_table=comparison_table,
            rankings=rankings,
            visualizations=visualizations,
        )

    def _rank_models(self, models: List[Dict[str, Any]], task_type: str) -> Dict[str, List[str]]:
        """Rank models by different metrics"""
        rankings = {}

        if task_type == "classification":
            primary_metric = "accuracy"
            secondary_metrics = ["precision", "recall", "f1_score", "roc_auc"]
        elif task_type == "regression":
            primary_metric = "r2_score"
            secondary_metrics = ["rmse", "mae", "mse"]
        else:
            primary_metric = "silhouette_score"
            secondary_metrics = []

        sorted_models = sorted(
            models, key=lambda x: x["metrics"].get(primary_metric, 0), reverse=True
        )
        rankings[primary_metric] = [m["model_name"] for m in sorted_models]

        for metric in secondary_metrics:
            if metric in models[0]["metrics"]:
                sorted_by_metric = sorted(
                    models, key=lambda x: x["metrics"].get(metric, 0), reverse=True
                )
                rankings[metric] = [m["model_name"] for m in sorted_by_metric]

        return rankings

    def _prepare_visualizations(
        self, models: List[Dict[str, Any]], task_type: str
    ) -> Dict[str, Any]:
        """Prepare data for visualizations"""
        visualizations = {}

        metric_names = list(models[0]["metrics"].keys()) if models else []
        model_names = [m["model_name"] for m in models]

        visualizations["bar_chart"] = {
            "metrics": metric_names,
            "models": model_names,
            "data": [{model["model_name"]: model["metrics"]} for model in models],
        }

        if task_type == "classification" and len(models) > 1:
            for model in models:
                if model["metrics"].get("roc_auc"):
                    visualizations["roc_comparison"] = {
                        "models": model_names,
                        "auc_scores": [m["metrics"].get("roc_auc", 0) for m in models],
                    }
                    break

        return visualizations

    def generate_comparison_report(self, comparison: ModelComparison) -> Dict[str, Any]:
        """Generate a detailed comparison report"""
        report = {
            "summary": {
                "total_models": len(comparison.models),
                "task_type": comparison.models[0]["task_type"] if comparison.models else "unknown",
            },
            "rankings": comparison.rankings,
            "top_models": {},
            "insights": [],
        }

        if comparison.rankings:
            primary_rank = list(comparison.rankings.values())[0]
            if primary_rank:
                report["top_models"]["best"] = primary_rank[0]
                if len(primary_rank) > 1:
                    report["top_models"]["second_best"] = primary_rank[1]

        if comparison.models:
            best_model = max(
                comparison.models, key=lambda x: x["metrics"].get(list(x["metrics"].keys())[0], 0)
            )
            report["insights"].append(f"Best performing model: {best_model['model_name']}")

            metrics_values = {}
            for metric in best_model["metrics"]:
                values = [m["metrics"].get(metric, 0) for m in comparison.models]
                if len(values) > 1:
                    metrics_values[metric] = {
                        "min": min(values),
                        "max": max(values),
                        "mean": sum(values) / len(values),
                    }

            if metrics_values:
                report["metrics_range"] = metrics_values

        return report
