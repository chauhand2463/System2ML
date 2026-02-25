from typing import List, Dict, Optional, Tuple
from ..validation.schemas import (
    DesignRequest, Constraints, PipelineCandidate, 
    ConstraintViolation, ExecutionRequest, ExecutionResult
)
from ..feasibility.engine import HardConstraintFilter
import uuid
from datetime import datetime


class ExecutionSafetyGate:
    """Validates pipeline before execution to prevent invalid runs"""
    
    def __init__(self):
        self.filter = HardConstraintFilter()
    
    def validate_for_execution(
        self,
        pipeline: PipelineCandidate,
        constraints: Constraints,
        force: bool = False
    ) -> Tuple[bool, List[ConstraintViolation], Dict]:
        """
        Validate pipeline can be executed safely
        Returns: (can_execute, violations, warnings)
        """
        violations = []
        warnings = []
        
        # Check hard constraints
        violations = self.filter._check_hard_constraints(pipeline, constraints)
        
        # Generate warnings for soft constraint violations
        if pipeline.estimated_accuracy < constraints.min_accuracy * 1.1:
            warnings.append({
                "type": "accuracy_warning",
                "message": f"Accuracy {pipeline.estimated_accuracy:.1%} is close to minimum {constraints.min_accuracy:.1%}"
            })
        
        if pipeline.estimated_cost > constraints.max_cost_usd * 0.8:
            warnings.append({
                "type": "cost_warning", 
                "message": f"Cost {pipeline.estimated_cost:.2f} is using {pipeline.estimated_cost/constraints.max_cost_usd:.0%} of budget"
            })
        
        can_execute = len(violations) == 0 or force
        
        return can_execute, violations, warnings
    
    def create_safety_report(
        self,
        pipeline: PipelineCandidate,
        constraints: Constraints
    ) -> Dict:
        """Create a comprehensive safety report"""
        can_execute, violations, warnings = self.validate_for_execution(
            pipeline, constraints
        )
        
        return {
            "pipeline_id": pipeline.id,
            "pipeline_name": pipeline.name,
            "can_execute": can_execute,
            "violations": [
                {
                    "constraint": v.constraint,
                    "value": v.value,
                    "required": v.required,
                    "severity": v.severity,
                    "message": v.message
                }
                for v in violations
            ],
            "warnings": warnings,
            "estimated_resources": {
                "cost": pipeline.estimated_cost,
                "carbon": pipeline.estimated_carbon,
                "latency_ms": pipeline.estimated_latency_ms,
                "accuracy": pipeline.estimated_accuracy
            },
            "constraints": {
                "max_cost_usd": constraints.max_cost_usd,
                "max_carbon_kg": constraints.max_carbon_kg,
                "max_latency_ms": constraints.max_latency_ms,
                "min_accuracy": constraints.min_accuracy,
                "compliance_level": constraints.compliance_level.value
            },
            "timestamp": datetime.utcnow().isoformat()
        }


class MonitoringAttacher:
    """Attaches required monitors to pipeline before execution"""
    
    def __init__(self):
        self.required_monitors = {
            "cost": self._attach_cost_monitor,
            "carbon": self._attach_carbon_monitor,
            "latency": self._attach_latency_monitor,
            "drift": self._attach_drift_monitor,
            "fairness": self._attach_fairness_monitor,
            "throughput": self._attach_throughput_monitor,
        }
    
    def attach_required_monitors(
        self,
        pipeline: PipelineCandidate,
        constraints: Constraints
    ) -> Dict:
        """Attach all required monitoring based on constraints"""
        attached = []
        
        # Always attach cost and latency
        attached.append(self._attach_cost_monitor(pipeline))
        attached.append(self._attach_latency_monitor(pipeline))
        
        # Carbon monitoring if low carbon constraint
        if constraints.max_carbon_kg < 1.0:
            attached.append(self._attach_carbon_monitor(pipeline))
        
        # Compliance-related monitors
        if constraints.compliance_level.value in ["regulated", "highly_regulated"]:
            attached.append(self._attach_drift_monitor(pipeline))
            
        if constraints.compliance_level.value == "highly_regulated":
            attached.append(self._attach_fairness_monitor(pipeline))
        
        # Realtime deployment needs throughput
        if constraints.max_latency_ms < 1000:
            attached.append(self._attach_throughput_monitor(pipeline))
        
        return {
            "pipeline_id": pipeline.id,
            "attached_monitors": attached,
            "count": len(attached)
        }
    
    def _attach_cost_monitor(self, pipeline: PipelineCandidate) -> Dict:
        return {
            "type": "cost",
            "name": "Cost Tracker",
            "config": {"threshold": pipeline.estimated_cost * 1.1}
        }
    
    def _attach_carbon_monitor(self, pipeline: PipelineCandidate) -> Dict:
        return {
            "type": "carbon",
            "name": "Carbon Emissions Tracker",
            "config": {"threshold": pipeline.estimated_carbon * 1.1}
        }
    
    def _attach_latency_monitor(self, pipeline: PipelineCandidate) -> Dict:
        return {
            "type": "latency",
            "name": "Latency Tracker",
            "config": {"threshold": pipeline.estimated_latency_ms * 1.1}
        }
    
    def _attach_drift_monitor(self, pipeline: PipelineCandidate) -> Dict:
        return {
            "type": "drift",
            "name": "Data Drift Detector",
            "config": {"threshold": 0.1, "method": "kl_divergence"}
        }
    
    def _attach_fairness_monitor(self, pipeline: PipelineCandidate) -> Dict:
        return {
            "type": "fairness",
            "name": "Fairness Monitor",
            "config": {"metrics": ["demographic_parity", "equalized_odds"]}
        }
    
    def _attach_throughput_monitor(self, pipeline: PipelineCandidate) -> Dict:
        return {
            "type": "throughput",
            "name": "Throughput Tracker",
            "config": {"min_rps": 10}
        }


def validate_execution(
    pipeline: PipelineCandidate,
    constraints: Constraints,
    force: bool = False
) -> Tuple[bool, Dict]:
    """Convenience function for execution validation"""
    gate = ExecutionSafetyGate()
    can_execute, violations, warnings = gate.validate_for_execution(
        pipeline, constraints, force
    )
    
    report = gate.create_safety_report(pipeline, constraints)
    
    return can_execute, report
