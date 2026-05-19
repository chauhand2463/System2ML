"""
Pipeline Builder
Builds executable pipelines from recommendations.
"""

from typing import Dict, List, Any
from dataclasses import dataclass
import uuid
from datetime import datetime


@dataclass
class PipelineResult:
    """Result of building a pipeline"""

    id: str
    name: str
    model_id: str
    model_type: str

    steps: List[Dict[str, Any]]

    estimated_accuracy: float
    estimated_cost: float
    estimated_time_seconds: float

    config: Dict[str, Any]

    is_finetunable: bool
    finetune_config: Dict[str, Any] = None


class AutonomousPipelineBuilder:
    """Builds autonomous ML pipelines"""

    def build(
        self,
        model_id: str,
        model_type: str,
        data_profile: Dict,
        include_finetuning: bool = False,
    ) -> PipelineResult:
        """Build a complete pipeline"""

        pipeline_id = str(uuid.uuid4())[:12]

        steps = self._build_steps(data_profile, model_type)

        config = self._build_config(model_id, model_type, data_profile)

        finetune_config = None
        if include_finetuning and model_type in ["transformer", "llm"]:
            finetune_config = self._build_finetune_config(data_profile)

        return PipelineResult(
            id=pipeline_id,
            name=f"AutoPipeline-{pipeline_id}",
            model_id=model_id,
            model_type=model_type,
            steps=steps,
            estimated_accuracy=0.85,
            estimated_cost=10.0,
            estimated_time_seconds=60.0,
            config=config,
            is_finetunable=include_finetuning and model_type in ["transformer", "llm"],
            finetune_config=finetune_config,
        )

    def _build_steps(self, data_profile: Dict, model_type: str) -> List[Dict]:
        """Build pipeline steps"""

        steps = [
            {"name": "Load Data", "type": "load"},
        ]

        # Preprocessing
        if data_profile.get("missing_rate", 0) > 0.1:
            steps.append({"name": "Handle Missing", "type": "preprocess"})

        if data_profile.get("numeric_ratio", 0) > 0.5:
            steps.append({"name": "Scale Features", "type": "transform"})

        if data_profile.get("categorical_ratio", 0) > 0.3:
            steps.append({"name": "Encode Categorical", "type": "transform"})

        if data_profile.get("text_ratio", 0) > 0.3 and model_type != "llm":
            steps.append({"name": "Text Vectorization", "type": "transform"})

        # Split
        steps.append({"name": "Train-Test Split", "type": "split"})

        # Train
        steps.append({"name": "Train Model", "type": "train"})

        # Evaluate
        steps.append({"name": "Evaluate", "type": "evaluate"})

        return steps

    def _build_config(self, model_id: str, model_type: str, data_profile: Dict) -> Dict:
        """Build model configuration"""

        config = {
            "model_id": model_id,
            "model_type": model_type,
        }

        if model_type == "classical":
            config.update(
                {
                    "n_estimators": 100,
                    "max_depth": 6,
                    "learning_rate": 0.1,
                }
            )
        elif model_type == "transformer":
            config.update(
                {
                    "max_length": 512,
                    "batch_size": 8,
                    "learning_rate": 2e-5,
                }
            )
        elif model_type == "llm":
            config.update(
                {
                    "method": "qlora",
                    "max_length": 2048,
                }
            )

        return config

    def _build_finetune_config(self, data_profile: Dict) -> Dict:
        """Build fine-tuning configuration"""

        rows = data_profile.get("rows", 1000)

        if rows < 1000:
            return {"lora_r": 8, "epochs": 5, "batch_size": 4}
        elif rows < 5000:
            return {"lora_r": 16, "epochs": 3, "batch_size": 4}
        else:
            return {"lora_r": 32, "epochs": 3, "batch_size": 8}


__all__ = ["AutonomousPipelineBuilder", "PipelineResult"]
