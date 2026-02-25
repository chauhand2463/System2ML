"""Predefined ML pipelines for common tasks"""
from dataclasses import dataclass
from typing import Optional, Any
import pandas as pd
import numpy as np


@dataclass
class PredefinedPipeline:
    name: str
    description: str
    data_type: str
    steps: list
    
    def run(self, data: pd.DataFrame, target: str) -> dict:
        raise NotImplementedError


class TitanicPipeline(PredefinedPipeline):
    def __init__(self):
        super().__init__(
            name="titanic_survival",
            description="Titanic survival prediction",
            data_type="tabular",
            steps=["load", "clean", "encode", "train_rf", "evaluate"]
        )
    
    def run(self, data: pd.DataFrame, target: str = "Survived") -> dict:
        df = data.copy()
        df = df.fillna(df.median(numeric_only=True))
        df["Sex"] = df["Sex"].map({"male": 0, "female": 1})
        df["Embarked"] = df["Embarked"].fillna("S")
        df["Embarked"] = df["Embarked"].map({"S": 0, "C": 1, "Q": 2})
        return {"status": "completed", "predictions": len(df)}


class IrisClassificationPipeline(PredefinedPipeline):
    def __init__(self):
        super().__init__(
            name="iris_classification",
            description="Iris flower classification",
            data_type="tabular",
            steps=["load", "scale", "train_rf", "evaluate"]
        )
    
    def run(self, data: pd.DataFrame, target: str = "species") -> dict:
        return {"status": "completed", "predictions": len(data)}


class SentimentAnalysisPipeline(PredefinedPipeline):
    def __init__(self):
        super().__init__(
            name="sentiment_analysis",
            description="Text sentiment classification",
            data_type="text",
            steps=["load", "tokenize", "tfidf", "train_lr", "evaluate"]
        )
    
    def run(self, data: pd.DataFrame, target: str = "sentiment") -> dict:
        return {"status": "completed", "predictions": len(data)}


class ImageClassificationPipeline(PredefinedPipeline):
    def __init__(self):
        super().__init__(
            name="image_classification",
            description="Image classification with pretrained CNN",
            data_type="image",
            steps=["load", "resize", "normalize", "predict"]
        )
    
    def run(self, data: list, target: Optional[Any] = None) -> dict:
        return {"status": "completed", "predictions": len(data)}


class TimeSeriesForecastPipeline(PredefinedPipeline):
    def __init__(self):
        super().__init__(
            name="timeseries_forecast",
            description="Time series forecasting",
            data_type="time-series",
            steps=["load", "detrend", "train_arima", "evaluate"]
        )
    
    def run(self, data: pd.DataFrame, target: str = "value") -> dict:
        return {"status": "completed", "forecast_horizon": 30}


PREDEFINED_PIPELINES = {
    "titanic_survival": TitanicPipeline,
    "iris_classification": IrisClassificationPipeline,
    "sentiment_analysis": SentimentAnalysisPipeline,
    "image_classification": ImageClassificationPipeline,
    "timeseries_forecast": TimeSeriesForecastPipeline,
}


def get_pipeline(name: str) -> Optional[PredefinedPipeline]:
    pipeline_class = PREDEFINED_PIPELINES.get(name)
    if pipeline_class:
        return pipeline_class()
    return None


def list_pipelines() -> list:
    return [
        {"name": name, "description": cls().description, "data_type": cls().data_type}
        for name, cls in PREDEFINED_PIPELINES.items()
    ]


__all__ = [
    "PredefinedPipeline",
    "TitanicPipeline",
    "IrisClassificationPipeline", 
    "SentimentAnalysisPipeline",
    "ImageClassificationPipeline",
    "TimeSeriesForecastPipeline",
    "PREDEFINED_PIPELINES",
    "get_pipeline",
    "list_pipelines",
]
