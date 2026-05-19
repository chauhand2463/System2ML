"""
Vibe ML Quick Test
Tests the Vibe ML components with sample data.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import pandas as pd
import numpy as np

# Test 1: VibeAnalyzer
print("=" * 60)
print("TEST 1: VibeAnalyzer")
print("=" * 60)

from vibe_ml.vibe_analyzer import VibeAnalyzer

# Create sample data with different vibes
np.random.seed(42)

# Clean, balanced, numeric-heavy data
clean_data = pd.DataFrame(
    {
        "feature1": np.random.randn(1000),
        "feature2": np.random.randn(1000),
        "feature3": np.random.randn(1000),
        "label": np.random.choice(["A", "B", "C"], 1000),
    }
)

analyzer = VibeAnalyzer()
clean_profile = analyzer.analyze(clean_data, "clean_data")

print(f"Profile: {clean_profile.id}")
print(f"Categories: {clean_profile.categories}")
print(f"Strengths: {clean_profile.strengths}")
print(f"Recommended Task: {clean_profile.recommended_task}")
print(f"Recommended Models: {clean_profile.recommended_models}")
print(f"Vibe Summary: {analyzer.generate_vibe_summary(clean_profile)}")
print()

# Messy, imbalanced data
messy_data = pd.DataFrame(
    {
        "feature1": np.concatenate([np.random.randn(500), np.full(200, np.nan)]),
        "feature2": list(range(500)) + [np.nan] * 200,
        "text_column": ["Lorem ipsum " * 10] * 700,
        "label": ["A"] * 600 + ["B"] * 100,
    }
)

messy_profile = analyzer.analyze(messy_data, "messy_data")
print(f"Messy Profile Categories: {messy_profile.categories}")
print(f"Messy Profile Strengths: {messy_profile.strengths}")
print(f"Messy Vibe Summary: {analyzer.generate_vibe_summary(messy_profile)}")
print()

# Test 2: Compare vibes
print("=" * 60)
print("TEST 2: Vibe Comparison")
print("=" * 60)

comparison = analyzer.compare_vibes(clean_profile, messy_profile)
print(f"Similarity: {comparison['similarity']:.2f}")
print(f"Common vibes: {comparison['common_vibes']}")
print()

# Test 3: VibePipelineGenerator
print("=" * 60)
print("TEST 3: VibePipelineGenerator")
print("=" * 60)

from vibe_ml.vibe_pipeline import VibePipelineGenerator

generator = VibePipelineGenerator()
pipeline = generator.generate(clean_profile, {"max_cost": 50, "max_latency": 500})

print(f"Pipeline: {pipeline.name}")
print(f"Task Type: {pipeline.task_type}")
print(f"Steps: {len(pipeline.steps)}")
for step in pipeline.steps:
    print(f"  - {step.name} ({step.type})")
print(f"Estimated Accuracy: {pipeline.estimated_accuracy:.2%}")
print(f"Estimated Cost: ${pipeline.estimated_cost:.2f}")
print(f"Estimated Time: {pipeline.estimated_time_seconds:.1f}s")
print(f"Reasoning: {pipeline.reasoning}")
print()

# Test 4: VibeFineTuner
print("=" * 60)
print("TEST 4: VibeFineTuner")
print("=" * 60)

from vibe_ml.vibe_finetuner import VibeFineTuner

finetuner = VibeFineTuner()
recommendations = finetuner.recommend(clean_profile, {"max_vram_gb": 15, "prefer_free": True})

print(f"Recommendations for clean data:")
for rec in recommendations[:3]:
    print(f"  - {rec.model_name} ({rec.params})")
    print(f"    Score: {rec.score:.2f}")
    print(f"    VRAM: {rec.qlora_vram_gb}GB")
    print(f"    Rationale: {rec.rationale[:80]}...")
print()

# Test 5: Auto-tune config
print("=" * 60)
print("TEST 5: Auto-tune LoRA Config")
print("=" * 60)

config = finetuner.auto_tune_config(clean_profile, "mistralai/Mistral-7B-Instruct-v0.3", "qlora")
print(f"Model: {config.base_model_name}")
print(f"Method: {config.method}")
print(f"LoRA R: {config.lora_r}")
print(f"LoRA Alpha: {config.lora_alpha}")
print(f"Epochs: {config.epochs}")
print(f"Batch Size: {config.batch_size}")
print(f"Estimated VRAM: {config.estimated_vram_gb}GB")
print(f"Fits Colab T4: {config.fits_colab_t4}")
print(f"Rationale: {config.rationale}")
print()

# Test 6: Notebook config generation
print("=" * 60)
print("TEST 6: Notebook Config Generation")
print("=" * 60)

notebook_config = finetuner.generate_notebook_config(
    clean_profile, "mistralai/Mistral-7B-Instruct-v0.3", "colab"
)
print(f"Notebook Config:")
print(f"  Model: {notebook_config['model']['name']}")
print(f"  Method: {notebook_config['method']}")
print(f"  LoRA R: {notebook_config['lora_config']['r']}")
print(f"  Epochs: {notebook_config['training_config']['epochs']}")
print(f"  Estimated VRAM: {notebook_config['estimated_resources']['vram_gb']}GB")
print(f"  Fits Colab: {notebook_config['estimated_resources']['fits_colab_t4']}")
print()

print("=" * 60)
print("ALL TESTS PASSED!")
print("=" * 60)
