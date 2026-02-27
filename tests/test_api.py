import os
import sys

# Ensure the root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ui.api import app, get_ai_suggestions, create_project, get_project, profile_dataset, DatasetProfileRequest
from lib.state_machine import LifecycleState

def test_workflow():
    print("Step 1: Create Project")
    data = create_project("Real Data Test Project")
    project_id = data["project_id"]
    print(f"✓ Project {project_id} created")

    print("\nStep 2: Profile Real Dataset (loan_dataset.csv)")
    # Use real Pydantic model and real CSV file
    request = DatasetProfileRequest(
        project_id=project_id,
        source="upload",
        file_name="loan_dataset.csv",
        file_type="csv"
    )
    
    response = profile_dataset(request)
    print(f"✓ Dataset profiled: {response['status']}")
    profile = response['profile']
    print(f"  - Rows: {profile['rows']}")
    print(f"  - Columns: {profile['columns']}")
    print(f"  - Inferred Task: {profile['inferred_task']}")

    print("\nStep 3: Get AI Suggestions (Dynamic)")
    response = get_ai_suggestions(project_id)
    print(f"✓ AI Suggestions received: {len(response['suggestions'])} items")
    for s in response['suggestions']:
        print(f"  - {s['field']}: {s['value']} ({s['reason']})")

    print("\nStep 4: Health Check")
    from ui.api import health_check
    assert health_check()["status"] == "healthy"
    print("✓ Health check passed")

if __name__ == "__main__":
    print("Running API Unit Tests with Real Data...")
    try:
        test_workflow()
        print("\nAll API logic tests passed!")
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
