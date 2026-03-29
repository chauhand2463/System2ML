import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


@pytest.fixture
def mock_env(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    return monkeypatch


@pytest.fixture
def sample_constraints():
    return {
        "max_cost_usd": 10.0,
        "max_carbon_kg": 1.0,
        "max_latency_ms": 200,
        "compliance_level": "standard",
    }
