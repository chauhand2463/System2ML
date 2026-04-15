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
        missing_ratio = float(np.isnan(data).sum() / data.size) if data.size > 0 else 1.0

        if data.size == 0:
            return {
                "missing_ratio": 1.0,
                "outlier_ratio": 0.0,
                "valid": False,
                "errors": ["Empty data array"],
            }

        mean_val = np.mean(data)
        std_val = np.std(data)
        if std_val == 0:
            std_val = 1.0

        outliers = np.abs(data - mean_val) > 3 * std_val
        outlier_ratio = float(outliers.sum() / data.size)

        errors = []
        warnings = []

        if missing_ratio > 0.1:
            errors.append(f"High missing ratio: {missing_ratio:.2%}")
        elif missing_ratio > 0.05:
            warnings.append(f"Moderate missing ratio: {missing_ratio:.2%}")

        if outlier_ratio > 0.1:
            errors.append(f"High outlier ratio: {outlier_ratio:.2%}")
        elif outlier_ratio > 0.05:
            warnings.append(f"Moderate outlier ratio: {outlier_ratio:.2%}")

        is_valid = len(errors) == 0

        return {
            "missing_ratio": missing_ratio,
            "outlier_ratio": outlier_ratio,
            "valid": is_valid,
            "errors": errors,
            "warnings": warnings,
            "mean": float(mean_val),
            "std": float(std_val),
            "min": float(np.min(data)),
            "max": float(np.max(data)),
        }


__all__ = ["DriftDetector"]
