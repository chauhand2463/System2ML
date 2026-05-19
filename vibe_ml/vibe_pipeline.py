"""
Vibe Pipeline Generator - Autonomous pipeline generation based on vibe analysis.
Creates optimized ML pipelines based on data vibe profiles.
"""

import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any, Literal
from dataclasses import dataclass, field

from .vibe_analyzer import VibeAnalyzer, VibeProfile


@dataclass
class PipelineStep:
    """A single step in the generated pipeline"""

    id: str
    name: str
    type: str
    params: Dict[str, Any] = field(default_factory=dict)
    depends_on: List[str] = field(default_factory=list)
    description: str = ""


@dataclass
class VibePipeline:
    """Complete pipeline generated from vibe analysis"""

    id: str
    name: str
    created_at: str
    vibe_profile_id: str

    task_type: str
    steps: List[PipelineStep] = field(default_factory=list)

    estimated_accuracy: float = 0.0
    estimated_cost: float = 0.0
    estimated_time_seconds: float = 0.0
    estimated_carbon_kg: float = 0.0

    model_configs: Dict[str, Any] = field(default_factory=dict)
    preprocessing_configs: Dict[str, Any] = field(default_factory=dict)

    reasoning: str = ""
    confidence: float = 0.0


class VibePipelineGenerator:
    """Generates ML pipelines based on VibeProfile analysis"""

    def __init__(self):
        self.analyzer = VibeAnalyzer()

        self._step_templates = {
            "BasicClean": {
                "type": "cleaning",
                "params": {"remove_duplicates": True, "handle_missing": "auto"},
            },
            "Imputer": {
                "type": "imputation",
                "params": {"strategy": "median", "numeric_only": True},
            },
            "Scaler": {
                "type": "scaling",
                "params": {"method": "standard"},
            },
            "RobustScaler": {
                "type": "scaling",
                "params": {"method": "robust"},
            },
            "FeatureSelector": {
                "type": "feature_selection",
                "params": {"method": "variance_threshold", "threshold": 0.01},
            },
            "CategoricalEncoder": {
                "type": "encoding",
                "params": {"method": "label", "handle_unknown": "ignore"},
            },
            "Tokenizer": {
                "type": "text_processing",
                "params": {"method": "whitespace", "lowercase": True},
            },
            "TF-IDF": {
                "type": "text_vectorization",
                "params": {"max_features": 5000, "ngram_range": [1, 2]},
            },
            "SMOTE": {
                "type": "resampling",
                "params": {"sampling_strategy": "auto"},
            },
            "ClassWeights": {
                "type": "class_weighting",
                "params": {"mode": "balanced"},
            },
            "OutlierHandling": {
                "type": "outlier_removal",
                "params": {"method": "iqr", "action": "cap"},
            },
            "Detrend": {
                "type": "time_series",
                "params": {"method": "linear"},
            },
            "Differencing": {
                "type": "time_series",
                "params": {"order": 1},
            },
            "RollingStats": {
                "type": "feature_engineering",
                "params": {"windows": [7, 14, 30]},
            },
            "Split": {
                "type": "split",
                "params": {"test_size": 0.2, "random_state": 42},
            },
        }

        self._model_templates = {
            "XGBoost": {
                "type": "gradient_boosting",
                "params": {
                    "n_estimators": 100,
                    "max_depth": 6,
                    "learning_rate": 0.1,
                    "subsample": 0.8,
                    "colsample_bytree": 0.8,
                },
                "cost": 10,
                "carbon": 0.4,
                "latency": 120,
                "accuracy": 0.85,
            },
            "LightGBM": {
                "type": "gradient_boosting",
                "params": {
                    "n_estimators": 100,
                    "max_depth": 6,
                    "learning_rate": 0.1,
                    "subsample": 0.8,
                },
                "cost": 7,
                "carbon": 0.25,
                "latency": 80,
                "accuracy": 0.84,
            },
            "CatBoost": {
                "type": "gradient_boosting",
                "params": {
                    "iterations": 100,
                    "depth": 6,
                    "learning_rate": 0.1,
                },
                "cost": 12,
                "carbon": 0.5,
                "latency": 150,
                "accuracy": 0.86,
            },
            "RandomForest": {
                "type": "ensemble",
                "params": {
                    "n_estimators": 100,
                    "max_depth": 10,
                    "min_samples_split": 5,
                },
                "cost": 8,
                "carbon": 0.3,
                "latency": 100,
                "accuracy": 0.82,
            },
            "LogisticRegression": {
                "type": "linear",
                "params": {
                    "C": 1.0,
                    "max_iter": 1000,
                    "solver": "lbfgs",
                },
                "cost": 3,
                "carbon": 0.1,
                "latency": 50,
                "accuracy": 0.75,
            },
            "SVM": {
                "type": "linear",
                "params": {
                    "C": 1.0,
                    "kernel": "rbf",
                },
                "cost": 5,
                "carbon": 0.15,
                "latency": 60,
                "accuracy": 0.78,
            },
            "MLP": {
                "type": "neural",
                "params": {
                    "hidden_layers": [128, 64],
                    "activation": "relu",
                    "max_iter": 200,
                },
                "cost": 15,
                "carbon": 0.6,
                "latency": 200,
                "accuracy": 0.83,
            },
            "DistilBERT": {
                "type": "transformer",
                "params": {
                    "model_name": "distilbert-base-uncased",
                    "max_length": 512,
                },
                "cost": 25,
                "carbon": 1.2,
                "latency": 300,
                "accuracy": 0.88,
            },
            "BERT": {
                "type": "transformer",
                "params": {
                    "model_name": "bert-base-uncased",
                    "max_length": 512,
                },
                "cost": 40,
                "carbon": 2.0,
                "latency": 500,
                "accuracy": 0.90,
            },
            "Prophet": {
                "type": "time_series",
                "params": {
                    "yearly_seasonality": True,
                    "weekly_seasonality": True,
                    "daily_seasonality": False,
                },
                "cost": 8,
                "carbon": 0.3,
                "latency": 100,
                "accuracy": 0.75,
            },
            "LSTM": {
                "type": "recurrent",
                "params": {
                    "units": 64,
                    "layers": 2,
                    "dropout": 0.2,
                },
                "cost": 30,
                "carbon": 1.5,
                "latency": 400,
                "accuracy": 0.82,
            },
            "ARIMA": {
                "type": "time_series",
                "params": {
                    "p": 5,
                    "d": 1,
                    "q": 2,
                },
                "cost": 3,
                "carbon": 0.1,
                "latency": 40,
                "accuracy": 0.70,
            },
        }

    def generate(
        self,
        vibe_profile: VibeProfile,
        constraints: Optional[Dict[str, Any]] = None,
        name: Optional[str] = None,
    ) -> VibePipeline:
        """Generate a complete pipeline based on vibe profile"""

        constraints = constraints or {}
        pipeline_id = str(uuid.uuid4())[:12]

        pipeline = VibePipeline(
            id=pipeline_id,
            name=name or f"VibePipeline-{pipeline_id}",
            created_at=datetime.utcnow().isoformat(),
            vibe_profile_id=vibe_profile.id,
            task_type=vibe_profile.recommended_task,
            confidence=vibe_profile.confidence_score,
        )

        steps = []

        # Step 1: Data Loading (conceptual)
        load_step = PipelineStep(
            id=f"{pipeline_id}_load",
            name="Load Data",
            type="load",
            description=f"Load dataset with {vibe_profile.rows} rows and {vibe_profile.columns} columns",
        )
        steps.append(load_step)

        # Step 2: Preprocessing based on vibe
        preprocessing_steps = self._generate_preprocessing_steps(vibe_profile, pipeline_id)
        steps.extend(preprocessing_steps)

        # Step 3: Model selection based on vibe
        model_steps = self._generate_model_steps(vibe_profile, pipeline_id, constraints)
        steps.extend(model_steps)

        # Step 4: Evaluation
        eval_step = PipelineStep(
            id=f"{pipeline_id}_eval",
            name="Evaluate",
            type="evaluate",
            description="Evaluate model performance",
            depends_on=[steps[-1].id] if steps else [],
        )
        steps.append(eval_step)

        pipeline.steps = steps

        # Calculate estimates
        pipeline.estimated_accuracy = self._estimate_accuracy(vibe_profile, model_steps)
        pipeline.estimated_cost = self._estimate_cost(vibe_profile, model_steps)
        pipeline.estimated_time_seconds = self._estimate_time(vibe_profile, steps)
        pipeline.estimated_carbon_kg = self._estimate_carbon(vibe_profile, model_steps)

        # Store configs
        pipeline.model_configs = self._generate_model_configs(vibe_profile, model_steps)
        pipeline.preprocessing_configs = self._generate_preprocessing_configs(vibe_profile)

        # Generate reasoning
        pipeline.reasoning = self._generate_reasoning(vibe_profile, pipeline)

        return pipeline

    def generate_from_dataframe(
        self,
        df,
        name: str = "dataset",
        constraints: Optional[Dict[str, Any]] = None,
    ) -> VibePipeline:
        """Convenience method: analyze data and generate pipeline in one go"""
        vibe_profile = self.analyzer.analyze(df, name)
        return self.generate(vibe_profile, constraints)

    def _generate_preprocessing_steps(
        self, profile: VibeProfile, pipeline_id: str
    ) -> List[PipelineStep]:
        steps = []
        step_order = [
            "BasicClean",
            "Imputer",
            "OutlierHandling",
            "CategoricalEncoder",
            "Tokenizer",
            "TF-IDF",
            "Scaler",
            "RobustScaler",
            "FeatureSelector",
            "SMOTE",
            "ClassWeights",
            "Detrend",
            "Differencing",
            "RollingStats",
        ]

        for step_name in step_order:
            if step_name in profile.recommended_preprocessing:
                template = self._step_templates.get(step_name, {})

                step = PipelineStep(
                    id=f"{pipeline_id}_{step_name.lower()}",
                    name=step_name,
                    type=template.get("type", "transform"),
                    params=template.get("params", {}),
                    description=f"Apply {step_name} based on data vibe",
                )
                steps.append(step)

        # Add split step
        split_step = PipelineStep(
            id=f"{pipeline_id}_split",
            name="Train-Test Split",
            type="split",
            params={"test_size": 0.2, "random_state": 42},
            description="Split data into train and test sets",
        )
        steps.append(split_step)

        return steps

    def _generate_model_steps(
        self, profile: VibeProfile, pipeline_id: str, constraints: Dict
    ) -> List[PipelineStep]:
        steps = []

        selected_models = profile.recommended_models[:2]  # Top 2 models

        for i, model_name in enumerate(selected_models):
            template = self._model_templates.get(model_name, {})

            # Adjust based on constraints
            params = dict(template.get("params", {}))

            max_cost = constraints.get("max_cost", 100)
            max_latency = constraints.get("max_latency", 1000)

            if template.get("cost", 0) > max_cost:
                # Use cheaper model
                params["n_estimators"] = min(params.get("n_estimators", 100), 50)

            if template.get("latency", 0) > max_latency:
                params["max_depth"] = min(params.get("max_depth", 6), 4)

            step = PipelineStep(
                id=f"{pipeline_id}_model_{i}",
                name=f"Train {model_name}",
                type="train",
                params=params,
                description=f"Train {model_name} model",
            )
            steps.append(step)

        return steps

    def _estimate_accuracy(self, profile: VibeProfile, model_steps: List[PipelineStep]) -> float:
        if not model_steps:
            return 0.7

        base_accuracy = 0.75

        # Boost based on data quality
        if profile.categories.__contains__("clean"):
            base_accuracy += 0.05
        if profile.categories.__contains__("balanced"):
            base_accuracy += 0.03

        # Adjust based on task
        if profile.recommended_task == "regression":
            base_accuracy = 0.72

        # Get model-specific accuracy
        if model_steps:
            first_model = model_steps[0].name.replace("Train ", "")
            template = self._model_templates.get(first_model, {})
            model_accuracy = template.get("accuracy", 0.8)

            # Weighted average
            base_accuracy = (base_accuracy + model_accuracy) / 2

        return min(base_accuracy, 0.95)

    def _estimate_cost(self, profile: VibeProfile, model_steps: List[PipelineStep]) -> float:
        if not model_steps:
            return 5.0

        total_cost = 0
        for step in model_steps:
            model_name = step.name.replace("Train ", "")
            template = self._model_templates.get(model_name, {})
            total_cost += template.get("cost", 5)

        # Add preprocessing cost
        total_cost += len(profile.recommended_preprocessing) * 0.5

        return round(total_cost, 2)

    def _estimate_time(self, profile: VibeProfile, steps: List[PipelineStep]) -> float:
        rows = profile.rows
        features = profile.features

        base_time = (rows * features) / 10000

        preprocessing_time = len([s for s in steps if s.type != "train"]) * 0.5
        training_time = len([s for s in steps if s.type == "train"]) * (base_time * 0.5)

        return round(preprocessing_time + training_time + base_time, 2)

    def _estimate_carbon(self, profile: VibeProfile, model_steps: List[PipelineStep]) -> float:
        if not model_steps:
            return 0.1

        total_carbon = 0
        for step in model_steps:
            model_name = step.name.replace("Train ", "")
            template = self._model_templates.get(model_name, {})
            total_carbon += template.get("carbon", 0.2)

        return round(total_carbon, 4)

    def _generate_model_configs(
        self, profile: VibeProfile, model_steps: List[PipelineStep]
    ) -> Dict:
        configs = {}

        for step in model_steps:
            model_name = step.name.replace("Train ", "")
            template = self._model_templates.get(model_name, {})

            configs[model_name] = {
                "type": template.get("type"),
                "params": step.params,
                "metrics": {
                    "cost": template.get("cost"),
                    "carbon": template.get("carbon"),
                    "latency": template.get("latency"),
                    "accuracy": template.get("accuracy"),
                },
            }

        return configs

    def _generate_preprocessing_configs(self, profile: VibeProfile) -> Dict:
        configs = {}

        for step_name in profile.recommended_preprocessing:
            template = self._step_templates.get(step_name, {})
            configs[step_name] = template.get("params", {})

        return configs

    def _generate_reasoning(self, profile: VibeProfile, pipeline: VibePipeline) -> str:
        vibe_summary = self.analyzer.generate_vibe_summary(profile)

        reasoning = (
            f"Generated pipeline for {vibe_summary} dataset. Task: {profile.recommended_task}. "
        )

        if profile.recommended_models:
            reasoning += f"Models: {', '.join(profile.recommended_models[:2])}. "

        if profile.strengths:
            strengths = [f"{k} ({v})" for k, v in profile.strengths.items()]
            reasoning += f"Key vibes: {', '.join(strengths)}. "

        reasoning += f"Confidence: {profile.confidence_score:.0%}."

        return reasoning

    def export_pipeline(self, pipeline: VibePipeline, format: str = "dict") -> Dict:
        """Export pipeline in different formats"""

        if format == "dict":
            return {
                "id": pipeline.id,
                "name": pipeline.name,
                "created_at": pipeline.created_at,
                "task_type": pipeline.task_type,
                "steps": [
                    {
                        "id": s.id,
                        "name": s.name,
                        "type": s.type,
                        "params": s.params,
                        "depends_on": s.depends_on,
                        "description": s.description,
                    }
                    for s in pipeline.steps
                ],
                "estimated_metrics": {
                    "accuracy": pipeline.estimated_accuracy,
                    "cost": pipeline.estimated_cost,
                    "time_seconds": pipeline.estimated_time_seconds,
                    "carbon_kg": pipeline.estimated_carbon_kg,
                },
                "model_configs": pipeline.model_configs,
                "preprocessing_configs": pipeline.preprocessing_configs,
                "reasoning": pipeline.reasoning,
                "confidence": pipeline.confidence,
            }

        elif format == "json":
            import json

            return json.dumps(self.export_pipeline(pipeline, "dict"), indent=2)

        elif format == "python":
            code = f"""# Vibe ML Pipeline: {pipeline.name}
# Generated: {pipeline.created_at}
# Task: {pipeline.task_type}

from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
# ... import other components

# Step definitions
steps = [
"""
            for step in pipeline.steps:
                code += f'    ("{step.name}", {step.type.upper()}()),\n'
            code += "]\n\npipeline = Pipeline(steps)\n"
            return code

        return {}

    def compare_pipelines(self, pipeline1: VibePipeline, pipeline2: VibePipeline) -> Dict:
        """Compare two generated pipelines"""

        return {
            "pipeline1": {
                "id": pipeline1.id,
                "name": pipeline1.name,
                "accuracy": pipeline1.estimated_accuracy,
                "cost": pipeline1.estimated_cost,
                "steps": len(pipeline1.steps),
            },
            "pipeline2": {
                "id": pipeline2.id,
                "name": pipeline2.name,
                "accuracy": pipeline2.estimated_accuracy,
                "cost": pipeline2.estimated_cost,
                "steps": len(pipeline2.steps),
            },
            "comparison": {
                "accuracy_diff": pipeline1.estimated_accuracy - pipeline2.estimated_accuracy,
                "cost_diff": pipeline1.estimated_cost - pipeline2.estimated_cost,
                "faster": pipeline1.id
                if pipeline1.estimated_time_seconds < pipeline2.estimated_time_seconds
                else pipeline2.id,
                "cheaper": pipeline1.id
                if pipeline1.estimated_cost < pipeline2.estimated_cost
                else pipeline2.id,
            },
        }


__all__ = ["VibePipelineGenerator", "VibePipeline", "PipelineStep"]
