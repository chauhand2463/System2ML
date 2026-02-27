import requests
import json
import time

BASE_URL = "http://localhost:8000"  # Assuming backend is on 8000

def test_deployment():
    print("1. Listing pipelines...")
    resp = requests.get(f"{BASE_URL}/api/pipelines")
    pipelines = resp.json().get("pipelines", [])
    
    if not pipelines:
        print("No pipelines found. Creating one...")
        # Create a design request to generate a pipeline
        design_req = {
            "data_profile": {"type": "tabular"},
            "objective": "accuracy",
            "constraints": {
                "max_cost_usd": 10,
                "max_carbon_kg": 1.0,
                "max_latency_ms": 200,
                "compliance_level": "regulated"
            },
            "deployment": "batch",
            "retraining": "drift",
            "name": "Test Deployment Pipeline"
        }
        resp = requests.post(f"{BASE_URL}/api/design/request", json=design_req)
        pipeline_id = resp.json().get("pipeline_id")
    else:
        # Find a 'designed' pipeline or use the first one
        designed = [p for p in pipelines if p.get('status') == 'designed']
        if designed:
            pipeline_id = designed[0]['id']
        else:
            pipeline_id = pipelines[0]['id']
            # Re-set status to 'designed' for testing if needed
            print(f"Using pipeline {pipeline_id} with status {pipelines[0].get('status')}")

    print(f"2. Executing pipeline {pipeline_id}...")
    exec_resp = requests.post(f"{BASE_URL}/api/pipelines/{pipeline_id}/execute")
    try:
        print(f"Execution Result: {json.dumps(exec_resp.json(), indent=2)}")
    except Exception as e:
        print(f"JSON Error: {e}")
        print(f"Raw Response: {exec_resp.text}")
        return
    
    print("3. Checking status after execution...")
    resp = requests.get(f"{BASE_URL}/api/pipelines/{pipeline_id}")
    status = resp.json().get("pipeline", {}).get("status")
    print(f"Current Status: {status}")
    
    if status == "active":
        print("SUCCESS: Pipeline is now active!")
    else:
        print(f"FAILURE: Expected 'active', got '{status}'")

if __name__ == "__main__":
    try:
        test_deployment()
    except Exception as e:
        print(f"Error during test: {e}")
