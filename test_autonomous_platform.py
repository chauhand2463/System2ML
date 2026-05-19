"""
Test Autonomous Platform
Tests the unified autonomous ML platform.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import pandas as pd
import numpy as np

print("=" * 60)
print("TEST: Autonomous Platform")
print("=" * 60)

# Create sample dataset
np.random.seed(42)
data = pd.DataFrame(
    {
        "feature1": np.random.randn(1000),
        "feature2": np.random.randn(1000),
        "feature3": np.random.randn(1000),
        "feature4": np.random.choice(["A", "B", "C"], 1000),
        "label": np.random.choice([0, 1], 1000),
    }
)

print(f"Dataset shape: {data.shape}")

# Test 1: Analyze data
print("\n--- Test 1: Data Analysis ---")
from autonomous_platform import AutonomousPlatform, PlatformConfig

config = PlatformConfig(
    max_cost_usd=50,
    max_vram_gb=15,
    include_llm_finetuning=True,
)
platform = AutonomousPlatform(config)

profile = platform.analyze_data(data, "test_data")
print(f"Profile ID: {profile.id}")
print(f"Data Type: {profile.data_type}")
print(f"Task Type: {profile.task_type}")
print(f"Vibe Summary: {profile.vibe_summary}")
print(f"Confidence: {profile.confidence:.2f}")

# Test 2: Get recommendations
print("\n--- Test 2: Model Recommendations ---")
recommendations = platform.recommend_models(profile)
print(f"Found {len(recommendations)} recommendations")
for rec in recommendations[:3]:
    print(
        f"  - {rec.name} ({rec.model_type}): score={rec.score:.2f}, acc={rec.estimated_accuracy:.2f}"
    )
    if rec.is_finetunable:
        print(f"    Finetune method: {rec.finetune_method}")

# Test 3: Build pipeline
print("\n--- Test 3: Pipeline Building ---")
result = platform.build_pipeline(profile, recommendations[0])
print(f"Pipeline ID: {result.id}")
print(f"Pipeline Name: {result.name}")
print(f"Selected Model: {result.selected_model.name if result.selected_model else 'None'}")
print(f"Steps: {len(result.pipeline_steps)}")
for step in result.pipeline_steps:
    print(f"  - {step['name']} ({step['type']})")
print(f"Estimated Metrics: {result.estimated_metrics}")

# Test 4: Run fully autonomous
print("\n--- Test 4: Full Autonomous Run ---")
result2 = platform.run_autonomous(data, "test_data")
print(f"Pipeline ID: {result2.id}")
print(f"Selected Model: {result2.selected_model.name if result2.selected_model else 'None'}")
print(f"Estimated Accuracy: {result2.estimated_metrics.get('accuracy', 0):.2f}")

# Test 5: Text data with LLM recommendations
print("\n--- Test 5: Text Data with LLM ---")
text_data = pd.DataFrame(
    {
        "text": ["Sample text " * 50] * 500,
        "label": np.random.choice([0, 1], 500),
    }
)

profile2 = platform.analyze_data(text_data, "text_data")
print(f"Text Data Type: {profile2.data_type}")
print(f"Text Ratio: {profile2.text_ratio}")

recs2 = platform.recommend_models(profile2)
llm_recs = [r for r in recs2 if r.model_type == "llm"]
print(f"LLM Recommendations: {len(llm_recs)}")
for rec in llm_recs[:2]:
    print(f"  - {rec.name}: score={rec.score:.2f}, vram={rec.estimated_vram_gb}GB")

print("\n" + "=" * 60)
print("ALL TESTS PASSED!")
print("=" * 60)
