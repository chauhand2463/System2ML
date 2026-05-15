"""AutoML Model Deployment Module"""

import os
import json
import logging
import joblib
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


@dataclass
class DeployedModel:
    """Deployed model information"""

    deployment_id: str
    model_id: str
    model_name: str
    endpoint: str
    status: str
    deployed_at: str
    api_key: str


class ModelDeployer:
    """Handles model deployment and serving"""

    def __init__(self, models_dir: str = "models"):
        self.models_dir = models_dir
        os.makedirs(models_dir, exist_ok=True)
        self.deployments: Dict[str, DeployedModel] = {}

    def save_model(
        self,
        model: Any,
        model_id: str,
        model_name: str,
        metadata: Dict[str, Any],
    ) -> str:
        """Save model to disk"""
        model_path = os.path.join(self.models_dir, f"{model_id}.joblib")

        model_data = {
            "model": model,
            "model_name": model_name,
            "model_id": model_id,
            "metadata": metadata,
            "created_at": datetime.utcnow().isoformat(),
        }

        joblib.dump(model_data, model_path)
        logger.info(f"Saved model to {model_path}")

        return model_path

    def load_model(self, model_id: str) -> Optional[Dict[str, Any]]:
        """Load model from disk"""
        model_path = os.path.join(self.models_dir, f"{model_id}.joblib")

        if not os.path.exists(model_path):
            logger.warning(f"Model not found: {model_id}")
            return None

        model_data = joblib.load(model_path)
        return model_data

    def deploy(
        self,
        model_id: str,
        model_name: str,
        deployment_type: str = "api",
    ) -> DeployedModel:
        """Deploy a model"""
        deployment_id = str(uuid.uuid4())[:12]
        endpoint = f"/api/deploy/{deployment_id}/predict"

        deployment = DeployedModel(
            deployment_id=deployment_id,
            model_id=model_id,
            model_name=model_name,
            endpoint=endpoint,
            status="deployed",
            deployed_at=datetime.utcnow().isoformat(),
            api_key=str(uuid.uuid4()),
        )

        self.deployments[deployment_id] = deployment

        deployment_info = {
            "deployment_id": deployment_id,
            "model_id": model_id,
            "model_name": model_name,
            "endpoint": endpoint,
            "status": "deployed",
            "deployed_at": deployment.deployed_at,
        }

        deployment_file = os.path.join(self.models_dir, f"deployment_{deployment_id}.json")
        with open(deployment_file, "w") as f:
            json.dump(deployment_info, f, indent=2)

        logger.info(f"Deployed model {model_name} with ID {deployment_id}")

        return deployment

    def undeploy(self, deployment_id: str) -> bool:
        """Undeploy a model"""
        if deployment_id in self.deployments:
            deployment = self.deployments[deployment_id]
            deployment.status = "undeployed"

            deployment_file = os.path.join(self.models_dir, f"deployment_{deployment_id}.json")
            if os.path.exists(deployment_file):
                with open(deployment_file, "w") as f:
                    json.dump({"status": "undeployed"}, f)

            logger.info(f"Undeployed model with deployment ID {deployment_id}")
            return True

        return False

    def predict(self, deployment_id: str, features: Dict[str, Any]) -> Dict[str, Any]:
        """Make prediction using deployed model"""
        deployment = self.deployments.get(deployment_id)

        if not deployment or deployment.status != "deployed":
            raise ValueError(f"Deployment {deployment_id} not found or not active")

        model_data = self.load_model(deployment.model_id)

        if not model_data:
            raise ValueError(f"Model {deployment.model_id} not found")

        model = model_data.get("model")

        if model is None:
            raise ValueError("Model object not found in saved data")

        import pandas as pd

        input_df = pd.DataFrame([features])

        prediction = model.predict(input_df)

        prediction_value = prediction[0] if hasattr(prediction, "__iter__") else prediction

        result = {
            "deployment_id": deployment_id,
            "prediction": str(prediction_value),
            "timestamp": datetime.utcnow().isoformat(),
        }

        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(input_df)
            result["probabilities"] = proba[0].tolist() if len(proba.shape) > 1 else [proba[0]]

        return result

    def get_deployment_status(self, deployment_id: str) -> Optional[Dict[str, Any]]:
        """Get deployment status"""
        deployment = self.deployments.get(deployment_id)

        if not deployment:
            deployment_file = os.path.join(self.models_dir, f"deployment_{deployment_id}.json")
            if os.path.exists(deployment_file):
                with open(deployment_file, "r") as f:
                    return json.load(f)
            return None

        return {
            "deployment_id": deployment.deployment_id,
            "model_id": deployment.model_id,
            "model_name": deployment.model_name,
            "endpoint": deployment.endpoint,
            "status": deployment.status,
            "deployed_at": deployment.deployed_at,
        }

    def list_deployments(self) -> List[Dict[str, Any]]:
        """List all deployments"""
        deployments = []

        for dep_id, deployment in self.deployments.items():
            deployments.append(
                {
                    "deployment_id": deployment.deployment_id,
                    "model_name": deployment.model_name,
                    "endpoint": deployment.endpoint,
                    "status": deployment.status,
                    "deployed_at": deployment.deployed_at,
                }
            )

        return deployments
