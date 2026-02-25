from typing import List, Dict, Optional, Tuple
from enum import Enum
from .schemas import (
    ModelFamily, DataType, TaskType, ObjectiveType, 
    DeploymentType, HardwareType, ComplianceLevel, Constraints
)


class ModelProfile:
    """Profile for a model family with resource estimates"""
    
    def __init__(
        self,
        family: ModelFamily,
        name: str,
        cost_per_run: float,
        carbon_per_run: float,
        latency_ms: int,
        accuracy_range: Tuple[float, float],
        min_cost: float,
        max_cost: float,
        min_accuracy: float,
        max_latency: int,
        supported_data_types: List[DataType],
        supported_tasks: List[TaskType],
        requires_gpu: bool = False,
        model_size_mb: int = 100,
        description: str = ""
    ):
        self.family = family
        self.name = name
        self.cost_per_run = cost_per_run
        self.carbon_per_run = carbon_per_run
        self.latency_ms = latency_ms
        self.accuracy_range = accuracy_range
        self.min_cost = min_cost
        self.max_cost = max_cost
        self.min_accuracy = min_accuracy
        self.max_latency = max_latency
        self.supported_data_types = supported_data_types
        self.supported_tasks = supported_tasks
        self.requires_gpu = requires_gpu
        self.model_size_mb = model_size_mb
        self.description = description


MODEL_PROFILES: Dict[ModelFamily, ModelProfile] = {
    ModelFamily.CLASSICAL: ModelProfile(
        family=ModelFamily.CLASSICAL,
        name="Classical ML",
        cost_per_run=0.1,
        carbon_per_run=0.01,
        latency_ms=100,
        accuracy_range=(0.6, 0.85),
        min_cost=0.1,
        max_cost=2.0,
        min_accuracy=0.6,
        max_latency=5000,
        supported_data_types=[DataType.TABULAR, DataType.TIME_SERIES],
        supported_tasks=[TaskType.CLASSIFICATION, TaskType.REGRESSION, TaskType.CLUSTERING, TaskType.FORECASTING],
        requires_gpu=False,
        model_size_mb=10,
        description="Traditional ML models like Random Forest, XGBoost, SVM"
    ),
    
    ModelFamily.SMALL_DEEP: ModelProfile(
        family=ModelFamily.SMALL_DEEP,
        name="Small Deep Learning",
        cost_per_run=1.0,
        carbon_per_run=0.1,
        latency_ms=500,
        accuracy_range=(0.75, 0.92),
        min_cost=0.5,
        max_cost=10.0,
        min_accuracy=0.75,
        max_latency=10000,
        supported_data_types=[DataType.TABULAR, DataType.TEXT, DataType.IMAGE, DataType.TIME_SERIES],
        supported_tasks=[TaskType.CLASSIFICATION, TaskType.REGRESSION, TaskType.NER, TaskType.OBJECT_DETECTION],
        requires_gpu=True,
        model_size_mb=50,
        description="Lightweight neural networks optimized for efficiency"
    ),
    
    ModelFamily.COMPRESSED: ModelProfile(
        family=ModelFamily.COMPRESSED,
        name="Compressed/Quantized",
        cost_per_run=0.3,
        carbon_per_run=0.03,
        latency_ms=200,
        accuracy_range=(0.7, 0.88),
        min_cost=0.2,
        max_cost=3.0,
        min_accuracy=0.7,
        max_latency=2000,
        supported_data_types=[DataType.TABULAR, DataType.TEXT, DataType.IMAGE],
        supported_tasks=[TaskType.CLASSIFICATION, TaskType.REGRESSION, TaskType.NER],
        requires_gpu=False,
        model_size_mb=20,
        description="Quantized and pruned models for efficient inference"
    ),
    
    ModelFamily.TRANSFORMER: ModelProfile(
        family=ModelFamily.TRANSFORMER,
        name="Transformer Models",
        cost_per_run=5.0,
        carbon_per_run=0.5,
        latency_ms=2000,
        accuracy_range=(0.85, 0.98),
        min_cost=3.0,
        max_cost=50.0,
        min_accuracy=0.85,
        max_latency=30000,
        supported_data_types=[DataType.TEXT, DataType.IMAGE],
        supported_tasks=[TaskType.CLASSIFICATION, TaskType.NER, TaskType.SUMMARIZATION, TaskType.TRANSLATION, TaskType.OBJECT_DETECTION],
        requires_gpu=True,
        model_size_mb=500,
        description="BERT, GPT, ViT and other transformer architectures"
    ),
    
    ModelFamily.LEGACY: ModelProfile(
        family=ModelFamily.LEGACY,
        name="Legacy/Ensemble",
        cost_per_run=2.0,
        carbon_per_run=0.2,
        latency_ms=800,
        accuracy_range=(0.78, 0.90),
        min_cost=1.0,
        max_cost=15.0,
        min_accuracy=0.78,
        max_latency=15000,
        supported_data_types=[DataType.TABULAR, DataType.TEXT, DataType.TIME_SERIES],
        supported_tasks=[TaskType.CLASSIFICATION, TaskType.REGRESSION, TaskType.FORECASTING],
        requires_gpu=False,
        model_size_mb=100,
        description="Traditional deep learning and ensemble methods"
    ),
}


