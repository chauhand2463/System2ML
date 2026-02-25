from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class PolicyEngine:
    def check_policy(self, action: str, context: dict) -> bool:
        high_risk_actions = ["deploy_production", "delete_pipeline", "modify_policy"]
        if action in high_risk_actions:
            return context.get("approved", False)
        return True
    
    def require_approval(self, action: str) -> bool:
        return action in ["deploy_production", "modify_policy", "delete_pipeline"]


@dataclass
class AuditLogger:
    log_path: str = "./governance/audit.log"
    
    def log(self, user: str, action: str, resource: str, result: str, details: dict = None):
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user": user,
            "action": action,
            "resource": resource,
            "result": result,
            "details": details or {},
        }
        print(f"[Audit] {entry}")
    
    def get_logs(self, filter_criteria: dict = None) -> list:
        return []


__all__ = ["PolicyEngine", "AuditLogger"]
