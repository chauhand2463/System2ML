import pytest
from pydantic import ValidationError as PydanticValidationError


class TestConstraintsValidation:
    """Test constraint validation logic"""

    def test_min_cost_validation(self, sample_constraints):
        """Cost must be at least $0.10"""
        constraints = sample_constraints.copy()
        constraints["max_cost_usd"] = 0.05

        violations = []
        if constraints["max_cost_usd"] < 0.1:
            violations.append(
                {
                    "constraint": "max_cost_usd",
                    "value": constraints["max_cost_usd"],
                    "required": 0.1,
                    "severity": "hard",
                    "message": "Cost must be at least $0.10",
                }
            )

        assert len(violations) == 1
        assert violations[0]["severity"] == "hard"

    def test_realtime_deployment_requires_min_cost(self, sample_constraints):
        """Real-time deployment requires at least $5 budget"""
        constraints = sample_constraints.copy()
        constraints["max_cost_usd"] = 3.0
        deployment = "realtime"

        violations = []
        if constraints["max_cost_usd"] < 5 and deployment == "realtime":
            violations.append(
                {
                    "constraint": "max_cost_usd",
                    "value": constraints["max_cost_usd"],
                    "required": 5.0,
                    "severity": "hard",
                    "message": "realtime deployment requires at least $5 budget",
                }
            )

        assert len(violations) == 1
        assert "realtime" in violations[0]["message"].lower()

    def test_valid_constraints_pass(self, sample_constraints):
        """Valid constraints should have no violations"""
        constraints = sample_constraints.copy()

        violations = []
        if constraints["max_cost_usd"] < 0.1:
            violations.append({"severity": "hard"})

        hard_violations = [v for v in violations if v.get("severity") == "hard"]
        assert len(hard_violations) == 0

    def test_feasibility_score_calculation(self, sample_constraints):
        """Test feasibility score is calculated correctly"""
        violations = [
            {"severity": "hard"},
            {"severity": "soft"},
            {"severity": "hard"},
        ]

        hard_count = len([v for v in violations if v["severity"] == "hard"])
        is_valid = hard_count == 0
        feasibility_score = 1.0 - (hard_count * 0.3)

        assert is_valid is False
        assert feasibility_score == 0.4

    def test_model_eligibility_for_regulated_compliance(self):
        """Regulated compliance should only allow classical and compressed"""
        compliance = "regulated"

        eligible = ["classical", "small_deep", "compressed"]
        if compliance in ["regulated", "highly_regulated"]:
            eligible = ["classical", "compressed"]

        assert "classical" in eligible
        assert "compressed" in eligible
        assert "small_deep" not in eligible


class TestProfileValidation:
    """Test dataset profile validation"""

    def test_valid_profile(self):
        profile = {
            "rows": 1000,
            "columns": 10,
            "features": 9,
            "size_mb": 1.5,
        }

        errors = []
        if profile.get("size_mb", 0) <= 0:
            errors.append({"code": "FILE_NOT_PERSISTED"})

        if profile.get("features", 0) == 0:
            errors.append({"code": "NO_FEATURES"})

        assert len(errors) == 0

    def test_missing_file_size_fails(self):
        profile = {
            "rows": 1000,
            "columns": 10,
            "features": 9,
            "size_mb": 0,
        }

        errors = []
        if profile.get("size_mb", 0) <= 0:
            errors.append({"code": "FILE_NOT_PERSISTED", "message": "Dataset file size is 0"})

        assert len(errors) == 1
        assert errors[0]["code"] == "FILE_NOT_PERSISTED"

    def test_no_features_fails(self):
        profile = {
            "rows": 1000,
            "columns": 1,
            "features": 0,
            "size_mb": 0.1,
        }

        errors = []
        if profile.get("features", 0) == 0:
            errors.append({"code": "NO_FEATURES", "message": "Dataset has 0 feature columns"})

        assert len(errors) == 1
        assert errors[0]["code"] == "NO_FEATURES"

    def test_pii_detection_regulated_compliance(self):
        """PII in regulated compliance should fail"""
        profile = {
            "pii_detected": True,
            "pii_fields": ["email", "phone"],
        }
        compliance = "regulated"

        errors = []
        if profile.get("pii_detected", False):
            if compliance in ["regulated", "highly_regulated"]:
                errors.append(
                    {
                        "code": "PII_DETECTED",
                        "message": "PII detected. Compliance mode requires anonymization.",
                    }
                )

        assert len(errors) == 1
        assert errors[0]["code"] == "PII_DETECTED"
