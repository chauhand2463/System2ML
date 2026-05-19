"""
Vibe Fine-Tuner - Autonomous fine-tuning model selection based on vibe analysis.
Automatically selects optimal base models and configurations for fine-tuning.
"""

import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any, Literal
from dataclasses import dataclass, field

from .vibe_analyzer import VibeAnalyzer, VibeProfile


@dataclass
class VibeFinetuneConfig:
    """Configuration for vibe-based fine-tuning"""

    base_model_id: str
    base_model_name: str
    method: Literal["lora", "qlora", "full_ft"] = "qlora"

    # LoRA config (auto-tuned)
    lora_r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.05
    lora_target_modules: str = "q_proj,v_proj,k_proj,o_proj"

    # Training config (auto-tuned)
    epochs: int = 3
    batch_size: int = 4
    learning_rate: float = 2e-4
    max_seq_length: int = 2048
    warmup_ratio: float = 0.03

    # Rationale
    rationale: str = ""
    confidence: float = 0.0

    # Compatibility
    estimated_vram_gb: float = 8.0
    fits_colab_t4: bool = True


@dataclass
class ModelRecommendation:
    """A recommended model with reasoning"""

    model_id: str
    model_name: str
    family: str
    params: str
    vram_gb: int
    qlora_vram_gb: int
    score: float
    rationale: str
    tags: List[str] = field(default_factory=list)


