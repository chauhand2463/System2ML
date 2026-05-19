"""
Autonomous Platform Core
The main orchestrator that combines Vibe ML, Pipeline Generation, and Fine-Tuning.
"""

import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any, Literal
from dataclasses import dataclass, field

import pandas as pd
import numpy as np


from enum import Enum


class ModelType(str, Enum):
    """Type of ML model"""

    CLASSICAL = "classical"
    TRANSFORMER = "transformer"
    LLM = "llm"


class TaskType(str, Enum):
    """Type of ML task"""

    CLASSIFICATION = "classification"
    REGRESSION = "regression"
    CLUSTERING = "clustering"
    TEXT_GENERATION = "text_generation"
    CODE_GENERATION = "code_generation"


@dataclass
class PlatformConfig:
    """Configuration for the autonomous platform"""

    max_cost_usd: float = 50.0
    max_latency_ms: int = 1000
    max_carbon_kg: float = 5.0
    max_vram_gb: int = 15
    prefer_free_models: bool = True
    auto_select_method: bool = True
    include_transformers: bool = True
    include_llm_finetuning: bool = True


@dataclass
class DataProfile:
    """Profile of the input data"""

    id: str
    name: str
    rows: int
    columns: int
    features: int

    data_type: str = "tabular"
    task_type: str = "classification"

    has_label: bool = True
    label_column: Optional[str] = None

    missing_rate: float = 0.0
    duplicate_rate: float = 0.0
    outlier_rate: float = 0.0

    numeric_ratio: float = 0.7
    categorical_ratio: float = 0.2
    text_ratio: float = 0.1

    class_balance_ratio: float = 1.0

    vibe_categories: List[str] = field(default_factory=list)
    vibe_summary: str = ""

    confidence: float = 0.0


@dataclass
class ModelRecommendation:
    """A recommended model with full configuration"""

    id: str
    name: str
    model_type: str

    score: float
    rationale: str

    estimated_accuracy: float
    estimated_cost: float
    estimated_time_seconds: float
    estimated_vram_gb: float

    config: Dict[str, Any] = field(default_factory=dict)

    is_finetunable: bool = False
    finetune_method: Optional[str] = None
    finetune_config: Optional[Dict] = None


@dataclass
class PipelineResult:
    """Result of autonomous pipeline generation"""

    id: str
    name: str
    created_at: str

    data_profile: DataProfile

    recommended_models: List[ModelRecommendation]
    selected_model: Optional[ModelRecommendation] = None

    pipeline_steps: List[Dict[str, Any]] = field(default_factory=list)

    estimated_metrics: Dict[str, float] = field(default_factory=dict)

    execution_plan: Dict[str, Any] = field(default_factory=dict)

    warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "created_at": self.created_at,
            "data_profile": {
                "id": self.data_profile.id,
                "name": self.data_profile.name,
                "rows": self.data_profile.rows,
                "columns": self.data_profile.columns,
                "features": self.data_profile.features,
                "data_type": self.data_profile.data_type,
                "task_type": self.data_profile.task_type,
                "vibe_summary": self.data_profile.vibe_summary,
            },
            "recommended_models": [
                {
                    "id": m.id,
                    "name": m.name,
                    "model_type": m.model_type,
                    "score": m.score,
                    "rationale": m.rationale,
                    "estimated_accuracy": m.estimated_accuracy,
                    "estimated_cost": m.estimated_cost,
                    "estimated_time_seconds": m.estimated_time_seconds,
                    "estimated_vram_gb": m.estimated_vram_gb,
                    "is_finetunable": m.is_finetunable,
                    "finetune_method": m.finetune_method,
                }
                for m in self.recommended_models
            ],
            "selected_model": {
                "id": self.selected_model.id,
                "name": self.selected_model.name,
            }
            if self.selected_model
            else None,
            "pipeline_steps": self.pipeline_steps,
            "estimated_metrics": self.estimated_metrics,
            "execution_plan": self.execution_plan,
            "warnings": self.warnings,
        }


