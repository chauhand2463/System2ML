import pytest
from lib.state_machine import (
    LifecycleState,
    ProjectState,
    InvalidTransitionError,
    VALID_TRANSITIONS,
    ValidationError,
    ConstraintViolation,
)


class TestLifecycleState:
    def test_state_values(self):
        assert LifecycleState.DATASET_UPLOADED.value == "DATASET_UPLOADED"
        assert LifecycleState.TRAINING_RUNNING.value == "TRAINING_RUNNING"
        assert LifecycleState.TRAINING_COMPLETED.value == "TRAINING_COMPLETED"


class TestProjectState:
    def test_create_project(self):
        project = ProjectState(id="test-123", name="Test Project")
        assert project.id == "test-123"
        assert project.name == "Test Project"
        assert project.current_state is None

    def test_valid_transition(self):
        project = ProjectState(id="test-123", name="Test Project")
        project.transition_to(LifecycleState.DATASET_UPLOADED)
        assert project.current_state == LifecycleState.DATASET_UPLOADED

    def test_invalid_transition_raises_error(self):
        project = ProjectState(id="test-123", name="Test Project")
        with pytest.raises(InvalidTransitionError):
            project.transition_to(LifecycleState.TRAINING_RUNNING)

    def test_cannot_transition_from_none_to_training(self):
        project = ProjectState(id="test-123", name="Test Project")
        assert not project.can_transition_to(LifecycleState.TRAINING_RUNNING)

    def test_full_valid_workflow(self):
        project = ProjectState(id="test-123", name="Test Project")

        # Start: None -> DATASET_UPLOADED
        project.transition_to(LifecycleState.DATASET_UPLOADED)

        # -> DATASET_PROFILED
        project.transition_to(LifecycleState.DATASET_PROFILED)

        # -> DATASET_VALIDATED
        project.transition_to(LifecycleState.DATASET_VALIDATED)

        # -> CONSTRAINTS_VALIDATED
        project.transition_to(LifecycleState.CONSTRAINTS_VALIDATED)

        # -> FEASIBILITY_APPROVED
        project.transition_to(LifecycleState.FEASIBILITY_APPROVED)

        # -> CANDIDATES_GENERATED
        project.transition_to(LifecycleState.CANDIDATES_GENERATED)

        # -> EXECUTION_APPROVED
        project.transition_to(LifecycleState.EXECUTION_APPROVED)

        # -> TRAINING_RUNNING
        project.transition_to(LifecycleState.TRAINING_RUNNING)

        # -> TRAINING_COMPLETED
        project.transition_to(LifecycleState.TRAINING_COMPLETED)

        assert project.current_state == LifecycleState.TRAINING_COMPLETED


class TestValidationError:
    def test_create_validation_error(self):
        error = ValidationError(
            code="TEST_ERROR", message="Test error message", action="fix_the_issue"
        )
        assert error.code == "TEST_ERROR"
        assert error.message == "Test error message"
        assert error.action == "fix_the_issue"


class TestConstraintViolation:
    def test_create_constraint_violation(self):
        violation = ConstraintViolation(
            metric="cost", estimated=15.0, limit=10.0, suggestion="reduce_model_size"
        )
        assert violation.metric == "cost"
        assert violation.estimated == 15.0
        assert violation.limit == 10.0
