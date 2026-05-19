"""
Model Selector
Unified model selection combining classical ML, transformers, and LLMs.
"""

from typing import List, Dict, Optional
from dataclasses import dataclass


@dataclass
class ModelRecommendation:
    """Unified model recommendation"""

    id: str
    name: str
    type: str  # classical, transformer, llm
    score: float
    rationale: str

    accuracy: float
    cost: float
    latency: int
    vram_gb: float

    is_finetunable: bool = False
    finetune_method: Optional[str] = None
    finetune_config: Optional[Dict] = None


class UnifiedModelSelector:
    """Selects the best model based on data profile and constraints"""

    def __init__(self):
        self._models = self._load_all_models()

    def _load_all_models(self) -> Dict:
        return {
            # Classical ML
            "XGBoost": {
                "type": "classical",
                "accuracy": 0.85,
                "cost": 10,
                "latency": 120,
                "vram": 2,
            },
            "LightGBM": {
                "type": "classical",
                "accuracy": 0.84,
                "cost": 7,
                "latency": 80,
                "vram": 2,
            },
            "CatBoost": {
                "type": "classical",
                "accuracy": 0.86,
                "cost": 12,
                "latency": 150,
                "vram": 2,
            },
            "RandomForest": {
                "type": "classical",
                "accuracy": 0.82,
                "cost": 8,
                "latency": 100,
                "vram": 2,
            },
            "LogisticRegression": {
                "type": "classical",
                "accuracy": 0.75,
                "cost": 3,
                "latency": 50,
                "vram": 1,
            },
            "SVM": {"type": "classical", "accuracy": 0.78, "cost": 5, "latency": 60, "vram": 1},
            # Transformers
            "DistilBERT": {
                "type": "transformer",
                "accuracy": 0.88,
                "cost": 25,
                "latency": 300,
                "vram": 6,
            },
            "BERT": {
                "type": "transformer",
                "accuracy": 0.90,
                "cost": 40,
                "latency": 500,
                "vram": 14,
            },
            # LLMs
            "Llama-3.1-8B": {
                "type": "llm",
                "accuracy": 0.90,
                "cost": 30,
                "latency": 400,
                "vram": 16,
                "qlora_vram": 6,
            },
            "Mistral-7B": {
                "type": "llm",
                "accuracy": 0.87,
                "cost": 20,
                "latency": 250,
                "vram": 14,
                "qlora_vram": 5,
            },
            "Qwen2.5-7B": {
                "type": "llm",
                "accuracy": 0.86,
                "cost": 20,
                "latency": 250,
                "vram": 14,
                "qlora_vram": 5,
            },
            "Phi-3.5-Mini": {
                "type": "llm",
                "accuracy": 0.80,
                "cost": 10,
                "latency": 100,
                "vram": 8,
                "qlora_vram": 4,
            },
            "Gemma-2-9B": {
                "type": "llm",
                "accuracy": 0.88,
                "cost": 25,
                "latency": 350,
                "vram": 18,
                "qlora_vram": 6,
            },
        }

    def select(
        self,
        data_profile: Dict,
        constraints: Dict,
    ) -> List[ModelRecommendation]:
        """Select models based on data profile and constraints"""

        recommendations = []

        for model_name, model_info in self._models.items():
            # Check constraints
            if model_info["cost"] > constraints.get("max_cost", 100):
                continue

            vram = model_info.get("qlora_vram", model_info.get("vram", 16))
            if vram > constraints.get("max_vram", 50):
                continue

            # Calculate score
            score = self._score_model(model_info, data_profile, constraints)

            # Build recommendation
            rec = ModelRecommendation(
                id=model_name,
                name=model_name,
                type=model_info["type"],
                score=score,
                rationale=f"Selected based on {data_profile.get('task_type', 'classification')} task",
                accuracy=model_info["accuracy"],
                cost=model_info["cost"],
                latency=model_info["latency"],
                vram_gb=vram,
                is_finetunable=model_info["type"] in ["transformer", "llm"],
                finetune_method="qlora" if model_info["type"] == "llm" else "lora",
            )

            recommendations.append(rec)

        # Sort by score
        recommendations.sort(key=lambda x: x.score, reverse=True)

        return recommendations[:5]

    def _score_model(
        self,
        model_info: Dict,
        data_profile: Dict,
        constraints: Dict,
    ) -> float:
        """Calculate model score based on fit"""

        score = 0.5

        # Accuracy contribution
        score += model_info["accuracy"] * 0.3

        # Cost efficiency
        score += (1 - model_info["cost"] / 100) * 0.1

        # Data type match
        data_type = data_profile.get("data_type", "tabular")

        if model_info["type"] == "classical":
            if data_type in ["tabular", "numeric"]:
                score += 0.2
        elif model_info["type"] == "transformer":
            if data_type == "text":
                score += 0.2
        elif model_info["type"] == "llm":
            if data_type == "text":
                score += 0.15

        return min(score, 1.0)

    def get_finetune_config(self, model_id: str, dataset_info: Dict) -> Dict:
        """Get fine-tuning configuration for a model"""

        rows = dataset_info.get("rows", 1000)

        # Auto-tune based on dataset size
        if rows < 1000:
            lora_r = 8
            epochs = 5
            batch_size = 4
        elif rows < 5000:
            lora_r = 16
            epochs = 3
            batch_size = 4
        elif rows < 20000:
            lora_r = 32
            epochs = 3
            batch_size = 8
        else:
            lora_r = 64
            epochs = 2
            batch_size = 8

        return {
            "lora_r": lora_r,
            "lora_alpha": lora_r * 2,
            "dropout": 0.05,
            "epochs": epochs,
            "batch_size": batch_size,
            "learning_rate": 2e-4,
            "max_seq_length": 2048,
        }


__all__ = ["UnifiedModelSelector", "ModelRecommendation"]
