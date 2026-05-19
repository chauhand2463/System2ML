"""
Vibe ML API Routes
Autonomous ML pipeline and fine-tuning based on data vibe analysis.
"""

import io
import json
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field

# Import vibe ml components
try:
    from vibe_ml import (
        VibeAnalyzer,
        VibeProfile,
        VibePipelineGenerator,
        VibeFineTuner,
        VibeFinetuneConfig,
    )

    VIBE_ML_AVAILABLE = True
except ImportError:
    VIBE_ML_AVAILABLE = False
    VibeAnalyzer = None
    VibeProfile = None
    VibePipelineGenerator = None
    VibeFineTuner = None


router = APIRouter(prefix="/api/vibe", tags=["vibe-ml"])

# In-memory storage (would be DB in production)
_vibe_profiles: Dict[str, Dict] = {}
_vibe_pipelines: Dict[str, Dict] = {}
_vibe_configs: Dict[str, Dict] = {}


# ===================== Pydantic Models =====================


class DataProfileRequest(BaseModel):
    name: str = "dataset"
    file_format: str = "csv"


class VibeConstraints(BaseModel):
    max_cost: Optional[float] = None
    max_latency: Optional[int] = None
    max_carbon: Optional[float] = None
    max_vram_gb: Optional[int] = 15
    prefer_free: bool = False
    use_quantization: bool = True


class VibePipelineRequest(BaseModel):
    vibe_profile_id: Optional[str] = None
    constraints: Optional[VibeConstraints] = None
    name: Optional[str] = None


class VibeFinetuneRequest(BaseModel):
    vibe_profile_id: Optional[str] = None
    model_id: str
    method: str = "qlora"
    platform: str = "colab"


class VibeAutoRecommendRequest(BaseModel):
    task_type: Optional[str] = None
    constraints: Optional[VibeConstraints] = None


# ===================== Helper Functions =====================


def _get_analyzer():
    if not VIBE_ML_AVAILABLE:
        raise HTTPException(status_code=500, detail="Vibe ML not available")
    return VibeAnalyzer()


def _get_pipeline_generator():
    if not VIBE_ML_AVAILABLE:
        raise HTTPException(status_code=500, detail="Vibe ML not available")
    return VibePipelineGenerator()


def _get_finetuner():
    if not VIBE_ML_AVAILABLE:
        raise HTTPException(status_code=500, detail="Vibe ML not available")
    return VibeFineTuner()


# ===================== Routes =====================


@router.get("/health")
def vibe_health():
    """Check Vibe ML service status"""
    return {
        "status": "healthy" if VIBE_ML_AVAILABLE else "unavailable",
        "version": "1.0.0",
        "components": {
            "vibe_analyzer": VIBE_ML_AVAILABLE,
            "vibe_pipeline_generator": VIBE_ML_AVAILABLE,
            "vibe_finetuner": VIBE_ML_AVAILABLE,
        },
    }


# ===================== Vibe Analysis =====================


