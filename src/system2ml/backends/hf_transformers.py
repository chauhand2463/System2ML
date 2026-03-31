from typing import Any, Dict, Optional
from ..logger import logger


class HFTransformersBackend:
    def __init__(self):
        self.model = None
        self.tokenizer = None

    def load_model(self, model_name: str, **kwargs):
        logger.info(f"Loading HuggingFace model: {model_name}")
        self.model_name = model_name

    def predict(self, text: str, **kwargs) -> Any:
        raise NotImplementedError("Prediction not implemented")

    def __call__(self, text: str, **kwargs) -> Any:
        return self.predict(text, **kwargs)
