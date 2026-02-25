from dataclasses import dataclass
import numpy as np


@dataclass
class DriftDetector:
    threshold: float = 0.05
    
    def compute_drift(self, reference_data: np.ndarray, current_data: np.ndarray) -> dict:
        ref_mean = np.mean(reference_data)
        curr_mean = np.mean(current_data)
        drift_score = abs(curr_mean - ref_mean) / (ref_mean + 1e-8)
        
        return {
            "drift_detected": drift_score > self.threshold,
            "drift_score": float(drift_score),
            "reference_mean": float(ref_mean),
            "current_mean": float(curr_mean),
        }
    
    def check_data_quality(self, data: np.ndarray) -> dict:
        return {
            "missing_ratio": float(np.isnan(data).sum() / data.size),
            "outlier_ratio": float((np.abs(data - np.mean(data)) > 3 * np.std(data)).sum() / data.size),
            "valid": True,
        }


__all__ = ["DriftDetector"]
