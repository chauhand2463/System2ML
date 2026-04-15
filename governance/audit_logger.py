from dataclasses import dataclass
from typing import Optional, Dict, Any, List
from datetime import datetime
import os
import json
import sqlite3


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
    _db_path: str = "./system2ml_audit.db"

    def __post_init__(self):
        os.makedirs(
            os.path.dirname(self.log_path) if os.path.dirname(self.log_path) else ".", exist_ok=True
        )
        self._init_db()

    def _init_db(self):
        """Initialize SQLite database for audit logging"""
        conn = sqlite3.connect(self._db_path)
        c = conn.cursor()
        c.execute("""CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            user TEXT,
            action TEXT NOT NULL,
            resource TEXT,
            result TEXT,
            details TEXT,
            ip_address TEXT,
            user_agent TEXT
        )""")
        conn.commit()
        conn.close()

    def log(
        self,
        user: str,
        action: str,
        resource: str,
        result: str,
        details: dict = None,
        ip_address: str = None,
        user_agent: str = None,
    ):
        """Log an audit event"""
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user": user,
            "action": action,
            "resource": resource,
            "result": result,
            "details": details or {},
            "ip_address": ip_address,
            "user_agent": user_agent,
        }

        conn = sqlite3.connect(self._db_path)
        c = conn.cursor()
        c.execute(
            """INSERT INTO audit_logs 
                     (timestamp, user, action, resource, result, details, ip_address, user_agent) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                entry["timestamp"],
                user,
                action,
                resource,
                result,
                json.dumps(details),
                ip_address,
                user_agent,
            ),
        )
        conn.commit()
        conn.close()

        with open(self.log_path, "a") as f:
            f.write(json.dumps(entry) + "\n")

    def get_logs(self, filter_criteria: dict = None) -> list:
        """Get audit logs with optional filtering"""
        conn = sqlite3.connect(self._db_path)
        c = conn.cursor()

        query = "SELECT timestamp, user, action, resource, result, details FROM audit_logs"
        params = []

        if filter_criteria:
            conditions = []
            if "user" in filter_criteria:
                conditions.append("user = ?")
                params.append(filter_criteria["user"])
            if "action" in filter_criteria:
                conditions.append("action = ?")
                params.append(filter_criteria["action"])
            if "resource" in filter_criteria:
                conditions.append("resource = ?")
                params.append(filter_criteria["resource"])
            if "result" in filter_criteria:
                conditions.append("result = ?")
                params.append(filter_criteria["result"])
            if "start_date" in filter_criteria:
                conditions.append("timestamp >= ?")
                params.append(filter_criteria["start_date"])
            if "end_date" in filter_criteria:
                conditions.append("timestamp <= ?")
                params.append(filter_criteria["end_date"])

            if conditions:
                query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY timestamp DESC"

        if filter_criteria and "limit" in filter_criteria:
            query += f" LIMIT {filter_criteria['limit']}"
        else:
            query += " LIMIT 100"

        c.execute(query, params)
        rows = c.fetchall()
        conn.close()

        return [
            {
                "timestamp": r[0],
                "user": r[1],
                "action": r[2],
                "resource": r[3],
                "result": r[4],
                "details": json.loads(r[5]) if r[5] else {},
            }
            for r in rows
        ]

    def get_user_activity(self, user: str) -> List[Dict]:
        """Get all activity for a specific user"""
        return self.get_logs({"user": user})

    def get_resource_history(self, resource: str) -> List[Dict]:
        """Get history for a specific resource"""
        return self.get_logs({"resource": resource})


__all__ = ["PolicyEngine", "AuditLogger"]