class AutonomousPlatform:
    """
    Unified Autonomous ML Platform
    Combines:
    - Vibe analysis for intelligent model selection
    - Classical ML pipeline generation
    - LLM fine-tuning recommendations
    """

    def __init__(self, config: Optional[PlatformConfig] = None):
        self.config = config or PlatformConfig()

        self._vibe_analyzer = None
        self._pipeline_generator = None
        self._finetuner = None
        self._classical_models = self._load_classical_models()
        self._transformer_models = self._load_transformer_models()
        self._llm_models = self._load_llm_models()

    def _get_vibe_analyzer(self):
        if self._vibe_analyzer is None:
            from vibe_ml.vibe_analyzer import VibeAnalyzer

            self._vibe_analyzer = VibeAnalyzer()
        return self._vibe_analyzer

    def _get_pipeline_generator(self):
        if self._pipeline_generator is None:
            from vibe_ml.vibe_pipeline import VibePipelineGenerator

            self._pipeline_generator = VibePipelineGenerator()
        return self._pipeline_generator

    def _get_finetuner(self):
        if self._finetuner is None:
            from vibe_ml.vibe_finetuner import VibeFineTuner

            self._finetuner = VibeFineTuner()
        return self._finetuner

    def _load_classical_models(self) -> Dict:
        return {
            "XGBoost": {
                "type": "classical",
                "cost": 10,
                "carbon": 0.4,
                "latency": 120,
                "accuracy": 0.85,
                "best_for": ["tabular", "classification", "regression"],
                "min_rows": 100,
            },
            "LightGBM": {
                "type": "classical",
                "cost": 7,
                "carbon": 0.25,
                "latency": 80,
                "accuracy": 0.84,
                "best_for": ["tabular", "classification", "regression"],
                "min_rows": 100,
            },
            "CatBoost": {
                "type": "classical",
                "cost": 12,
                "carbon": 0.5,
                "latency": 150,
                "accuracy": 0.86,
                "best_for": ["tabular", "classification", "regression", "imbalanced"],
                "min_rows": 100,
            },
            "RandomForest": {
                "type": "classical",
                "cost": 8,
                "carbon": 0.3,
                "latency": 100,
                "accuracy": 0.82,
                "best_for": ["tabular", "classification", "regression"],
                "min_rows": 50,
            },
            "LogisticRegression": {
                "type": "classical",
                "cost": 3,
                "carbon": 0.1,
                "latency": 50,
                "accuracy": 0.75,
                "best_for": ["tabular", "classification", "low_features"],
                "min_rows": 50,
            },
            "SVM": {
                "type": "classical",
                "cost": 5,
                "carbon": 0.15,
                "latency": 60,
                "accuracy": 0.78,
                "best_for": ["tabular", "classification", "small_data"],
                "min_rows": 20,
            },
            "MLP": {
                "type": "classical",
                "cost": 15,
                "carbon": 0.6,
                "latency": 200,
                "accuracy": 0.83,
                "best_for": ["tabular", "classification", "regression"],
                "min_rows": 100,
            },
            "KMeans": {
                "type": "classical",
                "cost": 2,
                "carbon": 0.05,
                "latency": 30,
                "accuracy": 0.7,
                "best_for": ["tabular", "clustering", "unsupervised"],
                "min_rows": 50,
            },
        }

    def _load_transformer_models(self) -> Dict:
        return {
            "DistilBERT": {
                "type": "transformer",
                "cost": 25,
                "carbon": 1.2,
                "latency": 300,
                "accuracy": 0.88,
                "best_for": ["text", "classification", "NER"],
                "vram_gb": 6,
                "min_rows": 500,
            },
            "BERT": {
                "type": "transformer",
                "cost": 40,
                "carbon": 2.0,
                "latency": 500,
                "accuracy": 0.90,
                "best_for": ["text", "classification", "QA"],
                "vram_gb": 14,
                "min_rows": 1000,
            },
            "RoBERTa": {
                "type": "transformer",
                "cost": 45,
                "carbon": 2.5,
                "latency": 600,
                "accuracy": 0.91,
                "best_for": ["text", "classification"],
                "vram_gb": 16,
                "min_rows": 1000,
            },
        }

    def _load_llm_models(self) -> Dict:
        return {
            "meta-llama/Meta-Llama-3.1-8B-Instruct": {
                "name": "Llama 3.1 8B",
                "type": "llm",
                "cost": 30,
                "carbon": 1.5,
                "latency": 400,
                "accuracy": 0.90,
                "best_for": ["text_generation", "chat", "instruction"],
                "vram_gb": 16,
                "qlora_vram_gb": 6,
                "family": "Llama",
                "params": "8B",
            },
            "mistralai/Mistral-7B-Instruct-v0.3": {
                "name": "Mistral 7B",
                "type": "llm",
                "cost": 20,
                "carbon": 1.0,
                "latency": 250,
                "accuracy": 0.87,
                "best_for": ["text_generation", "chat", "fast"],
                "vram_gb": 14,
                "qlora_vram_gb": 5,
                "family": "Mistral",
                "params": "7B",
            },
            "Qwen/Qwen2.5-7B-Instruct": {
                "name": "Qwen 2.5 7B",
                "type": "llm",
                "cost": 20,
                "carbon": 1.0,
                "latency": 250,
                "accuracy": 0.86,
                "best_for": ["text_generation", "code", "multilingual"],
                "vram_gb": 14,
                "qlora_vram_gb": 5,
                "family": "Qwen",
                "params": "7B",
            },
            "microsoft/Phi-3.5-mini-instruct": {
                "name": "Phi-3.5 Mini",
                "type": "llm",
                "cost": 10,
                "carbon": 0.5,
                "latency": 100,
                "accuracy": 0.80,
                "best_for": ["text_generation", "edge", "fast"],
                "vram_gb": 8,
                "qlora_vram_gb": 4,
                "family": "Phi",
                "params": "3.8B",
            },
            "google/gemma-2-9b-it": {
                "name": "Gemma 2 9B",
                "type": "llm",
                "cost": 25,
                "carbon": 1.2,
                "latency": 350,
                "accuracy": 0.88,
                "best_for": ["text_generation", "instruction"],
                "vram_gb": 18,
                "qlora_vram_gb": 6,
                "family": "Gemma",
                "params": "9B",
            },
        }

    def analyze_data(self, df: pd.DataFrame, name: str = "dataset") -> DataProfile:
        """Analyze data and create a profile"""

        analyzer = self._get_vibe_analyzer()
        vibe_profile = analyzer.analyze(df, name)

        profile = DataProfile(
            id=vibe_profile.id,
            name=name,
            rows=vibe_profile.rows,
            columns=vibe_profile.columns,
            features=vibe_profile.features,
            data_type=self._infer_data_type(vibe_profile),
            task_type=vibe_profile.recommended_task,
            has_label=vibe_profile.analysis_metadata.get("class_balance_detail", {}).get(
                "label_column"
            )
            is not None,
            label_column=vibe_profile.analysis_metadata.get("class_balance_detail", {}).get(
                "label_column"
            ),
            missing_rate=vibe_profile.missing_rate,
            duplicate_rate=vibe_profile.duplicate_rate,
            outlier_rate=vibe_profile.outlier_rate,
            numeric_ratio=vibe_profile.numeric_dominance,
            categorical_ratio=vibe_profile.categorical_dominance,
            text_ratio=vibe_profile.text_dominance,
            class_balance_ratio=vibe_profile.class_balance_ratio,
            vibe_categories=vibe_profile.categories,
            vibe_summary=analyzer.generate_vibe_summary(vibe_profile),
            confidence=vibe_profile.confidence_score,
        )

        return profile

    def _infer_data_type(self, vibe_profile) -> str:
        """Infer the data type from vibe profile"""

        if vibe_profile.text_dominance > 0.5:
            return "text"
        elif vibe_profile.categories.__contains__("time_series"):
            return "time_series"
        elif vibe_profile.numeric_dominance > 0.7:
            return "tabular"
        return "mixed"

    def recommend_models(
        self,
        data_profile: DataProfile,
        include_llm: bool = None,
    ) -> List[ModelRecommendation]:
        """Get model recommendations based on data profile"""

        if include_llm is None:
            include_llm = self.config.include_llm_finetuning

        recommendations = []

        # 1. Classical ML models
        classical_recs = self._recommend_classical_models(data_profile)
        recommendations.extend(classical_recs)

        # 2. Transformer models (if text data)
        if data_profile.data_type == "text" and self.config.include_transformers:
            transformer_recs = self._recommend_transformer_models(data_profile)
            recommendations.extend(transformer_recs)

        # 3. LLM fine-tuning (if text and large dataset)
        if include_llm and data_profile.text_ratio > 0.3:
            llm_recs = self._recommend_llm_models(data_profile)
            recommendations.extend(llm_recs)

        # Sort by score
        recommendations.sort(key=lambda x: x.score, reverse=True)

        return recommendations[:10]

    def _recommend_classical_models(self, profile: DataProfile) -> List[ModelRecommendation]:
        recs = []

        for model_name, model_info in self._classical_models.items():
            # Check constraints
            if model_info["cost"] > self.config.max_cost_usd:
                continue
            if model_info["latency"] > self.config.max_latency_ms:
                continue
            if model_info["carbon"] > self.config.max_carbon_kg:
                continue

            # Check data suitability
            if profile.rows < model_info["min_rows"]:
                continue

            # Check task type
            task_match = any(
                task in model_info["best_for"] for task in [profile.task_type, profile.data_type]
            )
            if not task_match:
                continue

            # Calculate score
            score = self._calculate_model_score(model_info, profile)

            recs.append(
                ModelRecommendation(
                    id=model_name,
                    name=model_name,
                    model_type="classical",
                    score=score,
                    rationale=f"Classical ML model for {profile.task_type} on {profile.data_type} data",
                    estimated_accuracy=model_info["accuracy"],
                    estimated_cost=model_info["cost"],
                    estimated_time_seconds=model_info["latency"] / 1000 * profile.rows / 1000,
                    estimated_vram_gb=2,  # Classical models typically need <2GB
                )
            )

        return recs

    def _recommend_transformer_models(self, profile: DataProfile) -> List[ModelRecommendation]:
        recs = []

        for model_name, model_info in self._transformer_models.items():
            # Check constraints
            vram = model_info.get("vram_gb", 16)
            if vram > self.config.max_vram_gb:
                continue
            if model_info["cost"] > self.config.max_cost_usd:
                continue

            # Check data suitability
            if profile.rows < model_info["min_rows"]:
                continue

            # Calculate score
            score = self._calculate_model_score(model_info, profile)

            recs.append(
                ModelRecommendation(
                    id=model_name,
                    name=model_name,
                    model_type="transformer",
                    score=score,
                    rationale=f"Transformer model for text classification",
                    estimated_accuracy=model_info["accuracy"],
                    estimated_cost=model_info["cost"],
                    estimated_time_seconds=model_info["latency"] / 1000 * profile.rows / 100,
                    estimated_vram_gb=vram,
                    is_finetunable=True,
                    finetune_method="lora",
                )
            )

        return recs

    def _recommend_llm_models(self, profile: DataProfile) -> List[ModelRecommendation]:
        recs = []

        finetuner = self._get_finetuner()

        try:
            from vibe_ml.vibe_analyzer import VibeProfile

            vibe_profile = VibeProfile(
                id=profile.id,
                name=profile.name,
                created_at="",
                rows=profile.rows,
                columns=profile.columns,
                features=profile.features,
                categories=profile.vibe_categories,
                recommended_task=profile.task_type,
                confidence_score=profile.confidence,
            )

            llm_recommendations = finetuner.recommend(
                vibe_profile,
                {
                    "max_vram_gb": self.config.max_vram_gb,
                    "prefer_free": self.config.prefer_free_models,
                },
            )

            for llm_rec in llm_recommendations:
                score = self._calculate_llm_score(llm_rec, profile)

                # Auto-generate finetune config
                finetune_config = finetuner.auto_tune_config(
                    vibe_profile, llm_rec.model_id, "qlora"
                )

                recs.append(
                    ModelRecommendation(
                        id=llm_rec.model_id,
                        name=llm_rec.model_name,
                        model_type="llm",
                        score=score,
                        rationale=llm_rec.rationale,
                        estimated_accuracy=llm_rec.score,
                        estimated_cost=30,  # Estimated finetuning cost
                        estimated_time_seconds=profile.rows * 0.5,  # Rough estimate
                        estimated_vram_gb=llm_rec.qlora_vram_gb,
                        is_finetunable=True,
                        finetune_method="qlora",
                        finetune_config={
                            "lora_r": finetune_config.lora_r,
                            "lora_alpha": finetune_config.lora_alpha,
                            "epochs": finetune_config.epochs,
                            "batch_size": finetune_config.batch_size,
                            "learning_rate": finetune_config.learning_rate,
                        },
                    )
                )
        except Exception as e:
            # Fallback to basic LLM recommendations
            for model_id, model_info in self._llm_models.items():
                vram = model_info.get("qlora_vram_gb", model_info.get("vram_gb", 16))
                if vram > self.config.max_vram_gb:
                    continue

                recs.append(
                    ModelRecommendation(
                        id=model_id,
                        name=model_info["name"],
                        model_type="llm",
                        score=0.7,
                        rationale=f"LLM for text generation",
                        estimated_accuracy=0.85,
                        estimated_cost=30,
                        estimated_time_seconds=profile.rows * 0.5,
                        estimated_vram_gb=vram,
                        is_finetunable=True,
                        finetune_method="qlora",
                    )
                )

        return recs

    def _calculate_model_score(self, model_info: Dict, profile: DataProfile) -> float:
        """Calculate a suitability score for a model"""

        score = 0.5

        # Accuracy factor
        score += model_info["accuracy"] * 0.3

        # Cost efficiency
        cost_factor = 1 - (model_info["cost"] / 100)
        score += cost_factor * 0.1

        # Data size suitability
        if profile.rows >= model_info.get("min_rows", 100):
            score += 0.1
        elif profile.rows >= model_info.get("min_rows", 100) * 0.5:
            score += 0.05

        # Class balance factor
        if profile.class_balance_ratio < 0.3:  # Imbalanced
            if "imbalanced" in model_info.get("best_for", []):
                score += 0.15

        # Data type match
        for best_for in model_info.get("best_for", []):
            if best_for in [profile.data_type, profile.task_type]:
                score += 0.1
                break

        return min(score, 1.0)

    def _calculate_llm_score(self, llm_rec, profile: DataProfile) -> float:
        """Calculate score for LLM recommendation"""

        base_score = llm_rec.score

        # Adjust for dataset size
        if profile.rows < 1000:
            base_score *= 0.9
        elif profile.rows > 10000:
            base_score *= 1.1

        return min(base_score, 1.0)

    def build_pipeline(
        self,
        data_profile: DataProfile,
        selected_model: Optional[ModelRecommendation] = None,
    ) -> PipelineResult:
        """Build an execution pipeline based on data profile and model selection"""

        pipeline_id = str(uuid.uuid4())[:12]

        result = PipelineResult(
            id=pipeline_id,
            name=f"AutonomousPipeline-{pipeline_id}",
            created_at=datetime.utcnow().isoformat(),
            data_profile=data_profile,
            recommended_models=self.recommend_models(data_profile),
        )

        # Select best model if not specified
        if selected_model is None:
            result.selected_model = (
                result.recommended_models[0] if result.recommended_models else None
            )
        else:
            result.selected_model = selected_model

        if result.selected_model is None:
            result.warnings.append("No suitable model found for this dataset")
            return result

        # Build pipeline steps
        result.pipeline_steps = self._build_pipeline_steps(data_profile, result.selected_model)

        # Estimate metrics
        result.estimated_metrics = self._estimate_metrics(data_profile, result.selected_model)

        # Create execution plan
        result.execution_plan = self._create_execution_plan(data_profile, result.selected_model)

        return result

    def _build_pipeline_steps(self, profile: DataProfile, model: ModelRecommendation) -> List[Dict]:
        """Build pipeline steps based on data and model"""

        steps = []

        # Step 1: Data Loading
        steps.append(
            {
                "name": "Load Data",
                "type": "load",
                "description": f"Load dataset with {profile.rows} rows, {profile.columns} columns",
            }
        )

        # Step 2: Preprocessing based on data quality
        if profile.missing_rate > 0.1:
            steps.append(
                {
                    "name": "Handle Missing Values",
                    "type": "preprocess",
                    "params": {"strategy": "median"},
                }
            )

        if profile.duplicate_rate > 0.05:
            steps.append(
                {
                    "name": "Remove Duplicates",
                    "type": "preprocess",
                }
            )

        if profile.outlier_rate > 0.05:
            steps.append(
                {
                    "name": "Handle Outliers",
                    "type": "preprocess",
                    "params": {"method": "cap"},
                }
            )

        # Step 3: Feature engineering
        if profile.numeric_ratio > 0.5:
            steps.append(
                {
                    "name": "Scale Features",
                    "type": "transform",
                    "params": {"method": "standard"},
                }
            )

        if profile.categorical_ratio > 0.3:
            steps.append(
                {
                    "name": "Encode Categorical",
                    "type": "transform",
                    "params": {"method": "label"},
                }
            )

        if profile.text_ratio > 0.3:
            steps.append(
                {
                    "name": "Text Processing",
                    "type": "transform",
                    "params": {"method": "tfidf"},
                }
            )

        # Step 4: Split data
        steps.append(
            {
                "name": "Train-Test Split",
                "type": "split",
                "params": {"test_size": 0.2, "random_state": 42},
            }
        )

        # Step 5: Train model
        step = {
            "name": f"Train {model.name}",
            "type": "train",
            "params": model.config or {},
        }

        if model.is_finetunable and model.finetune_method:
            step["finetune"] = {
                "method": model.finetune_method,
                "config": model.finetune_config,
            }

        steps.append(step)

        # Step 6: Evaluate
        steps.append(
            {
                "name": "Evaluate Model",
                "type": "evaluate",
                "params": {"metrics": ["accuracy", "f1", "precision", "recall"]},
            }
        )

        return steps

    def _estimate_metrics(self, profile: DataProfile, model: ModelRecommendation) -> Dict:
        """Estimate pipeline metrics"""

        return {
            "accuracy": model.estimated_accuracy,
            "cost_usd": model.estimated_cost,
            "time_seconds": model.estimated_time_seconds,
            "carbon_kg": model.estimated_cost * 0.04,
            "vram_gb": model.estimated_vram_gb,
        }

    def _create_execution_plan(self, profile: DataProfile, model: ModelRecommendation) -> Dict:
        """Create a detailed execution plan"""

        plan = {
            "stage": "preparation",
            "steps": [],
        }

        if model.model_type == "llm" and model.is_finetunable:
            plan["stage"] = "finetuning"
            plan["platform"] = "colab"
            plan["runtime"] = "python"
            plan["notebook_generation"] = True
        elif model.model_type == "transformer":
            plan["stage"] = "transformer_training"
            plan["platform"] = "auto"
        else:
            plan["stage"] = "classical_ml"
            plan["platform"] = "auto"

        return plan

    def run_autonomous(
        self,
        df: pd.DataFrame,
        name: str = "dataset",
        constraints: Optional[Dict] = None,
    ) -> PipelineResult:
        """Fully autonomous pipeline - analyze, recommend, build"""

        # Apply constraints
        if constraints:
            if "max_cost" in constraints:
                self.config.max_cost_usd = constraints["max_cost"]
            if "max_latency" in constraints:
                self.config.max_latency_ms = constraints["max_latency"]
            if "max_vram" in constraints:
                self.config.max_vram_gb = constraints["max_vram"]

        # Step 1: Analyze data
        data_profile = self.analyze_data(df, name)

        # Step 2: Get recommendations
        recommendations = self.recommend_models(data_profile)

        # Step 3: Build pipeline with best model
        result = self.build_pipeline(data_profile, recommendations[0] if recommendations else None)

        return result


__all__ = [
    "AutonomousPlatform",
    "PlatformConfig",
    "DataProfile",
    "ModelRecommendation",
    "PipelineResult",
    "ModelType",
    "TaskType",
]
