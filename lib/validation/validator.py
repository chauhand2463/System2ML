from .schemas import (
    DesignRequest, 
    Constraints, 
    ValidationResult, 
    ConstraintViolation,
    RelaxationSuggestion,
    ComplianceLevel,
    HardwareType,
    DataType,
    ObjectiveType,
    DeploymentType
)
from typing import List, Tuple


class ConstraintValidator:
    """Validates user input and detects contradictions"""
    
    MIN_CONSTRAINTS = {
        "max_cost_usd": 0.1,
        "max_carbon_kg": 0.001,
        "max_latency_ms": 10,
        "min_accuracy": 0.1,
    }
    
    MAX_CONSTRAINTS = {
        "max_cost_usd": 10000,
        "max_carbon_kg": 1000,
        "max_latency_ms": 60000,
        "min_accuracy": 0.99,
    }
    
    COMBINATION_RULES = {
        ("realtime", "high_accuracy"): {"min_cost": 5.0, "min_latency": 100},
        ("edge", "high_accuracy"): {"min_cost": 2.0, "min_latency": 50},
        ("batch", "low_cost"): {"max_cost": 1.0, "min_accuracy": 0.7},
    }
    
    def __init__(self):
        self.violations: List[ConstraintViolation] = []
        self.suggestions: List[RelaxationSuggestion] = []
    
    def validate(self, request: DesignRequest) -> ValidationResult:
        """Main validation entry point"""
        self.violations = []
        self.suggestions = []
        
        self._validate_constraints(request.constraints)
        self._validate_combinations(request)
        self._validate_data_task_compatibility(request)
        self._generate_suggestions(request)
        
        is_valid = len([v for v in self.violations if v.severity == "hard"]) == 0
        
        feasibility_score = self._calculate_feasibility_score(request)
        
        return ValidationResult(
            is_valid=is_valid,
            violations=self.violations,
            suggestions=self.suggestions,
            feasibility_score=feasibility_score
        )
    
    def _validate_constraints(self, constraints: Constraints):
        """Validate individual constraints"""
        # Check minimums
        for field, min_val in self.MIN_CONSTRAINTS.items():
            value = getattr(constraints, field, None)
            if value is not None and value < min_val:
                self.violations.append(ConstraintViolation(
                    constraint=field,
                    value=value,
                    required=min_val,
                    severity="hard",
                    message=f"{field} must be at least {min_val}"
                ))
        
        # Check maximums
        for field, max_val in self.MAX_CONSTRAINTS.items():
            value = getattr(constraints, field, None)
            if value is not None and value > max_val:
                self.violations.append(ConstraintViolation(
                    constraint=field,
                    value=value,
                    required=max_val,
                    severity="hard",
                    message=f"{field} cannot exceed {max_val}"
                ))
        
        # Carbon-cost relationship check
        if constraints.max_carbon_kg < 0.1 and constraints.max_cost_usd > 100:
            self.suggestions.append(RelaxationSuggestion(
                constraint="max_carbon_kg",
                current_value=constraints.max_carbon_kg,
                suggested_value=0.5,
                reason="Very low carbon with high budget may not be achievable",
                priority=2
            ))
        
        # Latency-cost relationship check
        if constraints.max_latency_ms < 50 and constraints.max_cost_usd < 5:
            self.violations.append(ConstraintViolation(
                constraint="max_latency_ms",
                value=constraints.max_latency_ms,
                required=50,
                severity="hard",
                message="Very low latency (<50ms) with low budget ($<5) is likely infeasible"
            ))
        
        # Compliance level checks
        min_accuracy = constraints.min_accuracy or 0.5
        if constraints.compliance_level == ComplianceLevel.HIGHLY_REGULATED:
            if min_accuracy < 0.95:
                self.violations.append(ConstraintViolation(
                    constraint="min_accuracy",
                    value=min_accuracy,
                    required=0.95,
                    severity="hard",
                    message="Highly regulated systems require min 95% accuracy"
                ))
    
    def _validate_combinations(self, request: DesignRequest):
        """Validate constraint combinations"""
        # Realtime deployment requires higher budget
        if request.deployment == DeploymentType.REALTIME:
            if request.constraints.max_cost_usd < 5:
                self.violations.append(ConstraintViolation(
                    constraint="max_cost_usd",
                    value=request.constraints.max_cost_usd,
                    required=5.0,
                    severity="hard",
                    message="Real-time deployment requires at least $5 budget"
                ))
            if request.constraints.max_latency_ms > 1000:
                self.violations.append(ConstraintViolation(
                    constraint="max_latency_ms",
                    value=request.constraints.max_latency_ms,
                    required=1000,
                    severity="soft",
                    message="Consider lower latency for real-time use case"
                ))
        
        # Edge deployment constraints
        if request.deployment == DeploymentType.EDGE:
            if request.constraints.max_cost_usd < 0.5:
                self.suggestions.append(RelaxationSuggestion(
                    constraint="max_cost_usd",
                    current_value=request.constraints.max_cost_usd,
                    suggested_value=1.0,
                    reason="Edge deployment may require slightly higher budget for optimized models",
                    priority=2
                ))
            
            if request.constraints.max_model_size_mb and request.constraints.max_model_size_mb > 100:
                self.violations.append(ConstraintViolation(
                    constraint="max_model_size_mb",
                    value=request.constraints.max_model_size_mb,
                    required=100,
                    severity="soft",
                    message="Consider smaller models for edge deployment"
                ))
        
        # High accuracy with low budget contradiction
        min_acc = request.constraints.min_accuracy or 0.5
        if request.objective == ObjectiveType.ACCURACY:
            if min_acc > 0.9 and request.constraints.max_cost_usd < 10:
                self.violations.append(ConstraintViolation(
                    constraint="min_accuracy",
                    value=min_acc,
                    required=0.9,
                    severity="hard",
                    message="High accuracy (90%+) with low budget (<$10) is likely infeasible"
                ))
    
    def _validate_data_task_compatibility(self, request: DesignRequest):
        """Validate data type and task combinations"""
        # Text data with image task
        if request.data_profile.type == DataType.TEXT and request.task:
            if request.task.value in ["object_detection", "segmentation"]:
                self.violations.append(ConstraintViolation(
                    constraint="data_profile",
                    value=request.data_profile.type.value,
                    required="image",
                    severity="hard",
                    message=f"Task {request.task.value} requires image data, not text"
                ))
        
        # Image data with NLP task
        if request.data_profile.type == DataType.IMAGE and request.task:
            if request.task.value in ["ner", "summarization", "translation"]:
                self.violations.append(ConstraintViolation(
                    constraint="data_profile",
                    value=request.data_profile.type.value,
                    required="text",
                    severity="hard",
                    message=f"Task {request.task.value} requires text data, not image"
                ))
    
    def _generate_suggestions(self, request: DesignRequest):
        """Generate relaxation suggestions"""
        # Cost too low for objective
        if request.objective == ObjectiveType.ACCURACY and request.constraints.max_cost_usd < 1:
            self.suggestions.append(RelaxationSuggestion(
                constraint="max_cost_usd",
                current_value=request.constraints.max_cost_usd,
                suggested_value=5.0,
                reason="Accuracy optimization typically requires more compute",
                priority=1
            ))
        
        # Carbon too low for any practical ML
        if request.constraints.max_carbon_kg < 0.01:
            self.suggestions.append(RelaxationSuggestion(
                constraint="max_carbon_kg",
                current_value=request.constraints.max_carbon_kg,
                suggested_value=0.1,
                reason="Very low carbon footprint may limit model options",
                priority=1
            ))
        
        # Latency impossible for large models
        if request.data_profile.type in [DataType.IMAGE, DataType.TEXT]:
            if request.constraints.max_latency_ms < 100:
                self.suggestions.append(RelaxationSuggestion(
                    constraint="max_latency_ms",
                    current_value=request.constraints.max_latency_ms,
                    suggested_value=500,
                    reason=f"{request.data_profile.type.value} processing typically requires more time",
                    priority=2
                ))
    
    def _calculate_feasibility_score(self, request: DesignRequest) -> float:
        """Calculate how feasible the request is (0-1)"""
        score = 1.0
        
        # Reduce score for violations
        score -= len([v for v in self.violations if v.severity == "hard"]) * 0.3
        score -= len([v for v in self.violations if v.severity == "soft"]) * 0.1
        
        # Reduce score for borderline values
        if request.constraints.max_cost_usd < 1:
            score -= 0.1
        if request.constraints.max_carbon_kg < 0.01:
            score -= 0.1
        if request.constraints.max_latency_ms < 50:
            score -= 0.1
        
        return max(0.0, min(1.0, score))


def validate_design_request(request: DesignRequest) -> ValidationResult:
    """Convenience function for validation"""
    validator = ConstraintValidator()
    return validator.validate(request)
