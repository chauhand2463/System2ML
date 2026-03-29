import sys
import os
from fastapi.testclient import TestClient

# Ensure the project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ui.api import app, create_project, profile_dataset, DatasetProfileRequest

client = TestClient(app)


def test_root_endpoint_returns_message_and_version():
    response = client.get('/')
    assert response.status_code == 200
    data = response.json()
    assert 'message' in data
    assert 'version' in data
    assert data['message'] == 'System2ML API'
    assert isinstance(data['version'], str)


def test_health_endpoint_includes_dependencies():
    response = client.get('/health')
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'healthy'
    # Expect the dependencies dict to contain keys for database, groq_api, rate_limiting
    deps = data.get('dependencies', {})
    assert isinstance(deps, dict)
    for key in ['database', 'groq_api', 'rate_limiting']:
        assert key in deps


def test_ai_suggestions_returns_list():
    # Create a project first
    proj = create_project('Test Suggestion Project')
    project_id = proj['project_id']

    response = client.get(f'/api/ai/suggest/{project_id}')
    assert response.status_code == 200
    data = response.json()
    assert 'suggestions' in data
    assert isinstance(data['suggestions'], list)
    # Each suggestion should contain field, value, reason keys
    if data['suggestions']:
        sug = data['suggestions'][0]
        for k in ['field', 'value', 'reason']:
            assert k in sug


def test_predefined_pipelines_structure():
    response = client.get('/api/predefined-pipelines')
    assert response.status_code == 200
    data = response.json()
    assert 'pipelines' in data
    assert isinstance(data['pipelines'], list)
    # Verify at least one known pipeline name is present
    names = [p['name'] for p in data['pipelines']]
    assert any('titanic' in n.lower() for n in names)


def test_eligibility_matrix_contains_model_families():
    response = client.get('/api/eligibility/matrix')
    assert response.status_code == 200
    data = response.json()
    assert 'model_families' in data
    families = data['model_families']
    assert isinstance(families, list)
    # Check for required keys in each family entry
    required_keys = {'family', 'name', 'description', 'cost_range', 'carbon_per_run', 'latency_ms', 'accuracy_range', 'requires_gpu'}
    for fam in families:
        assert required_keys.issubset(fam.keys())