@router.post("/analyze")
async def analyze_dataset(
    file: UploadFile = File(...),
    name: str = Form("dataset"),
    file_format: str = Form("csv"),
):
    """Analyze dataset to determine its 'vibe'"""

    if not VIBE_ML_AVAILABLE:
        raise HTTPException(status_code=500, detail="Vibe ML not installed")

    try:
        # Read file content
        content = await file.read()

        # Load as DataFrame
        import pandas as pd
        from io import BytesIO

        if file_format == "csv":
            df = pd.read_csv(BytesIO(content))
        elif file_format == "jsonl":
            df = pd.read_json(BytesIO(content), lines=True)
        elif file_format == "parquet":
            df = pd.read_parquet(BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {file_format}")

        # Analyze
        analyzer = VibeAnalyzer()
        profile = analyzer.analyze(df, name)

        # Store profile
        _vibe_profiles[profile.id] = profile.to_dict()

        return {
            "status": "success",
            "profile_id": profile.id,
            "profile": profile.to_dict(),
            "vibe_summary": analyzer.generate_vibe_summary(profile),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profiles")
def list_vibe_profiles():
    """List all analyzed vibe profiles"""
    return {
        "profiles": list(_vibe_profiles.values()),
        "count": len(_vibe_profiles),
    }


@router.get("/profiles/{profile_id}")
def get_vibe_profile(profile_id: str):
    """Get a specific vibe profile"""
    profile = _vibe_profiles.get(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.delete("/profiles/{profile_id}")
def delete_vibe_profile(profile_id: str):
    """Delete a vibe profile"""
    if profile_id not in _vibe_profiles:
        raise HTTPException(status_code=404, detail="Profile not found")
    del _vibe_profiles[profile_id]
    return {"deleted": True}


# ===================== Vibe Pipeline Generation =====================


@router.post("/pipeline/generate")
def generate_vibe_pipeline(request: VibePipelineRequest):
    """Generate ML pipeline based on vibe profile"""

    if not VIBE_ML_AVAILABLE:
        raise HTTPException(status_code=500, detail="Vibe ML not installed")

    try:
        profile_id = request.vibe_profile_id

        # Get profile
        if profile_id:
            profile_dict = _vibe_profiles.get(profile_id)
            if not profile_dict:
                raise HTTPException(status_code=404, detail="Vibe profile not found")

            # Reconstruct VibeProfile
            profile = VibeProfile(**profile_dict)
        else:
            raise HTTPException(status_code=400, detail="vibe_profile_id required")

        # Generate pipeline
        generator = VibePipelineGenerator()
        constraints = request.constraints.dict() if request.constraints else None
        pipeline = generator.generate(profile, constraints, request.name)

        # Store pipeline
        _vibe_pipelines[pipeline.id] = {
            "id": pipeline.id,
            "name": pipeline.name,
            "created_at": pipeline.created_at,
            "vibe_profile_id": pipeline.vibe_profile_id,
            "task_type": pipeline.task_type,
            "steps": [
                {
                    "id": s.id,
                    "name": s.name,
                    "type": s.type,
                    "params": s.params,
                    "description": s.description,
                }
                for s in pipeline.steps
            ],
            "estimated_metrics": {
                "accuracy": pipeline.estimated_accuracy,
                "cost": pipeline.estimated_cost,
                "time_seconds": pipeline.estimated_time_seconds,
                "carbon_kg": pipeline.estimated_carbon_kg,
            },
            "model_configs": pipeline.model_configs,
            "preprocessing_configs": pipeline.preprocessing_configs,
            "reasoning": pipeline.reasoning,
            "confidence": pipeline.confidence,
        }

        return {
            "status": "success",
            "pipeline_id": pipeline.id,
            "pipeline": _vibe_pipelines[pipeline.id],
            "export_formats": {
                "dict": generator.export_pipeline(pipeline, "dict"),
                "json": generator.export_pipeline(pipeline, "json"),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pipeline/generate/from-data")
async def generate_pipeline_from_data(
    file: UploadFile = File(...),
    name: str = Form("dataset"),
    file_format: str = Form("csv"),
    max_cost: Optional[float] = Form(None),
    max_latency: Optional[int] = Form(None),
):
    """Convenience: analyze data and generate pipeline in one call"""

    if not VIBE_ML_AVAILABLE:
        raise HTTPException(status_code=500, detail="Vibe ML not installed")

    try:
        # Read and analyze data
        content = await file.read()

        import pandas as pd
        from io import BytesIO

        if file_format == "csv":
            df = pd.read_csv(BytesIO(content))
        elif file_format == "jsonl":
            df = pd.read_json(BytesIO(content), lines=True)
        elif file_format == "parquet":
            df = pd.read_parquet(BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {file_format}")

        # Generate pipeline directly
        generator = VibePipelineGenerator()
        constraints = {}
        if max_cost:
            constraints["max_cost"] = max_cost
        if max_latency:
            constraints["max_latency"] = max_latency

        pipeline = generator.generate_from_dataframe(df, name, constraints)

        # Store both profile and pipeline
        _vibe_profiles[pipeline.vibe_profile_id] = pipeline.vibe_profile_id
        _vibe_pipelines[pipeline.id] = {
            "id": pipeline.id,
            "name": pipeline.name,
            "created_at": pipeline.created_at,
            "vibe_profile_id": pipeline.vibe_profile_id,
            "task_type": pipeline.task_type,
            "steps": [
                {
                    "id": s.id,
                    "name": s.name,
                    "type": s.type,
                    "params": s.params,
                    "description": s.description,
                }
                for s in pipeline.steps
            ],
            "estimated_metrics": {
                "accuracy": pipeline.estimated_accuracy,
                "cost": pipeline.estimated_cost,
                "time_seconds": pipeline.estimated_time_seconds,
                "carbon_kg": pipeline.estimated_carbon_kg,
            },
            "model_configs": pipeline.model_configs,
            "reasoning": pipeline.reasoning,
            "confidence": pipeline.confidence,
        }

        return {
            "status": "success",
            "vibe_profile_id": pipeline.vibe_profile_id,
            "pipeline_id": pipeline.id,
            "pipeline": _vibe_pipelines[pipeline.id],
            "vibe_summary": generator.analyzer.generate_vibe_summary(
                VibeAnalyzer().analyze(df, name)
            ),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pipelines")
def list_vibe_pipelines():
    """List all generated vibe pipelines"""
    return {
        "pipelines": list(_vibe_pipelines.values()),
        "count": len(_vibe_pipelines),
    }


@router.get("/pipelines/{pipeline_id}")
def get_vibe_pipeline(pipeline_id: str):
    """Get a specific pipeline"""
    pipeline = _vibe_pipelines.get(pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return pipeline


@router.get("/pipelines/{pipeline_id}/export")
def export_vibe_pipeline(pipeline_id: str, format: str = "json"):
    """Export pipeline in different formats"""
    pipeline = _vibe_pipelines.get(pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    generator = VibePipelineGenerator()

    # Reconstruct pipeline object for export
    from vibe_ml.vibe_pipeline import VibePipeline, PipelineStep

    steps = [PipelineStep(**s) for s in pipeline["steps"]]
    vibepipeline = VibePipeline(
        id=pipeline["id"],
        name=pipeline["name"],
        created_at=pipeline["created_at"],
        vibe_profile_id=pipeline["vibe_profile_id"],
        task_type=pipeline["task_type"],
        steps=steps,
        estimated_accuracy=pipeline["estimated_metrics"]["accuracy"],
        estimated_cost=pipeline["estimated_metrics"]["cost"],
        estimated_time_seconds=pipeline["estimated_metrics"]["time_seconds"],
        estimated_carbon_kg=pipeline["estimated_metrics"]["carbon_kg"],
        reasoning=pipeline["reasoning"],
        confidence=pipeline["confidence"],
    )

    return generator.export_pipeline(vibepipeline, format)


# ===================== Vibe Fine-Tuning =====================


@router.post("/finetune/recommend")
def recommend_finetune_models(request: VibeAutoRecommendRequest):
    """Recommend fine-tuning models based on vibe analysis"""

    if not VIBE_ML_AVAILABLE:
        raise HTTPException(status_code=500, detail="Vibe ML not installed")

    try:
        finetuner = VibeFineTuner()

        if request.task_type:
            constraints = request.constraints.dict() if request.constraints else {}
            constraints["task_type"] = request.task_type
        else:
            constraints = request.constraints.dict() if request.constraints else {}

        # Get all models sorted
        temp_profile = (
            VibeProfile(**_vibe_profiles.get("default", {}))
            if "default" in _vibe_profiles
            else VibeProfile(
                id="temp",
                name="temp",
                created_at="",
                rows=1000,
                columns=10,
                features=9,
            )
        )
        recommendations = finetuner.recommend(temp_profile, constraints)

        return {
            "status": "success",
            "recommendations": [
                {
                    "model_id": r.model_id,
                    "model_name": r.model_name,
                    "family": r.family,
                    "params": r.params,
                    "vram_gb": r.vram_gb,
                    "qlora_vram_gb": r.qlora_vram_gb,
                    "score": r.score,
                    "rationale": r.rationale,
                    "tags": r.tags,
                }
                for r in recommendations
            ],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/finetune/recommend/from-data")
async def recommend_from_data(
    file: UploadFile = File(...),
    task_type: Optional[str] = Form(None),
    max_vram_gb: int = Form(15),
    prefer_free: bool = Form(False),
):
    """Recommend models based on uploaded dataset"""

    if not VIBE_ML_AVAILABLE:
        raise HTTPException(status_code=500, detail="Vibe ML not installed")

    try:
        # Read and analyze data
        content = await file.read()

        import pandas as pd
        from io import BytesIO

        df = pd.read_csv(BytesIO(content))

        # Get recommendations
        finetuner = VibeFineTuner()
        recommendations = finetuner.recommend_from_dataframe(
            df, {"max_vram_gb": max_vram_gb, "prefer_free": prefer_free, "task_type": task_type}
        )

        return {
            "status": "success",
            "vibe_summary": VibeAnalyzer().generate_vibe_summary(
                VibeAnalyzer().analyze(df, "dataset")
            ),
            "recommendations": [
                {
                    "model_id": r.model_id,
                    "model_name": r.model_name,
                    "family": r.family,
                    "params": r.params,
                    "vram_gb": r.vram_gb,
                    "qlora_vram_gb": r.qlora_vram_gb,
                    "score": r.score,
                    "rationale": r.rationale,
                    "tags": r.tags,
                }
                for r in recommendations
            ],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/finetune/auto-config")
def auto_tune_finetune_config(
    vibe_profile_id: str,
    model_id: str,
    method: str = "qlora",
):
    """Auto-generate fine-tuning configuration for a model"""

    if not VIBE_ML_AVAILABLE:
        raise HTTPException(status_code=500, detail="Vibe ML not installed")

    try:
        profile_dict = _vibe_profiles.get(vibe_profile_id)
        if not profile_dict:
            raise HTTPException(status_code=404, detail="Vibe profile not found")

        profile = VibeProfile(**profile_dict)
        finetuner = VibeFineTuner()

        config = finetuner.auto_tune_config(profile, model_id, method)

        config_id = str(uuid.uuid4())[:12]
        _vibe_configs[config_id] = {
            "id": config_id,
            "vibe_profile_id": vibe_profile_id,
            "model_id": config.base_model_id,
            "config": {
                "method": config.method,
                "lora_r": config.lora_r,
                "lora_alpha": config.lora_alpha,
                "lora_dropout": config.lora_dropout,
                "lora_target_modules": config.lora_target_modules,
                "epochs": config.epochs,
                "batch_size": config.batch_size,
                "learning_rate": config.learning_rate,
                "max_seq_length": config.max_seq_length,
                "warmup_ratio": config.warmup_ratio,
            },
            "estimated_vram_gb": config.estimated_vram_gb,
            "fits_colab_t4": config.fits_colab_t4,
            "rationale": config.rationale,
            "confidence": config.confidence,
        }

        return {
            "status": "success",
            "config_id": config_id,
            "config": _vibe_configs[config_id],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/finetune/notebook-config")
async def generate_notebook_config(
    file: UploadFile = File(...),
    model_id: str = Form(...),
    platform: str = Form("colab"),
):
    """Generate complete notebook configuration for fine-tuning"""

    if not VIBE_ML_AVAILABLE:
        raise HTTPException(status_code=500, detail="Vibe ML not installed")

    try:
        # Read and analyze data
        content = await file.read()

        import pandas as pd
        from io import BytesIO

        df = pd.read_csv(BytesIO(content))

        finetuner = VibeFineTuner()
        analyzer = VibeAnalyzer()

        profile = analyzer.analyze(df, "dataset")
        config = finetuner.generate_notebook_config(profile, model_id, platform)

        # Store profile
        _vibe_profiles[profile.id] = profile.to_dict()

        return {
            "status": "success",
            "vibe_profile_id": profile.id,
            "notebook_config": config,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models")
def list_available_models(
    max_vram_gb: Optional[int] = None,
    family: Optional[str] = None,
):
    """List all available fine-tuning models"""

    if not VIBE_ML_AVAILABLE:
        raise HTTPException(status_code=500, detail="Vibe ML not installed")

    finetuner = VibeFineTuner()

    filters = {}
    if max_vram_gb:
        filters["max_vram_gb"] = max_vram_gb
    if family:
        filters["family"] = [family]

    models = finetuner.list_available_models(filters)

    return {
        "models": models,
        "count": len(models),
    }


# ===================== Comparison =====================


@router.get("/compare/profiles/{profile_id1}/{profile_id2}")
def compare_vibe_profiles(profile_id1: str, profile_id2: str):
    """Compare two vibe profiles"""

    p1 = _vibe_profiles.get(profile_id1)
    p2 = _vibe_profiles.get(profile_id2)

    if not p1 or not p2:
        raise HTTPException(status_code=404, detail="Profile not found")

    analyzer = VibeAnalyzer()
    profile1 = VibeProfile(**p1)
    profile2 = VibeProfile(**p2)

    return analyzer.compare_vibes(profile1, profile2)


@router.get("/compare/pipelines/{pipeline_id1}/{pipeline_id2}")
def compare_pipelines(pipeline_id1: str, pipeline_id2: str):
    """Compare two generated pipelines"""

    p1 = _vibe_pipelines.get(pipeline_id1)
    p2 = _vibe_pipelines.get(pipeline_id2)

    if not p1 or not p2:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    from vibe_ml.vibe_pipeline import VibePipelineGenerator

    generator = VibePipelineGenerator()

    # Would need to reconstruct Pipeline objects for proper comparison
    # For now, return basic comparison

    return {
        "pipeline1": {
            "id": p1["id"],
            "name": p1["name"],
            "accuracy": p1["estimated_metrics"]["accuracy"],
        },
        "pipeline2": {
            "id": p2["id"],
            "name": p2["name"],
            "accuracy": p2["estimated_metrics"]["accuracy"],
        },
        "comparison": {
            "accuracy_diff": p1["estimated_metrics"]["accuracy"]
            - p2["estimated_metrics"]["accuracy"],
            "cost_diff": p1["estimated_metrics"]["cost"] - p2["estimated_metrics"]["cost"],
        },
    }


__all__ = ["router"]
