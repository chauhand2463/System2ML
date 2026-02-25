from typing import List, Dict, Optional, Tuple
from ..validation.schemas import (
    DesignRequest, Constraints, ValidationResult,
    ModelFamily, PipelineCandidate, ConstraintViolation
)
from ..eligibility.matrix import EligibilityMatrix, MODEL_PROFILES
import uuid


class FeasibilityPolicy:
    """Maps constraints to feasibility rules and policies"""
    
    def __init__(self):
        self.eligibility_matrix = EligibilityMatrix()
    
    def generate_policy(self, request: DesignRequest) -> Dict:
        """Generate feasibility policy based on constraints"""
        eligible_families = self.eligibility_matrix.get_eligible_families(
            constraints=request.constraints,
            data_type=request.data_profile.type,
            task=request.task,
            deployment=request.deployment,
            objective=request.objective
        )
        
        return {
            "request_id": str(uuid.uuid4()),
            "eligible_model_families": [f.value for f in eligible_families],
            "hard_constraints": self._get_hard_constraints(request),
            "soft_constraints": self._get_soft_constraints(request),
            "required_monitors": self._get_required_monitors(request),
            "compliance_requirements": self._get_compliance_requirements(request),
        }
    
    def _get_hard_constraints(self, request: DesignRequest) -> List[str]:
        """Get hard constraints that cannot be violated"""
        hard = ["max_cost_usd", "max_carbon_kg"]
        
        if request.deployment == DeploymentType.REALTIME:
            hard.append("max_latency_ms")
        
        if request.constraints.compliance_level.value in ["regulated", "highly_regulated"]:
            hard.append("compliance_level")
        
        return hard
    
    def _get_soft_constraints(self, request: DesignRequest) -> List[str]:
        """Get soft constraints that can be relaxed"""
        return ["min_accuracy", "max_latency_ms"]
    
    def _get_required_monitors(self, request: DesignRequest) -> List[str]:
        """Get required monitoring based on constraints"""
        monitors = ["cost", "latency"]
        
        if request.constraints.max_carbon_kg < 1.0:
            monitors.append("carbon")
        
        if request.deployment == DeploymentType.REALTIME:
            monitors.append("throughput")
        
        if request.constraints.compliance_level.value in ["regulated", "highly_regulated"]:
            monitors.extend(["drift", "fairness"])
        
        return monitors
    
    def _get_compliance_requirements(self, request: DesignRequest) -> Dict:
        """Get compliance requirements"""
        reqs = {}
        
        if request.constraints.compliance_level.value == "highly_regulated":
            reqs["audit_logging"] = True
            reqs["model_documentation"] = True
            reqs["fairness_audit"] = True
            reqs["explainability"] = True
        elif request.constraints.compliance_level.value == "regulated":
            reqs["audit_logging"] = True
            reqs["model_documentation"] = True
        
        return reqs


from ..validation.schemas import DeploymentType


