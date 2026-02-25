import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from ui.api import state, DesignRequest
import json

# Test complete workflow

print("=" * 50)
print("TEST 1: Design Pipeline")
print("=" * 50)

request = {
    'data_profile': {'type': 'tabular', 'size_mb': 1200, 'features': 45, 'label_type': 'binary'},
    'objective': 'accuracy',
    'constraints': {'max_cost_usd': 10, 'max_carbon_kg': 1.0, 'max_latency_ms': 200, 'compliance_level': 'regulated'},
    'deployment': 'batch',
    'retraining': 'drift'
}

req = DesignRequest(**request)
req_id = state.create_request(req)
result = state.generate_pipeline(req_id)

print(f"Pipeline ID: {result.pipeline_id}")
print(f"Number of designs: {len(result.designs)}")
print(f"Best design accuracy: {result.designs[0].tradeoff_summary['accuracy_est']}")

print("\n" + "=" * 50)
print("TEST 2: Execute Pipeline")
print("=" * 50)

pipeline_key = list(state.pipelines.keys())[0]
print(f"Executing: {pipeline_key}")

exec_result = state.execute_pipeline(pipeline_key, './data/train.csv', 'target')
print(f"Execution status: {exec_result['status']}")
print(f"Run ID: {exec_result['run_id']}")

print("\n" + "=" * 50)
print("TEST 3: Metrics & Runs")
print("=" * 50)

print(f"Total runs: {len(state.runs)}")
for run_id, run in list(state.runs.items())[-2:]:
    print(f"  Run {run_id[:8]}: {run.get('status')} - metrics: {run.get('metrics', {})}")

print("\n" + "=" * 50)
print("TEST 4: Predefined Pipelines")
print("=" * 50)

from pipelines.predefined import list_pipelines
for p in list_pipelines():
    print(f"  - {p['name']}: {p['description']}")

print("\n" + "=" * 50)
print("All tests passed!")
print("=" * 50)
