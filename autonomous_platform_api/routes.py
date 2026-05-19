"""
Autonomous Platform API Routes
Unified API for autonomous ML platform.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import pandas as pd
from io import BytesIO

router = APIRouter(prefix="/api/autonomous", tags=["autonomous"])

_platforms = {}


class AnalyzeRequest(BaseModel):
    name: str = "dataset"
    include_llm: bool = True


class Constraints(BaseModel):
    max_cost: Optional[float] = 50.0
    max_latency: Optional[int] = 1000
    max_vram: Optional[int] = 15


class AutonomousRequest(BaseModel):
    name: str = "dataset"
    constraints: Optional[Constraints] = None
    include_llm: bool = True


@router.get("/health")
def health():
    return {"status": "healthy", "service": "autonomous-platform"}


@router.post("/analyze")
async def analyze(file: UploadFile = File(...), name: str = Form("dataset")):
    """Analyze dataset and return profile"""
    try:
        content = await file.read()
        df = pd.read_csv(BytesIO(content))

        from autonomous_platform.platform_core import AutonomousPlatform

        platform = AutonomousPlatform()
        profile = platform.analyze_data(df, name)

        return {
            "status": "success",
            "profile": {
                "id": profile.id,
                "name": profile.name,
                "rows": profile.rows,
                "columns": profile.columns,
                "features": profile.features,
                "data_type": profile.data_type,
                "task_type": profile.task_type,
                "vibe_summary": profile.vibe_summary,
                "confidence": profile.confidence,
                "data_quality": {
                    "missing_rate": profile.missing_rate,
                    "duplicate_rate": profile.duplicate_rate,
                    "outlier_rate": profile.outlier_rate,
                },
                "column_types": {
                    "numeric_ratio": profile.numeric_ratio,
                    "categorical_ratio": profile.categorical_ratio,
                    "text_ratio": profile.text_ratio,
                },
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommend")
async def recommend(
    file: UploadFile = File(...),
    name: str = Form("dataset"),
    max_cost: float = Form(50.0),
    max_vram: int = Form(15),
):
    """Get model recommendations"""
    try:
        content = await file.read()
        df = pd.read_csv(BytesIO(content))

        from autonomous_platform.platform_core import AutonomousPlatform, PlatformConfig

        config = PlatformConfig(
            max_cost_usd=max_cost,
            max_vram_gb=max_vram,
        )
        platform = AutonomousPlatform(config)

        profile = platform.analyze_data(df, name)
        recommendations = platform.recommend_models(profile)

        return {
            "status": "success",
            "data_profile": {
                "rows": profile.rows,
                "features": profile.features,
                "data_type": profile.data_type,
                "task_type": profile.task_type,
                "vibe_summary": profile.vibe_summary,
            },
            "recommendations": [
                {
                    "id": r.id,
                    "name": r.name,
                    "model_type": r.model_type,
                    "score": r.score,
                    "rationale": r.rationale,
                    "estimated_accuracy": r.estimated_accuracy,
                    "estimated_cost": r.estimated_cost,
                    "estimated_vram_gb": r.estimated_vram_gb,
                    "is_finetunable": r.is_finetunable,
                    "finetune_method": r.finetune_method,
                }
                for r in recommendations
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/run")
async def run_autonomous(
    file: UploadFile = File(...),
    name: str = Form("dataset"),
    max_cost: float = Form(50.0),
    max_vram: int = Form(15),
    max_latency: int = Form(1000),
):
    """Run fully autonomous pipeline"""
    try:
        content = await file.read()
        df = pd.read_csv(BytesIO(content))

        from autonomous_platform.platform_core import AutonomousPlatform, PlatformConfig

        config = PlatformConfig(
            max_cost_usd=max_cost,
            max_vram_gb=max_vram,
            max_latency_ms=max_latency,
        )
        platform = AutonomousPlatform(config)

        result = platform.run_autonomous(df, name)

        return {
            "status": "success",
            "pipeline": result.to_dict(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models")
def list_models():
    """List all available models"""
    from autonomous_platform.platform_core import AutonomousPlatform

    platform = AutonomousPlatform()

    return {
        "classical": list(platform._classical_models.keys()),
        "transformers": list(platform._transformer_models.keys()),
        "llms": [
            {"id": k, "name": v["name"], "params": v.get("params")}
            for k, v in platform._llm_models.items()
        ],
    }


__all__ = ["router"]
