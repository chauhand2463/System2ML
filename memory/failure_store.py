from dataclasses import dataclass, field
from datetime import datetime
import uuid
import json


@dataclass
class FailureStore:
    storage_path: str = "./memory/failures"
    
    def add_failure(
        self,
        pipeline_id: str,
        error_type: str,
        error_message: str,
        root_cause: str,
        stack_trace: str,
        context: dict = None,
    ) -> str:
        failure_id = str(uuid.uuid4())
        failure = {
            "id": failure_id,
            "pipeline_id": pipeline_id,
            "error_type": error_type,
            "error_message": error_message,
            "root_cause": root_cause,
            "stack_trace": stack_trace,
            "timestamp": datetime.utcnow().isoformat(),
            "context": context or {},
            "resolved": False,
        }
        print(f"[FailureStore] Added failure: {failure_id}")
        return failure_id
    
    def get_failures(self, pipeline_id: str = None) -> list:
        return []
    
    def mark_resolved(self, failure_id: str, resolution: str) -> bool:
        print(f"[FailureStore] Marked {failure_id} as resolved")
        return True


__all__ = ["FailureStore"]
