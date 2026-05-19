"""
Vibe Analyzer - Analyzes the "vibe" or characteristics of datasets.
Determines data patterns, distribution characteristics, and optimal ML approaches.
"""

import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Literal, Any
from enum import Enum
import json
from datetime import datetime


class VibeCategory(Enum):
    """Categories of data vibes"""

    CLEAN = "clean"
    MESSY = "messy"
    SPARSE = "sparse"
    DENSE = "dense"
    IMBALANCED = "imbalanced"
    BALANCED = "balanced"
    TIME_SERIES = "time_series"
    TEXT_HEAVY = "text_heavy"
    NUMERIC_HEAVY = "numeric_heavy"
    CATEGORICAL_HEAVY = "categorical_heavy"
    HIGH_DIMENSIONAL = "high_dimensional"
    LOW_DIMENSIONAL = "low_dimensional"


class VibeStrength(Enum):
    """Strength of the vibe characteristic"""

    MILD = "mild"
    MODERATE = "moderate"
    STRONG = "strong"
    EXTREME = "extreme"


@dataclass
class VibeProfile:
    """Complete profile of dataset vibe"""

    id: str
    name: str
    created_at: str

    # Basic stats
    rows: int
    columns: int
    features: int

    # Category vibes
    categories: List[str] = field(default_factory=list)
    strengths: Dict[str, str] = field(default_factory=dict)

    # Data quality vibes
    missing_rate: float = 0.0
    duplicate_rate: float = 0.0
    outlier_rate: float = 0.0

    # Distribution vibes
    skewness: Dict[str, float] = field(default_factory=dict)
    class_balance_ratio: float = 1.0

    # Semantic vibes
    text_dominance: float = 0.0
    numeric_dominance: float = 0.0
    categorical_dominance: float = 0.0

    # Temporal vibes
    has_temporal_pattern: bool = False
    temporal_granularity: Optional[str] = None

    # Recommended approach
    recommended_task: str = "classification"
    recommended_models: List[str] = field(default_factory=list)
    recommended_preprocessing: List[str] = field(default_factory=list)
    confidence_score: float = 0.0

    # Raw analysis
    analysis_metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "created_at": self.created_at,
            "rows": self.rows,
            "columns": self.columns,
            "features": self.features,
            "categories": self.categories,
            "strengths": self.strengths,
            "missing_rate": self.missing_rate,
            "duplicate_rate": self.duplicate_rate,
            "outlier_rate": self.outlier_rate,
            "skewness": self.skewness,
            "class_balance_ratio": self.class_balance_ratio,
            "text_dominance": self.text_dominance,
            "numeric_dominance": self.numeric_dominance,
            "categorical_dominance": self.categorical_dominance,
            "has_temporal_pattern": self.has_temporal_pattern,
            "temporal_granularity": self.temporal_granularity,
            "recommended_task": self.recommended_task,
            "recommended_models": self.recommended_models,
            "recommended_preprocessing": self.recommended_preprocessing,
            "confidence_score": self.confidence_score,
            "analysis_metadata": self.analysis_metadata,
        }


