"""AutoML Data Preprocessing Module"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import json
import logging

logger = logging.getLogger(__name__)


@dataclass
class PreprocessingResult:
    """Result of data preprocessing"""

    data: pd.DataFrame
    feature_types: Dict[str, str]
    categorical_columns: List[str]
    numerical_columns: List[str]
    target_column: str
    task_type: str
    missing_values: Dict[str, int]
    scaler_type: str
    encoder_type: str
    feature_names: List[str]


class DataPreprocessor:
    """Handles data preprocessing for ML pipelines"""

    SUPPORTED_TASK_TYPES = ["classification", "regression", "clustering"]
    SUPPORTED_SCALERS = ["standard", "minmax", "robust", "none"]
    SUPPORTED_ENCODERS = ["label", "onehot", "none"]

    def __init__(self):
        self.scaler = None
        self.encoder = None
        self.feature_columns = []
        self.categorical_columns = []
        self.numerical_columns = []
        self.label_encoder = {}
        self.scaler_type = "standard"
        self.encoder_type = "label"

    def analyze_data(self, df: pd.DataFrame, target_column: Optional[str] = None) -> Dict[str, Any]:
        """Analyze dataset and return insights"""
        analysis = {
            "rows": len(df),
            "columns": len(df.columns),
            "memory_usage_mb": round(df.memory_usage(deep=True).sum() / 1024 / 1024, 2),
            "missing_values": {},
            "duplicates": int(df.duplicated().sum()),
            "feature_types": {},
            "numerical_stats": {},
            "categorical_stats": {},
        }

        for col in df.columns:
            missing = int(df[col].isnull().sum())
            if missing > 0:
                analysis["missing_values"][col] = missing

            if pd.api.types.is_numeric_dtype(df[col]):
                analysis["feature_types"][col] = "numerical"
                analysis["numerical_stats"][col] = {
                    "mean": round(float(df[col].mean()), 4) if not df[col].isnull().all() else None,
                    "std": round(float(df[col].std()), 4) if not df[col].isnull().all() else None,
                    "min": round(float(df[col].min()), 4) if not df[col].isnull().all() else None,
                    "max": round(float(df[col].max()), 4) if not df[col].isnull().all() else None,
                }
            else:
                analysis["feature_types"][col] = "categorical"
                unique_count = df[col].nunique()
                analysis["categorical_stats"][col] = {
                    "unique_count": unique_count,
                    "top_values": df[col].value_counts().head(5).to_dict(),
                }

        if target_column:
            analysis["target_column"] = target_column
            if pd.api.types.is_numeric_dtype(df[target_column]):
                unique_ratio = df[target_column].nunique() / max(len(df), 1)
                if unique_ratio < 0.05:
                    analysis["inferred_task"] = "classification"
                else:
                    analysis["inferred_task"] = "regression"
            else:
                analysis["inferred_task"] = "classification"

        return analysis

    def infer_task_type(self, df: pd.DataFrame, target_column: str) -> str:
        """Infer ML task type from target column"""
        if target_column not in df.columns:
            return "classification"

        target = df[target_column]

        if pd.api.types.is_numeric_dtype(target):
            unique_ratio = target.nunique() / max(len(target), 1)
            if unique_ratio < 0.1:
                return "classification"
            return "regression"
        else:
            return "classification"

    def handle_missing_values(self, df: pd.DataFrame, strategy: str = "auto") -> pd.DataFrame:
        """Handle missing values in the dataset"""
        df = df.copy()

        for col in df.columns:
            if df[col].isnull().sum() > 0:
                if pd.api.types.is_numeric_dtype(df[col]):
                    if strategy == "auto":
                        fill_value = df[col].median()
                    elif strategy == "mean":
                        fill_value = df[col].mean()
                    elif strategy == "median":
                        fill_value = df[col].median()
                    else:
                        fill_value = 0
                    df[col].fillna(fill_value, inplace=True)
                else:
                    df[col].fillna("Unknown", inplace=True)

        return df

    def encode_categorical(
        self, df: pd.DataFrame, columns: List[str], method: str = "label"
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Encode categorical columns"""
        df = df.copy()
        encoding_info = {}

        for col in columns:
            if col not in df.columns:
                continue

            if method == "label":
                unique_values = df[col].unique()
                label_map = {val: idx for idx, val in enumerate(unique_values)}
                df[col] = df[col].map(label_map)
                encoding_info[col] = {"method": "label", "labels": label_map}
            elif method == "onehot":
                dummies = pd.get_dummies(df[col], prefix=col, drop_first=True)
                df = pd.concat([df.drop(col, axis=1), dummies], axis=1)
                encoding_info[col] = {"method": "onehot", "columns": list(dummies.columns)}

        return df, encoding_info

    def scale_numerical(
        self, df: pd.DataFrame, columns: List[str], method: str = "standard"
    ) -> Tuple[pd.DataFrame, Any]:
        """Scale numerical columns"""
        from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler

        df = df.copy()
        scaler = None

        if method == "standard":
            scaler = StandardScaler()
        elif method == "minmax":
            scaler = MinMaxScaler()
        elif method == "robust":
            scaler = RobustScaler()
        else:
            return df, None

        df[columns] = scaler.fit_transform(df[columns])
        return df, scaler

    def preprocess(
        self,
        df: pd.DataFrame,
        target_column: str,
        task_type: str = "auto",
        scaler_type: str = "standard",
        encoder_type: str = "label",
        handle_missing: str = "auto",
    ) -> PreprocessingResult:
        """Full preprocessing pipeline"""
        logger.info(f"Preprocessing data with {len(df)} rows and {len(df.columns)} columns")

        df = df.copy()

        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found in dataset")

        if task_type == "auto":
            task_type = self.infer_task_type(df, target_column)

        df = self.handle_missing_values(df, handle_missing)

        self.numerical_columns = [
            col
            for col in df.columns
            if col != target_column and pd.api.types.is_numeric_dtype(df[col])
        ]
        self.categorical_columns = [
            col
            for col in df.columns
            if col != target_column and not pd.api.types.is_numeric_dtype(df[col])
        ]

        feature_types = {}
        for col in self.numerical_columns:
            feature_types[col] = "numerical"
        for col in self.categorical_columns:
            feature_types[col] = "categorical"

        encoding_info = {}
        if self.categorical_columns:
            df, encoding_info = self.encode_categorical(df, self.categorical_columns, encoder_type)

        scaled_df, scaler = self.scale_numerical(df, self.numerical_columns, scaler_type)

        if scaler is not None:
            self.scaler = scaler
        self.scaler_type = scaler_type
        self.encoder_type = encoder_type

        self.feature_columns = [col for col in df.columns if col != target_column]

        missing_values = {}
        for col in df.columns:
            missing_values[col] = int(df[col].isnull().sum())

        return PreprocessingResult(
            data=df,
            feature_types=feature_types,
            categorical_columns=self.categorical_columns,
            numerical_columns=self.numerical_columns,
            target_column=target_column,
            task_type=task_type,
            missing_values=missing_values,
            scaler_type=scaler_type,
            encoder_type=encoder_type,
            feature_names=self.feature_columns,
        )

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform new data using fitted preprocessor"""
        df = df.copy()

        if self.categorical_columns:
            for col in self.categorical_columns:
                if col in df.columns and col in self.label_encoder:
                    df[col] = df[col].map(self.label_encoder[col]).fillna(-1)

        if self.scaler is not None and self.numerical_columns:
            available_cols = [c for c in self.numerical_columns if c in df.columns]
            if available_cols:
                df[available_cols] = self.scaler.transform(df[available_cols])

        return df
