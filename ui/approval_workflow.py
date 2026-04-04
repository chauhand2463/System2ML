"""
Approval Workflow State Machine for System2ML
Enterprise-grade pipeline approval with audit trail
"""

import sqlite3
import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from enum import Enum

logger = logging.getLogger(__name__)

DB_PATH = "system2ml.db"


class ApprovalStatus(Enum):
    """Approval workflow states"""

    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"
    EXPIRED = "expired"


class ApprovalAction(Enum):
    """Valid actions in the workflow"""

    SUBMIT = "submit"
    APPROVE = "approve"
    REJECT = "reject"
    REQUEST_CHANGES = "request_changes"
    RESUBMIT = "resubmit"
    WITHDRAW = "withdraw"


APPROVAL_TRANSITIONS = {
    ApprovalStatus.DRAFT: [ApprovalAction.SUBMIT, ApprovalAction.WITHDRAW],
    ApprovalStatus.PENDING_REVIEW: [
        ApprovalAction.APPROVE,
        ApprovalAction.REJECT,
        ApprovalAction.REQUEST_CHANGES,
    ],
    ApprovalStatus.APPROVED: [ApprovalAction.WITHDRAW],
    ApprovalStatus.REJECTED: [ApprovalAction.RESUBMIT],
    ApprovalStatus.CHANGES_REQUESTED: [ApprovalAction.RESUBMIT],
    ApprovalStatus.EXPIRED: [],
}


