"""Simple test script for System2ML Fine-tuning"""

import requests
import time
import sys

API_URL = "http://localhost:8000"


def main():
    print("=" * 50)
    print("System2ML - Celery Fine-tuning Test")
    print("=" * 50)

    # Check API
    try:
        r = requests.get(API_URL, timeout=5)
        print(f"[OK] API running on {API_URL}")
    except:
        print(f"[ERROR] API not running on {API_URL}")
        print("Start with: python -m ui.api")
        sys.exit(1)

    # Check Redis
    import subprocess

    result = subprocess.run(
        ["docker", "exec", "redis", "redis-cli", "ping"], capture_output=True, text=True
    )
    if "PONG" in result.stdout:
        print("[OK] Redis running")
    else:
        print("[ERROR] Redis not running")
        print("Start with: docker start redis")
        sys.exit(1)

    # Start task
    print("\n[1] Starting fine-tuning task...")
    config = {
        "model_id": "microsoft/phi-2",
        "method": "qlora",
        "dataset_path": "test_data.csv",
    }

    r = requests.post(f"{API_URL}/api/finetuning/start-platform", json=config)
    if r.status_code != 200:
        print(f"[ERROR] {r.text}")
        return

    data = r.json()
    task_id = data.get("task_id")
    print(f"    Task ID: {task_id}")
    print(f"    Status: {data.get('status')}")

    # Poll for status
    print("\n[2] Checking status...")
    for i in range(10):
        time.sleep(2)
        r = requests.get(f"{API_URL}/api/finetuning/status/{task_id}")
        status = r.json()
        print(f"    {status.get('status')} - {status}")

        if status.get("status") in ["completed", "failed"]:
            break

    print("\n[OK] Done!")


if __name__ == "__main__":
    main()