class HardConstraintFilter:
    """Filters out pipelines that violate hard constraints"""
    
    def __init__(self):
        self.eligibility_matrix = EligibilityMatrix()
    
    def filter_candidates(
        self,
        candidates: List[PipelineCandidate],
        constraints: Constraints
    ) -> Tuple[List[PipelineCandidate], List[PipelineCandidate]]:
        """Filter candidates into feasible and infeasible"""
        feasible = []
        infeasible = []
        
        for candidate in candidates:
            violations = self._check_hard_constraints(candidate, constraints)
            candidate.violates_constraints = violations
            
            if len(violations) == 0:
                feasible.append(candidate)
            else:
                infeasible.append(candidate)
        
        return feasible, infeasible
    
    def _check_hard_constraints(
        self,
        candidate: PipelineCandidate,
        constraints: Constraints
    ) -> List[ConstraintViolation]:
        """Check if candidate violates any hard constraints"""
        violations = []
        
        # Check cost
        if candidate.estimated_cost > constraints.max_cost_usd:
            violations.append(ConstraintViolation(
                constraint="max_cost_usd",
                value=candidate.estimated_cost,
                required=constraints.max_cost_usd,
                severity="hard",
                message=f"Estimated cost ${candidate.estimated_cost:.2f} exceeds limit ${constraints.max_cost_usd}"
            ))
        
        # Check carbon
        if candidate.estimated_carbon > constraints.max_carbon_kg:
            violations.append(ConstraintViolation(
                constraint="max_carbon_kg",
                value=candidate.estimated_carbon,
                required=constraints.max_carbon_kg,
                severity="hard",
                message=f"Estimated carbon {candidate.estimated_carbon:.4f}kg exceeds limit {constraints.max_carbon_kg}kg"
            ))
        
        # Check latency
        if candidate.estimated_latency_ms > constraints.max_latency_ms:
            violations.append(ConstraintViolation(
                constraint="max_latency_ms",
                value=candidate.estimated_latency_ms,
                required=constraints.max_latency_ms,
                severity="hard",
                message=f"Estimated latency {candidate.estimated_latency_ms}ms exceeds limit {constraints.max_latency_ms}ms"
            ))
        
        # Check accuracy
        if candidate.estimated_accuracy < constraints.min_accuracy:
            violations.append(ConstraintViolation(
                constraint="min_accuracy",
                value=candidate.estimated_accuracy,
                required=constraints.min_accuracy,
                severity="hard",
                message=f"Estimated accuracy {candidate.estimated_accuracy:.1%} below minimum {constraints.min_accuracy:.1%}"
            ))
        
        return violations
    
    def get_relaxation_suggestions(
        self,
        infeasible: List[PipelineCandidate],
        constraints: Constraints
    ) -> List[Dict]:
        """Generate suggestions to make constraints feasible"""
        suggestions = []
        
        if not infeasible:
            return suggestions
        
        # Find the worst violations
        worst_cost = max(c.estimated_cost for c in infeasible)
        worst_carbon = max(c.estimated_carbon for c in infeasible)
        worst_latency = max(c.estimated_latency_ms for c in infeasible)
        
        # Cost suggestion
        if worst_cost > constraints.max_cost_usd:
            suggestions.append({
                "constraint": "max_cost_usd",
                "current": constraints.max_cost_usd,
                "suggested": worst_cost * 1.2,
                "reason": f"Lowest feasible cost among candidates is ${worst_cost:.2f}"
            })
        
        # Carbon suggestion
        if worst_carbon > constraints.max_carbon_kg:
            suggestions.append({
                "constraint": "max_carbon_kg",
                "current": constraints.max_carbon_kg,
                "suggested": worst_carbon * 1.2,
                "reason": f"Lowest carbon footprint among candidates is {worst_carbon:.4f}kg"
            })
        
        # Latency suggestion
        if worst_latency > constraints.max_latency_ms:
            suggestions.append({
                "constraint": "max_latency_ms",
                "current": constraints.max_latency_ms,
                "suggested": int(worst_latency * 1.2),
                "reason": f"Lowest latency among candidates is {worst_latency}ms"
            })
        
        return suggestions


def generate_candidates(
    request: DesignRequest,
    max_candidates: int = 5
) -> List[PipelineCandidate]:
    """Generate diverse pipeline candidates"""
    eligibility = EligibilityMatrix()
    policy = FeasibilityPolicy()
    
    # Get eligible model families
    eligible_families = eligibility.get_eligible_families(
        constraints=request.constraints,
        data_type=request.data_profile.type,
        task=request.task,
        deployment=request.deployment,
        objective=request.objective
    )
    
    # If no families eligible, return empty
    if not eligible_families:
        return []
    
    # Generate candidates from different families
    candidates = []
    for family in eligible_families[:max_candidates]:
        profile = MODEL_PROFILES[family]
        
        # Get pipeline components
        components = eligibility.get_pipeline_components(
            family=family,
            data_type=request.data_profile.type,
            task=request.task
        )
        
        # Estimate resources
        estimates = eligibility.estimate_resources(
            family=family,
            data_size_mb=request.data_profile.size_mb or 100,
            num_samples=request.data_profile.num_samples or 10000
        )
        
        # Calculate accuracy range
        if request.objective.value == "accuracy":
            accuracy = profile.accuracy_range[1]
        elif request.objective.value == "cost":
            accuracy = profile.accuracy_range[0]
        else:
            accuracy = (profile.accuracy_range[0] + profile.accuracy_range[1]) / 2
        
        candidate = PipelineCandidate(
            id=str(uuid.uuid4()),
            name=f"{profile.name} Pipeline",
            description=profile.description,
            model_families=[family],
            estimated_cost=estimates["estimated_cost"],
            estimated_carbon=estimates["estimated_carbon"],
            estimated_latency_ms=estimates["estimated_latency_ms"],
            estimated_accuracy=accuracy,
            components=components,
            feasibility_score=0.8
        )
        
        candidates.append(candidate)
    
    # Apply hard constraint filter
    filter_engine = HardConstraintFilter()
    feasible, infeasible = filter_engine.filter_candidates(
        candidates, request.constraints
    )
    
    # Return only feasible candidates, or all if none feasible
    return feasible if feasible else candidates