class VibeFineTuner:
    """Autonomous fine-tuning model selector based on vibe analysis"""

    def __init__(self):
        self.analyzer = VibeAnalyzer()

        # Curated model library with metadata
        self._model_library = {
            "meta-llama/Meta-Llama-3.1-8B-Instruct": {
                "name": "Llama 3.1 8B",
                "family": "Llama 3",
                "params": "8B",
                "vram_gb": 16,
                "qlora_vram_gb": 6,
                "license": "Llama 3",
                "tags": ["instruction", "general", "chat"],
                "best_for": ["general_purpose", "chat", "reasoning"],
                "vibe_match": {
                    "text_heavy": 0.9,
                    "clean": 0.85,
                    "balanced": 0.8,
                    "messy": 0.6,
                },
            },
            "meta-llama/Meta-Llama-3.1-70B-Instruct": {
                "name": "Llama 3.1 70B",
                "family": "Llama 3",
                "params": "70B",
                "vram_gb": 80,
                "qlora_vram_gb": 20,
                "license": "Llama 3",
                "tags": ["powerful", "reasoning"],
                "best_for": ["high_accuracy", "complex_reasoning"],
                "vibe_match": {
                    "text_heavy": 0.95,
                    "clean": 0.9,
                },
            },
            "mistralai/Mistral-7B-Instruct-v0.3": {
                "name": "Mistral 7B v0.3",
                "family": "Mistral",
                "params": "7B",
                "vram_gb": 14,
                "qlora_vram_gb": 5,
                "license": "Apache 2.0",
                "tags": ["commercial", "fast", "efficient"],
                "best_for": ["speed", "general_purpose"],
                "vibe_match": {
                    "clean": 0.9,
                    "balanced": 0.85,
                    "text_heavy": 0.8,
                },
            },
            "mistralai/Mixtral-8x7B-Instruct-v0.1": {
                "name": "Mixtral 8x7B",
                "family": "Mistral",
                "params": "47B MoE",
                "vram_gb": 48,
                "qlora_vram_gb": 12,
                "license": "Apache 2.0",
                "tags": ["moe", "powerful", "efficient"],
                "best_for": ["high_capacity", "multilingual"],
                "vibe_match": {
                    "text_heavy": 0.92,
                    "clean": 0.88,
                },
            },
            "Qwen/Qwen2.5-7B-Instruct": {
                "name": "Qwen 2.5 7B",
                "family": "Qwen",
                "params": "7B",
                "vram_gb": 14,
                "qlora_vram_gb": 5,
                "license": "Apache 2.0",
                "tags": ["code", "multilingual", "fast"],
                "best_for": ["code_generation", "multilingual"],
                "vibe_match": {
                    "text_heavy": 0.85,
                    "code_oriented": 0.95,
                },
            },
            "Qwen/Qwen2.5-14B-Instruct": {
                "name": "Qwen 2.5 14B",
                "family": "Qwen",
                "params": "14B",
                "vram_gb": 28,
                "qlora_vram_gb": 8,
                "license": "Apache 2.0",
                "tags": ["code", "math", "powerful"],
                "best_for": ["code", "math", "reasoning"],
                "vibe_match": {
                    "text_heavy": 0.88,
                    "code_oriented": 0.95,
                    "clean": 0.85,
                },
            },
            "microsoft/Phi-3.5-mini-instruct": {
                "name": "Phi-3.5 Mini",
                "family": "Phi",
                "params": "3.8B",
                "vram_gb": 8,
                "qlora_vram_gb": 4,
                "license": "MIT",
                "tags": ["tiny", "edge", "fast"],
                "best_for": ["edge_deployment", "speed", "low_resources"],
                "vibe_match": {
                    "low_dimensional": 0.9,
                    "sparse": 0.85,
                    "clean": 0.8,
                },
            },
            "google/gemma-2-9b-it": {
                "name": "Gemma 2 9B",
                "family": "Gemma",
                "params": "9B",
                "vram_gb": 18,
                "qlora_vram_gb": 6,
                "license": "Gemma",
                "tags": ["google", "safe", "instruction"],
                "best_for": ["safety", "instruction_following"],
                "vibe_match": {
                    "clean": 0.9,
                    "balanced": 0.85,
                    "text_heavy": 0.8,
                },
            },
            "deepseek-ai/deepseek-coder-7b-instruct-v1.5": {
                "name": "DeepSeek Coder 7B",
                "family": "DeepSeek",
                "params": "7B",
                "vram_gb": 14,
                "qlora_vram_gb": 5,
                "license": "DeepSeek",
                "tags": ["code", "specialized"],
                "best_for": ["code_generation", "programming"],
                "vibe_match": {
                    "code_oriented": 0.98,
                    "text_heavy": 0.7,
                },
            },
            "tiiuae/falcon-7b-instruct": {
                "name": "Falcon 7B",
                "family": "Falcon",
                "params": "7B",
                "vram_gb": 14,
                "qlora_vram_gb": 5,
                "license": "Apache 2.0",
                "tags": ["commercial", "apache"],
                "best_for": ["general_purpose"],
                "vibe_match": {
                    "clean": 0.8,
                    "balanced": 0.75,
                },
            },
            "EleutherAI/gpt-neo-2.7B": {
                "name": "GPT-Neo 2.7B",
                "family": "GPT-Neo",
                "params": "2.7B",
                "vram_gb": 6,
                "qlora_vram_gb": 3,
                "license": "MIT",
                "tags": ["open", "free", "small"],
                "best_for": ["low_resources", "experimentation"],
                "vibe_match": {
                    "low_dimensional": 0.85,
                    "sparse": 0.8,
                },
            },
            "facebook/opt-1.3b": {
                "name": "OPT 1.3B",
                "family": "OPT",
                "params": "1.3B",
                "vram_gb": 4,
                "qlora_vram_gb": 2,
                "license": "AI",
                "tags": ["open", "tiny", "free"],
                "best_for": ["edge", "minimal_resources"],
                "vibe_match": {
                    "high_dimensional": 0.6,
                    "low_dimensional": 0.95,
                },
            },
        }

        # Vibe to task type mapping
        self._task_type_models = {
            "classification": ["Llama 3.1 8B", "Mistral 7B", "Qwen 2.5 7B"],
            "regression": ["Mistral 7B", "Qwen 2.5 7B", "Llama 3.1 8B"],
            "text_generation": ["Llama 3.1 8B", "Mixtral 8x7B", "Mistral 7B"],
            "code_generation": ["DeepSeek Coder 7B", "Qwen 2.5 14B", "CodeLlama"],
            "chat": ["Llama 3.1 8B", "Mistral 7B", "Gemma 2 9B"],
            "instruction_following": ["Llama 3.1 8B", "Gemma 2 9B", "Mistral 7B"],
            "clustering": ["Phi-3.5 Mini", "GPT-Neo 2.7B"],
        }

    def recommend(
        self,
        vibe_profile: VibeProfile,
        constraints: Optional[Dict[str, Any]] = None,
    ) -> List[ModelRecommendation]:
        """Recommend models based on vibe profile"""

        constraints = constraints or {}
        max_vram = constraints.get("max_vram_gb", 15)  # Colab T4 default
        prefer_free = constraints.get("prefer_free", False)
        task_type = constraints.get("task_type", vibe_profile.recommended_task)

        recommendations = []

        for model_id, model_info in self._model_library.items():
            # Check VRAM constraint
            use_vram = (
                model_info["qlora_vram_gb"]
                if constraints.get("use_quantization", True)
                else model_info["vram_gb"]
            )

            if use_vram > max_vram:
                continue

            # Check license preference
            if prefer_free and model_info["license"] not in ["MIT", "Apache 2.0", "AI"]:
                continue

            # Calculate vibe match score
            score = self._calculate_vibe_score(vibe_profile, model_info)

            # Adjust for task type
            task_boost = self._get_task_boost(task_type, model_info)
            score *= task_boost

            # Adjust for data characteristics
            score *= self._get_data_adjustment(vibe_profile, model_info)

            # Generate rationale
            rationale = self._generate_rationale(vibe_profile, model_info, score)

            recommendations.append(
                ModelRecommendation(
                    model_id=model_id,
                    model_name=model_info["name"],
                    family=model_info["family"],
                    params=model_info["params"],
                    vram_gb=model_info["vram_gb"],
                    qlora_vram_gb=model_info["qlora_vram_gb"],
                    score=round(score, 3),
                    rationale=rationale,
                    tags=model_info["tags"],
                )
            )

        # Sort by score
        recommendations.sort(key=lambda x: x.score, reverse=True)

        return recommendations[:5]

    def recommend_from_dataframe(
        self,
        df,
        constraints: Optional[Dict[str, Any]] = None,
    ) -> List[ModelRecommendation]:
        """Convenience: analyze data and recommend models"""
        vibe_profile = self.analyzer.analyze(df, "dataset")
        return self.recommend(vibe_profile, constraints)

    def _calculate_vibe_score(self, profile: VibeProfile, model_info: Dict) -> float:
        """Calculate how well a model matches the data vibe"""

        base_score = 0.5

        # Check vibe matches
        vibe_matches = model_info.get("vibe_match", {})

        for category in profile.categories:
            if category in vibe_matches:
                base_score += vibe_matches[category] * 0.1

        # Check strengths
        for strength, value in profile.strengths.items():
            if strength in vibe_matches:
                strength_bonus = 0.05 if value == "mild" else 0.1 if value == "moderate" else 0.15
                base_score += vibe_matches[strength] * strength_bonus

        # Data quality adjustment
        if profile.missing_rate < 0.05:
            base_score += 0.05
        elif profile.missing_rate > 0.3:
            base_score -= 0.1

        # Class balance adjustment
        if profile.class_balance_ratio < 0.3:
            base_score -= 0.05  # Imbalanced is harder

        return max(0.1, min(1.0, base_score))

    def _get_task_boost(self, task_type: str, model_info: Dict) -> float:
        """Boost score based on task type"""

        best_for = model_info.get("best_for", [])

        task_to_best_for = {
            "classification": ["general_purpose"],
            "regression": ["general_purpose"],
            "text_generation": ["general_purpose", "chat"],
            "code_generation": ["code_generation", "programming"],
            "chat": ["chat", "instruction_following"],
            "instruction_following": ["instruction_following", "chat"],
        }

        relevant = task_to_best_for.get(task_type, [])

        if any(b in best_for for b in relevant):
            return 1.2

        return 1.0

    def _get_data_adjustment(self, profile: VibeProfile, model_info: Dict) -> float:
        """Adjust score based on data characteristics"""

        multiplier = 1.0

        # Dataset size adjustments
        if profile.rows < 1000:
            # Small dataset - prefer smaller models
            if model_info["params"] in ["3.8B", "1.3B", "2.7B"]:
                multiplier *= 1.2
            elif model_info["params"] in ["70B", "47B MoE"]:
                multiplier *= 0.7
        elif profile.rows > 50000:
            # Large dataset - can use bigger models
            if model_info["params"] in ["70B", "47B MoE"]:
                multiplier *= 1.1

        # Text dominance
        if profile.text_dominance > 0.5:
            if "text" in model_info.get("tags", []):
                multiplier *= 1.1

        return multiplier

    def _generate_rationale(self, profile: VibeProfile, model_info: Dict, score: float) -> str:
        """Generate explanation for why this model was recommended"""

        parts = []

        # Data vibe match
        vibe_desc = []
        for category in profile.categories[:3]:
            if category in model_info.get("vibe_match", {}):
                vibe_desc.append(category)

        if vibe_desc:
            parts.append(f"Matches vibe: {', '.join(vibe_desc)}")

        # Data size
        if profile.rows < 1000:
            parts.append(f"Small dataset ({profile.rows} rows) - {model_info['name']} works well")
        elif profile.rows > 50000:
            parts.append(f"Large dataset ({profile.rows} rows) - can leverage model capacity")

        # VRAM
        parts.append(f"Requires ~{model_info['qlora_vram_gb']}GB VRAM (QLoRA)")

        # Confidence
        if score > 0.8:
            parts.append("High confidence match")
        elif score > 0.6:
            parts.append("Good match")

        return ". ".join(parts)

    def auto_tune_config(
        self,
        vibe_profile: VibeProfile,
        model_id: str,
        method: Literal["lora", "qlora", "full_ft"] = "qlora",
    ) -> VibeFinetuneConfig:
        """Auto-generate fine-tuning configuration based on vibe"""

        model_info = self._model_library.get(model_id, {})

        # Extract model size in billions
        params_str = model_info.get("params", "7B")
        try:
            model_params_b = float(params_str.replace("B", "").replace("MoE", ""))
        except:
            model_params_b = 7.0

        # Auto-tune LoRA based on dataset size
        config = VibeFinetuneConfig(
            base_model_id=model_id,
            base_model_name=model_info.get("name", model_id),
            method=method,
        )

        # LoRA rank based on dataset size
        if vibe_profile.rows < 1000:
            config.lora_r = 8
            config.lora_alpha = 16
            config.lora_dropout = 0.1
        elif vibe_profile.rows < 5000:
            config.lora_r = 16
            config.lora_alpha = 32
            config.lora_dropout = 0.05
        elif vibe_profile.rows < 20000:
            config.lora_r = 32
            config.lora_alpha = 64
            config.lora_dropout = 0.03
        else:
            config.lora_r = 64
            config.lora_alpha = 128
            config.lora_dropout = 0.02

        # Adjust based on model size
        if model_params_b < 3:
            config.lora_r = min(config.lora_r, 16)
        elif model_params_b > 30:
            config.lora_r = max(config.lora_r, 32)

        # Training epochs based on data size
        if vibe_profile.rows < 1000:
            config.epochs = 5
        elif vibe_profile.rows < 5000:
            config.epochs = 3
        else:
            config.epochs = 2

        # Batch size based on model size
        if model_params_b < 3:
            config.batch_size = 8
        elif model_params_b < 10:
            config.batch_size = 4
        elif model_params_b < 50:
            config.batch_size = 2
        else:
            config.batch_size = 1

        # Learning rate adjustment for messy data
        if vibe_profile.missing_rate > 0.2 or vibe_profile.duplicate_rate > 0.05:
            config.learning_rate *= 0.8  # Lower LR for messy data

        # Max seq length based on text dominance
        if vibe_profile.text_dominance > 0.5:
            config.max_seq_length = 4096
        else:
            config.max_seq_length = 2048

        # Estimate VRAM
        if method == "qlora":
            config.estimated_vram_gb = max(4, model_info.get("qlora_vram_gb", 6))
            config.fits_colab_t4 = config.estimated_vram_gb <= 15
        elif method == "lora":
            config.estimated_vram_gb = max(6, model_info.get("vram_gb", 14) // 2)
            config.fits_colab_t4 = config.estimated_vram_gb <= 15
        else:
            config.estimated_vram_gb = model_info.get("vram_gb", 16)
            config.fits_colab_t4 = config.estimated_vram_gb <= 15

        # Generate rationale
        config.rationale = self._generate_config_rationale(vibe_profile, config)
        config.confidence = min(0.95, 0.5 + (vibe_profile.confidence_score * 0.4))

        return config

    def _generate_config_rationale(self, profile: VibeProfile, config: VibeFinetuneConfig) -> str:
        """Generate explanation for auto-tuned config"""

        parts = [
            f"LoRA rank={config.lora_r} optimized for {profile.rows} samples",
            f"Epochs={config.epochs} based on dataset size",
            f"Batch size={config.batch_size} for {config.base_model_name}",
        ]

        if profile.missing_rate > 0.2:
            parts.append(f"Lower LR ({config.learning_rate}) due to messy data")

        if profile.text_dominance > 0.5:
            parts.append(
                f"Longer context (max_seq_length={config.max_seq_length}) for text-heavy data"
            )

        parts.append(f"Estimated VRAM: {config.estimated_vram_gb}GB")

        return ". ".join(parts)

    def generate_notebook_config(
        self,
        vibe_profile: VibeProfile,
        model_id: str,
        platform: Literal["colab", "jupyter", "kaggle"] = "colab",
    ) -> Dict[str, Any]:
        """Generate complete notebook configuration for fine-tuning"""

        model_info = self._model_library.get(model_id, {})
        config = self.auto_tune_config(vibe_profile, model_id, "qlora")

        return {
            "model": {
                "id": model_id,
                "name": model_info.get("name", model_id),
                "params": model_info.get("params", "7B"),
                "vram_gb": model_info.get("vram_gb", 14),
                "qlora_vram_gb": model_info.get("qlora_vram_gb", 5),
            },
            "method": "qlora",
            "lora_config": {
                "r": config.lora_r,
                "alpha": config.lora_alpha,
                "dropout": config.lora_dropout,
                "target_modules": config.lora_target_modules,
            },
            "training_config": {
                "epochs": config.epochs,
                "batch_size": config.batch_size,
                "learning_rate": config.learning_rate,
                "max_seq_length": config.max_seq_length,
                "warmup_ratio": config.warmup_ratio,
            },
            "platform": platform,
            "estimated_resources": {
                "vram_gb": config.estimated_vram_gb,
                "fits_colab_t4": config.fits_colab_t4,
                "estimated_time_minutes": self._estimate_training_time(
                    vibe_profile.rows, config.epochs, platform
                ),
            },
            "vibe_analysis": {
                "dataset_rows": vibe_profile.rows,
                "dataset_features": vibe_profile.features,
                "text_dominance": vibe_profile.text_dominance,
                "missing_rate": vibe_profile.missing_rate,
                "recommended_task": vibe_profile.recommended_task,
            },
            "rationale": config.rationale,
            "confidence": config.confidence,
        }

    def _estimate_training_time(self, rows: int, epochs: int, platform: str) -> int:
        """Estimate training time in minutes"""

        base_tokens = rows * 256  # Assume average 256 tokens per sample
        tokens_per_sec = 800 if platform == "colab" else 600

        total_seconds = (base_tokens * epochs) / tokens_per_sec

        return max(5, int(total_seconds / 60))

    def list_available_models(self, filters: Optional[Dict] = None) -> List[Dict]:
        """List all available models with optional filters"""

        filters = filters or {}
        models = []

        for model_id, info in self._model_library.items():
            if filters.get("max_vram_gb"):
                vram = (
                    info["qlora_vram_gb"]
                    if filters.get("use_quantization", True)
                    else info["vram_gb"]
                )
                if vram > filters["max_vram_gb"]:
                    continue

            if filters.get("license"):
                if info["license"] != filters["license"]:
                    continue

            if filters.get("family"):
                if info["family"] not in filters["family"]:
                    continue

            models.append(
                {
                    "id": model_id,
                    "name": info["name"],
                    "family": info["family"],
                    "params": info["params"],
                    "vram_gb": info["vram_gb"],
                    "qlora_vram_gb": info["qlora_vram_gb"],
                    "license": info["license"],
                    "tags": info["tags"],
                    "best_for": info["best_for"],
                }
            )

        return models


__all__ = ["VibeFineTuner", "VibeFinetuneConfig", "ModelRecommendation"]
