from typing import Any, Dict, Optional
from ..logger import logger


class OllamaBackend:
    def __init__(self):
        self.model = None

    def load_model(self, model_name: str, **kwargs):
        logger.info(f"Loading Ollama model: {model_name}")
        self.model_name = model_name

    def predict(self, text: str, **kwargs) -> Any:
        raise NotImplementedError("Prediction not implemented")

    def __call__(self, text: str, **kwargs) -> Any:
        return self.predict(text, **kwargs)
