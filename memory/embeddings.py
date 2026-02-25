import numpy as np
from dataclasses import dataclass


@dataclass
class Embeddings:
    embedding_dim: int = 128
    
    def encode_failure(self, error_text: str) -> np.ndarray:
        return np.random.randn(self.embedding_dim)
    
    def compute_similarity(self, emb1: np.ndarray, emb2: np.ndarray) -> float:
        return float(np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2) + 1e-8))
    
    def find_similar_failures(self, error_embedding: np.ndarray, failure_embeddings: list, top_k: int = 5) -> list:
        similarities = [self.compute_similarity(error_embedding, fe) for fe in failure_embeddings]
        indices = np.argsort(similarities)[-top_k:][::-1]
        return indices.tolist()


__all__ = ["Embeddings"]