class ApprovalWorkflow:
    """
    State machine for pipeline approval workflows.
    Supports regulated industries (finance, healthcare) with full audit trail.
    """

    @staticmethod
    def init_table():
        """Initialize the approval_workflows table"""
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        c.execute("""
            CREATE TABLE IF NOT EXISTS approval_workflows (
                id TEXT PRIMARY KEY,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                version INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                submitted_by INTEGER,
                submitted_at TEXT,
                reviewed_by INTEGER,
                reviewed_at TEXT,
                reviewer_comment TEXT,
                approver_name TEXT,
                expires_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                metadata TEXT,
                UNIQUE(entity_type, entity_id, version)
            )
        """)

        c.execute("""
            CREATE TABLE IF NOT EXISTS approval_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workflow_id TEXT NOT NULL,
                action TEXT NOT NULL,
                actor_id INTEGER,
                actor_email TEXT,
                comment TEXT,
                previous_status TEXT,
                new_status TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id)
            )
        """)

        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_approval_entity 
            ON approval_workflows(entity_type, entity_id)
        """)

        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_approval_status 
            ON approval_workflows(status)
        """)

        conn.commit()
        conn.close()
        logger.info("Approval workflow tables initialized")

    @staticmethod
    def create_workflow(
        entity_type: str,
        entity_id: str,
        version: int,
        submitted_by: Optional[int] = None,
        metadata: Optional[Dict] = None,
    ) -> str:
        """
        Create a new approval workflow for an entity (pipeline, model, etc.)

        Args:
            entity_type: Type of entity ('pipeline', 'model', 'deployment')
            entity_id: ID of the entity
            version: Version number
            submitted_by: User ID submitting for approval

        Returns:
            Workflow ID
        """
        workflow_id = str(uuid.uuid4())[:12]
        now = datetime.utcnow().isoformat()

        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        try:
            c.execute(
                """
                INSERT INTO approval_workflows 
                (id, entity_type, entity_id, version, status, submitted_by, created_at, updated_at, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    workflow_id,
                    entity_type,
                    entity_id,
                    version,
                    ApprovalStatus.DRAFT.value,
                    submitted_by,
                    now,
                    now,
                    str(metadata) if metadata else None,
                ),
            )
            conn.commit()
            logger.info(f"Created approval workflow {workflow_id} for {entity_type}/{entity_id}")
            return workflow_id

        except sqlite3.IntegrityError:
            c.execute(
                """
                SELECT id FROM approval_workflows 
                WHERE entity_type = ? AND entity_id = ? AND version = ?
            """,
                (entity_type, entity_id, version),
            )
            row = c.fetchone()
            conn.close()
            if row:
                logger.info(f"Workflow already exists: {row[0]}")
                return row[0]
            raise
        finally:
            conn.close()

    @staticmethod
    def can_transition(current_status: ApprovalStatus, action: ApprovalAction) -> bool:
        """Check if a state transition is valid"""
        return action in APPROVAL_TRANSITIONS.get(current_status, [])

    @staticmethod
    def perform_action(
        workflow_id: str,
        action: ApprovalAction,
        actor_id: Optional[int] = None,
        actor_email: Optional[str] = None,
        comment: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Perform an action on the workflow, transitioning its state.

        Args:
            workflow_id: ID of the workflow
            action: The action to perform
            actor_id: User performing the action
            actor_email: Email of the user
            comment: Optional comment

        Returns:
            Dictionary with result and updated status
        """
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        c.execute("SELECT status FROM approval_workflows WHERE id = ?", (workflow_id,))
        row = c.fetchone()

        if not row:
            conn.close()
            return {"success": False, "error": "Workflow not found"}

        current_status = ApprovalStatus(row[0])

        if not ApprovalWorkflow.can_transition(current_status, action):
            conn.close()
            return {
                "success": False,
                "error": f"Cannot perform {action.value} from {current_status.value}",
                "current_status": current_status.value,
                "allowed_actions": [a.value for a in APPROVAL_TRANSITIONS.get(current_status, [])],
            }

        now = datetime.utcnow().isoformat()

        if action == ApprovalAction.SUBMIT:
            new_status = ApprovalStatus.PENDING_REVIEW
            expires_at = (datetime.utcnow() + timedelta(days=7)).isoformat()

            c.execute(
                """
                UPDATE approval_workflows 
                SET status = ?, submitted_by = ?, submitted_at = ?, expires_at = ?, updated_at = ?
                WHERE id = ?
            """,
                (new_status.value, actor_id, now, expires_at, now, workflow_id),
            )

        elif action == ApprovalAction.APPROVE:
            new_status = ApprovalStatus.APPROVED

            c.execute(
                """
                UPDATE approval_workflows 
                SET status = ?, reviewed_by = ?, reviewed_at = ?, reviewer_comment = ?, approver_name = ?, updated_at = ?
                WHERE id = ?
            """,
                (new_status.value, actor_id, now, comment, actor_email, now, workflow_id),
            )

        elif action == ApprovalAction.REJECT:
            new_status = ApprovalStatus.REJECTED

            c.execute(
                """
                UPDATE approval_workflows 
                SET status = ?, reviewed_by = ?, reviewed_at = ?, reviewer_comment = ?, updated_at = ?
                WHERE id = ?
            """,
                (new_status.value, actor_id, now, comment, now, workflow_id),
            )

        elif action == ApprovalAction.REQUEST_CHANGES:
            new_status = ApprovalStatus.CHANGES_REQUESTED

            c.execute(
                """
                UPDATE approval_workflows 
                SET status = ?, reviewed_by = ?, reviewed_at = ?, reviewer_comment = ?, updated_at = ?
                WHERE id = ?
            """,
                (new_status.value, actor_id, now, comment, now, workflow_id),
            )

        elif action == ApprovalAction.RESUBMIT:
            new_status = ApprovalStatus.PENDING_REVIEW
            expires_at = (datetime.utcnow() + timedelta(days=7)).isoformat()

            c.execute(
                """
                UPDATE approval_workflows 
                SET status = ?, submitted_by = ?, submitted_at = ?, expires_at = ?, updated_at = ?
                WHERE id = ?
            """,
                (new_status.value, actor_id, now, expires_at, now, workflow_id),
            )

        elif action == ApprovalAction.WITHDRAW:
            new_status = ApprovalStatus.DRAFT

            c.execute(
                """
                UPDATE approval_workflows 
                SET status = ?, submitted_by = NULL, submitted_at = NULL, updated_at = ?
                WHERE id = ?
            """,
                (now, workflow_id),
            )

        c.execute(
            """
            INSERT INTO approval_actions 
            (workflow_id, action, actor_id, actor_email, comment, previous_status, new_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                workflow_id,
                action.value,
                actor_id,
                actor_email,
                comment,
                current_status.value,
                new_status.value,
                now,
            ),
        )

        conn.commit()
        conn.close()

        logger.info(
            f"Workflow {workflow_id}: {current_status.value} -> {new_status.value} ({action.value})"
        )

        return {
            "success": True,
            "workflow_id": workflow_id,
            "previous_status": current_status.value,
            "new_status": new_status.value,
            "action": action.value,
            "timestamp": now,
        }

    @staticmethod
    def get_workflow(workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get workflow details"""
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        c.execute(
            """
            SELECT * FROM approval_workflows WHERE id = ?
        """,
            (workflow_id,),
        )

        row = c.fetchone()
        conn.close()

        if row:
            columns = [
                "id",
                "entity_type",
                "entity_id",
                "version",
                "status",
                "submitted_by",
                "submitted_at",
                "reviewed_by",
                "reviewed_at",
                "reviewer_comment",
                "approver_name",
                "expires_at",
                "created_at",
                "updated_at",
                "metadata",
            ]
            return dict(zip(columns, row))
        return None

    @staticmethod
    def get_workflows_for_entity(entity_type: str, entity_id: str) -> List[Dict[str, Any]]:
        """Get all workflows for an entity"""
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        c.execute(
            """
            SELECT * FROM approval_workflows 
            WHERE entity_type = ? AND entity_id = ?
            ORDER BY version DESC, created_at DESC
        """,
            (entity_type, entity_id),
        )

        rows = c.fetchall()
        conn.close()

        columns = [
            "id",
            "entity_type",
            "entity_id",
            "version",
            "status",
            "submitted_by",
            "submitted_at",
            "reviewed_by",
            "reviewed_at",
            "reviewer_comment",
            "approver_name",
            "expires_at",
            "created_at",
            "updated_at",
            "metadata",
        ]
        return [dict(zip(columns, row)) for row in rows]

    @staticmethod
    def get_pending_reviews(reviewer_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get all pending review workflows"""
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        if reviewer_id:
            c.execute("""
                SELECT * FROM approval_workflows 
                WHERE status = 'pending_review'
                ORDER BY submitted_at ASC
            """)
        else:
            c.execute("""
                SELECT * FROM approval_workflows 
                WHERE status = 'pending_review'
                ORDER BY submitted_at ASC
            """)

        rows = c.fetchall()
        conn.close()

        columns = [
            "id",
            "entity_type",
            "entity_id",
            "version",
            "status",
            "submitted_by",
            "submitted_at",
            "reviewed_by",
            "reviewed_at",
            "reviewer_comment",
            "approver_name",
            "expires_at",
            "created_at",
            "updated_at",
            "metadata",
        ]
        return [dict(zip(columns, row)) for row in rows]

    @staticmethod
    def get_audit_trail(workflow_id: str) -> List[Dict[str, Any]]:
        """Get full audit trail for a workflow"""
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        c.execute(
            """
            SELECT * FROM approval_actions 
            WHERE workflow_id = ?
            ORDER BY created_at ASC
        """,
            (workflow_id,),
        )

        rows = c.fetchall()
        conn.close()

        columns = [
            "id",
            "workflow_id",
            "action",
            "actor_id",
            "actor_email",
            "comment",
            "previous_status",
            "new_status",
            "created_at",
        ]
        return [dict(zip(columns, row)) for row in rows]

    @staticmethod
    def is_approved(entity_type: str, entity_id: str, version: int) -> bool:
        """Check if an entity version is approved"""
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        c.execute(
            """
            SELECT status FROM approval_workflows 
            WHERE entity_type = ? AND entity_id = ? AND version = ?
        """,
            (entity_type, entity_id, version),
        )

        row = c.fetchone()
        conn.close()

        return row and row[0] == ApprovalStatus.APPROVED.value


def init_approval_workflow():
    """Initialize the approval workflow system"""
    ApprovalWorkflow.init_table()
    print("[APPROVAL] Workflow state machine initialized")
