import pytest
from unittest.mock import patch, MagicMock
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


class TestHealthEndpoint:
    def test_health_check_returns_healthy(self):
        from datetime import datetime
        from fastapi.testclient import TestClient

        with patch.dict(os.environ, {"DATABASE_URL": "sqlite:///:memory:"}):
            with patch("os.path.exists", return_value=False):
                from ui.api import app

                client = TestClient(app)

                response = client.get("/health")
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "healthy"
                assert "timestamp" in data


class TestRootEndpoint:
    def test_root_returns_version(self):
        with patch.dict(os.environ, {"DATABASE_URL": "sqlite:///:memory:"}):
            with patch("os.path.exists", return_value=False):
                from ui.api import app

                client = TestClient(app)

                response = client.get("/")
                assert response.status_code == 200
                data = response.json()
                assert "message" in data
                assert "version" in data


class TestPredefinedPipelines:
    def test_list_predefined_pipelines(self):
        with patch.dict(os.environ, {"DATABASE_URL": "sqlite:///:memory:"}):
            with patch("os.path.exists", return_value=False):
                from ui.api import app

                client = TestClient(app)

                response = client.get("/api/predefined-pipelines")
                assert response.status_code == 200
                data = response.json()
                assert "pipelines" in data
                assert len(data["pipelines"]) > 0


class TestEligibilityMatrix:
    def test_get_eligibility_matrix(self):
        with patch.dict(os.environ, {"DATABASE_URL": "sqlite:///:memory:"}):
            with patch("os.path.exists", return_value=False):
                from ui.api import app

                client = TestClient(app)

                response = client.get("/api/eligibility/matrix")
                assert response.status_code == 200
                data = response.json()
                assert "model_families" in data
                families = data["model_families"]

                family_names = [f["family"] for f in families]
                assert "classical" in family_names
                assert "transformer" in family_names


class TestFeasibilityEndpoints:
    def test_validate_constraints(self):
        with patch.dict(os.environ, {"DATABASE_URL": "sqlite:///:memory:"}):
            with patch("os.path.exists", return_value=False):
                from ui.api import app

                client = TestClient(app)

                payload = {
                    "project_id": "test-123",
                    "constraints": {
                        "max_cost_usd": 10.0,
                        "max_carbon_kg": 1.0,
                        "max_latency_ms": 200,
                        "compliance_level": "standard",
                    },
                    "deployment": "batch",
                }

                response = client.post("/api/validate", json=payload)
                assert response.status_code == 200
                data = response.json()
                assert "is_valid" in data
                assert "feasibility_score" in data

    def test_generate_candidates(self):
        with patch.dict(os.environ, {"DATABASE_URL": "sqlite:///:memory:"}):
            with patch("os.path.exists", return_value=False):
                from ui.api import app

                client = TestClient(app)

                payload = {
                    "project_id": "test-123",
                    "constraints": {
                        "max_cost_usd": 10.0,
                        "max_carbon_kg": 1.0,
                        "max_latency_ms": 200,
                    },
                }

                response = client.post("/api/feasibility/generate", json=payload)
                assert response.status_code == 200
                data = response.json()
                assert "candidates" in data
                assert "feasible_count" in data

    def test_feasibility_policy(self):
        with patch.dict(os.environ, {"DATABASE_URL": "sqlite:///:memory:"}):
            with patch("os.path.exists", return_value=False):
                from ui.api import app

                client = TestClient(app)

                payload = {
                    "constraints": {"compliance_level": "standard", "max_carbon_kg": 1.0},
                    "deployment": "batch",
                }

                response = client.post("/api/feasibility/policy", json=payload)
                assert response.status_code == 200
                data = response.json()
                assert "eligible_model_families" in data
                assert "hard_constraints" in data


class TestSafetyValidation:
    def test_validate_execution_allowed(self):
        with patch.dict(os.environ, {"DATABASE_URL": "sqlite:///:memory:"}):
            with patch("os.path.exists", return_value=False):
                from ui.api import app

                client = TestClient(app)

                payload = {
                    "project_id": "test-123",
                    "constraints": {
                        "max_cost_usd": 10.0,
                        "max_carbon_kg": 1.0,
                        "max_latency_ms": 200,
                    },
                    "pipeline": {
                        "estimated_cost": 5.0,
                        "estimated_carbon": 0.5,
                        "estimated_latency_ms": 100,
                    },
                }

                response = client.post("/api/safety/validate-execution", json=payload)
                assert response.status_code == 200
                data = response.json()
                assert "can_execute" in data
                assert "violations" in data

    def test_validate_execution_blocked(self):
        with patch.dict(os.environ, {"DATABASE_URL": "sqlite:///:memory:"}):
            with patch("os.path.exists", return_value=False):
                from ui.api import app

                client = TestClient(app)

                payload = {
                    "project_id": "test-123",
                    "constraints": {
                        "max_cost_usd": 10.0,
                        "max_carbon_kg": 1.0,
                        "max_latency_ms": 200,
                    },
                    "pipeline": {
                        "estimated_cost": 15.0,  # Exceeds limit
                        "estimated_carbon": 0.5,
                        "estimated_latency_ms": 100,
                    },
                }

                response = client.post("/api/safety/validate-execution", json=payload)
                assert response.status_code == 200
                data = response.json()
                assert len(data["violations"]) > 0
