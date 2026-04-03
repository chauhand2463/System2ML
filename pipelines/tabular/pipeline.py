"""Tabular ML Pipeline Module"""

from dataclasses import dataclass
from typing import Optional
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import os

from system2ml.logger import logger


@dataclass
class TabularPipeline:
    """Base class for tabular ML pipelines"""

    name: str = "tabular_pipeline"
    model_type: str = "RandomForest"
    target_column: Optional[str] = None
    model: Optional[RandomForestClassifier] = None
    label_encoder: Optional[LabelEncoder] = None
    feature_columns: Optional[list] = None

    def fit(self, df: pd.DataFrame, target: str) -> dict:
        """Fit the pipeline and return metrics"""
        logger.info("Fitting TabularPipeline with %d rows", len(df))
        try:
            self.target_column = target

            feature_cols = [c for c in df.columns if c != target]
            self.feature_columns = feature_cols

            X = df[feature_cols].copy()
            y = df[target].copy()

            for col in X.select_dtypes(include=["object"]).columns:
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col].astype(str))

            X = X.fillna(0)

            if y.dtype == "object":
                self.label_encoder = LabelEncoder()
                y = self.label_encoder.fit_transform(y)

            test_size = float(os.environ.get("TEST_SIZE", "0.2"))
            random_seed = int(os.environ.get("RANDOM_SEED", "42"))

            X_train, _, y_train, _ = train_test_split(
                X, y, test_size=test_size, random_state=random_seed
            )

            self.model = RandomForestClassifier(
                n_estimators=100, random_state=random_seed, n_jobs=-1
            )
            self.model.fit(X_train, y_train)

            result = {"status": "fitted", "rows": len(df)}
            logger.debug("Fit result: %s", result)
            return result
        except Exception as e:
            logger.exception("Error during fit")
            raise

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        """Make predictions"""
        logger.info("Predicting with TabularPipeline on %d rows", len(df))
        try:
            if self.model is None:
                logger.warning("Model not fitted, returning zeros")
                return np.zeros(len(df))

            X = df.copy()

            if self.feature_columns:
                X = X[self.feature_columns]

            for col in X.select_dtypes(include=["object"]).columns:
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col].astype(str))

            X = X.fillna(0)

            preds = self.model.predict(X)

            if self.label_encoder:
                preds = self.label_encoder.inverse_transform(preds)

            logger.debug("Predictions shape: %s", preds.shape)
            return preds
        except Exception:
            logger.exception("Error during prediction")
            raise

    def evaluate(self, df: pd.DataFrame, target: str) -> dict:
        """Evaluate the pipeline"""
        logger.info("Evaluating TabularPipeline on %d rows", len(df))
        try:
            if self.model is None:
                raise RuntimeError("Model not fitted. Call fit() first.")

            X = df[[c for c in df.columns if c != target]].copy()
            y_true = df[target].copy()

            for col in X.select_dtypes(include=["object"]).columns:
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col].astype(str))

            X = X.fillna(0)

            preds = self.model.predict(X)

            if self.label_encoder:
                y_true = self.label_encoder.transform(y_true)

            accuracy = accuracy_score(y_true, preds)

            metrics = {"accuracy": round(accuracy, 4)}
            logger.debug("Evaluation metrics: %s", metrics)
            return metrics
        except Exception:
            logger.exception("Error during evaluation")
            raise


__all__ = ["TabularPipeline"]
