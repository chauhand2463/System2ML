import sqlite3
import json
import os
from datetime import datetime
from typing import Optional, Dict, Any
import logging
import requests

logger = logging.getLogger(__name__)

DB_PATH = "system2ml.db"


def get_db():
    return sqlite3.connect(DB_PATH)


class BudgetAlertService:
    @staticmethod
    def create_alert(
        project_id: str,
        threshold_percent: int = 80,
        alert_type: str = "cost",
        webhook_url: str = None,
        email: str = None,
    ) -> str:
        import uuid

        alert_id = str(uuid.uuid4())[:12]

        conn = get_db()
        c = conn.cursor()
        now = datetime.utcnow().isoformat()

        c.execute(
            """
            INSERT INTO budget_alerts 
            (id, project_id, threshold_percent, alert_type, webhook_url, email, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            (alert_id, project_id, threshold_percent, alert_type, webhook_url, email, now),
        )

        conn.commit()
        conn.close()
        return alert_id

    @staticmethod
    def get_alerts(project_id: str = None) -> list:
        conn = get_db()
        c = conn.cursor()

        if project_id:
            c.execute("SELECT * FROM budget_alerts WHERE project_id = ?", (project_id,))
        else:
            c.execute("SELECT * FROM budget_alerts")

        rows = c.fetchall()
        conn.close()

        columns = [col[0] for col in c.description]
        return [dict(zip(columns, row)) for row in rows]

    @staticmethod
    def check_and_notify(project_id: str, current_cost: float, max_budget: float):
        if max_budget <= 0:
            return

        percent_used = (current_cost / max_budget) * 100
        alerts = BudgetAlertService.get_alerts(project_id)

        for alert in alerts:
            if not alert.get("is_active"):
                continue

            threshold = alert.get("threshold_percent", 80)
            if percent_used >= threshold:
                BudgetAlertService._send_notification(
                    alert=alert,
                    project_id=project_id,
                    percent_used=percent_used,
                    current_cost=current_cost,
                    max_budget=max_budget,
                )

    @staticmethod
    def _send_notification(
        alert: Dict, project_id: str, percent_used: float, current_cost: float, max_budget: float
    ):
        now = datetime.utcnow().isoformat()

        conn = get_db()
        c = conn.cursor()
        c.execute("UPDATE budget_alerts SET last_triggered_at = ? WHERE id = ?", (now, alert["id"]))
        conn.commit()
        conn.close()

        webhook_url = alert.get("webhook_url")
        email = alert.get("email")

        message = {
            "type": "budget_alert",
            "project_id": project_id,
            "alert_type": alert.get("alert_type"),
            "threshold_percent": alert.get("threshold_percent"),
            "current_percent": round(percent_used, 2),
            "current_cost": round(current_cost, 2),
            "max_budget": max_budget,
            "message": f"Budget alert: {percent_used:.1f}% of budget consumed (${current_cost:.2f}/${max_budget:.2f})",
        }

        if webhook_url:
            try:
                requests.post(webhook_url, json=message, timeout=5)
                logger.info(f"Budget alert sent to webhook for project {project_id}")
            except Exception as e:
                logger.error(f"Failed to send webhook: {e}")

        if email:
            logger.info(f"Budget alert email would be sent to {email}: {message}")


class WorkspaceService:
    @staticmethod
    def create_workspace(name: str, owner_id: int, description: str = None) -> str:
        import uuid

        workspace_id = str(uuid.uuid4())[:12]

        conn = get_db()
        c = conn.cursor()
        now = datetime.utcnow().isoformat()

        c.execute(
            """
            INSERT INTO workspaces (id, name, owner_id, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (workspace_id, name, owner_id, description, now, now),
        )

        c.execute(
            """
            INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
            VALUES (?, ?, ?, ?)
        """,
            (workspace_id, owner_id, "admin", now),
        )

        conn.commit()
        conn.close()
        return workspace_id

    @staticmethod
    def get_workspace(workspace_id: str) -> Optional[Dict]:
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM workspaces WHERE id = ?", (workspace_id,))
        row = c.fetchone()
        conn.close()

        if row:
            columns = [col[0] for col in c.description]
            return dict(zip(columns, row))
        return None

    @staticmethod
    def add_member(workspace_id: str, user_id: int, role: str = "viewer") -> bool:
        conn = get_db()
        c = conn.cursor()
        now = datetime.utcnow().isoformat()

        try:
            c.execute(
                """
                INSERT OR REPLACE INTO workspace_members (workspace_id, user_id, role, joined_at)
                VALUES (?, ?, ?, ?)
            """,
                (workspace_id, user_id, role, now),
            )
            conn.commit()
            conn.close()
            return True
        except Exception:
            conn.close()
            return False

    @staticmethod
    def get_members(workspace_id: str) -> list:
        conn = get_db()
        c = conn.cursor()
        c.execute(
            """
            SELECT wm.*, u.name, u.email 
            FROM workspace_members wm
            JOIN users u ON wm.user_id = u.id
            WHERE wm.workspace_id = ?
        """,
            (workspace_id,),
        )
        rows = c.fetchall()
        conn.close()

        columns = [col[0] for col in c.description]
        return [dict(zip(columns, row)) for row in rows]


class ModelRegistryService:
    @staticmethod
    def register_model(
        name: str,
        version: str,
        pipeline_id: str = None,
        dataset_version_id: str = None,
        metrics: Dict = None,
        artifacts: Dict = None,
        owner_id: int = None,
    ) -> str:
        import uuid

        model_id = str(uuid.uuid4())[:12]

        conn = get_db()
        c = conn.cursor()
        now = datetime.utcnow().isoformat()

        c.execute(
            """
            INSERT INTO models 
            (id, name, version, pipeline_id, dataset_version_id, metrics, artifacts, owner_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                model_id,
                name,
                version,
                pipeline_id,
                dataset_version_id,
                json.dumps(metrics),
                json.dumps(artifacts),
                owner_id,
                now,
                now,
            ),
        )

        conn.commit()
        conn.close()
        return model_id

    @staticmethod
    def get_models(filters: Dict = None) -> list:
        conn = get_db()
        c = conn.cursor()

        query = "SELECT * FROM models"
        params = []

        if filters:
            conditions = []
            for key, value in filters.items():
                conditions.append(f"{key} = ?")
                params.append(value)

            if conditions:
                query += " WHERE " + " AND ".join(conditions)

        c.execute(query, params)
        rows = c.fetchall()
        conn.close()

        columns = [col[0] for col in c.description]
        models = []
        for row in rows:
            model = dict(zip(columns, row))
            for field in ["metrics", "artifacts"]:
                if model.get(field):
                    try:
                        model[field] = json.loads(model[field])
                    except (json.JSONDecodeError, TypeError):
                        pass
            models.append(model)

        return models

    @staticmethod
    def update_deployment_status(model_id: str, status: str) -> bool:
        conn = get_db()
        c = conn.cursor()
        now = datetime.utcnow().isoformat()

        c.execute(
            "UPDATE models SET deployment_status = ?, updated_at = ? WHERE id = ?",
            (status, now, model_id),
        )
        conn.commit()
        conn.close()
        return True


class CommentService:
    @staticmethod
    def add_comment(
        entity_type: str,
        entity_id: str,
        user_id: int,
        content: str,
        mentions: list = None,
        parent_comment_id: str = None,
    ) -> str:
        import uuid

        comment_id = str(uuid.uuid4())[:12]

        conn = get_db()
        c = conn.cursor()
        now = datetime.utcnow().isoformat()

        c.execute(
            """
            INSERT INTO comments 
            (id, entity_type, entity_id, user_id, content, mentions, parent_comment_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                comment_id,
                entity_type,
                entity_id,
                user_id,
                content,
                json.dumps(mentions),
                parent_comment_id,
                now,
                now,
            ),
        )

        conn.commit()
        conn.close()
        return comment_id

    @staticmethod
    def get_comments(entity_type: str, entity_id: str) -> list:
        conn = get_db()
        c = conn.cursor()

        c.execute(
            """
            SELECT c.*, u.name as user_name, u.avatar as user_avatar
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.entity_type = ? AND c.entity_id = ?
            ORDER BY c.created_at ASC
        """,
            (entity_type, entity_id),
        )

        rows = c.fetchall()
        conn.close()

        columns = [col[0] for col in c.description]
        comments = []
        for row in rows:
            comment = dict(zip(columns, row))
            if comment.get("mentions"):
                try:
                    comment["mentions"] = json.loads(comment["mentions"])
                except (json.JSONDecodeError, TypeError):
                    pass
            comments.append(comment)

        return comments


class DatasetVersionService:
    @staticmethod
    def create_version(
        dataset_id: str,
        name: str,
        data: bytes,
        metadata: Dict = None,
        parent_version_id: str = None,
        pipeline_id: str = None,
        created_by: int = None,
    ) -> str:
        import uuid

        version_id = str(uuid.uuid4())[:12]

        conn = get_db()
        c = conn.cursor()
        now = datetime.utcnow().isoformat()

        c.execute(
            "SELECT COALESCE(MAX(version), 0) + 1 FROM dataset_versions WHERE dataset_id = ?",
            (dataset_id,),
        )
        version_num = c.fetchone()[0]

        c.execute(
            """
            INSERT INTO dataset_versions 
            (id, dataset_id, version, name, data, metadata, parent_version_id, pipeline_id, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                version_id,
                dataset_id,
                version_num,
                name,
                data,
                json.dumps(metadata),
                parent_version_id,
                pipeline_id,
                created_by,
                now,
            ),
        )

        conn.commit()
        conn.close()
        return version_id

    @staticmethod
    def get_versions(dataset_id: str) -> list:
        conn = get_db()
        c = conn.cursor()

        c.execute(
            """
            SELECT dv.*, u.name as created_by_name
            FROM dataset_versions dv
            LEFT JOIN users u ON dv.created_by = u.id
            WHERE dv.dataset_id = ?
            ORDER BY dv.version DESC
        """,
            (dataset_id,),
        )

        rows = c.fetchall()
        conn.close()

        columns = [col[0] for col in c.description]
        versions = []
        for row in rows:
            version = dict(zip(columns, row))
            if version.get("metadata"):
                try:
                    version["metadata"] = json.loads(version["metadata"])
                except (json.JSONDecodeError, TypeError):
                    pass
            version["data"] = None
            versions.append(version)

        return versions

    @staticmethod
    def get_latest_version(dataset_id: str) -> Optional[Dict]:
        conn = get_db()
        c = conn.cursor()

        c.execute(
            """
            SELECT dv.*, u.name as created_by_name
            FROM dataset_versions dv
            LEFT JOIN users u ON dv.created_by = u.id
            WHERE dv.dataset_id = ?
            ORDER BY dv.version DESC
            LIMIT 1
        """,
            (dataset_id,),
        )

        row = c.fetchone()
        conn.close()

        if row:
            columns = [col[0] for col in c.description]
            version = dict(zip(columns, row))
            if version.get("metadata"):
                try:
                    version["metadata"] = json.loads(version["metadata"])
                except (json.JSONDecodeError, TypeError):
                    pass
            version["data"] = None
            return version
        return None