class EligibilityMatrix:
    """Determines which model families are eligible given constraints"""
    
    def __init__(self):
        self.profiles = MODEL_PROFILES
    
    def get_eligible_families(
        self,
        constraints: Constraints,
        data_type: DataType,
        task: Optional[TaskType] = None,
        deployment: DeploymentType = DeploymentType.BATCH,
        objective: ObjectiveType = ObjectiveType.ACCURACY
    ) -> List[ModelFamily]:
        """Get all model families that can satisfy the constraints"""
        eligible = []
        
        for family, profile in self.profiles.items():
            if self._is_eligible(profile, constraints, data_type, task, deployment, objective):
                eligible.append(family)
        
        return eligible
    
    def _is_eligible(
        self,
        profile: ModelProfile,
        constraints: Constraints,
        data_type: DataType,
        task: Optional[TaskType],
        deployment: DeploymentType,
        objective: ObjectiveType
    ) -> bool:
        """Check if a model profile is eligible"""
        # Check data type support
        if data_type not in profile.supported_data_types:
            return False
        
        # Check task support
        if task and task not in profile.supported_tasks:
            return False
        
        # Check cost constraint
        if profile.min_cost > constraints.max_cost_usd:
            return False
        
        # Check carbon constraint
        if profile.carbon_per_run > constraints.max_carbon_kg:
            return False
        
        # Check latency constraint
        if profile.latency_ms > constraints.max_latency_ms:
            return False
        
        # Check accuracy requirement
        if profile.accuracy_range[0] < constraints.min_accuracy:
            if profile.accuracy_range[1] < constraints.min_accuracy:
                return False
        
        # Check hardware requirement
        if profile.requires_gpu and constraints.hardware == HardwareType.CPU:
            # Some models can run on CPU but will be slower
            if profile.latency_ms > constraints.max_latency_ms * 2:
                return False
        
        # Check model size for edge deployment
        if deployment == DeploymentType.EDGE:
            if profile.model_size_mb > (constraints.max_model_size_mb or 100):
                return False
        
        # Check compliance level
        if constraints.compliance_level == ComplianceLevel.HIGHLY_REGULATED:
            # Only classical and compressed models for highly regulated
            if profile.family not in [ModelFamily.CLASSICAL, ModelFamily.COMPRESSED]:
                return False
        
        return True
    
    def get_pipeline_components(
        self,
        family: ModelFamily,
        data_type: DataType,
        task: Optional[TaskType] = None
    ) -> List[Dict]:
        """Get pipeline components for a model family"""
        components = []
        
        # Source component
        if data_type == DataType.TABULAR:
            components.append({"type": "source", "name": "CSV Reader", "tool": "pandas"})
        elif data_type == DataType.TEXT:
            components.append({"type": "source", "name": "Text Loader", "tool": "huggingface"})
        elif data_type == DataType.IMAGE:
            components.append({"type": "source", "name": "Image Loader", "tool": "PIL"})
        
        # Preprocessing
        if data_type == DataType.TABULAR:
            components.append({"type": "transform", "name": "Preprocessor", "tool": "sklearn"})
        elif data_type == DataType.TEXT:
            components.append({"type": "transform", "name": "Tokenizer", "tool": "huggingface"})
            components.append({"type": "transform", "name": "Feature Extractor", "tool": "huggingface"})
        
        # Model
        model_info = self.profiles[family]
        components.append({
            "type": "model",
            "name": model_info.name,
            "family": family.value,
            "description": model_info.description
        })
        
        # Sink
        components.append({"type": "sink", "name": "Results Output", "tool": "pandas"})
        
        return components
    
    def estimate_resources(
        self,
        family: ModelFamily,
        data_size_mb: int = 100,
        num_samples: int = 10000
    ) -> Dict[str, float]:
        """Estimate resources based on model family and data size"""
        profile = self.profiles[family]
        
        # Adjust based on data size
        size_factor = max(1.0, data_size_mb / 100)
        sample_factor = max(1.0, num_samples / 10000)
        
        return {
            "estimated_cost": round(profile.cost_per_run * size_factor, 2),
            "estimated_carbon": round(profile.carbon_per_run * size_factor, 4),
            "estimated_latency_ms": int(profile.latency_ms * sample_factor),
            "model_size_mb": profile.model_size_mb,
        }


def get_eligible_models(
    constraints: Constraints,
    data_type: DataType,
    task: Optional[TaskType] = None,
    deployment: DeploymentType = DeploymentType.BATCH,
    objective: ObjectiveType = ObjectiveType.ACCURACY
) -> List[ModelFamily]:
    """Convenience function"""
    matrix = EligibilityMatrix()
    return matrix.get_eligible_families(constraints, data_type, task, deployment, objective)
