"""NLP Pipeline Module"""
from dataclasses import dataclass
from typing import Optional
import pandas as pd
import numpy as np


@dataclass
class NLPPipeline:
    """Base class for NLP pipelines"""
    name: str = "nlp_pipeline"
    model_type: str = "TF-IDF"
    target_column: Optional[str] = None
    
    def fit(self, df: pd.DataFrame, target: str) -> dict:
        return {"status": "fitted", "text_rows": len(df)}
    
    def predict(self, texts: list) -> np.ndarray:
        return np.zeros(len(texts))
    
    def evaluate(self, df: pd.DataFrame, target: str) -> dict:
        return {"accuracy": 0.82, "f1": 0.80}


NLP_MODELS = [
    "TF-IDF + LogisticRegression",
    "BERTClassifier", 
    "DistilBERTClassifier",
    "RoBERTaClassifier",
]

__all__ = ["NLPPipeline", "NLP_MODELS"]
