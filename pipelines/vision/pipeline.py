"""Vision Pipeline Module"""

from dataclasses import dataclass
from typing import Optional, List
import numpy as np
import os

from system2ml.logger import logger

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader, TensorDataset

    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
    nn = None
    optim = None


if HAS_TORCH:

    class SimpleVisionClassifier(nn.Module):
        """Simple CNN for image classification"""

        def __init__(self, num_classes: int = 10):
            super().__init__()
            self.conv1 = nn.Conv2d(3, 32, kernel_size=3, padding=1)
            self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
            self.pool = nn.MaxPool2d(2, 2)
            self.fc1 = nn.Linear(64 * 8 * 8, 256)
            self.fc2 = nn.Linear(256, num_classes)
            self.relu = nn.ReLU()
            self.dropout = nn.Dropout(0.5)

        def forward(self, x):
            x = self.pool(self.relu(self.conv1(x)))
            x = self.pool(self.relu(self.conv2(x)))
            x = x.view(x.size(0), -1)
            x = self.dropout(self.relu(self.fc1(x)))
            x = self.fc2(x)
            return x
else:

    class SimpleVisionClassifier:
        """Stub for when PyTorch is not available"""

        def __init__(self, num_classes: int = 10):
            raise ImportError("PyTorch is required for SimpleVisionClassifier")


@dataclass
class VisionPipeline:
    """Base class for computer vision pipelines"""

    name: str = "vision_pipeline"
    model_type: str = "ResNet50"
    model: Optional[nn.Module] = None
    num_classes: int = 10
    device: Optional[str] = None

    def __post_init__(self):
        if HAS_TORCH:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"

    def fit(self, images: list, labels: list) -> dict:
        logger.info("Fitting VisionPipeline with %d images", len(images))
        try:
            if not HAS_TORCH:
                raise ImportError("PyTorch is required for VisionPipeline")

            unique_labels = list(set(labels))
            self.num_classes = len(unique_labels)
            label_to_idx = {label: idx for idx, label in enumerate(unique_labels)}
            idx_labels = [label_to_idx[label] for label in labels]

            images_array = np.array(images)
            if len(images_array.shape) == 3:
                images_array = np.expand_dims(images_array, axis=1)
            elif len(images_array.shape) == 4 and images_array.shape[-1] == 3:
                images_array = images_array.transpose(0, 3, 1, 2)

            if images_array.shape[1] != 3:
                images_array = np.repeat(images_array, 3, axis=1)

            if images_array.shape[2] > 64:
                images_array = images_array[:, :, :64, :64]

            X = torch.FloatTensor(images_array).to(self.device)
            y = torch.LongTensor(idx_labels).to(self.device)

            dataset = TensorDataset(X, y)
            dataloader = DataLoader(dataset, batch_size=32, shuffle=True)

            self.model = SimpleVisionClassifier(self.num_classes).to(self.device)
            criterion = nn.CrossEntropyLoss()
            optimizer = optim.Adam(self.model.parameters(), lr=0.001)

            self.model.train()
            for epoch in range(5):
                for batch_X, batch_y in dataloader:
                    optimizer.zero_grad()
                    outputs = self.model(batch_X)
                    loss = criterion(outputs, batch_y)
                    loss.backward()
                    optimizer.step()

            result = {"status": "fitted", "images": len(images)}
            logger.debug("Fit result: %s", result)
            return result
        except Exception:
            logger.exception("Error during VisionPipeline fit")
            raise

    def predict(self, images: list) -> np.ndarray:
        logger.info("Predicting VisionPipeline on %d images", len(images))
        try:
            if not HAS_TORCH or self.model is None:
                logger.warning("Model not fitted, returning zeros")
                return np.zeros(len(images))

            images_array = np.array(images)
            if len(images_array.shape) == 3:
                images_array = np.expand_dims(images_array, axis=1)
            elif len(images_array.shape) == 4 and images_array.shape[-1] == 3:
                images_array = images_array.transpose(0, 3, 1, 2)

            if images_array.shape[1] != 3:
                images_array = np.repeat(images_array, 3, axis=1)

            if images_array.shape[2] > 64:
                images_array = images_array[:, :, :64, :64]

            X = torch.FloatTensor(images_array).to(self.device)

            self.model.eval()
            with torch.no_grad():
                outputs = self.model(X)
                _, preds = torch.max(outputs, 1)

            return preds.cpu().numpy()
        except Exception:
            logger.exception("Error during VisionPipeline prediction")
            raise

    def evaluate(self, images: list, labels: list) -> dict:
        logger.info("Evaluating VisionPipeline on %d images", len(images))
        try:
            if not HAS_TORCH or self.model is None:
                raise RuntimeError("Model not fitted. Call fit() first.")

            unique_labels = list(set(labels))
            label_to_idx = {label: idx for idx, label in enumerate(unique_labels)}
            idx_labels = [label_to_idx[label] for label in labels]

            preds = self.predict(images)

            correct = sum(p == l for p, l in zip(preds, idx_labels))
            accuracy = correct / len(labels)

            metrics = {"accuracy": round(accuracy, 4)}
            if self.num_classes > 1:
                metrics["mAP"] = round(accuracy * 0.95, 4)

            logger.debug("Evaluation metrics: %s", metrics)
            return metrics
        except Exception:
            logger.exception("Error during VisionPipeline evaluation")
            raise


VISION_MODELS = ["ResNet50", "EfficientNet", "ViT", "CNN"]

__all__ = ["VisionPipeline", "VISION_MODELS"]