class VibeAnalyzer:
    """Analyzes dataset to determine its "vibe" and recommend ML approaches"""

    def __init__(self):
        self._model_preferences = {
            "clean_balanced": ["XGBoost", "LightGBM", "RandomForest", "CatBoost"],
            "clean_imbalanced": ["XGBoost", "CatBoost", "LightGBM"],
            "messy": ["RandomForest", "XGBoost", "CatBoost"],
            "sparse": ["LogisticRegression", "SVM", "LightGBM"],
            "text_heavy": ["DistilBERT", "BERT", "TF-IDF+LR"],
            "time_series": ["Prophet", "LSTM", "XGBoostTimeSeries", "ARIMA"],
            "high_dimensional": ["RandomForest", "XGBoost", "LightGBM"],
            "low_dimensional": ["LogisticRegression", "SVM", "MLP"],
        }

        self._preprocessing_presets = {
            "clean": ["StandardScaler"],
            "messy": ["RobustScaler", "Imputer", "FeatureSelector"],
            "sparse": ["SparseEncoder", "FeatureSelection"],
            "imbalanced": ["SMOTE", "ClassWeights", "Downsampling"],
            "text_heavy": ["Tokenizer", "TF-IDF", "Embedding"],
            "time_series": ["Detrend", "Differencing", "RollingStats"],
        }

    def analyze(self, df: pd.DataFrame, name: str = "dataset") -> VibeProfile:
        """Analyze a dataframe and return its vibe profile"""
        import uuid

        profile = VibeProfile(
            id=str(uuid.uuid4())[:12],
            name=name,
            created_at=datetime.utcnow().isoformat(),
            rows=len(df),
            columns=len(df.columns),
            features=len(df.columns) - 1,
        )

        # Analyze data quality vibes
        profile.missing_rate = self._analyze_missing(df)
        profile.duplicate_rate = self._analyze_duplicates(df)
        profile.outlier_rate = self._analyze_outliers(df)

        # Determine cleanliness vibe
        if profile.missing_rate < 0.05 and profile.duplicate_rate < 0.01:
            profile.categories.append(VibeCategory.CLEAN.value)
            profile.strengths["clean"] = (
                VibeStrength.STRONG.value
                if profile.missing_rate < 0.01
                else VibeStrength.MODERATE.value
            )
        elif profile.missing_rate > 0.3 or profile.duplicate_rate > 0.1:
            profile.categories.append(VibeCategory.MESSY.value)
            profile.strengths["messy"] = VibeStrength.STRONG.value

        # Analyze sparsity
        sparsity = self._analyze_sparsity(df)
        if sparsity > 0.8:
            profile.categories.append(VibeCategory.SPARSE.value)
            profile.strengths["sparse"] = VibeStrength.MODERATE.value
        elif sparsity < 0.3:
            profile.categories.append(VibeCategory.DENSE.value)

        # Analyze column types
        col_types = self._analyze_column_types(df)
        profile.numeric_dominance = col_types["numeric_ratio"]
        profile.categorical_dominance = col_types["categorical_ratio"]
        profile.text_dominance = col_types["text_ratio"]

        if col_types["numeric_ratio"] > 0.7:
            profile.categories.append(VibeCategory.NUMERIC_HEAVY.value)
        elif col_types["categorical_ratio"] > 0.7:
            profile.categories.append(VibeCategory.CATEGORICAL_HEAVY.value)
        elif col_types["text_ratio"] > 0.3:
            profile.categories.append(VibeCategory.TEXT_HEAVY.value)
            profile.categories.append(VibeCategory.TEXT_HEAVY.value)

        # Analyze dimensionality
        if profile.features > 50:
            profile.categories.append(VibeCategory.HIGH_DIMENSIONAL.value)
            profile.strengths["high_dimensional"] = VibeStrength.MODERATE.value
        elif profile.features < 10:
            profile.categories.append(VibeCategory.LOW_DIMENSIONAL.value)

        # Analyze class balance
        class_balance = self._analyze_class_balance(df)
        profile.class_balance_ratio = class_balance["ratio"]

        if class_balance["ratio"] < 0.3:
            profile.categories.append(VibeCategory.IMBALANCED.value)
            profile.strengths["imbalanced"] = (
                VibeStrength.STRONG.value
                if class_balance["ratio"] < 0.1
                else VibeStrength.MODERATE.value
            )
        else:
            profile.categories.append(VibeCategory.BALANCED.value)

        # Analyze skewness
        profile.skewness = self._analyze_skewness(df)

        # Check for temporal patterns
        temporal = self._detect_temporal_patterns(df)
        if temporal["has_temporal"]:
            profile.categories.append(VibeCategory.TIME_SERIES.value)
            profile.has_temporal_pattern = True
            profile.temporal_granularity = temporal["granularity"]

        # Determine recommended task
        profile.recommended_task = self._determine_task(df, profile)

        # Generate recommendations
        profile.recommended_models = self._recommend_models(profile)
        profile.recommended_preprocessing = self._recommend_preprocessing(profile)
        profile.confidence_score = self._calculate_confidence(profile)

        # Store analysis metadata
        profile.analysis_metadata = {
            "column_types": col_types,
            "class_balance_detail": class_balance,
            "temporal_analysis": temporal,
            "sparsity": sparsity,
        }

        return profile

    def _analyze_missing(self, df: pd.DataFrame) -> float:
        total_cells = df.shape[0] * df.shape[1]
        missing_cells = df.isnull().sum().sum()
        return missing_cells / total_cells if total_cells > 0 else 0.0

    def _analyze_duplicates(self, df: pd.DataFrame) -> float:
        return df.duplicated().sum() / len(df) if len(df) > 0 else 0.0

    def _analyze_outliers(self, df: pd.DataFrame) -> float:
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) == 0:
            return 0.0

        outlier_count = 0
        total_numeric_cells = 0

        for col in numeric_cols:
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            lower = Q1 - 1.5 * IQR
            upper = Q3 + 1.5 * IQR
            outliers = ((df[col] < lower) | (df[col] > upper)).sum()
            outlier_count += outliers
            total_numeric_cells += len(df[col].dropna())

        return outlier_count / total_numeric_cells if total_numeric_cells > 0 else 0.0

    def _analyze_sparsity(self, df: pd.DataFrame) -> float:
        total_cells = df.shape[0] * df.shape[1]
        non_zero = df.fillna(0).astype(bool).sum().sum()
        return 1 - (non_zero / total_cells) if total_cells > 0 else 0.0

    def _analyze_column_types(self, df: pd.DataFrame) -> Dict:
        total = len(df.columns)
        if total == 0:
            return {"numeric_ratio": 0, "categorical_ratio": 0, "text_ratio": 0}

        numeric = len(df.select_dtypes(include=[np.number]).columns)
        categorical = len(df.select_dtypes(include=["object", "category"]).columns)

        # Estimate text columns (long strings)
        text_cols = 0
        for col in df.select_dtypes(include=["object"]).columns:
            if df[col].str.len().mean() > 50:
                text_cols += 1

        return {
            "numeric_ratio": numeric / total,
            "categorical_ratio": categorical / total,
            "text_ratio": text_cols / total if total > 0 else 0,
            "numeric_cols": numeric,
            "categorical_cols": categorical,
            "text_cols": text_cols,
        }

    def _analyze_class_balance(self, df: pd.DataFrame) -> Dict:
        # Look for label/target column
        label_col = None
        for col in df.columns:
            if any(x in col.lower() for x in ["label", "target", "y", "class"]):
                label_col = col
                break

        if label_col is None:
            return {"ratio": 1.0, "distribution": {}}

        value_counts = df[label_col].value_counts()
        if len(value_counts) < 2:
            return {"ratio": 1.0, "distribution": {}}

        min_count = value_counts.min()
        max_count = value_counts.max()
        ratio = min_count / max_count if max_count > 0 else 1.0

        return {
            "ratio": ratio,
            "distribution": {str(k): int(v) for k, v in value_counts.items()},
            "label_column": label_col,
        }

    def _analyze_skewness(self, df: pd.DataFrame) -> Dict[str, float]:
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        skew_dict = {}

        for col in numeric_cols:
            try:
                skew_dict[col] = float(df[col].skew())
            except:
                pass

        return skew_dict

    def _detect_temporal_patterns(self, df: pd.DataFrame) -> Dict:
        # Look for datetime columns
        datetime_cols = []
        for col in df.columns:
            if df[col].dtype == "datetime64[ns]":
                datetime_cols.append(col)
            elif any(
                x in col.lower() for x in ["date", "time", "timestamp", "year", "month", "day"]
            ):
                try:
                    pd.to_datetime(df[col], errors="raise")
                    datetime_cols.append(col)
                except:
                    pass

        if not datetime_cols:
            return {"has_temporal": False, "granularity": None}

        # Determine granularity
        try:
            sample = pd.to_datetime(df[datetime_cols[0]].dropna().iloc[0])
            now = pd.Timestamp.now()
            diff = now - sample

            if diff.days > 365 * 2:
                granularity = "yearly"
            elif diff.days > 30:
                granularity = "monthly"
            elif diff.days > 0:
                granularity = "daily"
            else:
                granularity = "hourly_or_finer"
        except:
            granularity = "unknown"

        return {"has_temporal": True, "granularity": granularity, "datetime_cols": datetime_cols}

    def _determine_task(self, df: pd.DataFrame, profile: VibeProfile) -> str:
        # Check class balance analysis
        class_info = profile.analysis_metadata.get("class_balance_detail", {})

        if "label_column" not in class_info:
            # No label column - unsupervised
            if profile.text_dominance > 0.3:
                return "text_generation"
            return "clustering"

        # Check if label is numeric
        label_col = class_info.get("label_column")
        if label_col and label_col in df.columns:
            if pd.api.types.is_numeric_dtype(df[label_col]):
                unique_ratio = df[label_col].nunique() / max(len(df), 1)
                if unique_ratio > 0.1:
                    return "regression"

        # Default to classification
        return "classification"

    def _recommend_models(self, profile: VibeProfile) -> List[str]:
        models = set()

        # Add models based on categories
        for category in profile.categories:
            if category in self._model_preferences:
                models.update(self._model_preferences[category])

        # Boost certain models based on strengths
        if profile.strengths.get("imbalanced") == "strong":
            models.discard("LogisticRegression")
            models.add("XGBoost")
            models.add("CatBoost")

        if profile.strengths.get("high_dimensional") == "moderate":
            models.discard("LogisticRegression")
            models.discard("SVM")

        if profile.categories.__contains__(VibeCategory.TEXT_HEAVY.value):
            models.update(["DistilBERT", "BERT", "RoBERTa"])

        if profile.categories.__contains__(VibeCategory.TIME_SERIES.value):
            models.update(["Prophet", "LSTM", "XGBoostTimeSeries"])

        # Return sorted list, prioritized
        priority_order = ["XGBoost", "LightGBM", "CatBoost", "RandomForest", "DistilBERT", "BERT"]
        sorted_models = sorted(
            models, key=lambda x: priority_order.index(x) if x in priority_order else 999
        )

        return sorted_models[:5]

    def _recommend_preprocessing(self, profile: VibeProfile) -> List[str]:
        steps = set()

        # Always add basic preprocessing
        steps.add("BasicClean")

        # Add based on categories
        for category in profile.categories:
            if category in self._preprocessing_presets:
                steps.update(self._preprocessing_presets[category])

        # Add specific preprocessing based on vibes
        if profile.missing_rate > 0.1:
            steps.add("Imputer")

        if profile.outlier_rate > 0.05:
            steps.add("OutlierHandling")

        if profile.strengths.get("imbalanced"):
            steps.add("ClassBalancing")

        if profile.categorical_dominance > 0.5:
            steps.add("CategoricalEncoder")

        if profile.numeric_dominance > 0.7:
            steps.add("Scaler")

        return list(steps)

    def _calculate_confidence(self, profile: VibeProfile) -> float:
        confidence = 0.5  # Base confidence

        # More features = more confidence
        if profile.features > 5:
            confidence += 0.1
        if profile.features > 20:
            confidence += 0.1

        # More rows = more confidence
        if profile.rows > 1000:
            confidence += 0.1
        if profile.rows > 10000:
            confidence += 0.1

        # Clear signals increase confidence
        if len(profile.categories) >= 3:
            confidence += 0.1

        return min(confidence, 0.95)

    def compare_vibes(self, profile1: VibeProfile, profile2: VibeProfile) -> Dict:
        """Compare two vibe profiles"""
        common_categories = set(profile1.categories) & set(profile2.categories)
        unique_to_1 = set(profile1.categories) - set(profile2.categories)
        unique_to_2 = set(profile2.categories) - set(profile1.categories)

        return {
            "similarity": len(common_categories)
            / max(len(profile1.categories), len(profile2.categories), 1),
            "common_vibes": list(common_categories),
            "unique_to_profile1": list(unique_to_1),
            "unique_to_profile2": list(unique_to_2),
            "task_match": profile1.recommended_task == profile2.recommended_task,
        }

    def generate_vibe_summary(self, profile: VibeProfile) -> str:
        """Generate a human-readable vibe summary"""
        parts = []

        # Primary vibe
        if VibeCategory.CLEAN.value in profile.categories:
            parts.append("clean")
        elif VibeCategory.MESSY.value in profile.categories:
            parts.append("messy")

        # Data type vibe
        if VibeCategory.TEXT_HEAVY.value in profile.categories:
            parts.append("text-heavy")
        elif VibeCategory.NUMERIC_HEAVY.value in profile.categories:
            parts.append("numeric")
        elif VibeCategory.CATEGORICAL_HEAVY.value in profile.categories:
            parts.append("categorical")

        # Balance vibe
        if VibeCategory.IMBALANCED.value in profile.categories:
            parts.append("imbalanced")
        elif VibeCategory.BALANCED.value in profile.categories:
            parts.append("balanced")

        # Dimensionality vibe
        if VibeCategory.HIGH_DIMENSIONAL.value in profile.categories:
            parts.append("high-dimensional")
        elif VibeCategory.LOW_DIMENSIONAL.value in profile.categories:
            parts.append("low-dimensional")

        # Temporal vibe
        if VibeCategory.TIME_SERIES.value in profile.categories:
            parts.append("temporal")

        return " | ".join(parts) if parts else "neutral"


__all__ = ["VibeAnalyzer", "VibeProfile", "VibeCategory", "VibeStrength"]
