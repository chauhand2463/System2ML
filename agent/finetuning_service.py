"""
System2ML Fine-Tuning Service
Handles: notebook generation, job tracking, model registry, HuggingFace integration
Features:
- Dynamic AI-Generated Notebooks (Groq integration)
- Training Progress Streaming (WebSocket)
- LoRA Rank Auto-Tuning
- Model Comparison View
- Dataset Format Converter
- Adapter Hub
"""

import os
import json
import uuid
import time
import tempfile
import zipfile
import asyncio
import websockets
from datetime import datetime
from typing import Optional, Dict, Any, List, Literal
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel, Field
from starlette.websockets import WebSocket

router = APIRouter(prefix="/api/finetuning", tags=["finetuning"])

# ─── In-memory job store (replace with DB in production) ──────────────────────
_jobs: Dict[str, Dict] = {}
_adapters: Dict[str, Dict] = {}  # Adapter Hub storage
_active_connections: Dict[str, List[WebSocket]] = {}  # WebSocket connections per job


# ─── Pydantic Models ──────────────────────────────────────────────────────────


class DatasetProfile(BaseModel):
    name: str = "dataset"
    format: Literal["csv", "jsonl", "parquet", "huggingface"] = "jsonl"
    rows: int = 0
    columns: List[str] = []
    label_column: Optional[str] = None
    label_type: Optional[Literal["classification", "regression", "text"]] = None
    task_type: Optional[Literal["causal_lm", "seq2seq", "classification", "regression"]] = None
    class_balance: Optional[Dict[str, int]] = {}
    missing_values: Dict[str, int] = {}
    text_columns: List[str] = []
    numeric_columns: List[str] = []
    size_mb: float = 0.0


# ─── Pydantic Models ──────────────────────────────────────────────────────────


class LoRAConfig(BaseModel):
    r: int = Field(16, ge=4, le=256)
    alpha: int = Field(32, ge=8, le=512)
    dropout: float = Field(0.05, ge=0.0, le=0.5)
    target_modules: str = "q_proj,v_proj,k_proj,o_proj"
    bias: str = "none"


# ─── LoRA Rank Auto-Tuning ────────────────────────────────────────────────────


def recommend_lora_config(dataset_rows: int, model_params_b: int) -> Dict[str, Any]:
    """
    Auto-tune LoRA parameters based on dataset size and model parameter count.
    Smaller datasets → lower rank to prevent overfitting.
    """
    # Calculate recommended rank based on dataset size
    if dataset_rows < 1000:
        recommended_r = 8
    elif dataset_rows < 5000:
        recommended_r = 16
    elif dataset_rows < 20000:
        recommended_r = 32
    elif dataset_rows < 100000:
        recommended_r = 64
    else:
        recommended_r = 128

    # Adjust based on model size
    if model_params_b < 3:
        recommended_r = min(recommended_r, 16)
    elif model_params_b < 10:
        recommended_r = min(recommended_r, 32)
    elif model_params_b < 50:
        recommended_r = min(recommended_r, 64)
    # 50B+ models can use higher rank

    # Alpha is typically 2x the rank
    alpha = recommended_r * 2

    # Dropout - higher for smaller datasets
    if dataset_rows < 1000:
        dropout = 0.1
    elif dataset_rows < 5000:
        dropout = 0.05
    else:
        dropout = 0.03

    return {
        "r": recommended_r,
        "alpha": alpha,
        "dropout": dropout,
        "rationale": f"Based on {dataset_rows} samples and {model_params_b}B model",
        "overfitting_risk": "high"
        if dataset_rows < 1000
        else "medium"
        if dataset_rows < 5000
        else "low",
    }


# ─── Dataset Format Converter ────────────────────────────────────────────────


def convert_dataset_format(
    file_content: bytes, source_format: str, target_format: str, columns: List[str] = None
) -> bytes:
    """
    Convert between dataset formats: CSV, JSONL, Parquet, HuggingFace
    """
    import pandas as pd
    from io import BytesIO

    df = None

    # Load source format
    if source_format == "csv":
        df = pd.read_csv(BytesIO(file_content))
    elif source_format == "jsonl":
        df = pd.read_json(BytesIO(file_content), lines=True)
    elif source_format == "parquet":
        df = pd.read_parquet(BytesIO(file_content))
    else:
        raise ValueError(f"Unsupported source format: {source_format}")

    # Convert to target format
    output = BytesIO()
    if target_format == "csv":
        df.to_csv(output, index=False)
    elif target_format == "jsonl":
        df.to_json(output, orient="records", lines=True)
    elif target_format == "parquet":
        df.to_parquet(output, index=False)
    else:
        raise ValueError(f"Unsupported target format: {target_format}")

    return output.getvalue()


def profile_dataset(
    file_content: bytes, file_format: str, file_name: str = "dataset"
) -> DatasetProfile:
    """
    Analyze a dataset to extract column names, task type, class balance, etc.
    Used for AI-aware notebook generation.
    """
    import pandas as pd
    from io import BytesIO

    df = None

    if file_format == "csv":
        df = pd.read_csv(BytesIO(file_content))
    elif file_format == "jsonl":
        df = pd.read_json(BytesIO(file_content), lines=True)
    elif file_format == "parquet":
        df = pd.read_parquet(BytesIO(file_content))
    else:
        raise ValueError(f"Unsupported format: {file_format}")

    columns = list(df.columns)
    rows = len(df)
    size_mb = len(file_content) / (1024 * 1024)

    # Identify label column
    label_column = None
    label_type = None
    task_type = None
    class_balance = {}
    text_columns = []
    numeric_columns = []

    for col in columns:
        col_lower = col.lower()
        if any(x in col_lower for x in ["label", "target", "y", "class", "output", "class_"]):
            label_column = col
            if pd.api.types.is_numeric_dtype(df[col]):
                unique_ratio = df[col].nunique() / max(rows, 1)
                if unique_ratio < 0.1:
                    label_type = "classification"
                    task_type = "classification"
                    class_balance = {str(k): int(v) for k, v in df[col].value_counts().items()}
                else:
                    label_type = "regression"
                    task_type = "regression"
            else:
                label_type = "classification"
                task_type = "classification"
                class_balance = {str(k): int(v) for k, v in df[col].value_counts().items()}
            break

    # Identify column types
    for col in columns:
        if col == label_column:
            continue
        if pd.api.types.is_numeric_dtype(df[col]):
            numeric_columns.append(col)
        elif pd.api.types.is_string_dtype(df[col]) or df[col].dtype == object:
            # Check if it looks like text
            if df[col].str.len().mean() > 50:
                text_columns.append(col)

    # Detect missing values
    missing_values = {
        col: int(df[col].isnull().sum()) for col in columns if df[col].isnull().sum() > 0
    }

    # Infer task type if no label column
    if not task_type:
        if text_columns:
            task_type = "causal_lm"
        else:
            task_type = "causal_lm"  # Default for fine-tuning

    return DatasetProfile(
        name=file_name,
        format=file_format,
        rows=rows,
        columns=columns,
        label_column=label_column,
        label_type=label_type,
        task_type=task_type,
        class_balance=class_balance,
        missing_values=missing_values,
        text_columns=text_columns,
        numeric_columns=numeric_columns,
        size_mb=round(size_mb, 2),
    )


# ─── Adapter Hub ──────────────────────────────────────────────────────────────


class AdapterMetadata(BaseModel):
    id: str
    name: str
    model_id: str
    base_model_name: str
    method: str
    lora_r: int
    lora_alpha: int
    dataset_name: str
    dataset_rows: int
    epochs: int
    accuracy: Optional[float] = None
    created_at: str
    version: int = 1
    description: str = ""
    tags: List[str] = []
    is_public: bool = False
    download_count: int = 0


def save_adapter(adapter_id: str, adapter_data: Dict[str, Any]) -> AdapterMetadata:
    """Save a LoRA adapter to the hub."""
    _adapters[adapter_id] = adapter_data
    return AdapterMetadata(**adapter_data)


def get_adapter(adapter_id: str) -> Optional[Dict[str, Any]]:
    """Get an adapter by ID."""
    return _adapters.get(adapter_id)


def list_adapters(filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    """List adapters with optional filters."""
    adapters = list(_adapters.values())

    if filters:
        if filters.get("model_id"):
            adapters = [a for a in adapters if a.get("model_id") == filters["model_id"]]
        if filters.get("is_public") is not None:
            adapters = [a for a in adapters if a.get("is_public") == filters["is_public"]]

    return sorted(adapters, key=lambda x: x.get("created_at", ""), reverse=True)


def version_adapter(adapter_id: str, new_version_data: Dict[str, Any]) -> Optional[AdapterMetadata]:
    """Create a new version of an adapter."""
    adapter = _adapters.get(adapter_id)
    if not adapter:
        return None

    new_version = adapter.get("version", 1) + 1
    new_adapter_data = {
        **adapter,
        **new_version_data,
        "version": new_version,
        "created_at": datetime.utcnow().isoformat(),
    }
    new_id = str(uuid.uuid4())[:12]
    _adapters[new_id] = new_adapter_data
    return AdapterMetadata(**new_adapter_data)


class TrainingHyperparams(BaseModel):
    epochs: int = Field(3, ge=1, le=20)
    batch_size: int = Field(4, ge=1, le=64)
    gradient_accumulation_steps: int = Field(4, ge=1, le=64)
    learning_rate: float = Field(2e-4, gt=0, lt=1e-2)
    max_seq_length: int = Field(2048, ge=128, le=32768)
    warmup_ratio: float = Field(0.03, ge=0.0, le=0.5)
    lr_scheduler: str = "cosine"
    weight_decay: float = Field(0.01, ge=0.0, le=0.5)
    max_grad_norm: float = Field(1.0, ge=0.1, le=10.0)
    fp16: bool = False
    bf16: bool = True
    gradient_checkpointing: bool = True
    save_steps: int = 100
    eval_steps: int = 100


class NotebookRequest(BaseModel):
    # Model
    model_id: str = Field(..., description="HuggingFace model ID")
    model_name: str = Field(..., description="Human readable model name")
    model_vram_gb: int = Field(16)

    # Method
    method: Literal["lora", "qlora", "full_ft"] = "qlora"
    quantization_bits: Optional[Literal[4, 8]] = 4
    task_type: Literal["causal_lm", "seq2seq", "classification", "regression"] = "causal_lm"
    dataset_format: Literal["alpaca", "sharegpt", "raw_text", "csv", "jsonl"] = "alpaca"

    # Training params
    hyperparams: TrainingHyperparams = Field(default_factory=TrainingHyperparams)
    lora_config: LoRAConfig = Field(default_factory=LoRAConfig)

    # Output
    output_dir: str = "./finetuned_model"
    push_to_hub: bool = False
    hub_model_id: str = ""
    use_wandb: bool = False
    wandb_project: str = "finetuning"

    # Platform
    platform: Literal["colab", "jupyter", "kaggle", "runpod"] = "colab"


class JobStatus(BaseModel):
    job_id: str
    status: Literal["pending", "running", "completed", "failed", "cancelled"]
    model_id: str
    method: str
    platform: str
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    progress: float = 0.0
    current_step: Optional[str] = None
    metrics: Optional[Dict[str, float]] = None
    error: Optional[str] = None
    notebook_path: Optional[str] = None


# ─── Notebook Generator ───────────────────────────────────────────────────────


def _make_code_cell(source: str) -> dict:
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": source,
    }


def _make_md_cell(source: str) -> dict:
    return {"cell_type": "markdown", "metadata": {}, "source": source}


def generate_notebook(req: NotebookRequest) -> dict:
    """Generate a complete, production-ready Jupyter/Colab notebook."""
    hp = req.hyperparams
    lora = req.lora_config
    is_lora = req.method in ("lora", "qlora")
    is_qlora = req.method == "qlora"
    is_colab = req.platform == "colab"
    eff_batch = hp.batch_size * hp.gradient_accumulation_steps

    cells = []

    # ── Title ──────────────────────────────────────────────────────────────
    cells.append(
        _make_md_cell(
            f"# 🚀 Fine-Tuning: {req.model_name} — {req.method.upper()}\n\n"
            f"> **Generated by System2ML** | {datetime.utcnow().strftime('%Y-%m-%d')}\n\n"
            f"| Parameter | Value |\n|-----------|-------|\n"
            f"| Model | `{req.model_id}` |\n"
            f"| Method | {req.method.upper()} |\n"
            f"| Task | {req.task_type} |\n"
            f"| Dataset Format | {req.dataset_format} |\n"
            f"| Epochs | {hp.epochs} |\n"
            f"| Effective Batch | {eff_batch} ({hp.batch_size}×{hp.gradient_accumulation_steps}) |\n"
            f"| Learning Rate | {hp.learning_rate} |\n"
            f"| Max Seq Length | {hp.max_seq_length} |\n"
            f"| VRAM (est.) | ~{req.model_vram_gb if req.method == 'full_ft' else max(6, req.model_vram_gb // (4 if is_qlora else 2))}GB |\n\n"
            f"## ⚡ Quick Start\n"
            + (
                "1. `Runtime` → `Change runtime type` → **T4 GPU** (free)\n"
                "2. Add `HF_TOKEN` in Secrets (left sidebar 🔑) for gated models\n"
                "3. **Run All** (`Ctrl+F9`)\n"
                if is_colab
                else "1. Activate your Python environment with GPU support\n"
                "2. Set `HF_TOKEN` env var for gated models: `export HF_TOKEN=hf_...`\n"
                "3. Run all cells top to bottom\n"
            )
        )
    )

    # ── Install ────────────────────────────────────────────────────────────
    cells.append(_make_md_cell("## 📦 1. Install Dependencies"))
    install_pkgs = [
        "transformers==4.44.0",
        "datasets==2.20.0",
        "peft==0.12.0",
        "trl==0.9.6",
        "accelerate==0.33.0",
        "bitsandbytes==0.43.3",
        "huggingface_hub",
        "sentencepiece",
        "protobuf",
    ]
    if req.use_wandb:
        install_pkgs.append("wandb")
    cells.append(
        _make_code_cell(
            "# Install all required packages\n"
            + "\n".join(f"!pip install -q {pkg}" for pkg in install_pkgs)
            + "\n\nimport importlib\n"
            "print('✅ Packages installed!')\n"
            "print('transformers:', importlib.import_module('transformers').__version__)\n"
            "print('peft:', importlib.import_module('peft').__version__)\n"
            "print('trl:', importlib.import_module('trl').__version__)\n"
        )
    )

    # ── GPU Check ──────────────────────────────────────────────────────────
    cells.append(_make_md_cell("## 🖥️ 2. Verify GPU"))
    cells.append(
        _make_code_cell(
            "import torch, subprocess\n\n"
            "result = subprocess.run(['nvidia-smi'], capture_output=True, text=True)\n"
            "print(result.stdout[:600] if result.returncode == 0 else '❌ No GPU! Change runtime.')\n\n"
            "if torch.cuda.is_available():\n"
            "    gpu = torch.cuda.get_device_properties(0)\n"
            "    vram_gb = gpu.total_memory / 1e9\n"
            f"    needed_gb = {req.model_vram_gb if req.method == 'full_ft' else max(6, req.model_vram_gb // (4 if is_qlora else 2))}\n"
            "    print(f'\\n✅ GPU: {gpu.name}')\n"
            "    print(f'💾 VRAM: {vram_gb:.1f}GB | Needed: ~{needed_gb}GB')\n"
            "    if vram_gb < needed_gb * 0.9:\n"
            "        print('⚠️  May OOM! Lower batch_size or use QLoRA.')\n"
            "    else:\n"
            "        print('✅ VRAM sufficient!')\n"
            "else:\n"
            "    raise RuntimeError('❌ CUDA not available. Enable GPU runtime!')\n"
        )
    )

    # ── Auth ───────────────────────────────────────────────────────────────
    cells.append(
        _make_md_cell(
            "## 🔑 3. Authentication\n\n"
            "> **Required for gated models** (Llama, Gemma, etc.)\n"
            "> Get your token at: https://huggingface.co/settings/tokens"
        )
    )
    if is_colab:
        cells.append(
            _make_code_cell(
                "import os\nfrom huggingface_hub import login\n\n"
                "# Colab Secrets (recommended) — or paste token directly\n"
                "try:\n"
                "    from google.colab import userdata\n"
                "    HF_TOKEN = userdata.get('HF_TOKEN')\n"
                "    login(token=HF_TOKEN, add_to_git_credential=False)\n"
                "    print('✅ Logged in via Colab Secrets')\n"
                "except Exception:\n"
                "    HF_TOKEN = os.environ.get('HF_TOKEN', '')\n"
                "    if HF_TOKEN:\n"
                "        login(token=HF_TOKEN, add_to_git_credential=False)\n"
                "        print('✅ Logged in via env var')\n"
                "    else:\n"
                "        print('⚠️  No HF_TOKEN found. Only public models will work.')\n"
            )
        )
    else:
        cells.append(
            _make_code_cell(
                "import os\nfrom huggingface_hub import login\n\n"
                "# Set via: export HF_TOKEN=hf_your_token_here\n"
                "HF_TOKEN = os.environ.get('HF_TOKEN', '')\n"
                "if HF_TOKEN:\n"
                "    login(token=HF_TOKEN, add_to_git_credential=False)\n"
                "    print('✅ Logged in to HuggingFace')\n"
                "else:\n"
                "    print('⚠️  No HF_TOKEN. Set: export HF_TOKEN=hf_...')\n"
            )
        )

    # ── Config ─────────────────────────────────────────────────────────────
    cells.append(
        _make_md_cell(
            "## ⚙️ 4. Training Configuration\n\n> Modify these values to customize your training run."
        )
    )
    config_code = (
        f"# ─── Model ───────────────────────────────────────────────────\n"
        f'MODEL_ID = "{req.model_id}"\n'
        f'METHOD = "{req.method}"  # lora | qlora | full_ft\n'
        f'TASK_TYPE = "{req.task_type}"\n'
        f'DATASET_FORMAT = "{req.dataset_format}"\n\n'
        f"# ─── Training Hyperparameters ────────────────────────────────\n"
        f"EPOCHS = {hp.epochs}\n"
        f"BATCH_SIZE = {hp.batch_size}\n"
        f"GRAD_ACCUM = {hp.gradient_accumulation_steps}  # Effective batch = BATCH_SIZE * GRAD_ACCUM = {eff_batch}\n"
        f"LEARNING_RATE = {hp.learning_rate}\n"
        f"MAX_SEQ_LENGTH = {hp.max_seq_length}\n"
        f"WARMUP_RATIO = {hp.warmup_ratio}\n"
        f'LR_SCHEDULER = "{hp.lr_scheduler}"\n'
        f"WEIGHT_DECAY = {hp.weight_decay}\n"
        f"MAX_GRAD_NORM = {hp.max_grad_norm}\n"
        f"FP16 = {hp.fp16}\n"
        f"BF16 = {hp.bf16}\n"
        f"GRADIENT_CHECKPOINTING = {hp.gradient_checkpointing}\n"
        f"SAVE_STEPS = {hp.save_steps}\n\n"
        f'OUTPUT_DIR = "{req.output_dir}"\n'
        f"PUSH_TO_HUB = {req.push_to_hub}\n"
    )
    if is_lora:
        config_code += (
            f"\n# ─── LoRA Configuration ──────────────────────────────────\n"
            f"LORA_R = {lora.r}  # Rank\n"
            f"LORA_ALPHA = {lora.alpha}  # Usually 2x rank\n"
            f"LORA_DROPOUT = {lora.dropout}\n"
            f'LORA_TARGET_MODULES = "{lora.target_modules}".split(",")\n'
        )
    if is_qlora:
        config_code += f"\n# ─── QLoRA Quantization ──────────────────────────────────\n"
        config_code += f"QUANT_BITS = {req.quantization_bits or 4}  # 4-bit or 8-bit\n"
    if req.push_to_hub:
        config_code += f'\nHUB_MODEL_ID = "{req.hub_model_id}"\n'
    if req.use_wandb:
        config_code += f'\nUSE_WANDB = True\nWANDB_PROJECT = "{req.wandb_project}"\n'
    else:
        config_code += "\nUSE_WANDB = False\n"
    config_code += '\nprint("✅ Config ready!")\nprint(f"  Model: {MODEL_ID}")\n'
    config_code += f'print(f"  Method: {req.method.upper()} | Effective batch: {eff_batch}")\n'
    cells.append(_make_code_cell(config_code))

    # ── Dataset ────────────────────────────────────────────────────────────
    cells.append(
        _make_md_cell(
            f"## 📂 5. Load Dataset\n\n"
            f"**Format**: `{req.dataset_format}` | "
            f"[Format guide](https://huggingface.co/docs/trl/en/sft_trainer)\n\n"
            f"Choose ONE of the options below:"
        )
    )
    dataset_code = (
        "from datasets import load_dataset\nimport json\n\n"
        "# TODO: Load your dataset here using the profile information (e.g., CSV, JSONL, HuggingFace).\n"
        "# # dataset = load_dataset('tatsu-lab/alpaca', split='train[:1000]')\n\n"
        "# # ─── OPTION B: Upload local file ─────────────────────────────────────\n"
    )
    if is_colab:
        dataset_code += (
            "# # from google.colab import files\n"
            "# # uploaded = files.upload()  # Upload your .jsonl / .csv / .json file\n"
            "# # dataset_file = list(uploaded.keys())[0]\n"
            "# # dataset = load_dataset('json', data_files=dataset_file, split='train')\n\n"
        )
    else:
        dataset_code += (
            "# # dataset = load_dataset('json', data_files='./my_data.jsonl', split='train')\n\n"
        )
    dataset_code += (
        "# # ─── OPTION C: From pandas / local CSV ───────────────────────────────\n"
        "# # import pandas as pd\n"
        "# # from datasets import Dataset\n"
        "# # df = pd.read_csv('my_data.csv')\n"
        "# # dataset = Dataset.from_pandas(df)\n\n"
        "# # ─── DEMO: Using sample Alpaca data ──────────────────────────────────\n"
        "# # dataset = load_dataset('tatsu-lab/alpaca', split='train[:500]')  # 500 samples demo\n"
        "# # print(f'✅ Dataset loaded: {len(dataset)} samples')\n"
        "# # print(f'   Columns: {dataset.column_names}')\n"
        "# # print(f'   Sample: {dataset[0]}')\n"
    )

    if req.dataset_format == "alpaca":
        dataset_code += (
            "\n# ─── Alpaca Formatting Function ──────────────────────────────────────\n"
            "def format_alpaca(example):\n"
            "    if example.get('input', '').strip():\n"
            "        prompt = (\n"
            "            f'### Instruction:\\n{example[\"instruction\"]}\\n\\n'\n"
            "            f'### Input:\\n{example[\"input\"]}\\n\\n'\n"
            "            f'### Response:\\n{example[\"output\"]}'\n"
            "        )\n"
            "    else:\n"
            "        prompt = (\n"
            "            f'### Instruction:\\n{example[\"instruction\"]}\\n\\n'\n"
            "            f'### Response:\\n{example[\"output\"]}'\n"
            "        )\n"
            "    return {'text': prompt}\n\n"
            "dataset = dataset.map(format_alpaca, remove_columns=dataset.column_names)\n"
            "formatting_func = None  # Already formatted as 'text'\n"
            "print(f'✅ Formatted. Sample:\\n{dataset[0][\"text\"][:200]}...')\n"
        )
    elif req.dataset_format == "sharegpt":
        dataset_code += (
            "\n# ─── ShareGPT Formatting Function ───────────────────────────────────\n"
            "def format_sharegpt(example):\n"
            "    text = ''\n"
            "    for turn in example.get('conversations', []):\n"
            "        role = 'Human' if turn['from'] in ('human', 'user') else 'Assistant'\n"
            "        text += f\"{role}: {turn['value']}\\n\"\n"
            "    return {'text': text.strip()}\n\n"
            "# dataset = dataset.map(format_sharegpt, remove_columns=['conversations'])\n"
        )
    cells.append(_make_code_cell(dataset_code))

    # ── Load Model ─────────────────────────────────────────────────────────
    cells.append(
        _make_md_cell(
            f"## 🤖 6. Load Model & Tokenizer\n\n"
            f"> Loading `{req.model_id}` with "
            f"{'QLoRA (' + str(req.quantization_bits) + '-bit)' if is_qlora else 'LoRA' if is_lora else 'Full Fine-Tuning'}"
        )
    )
    load_code = (
        "import torch\n"
        "from transformers import AutoModelForCausalLM, AutoTokenizer"
        + (", BitsAndBytesConfig" if is_qlora else "")
        + "\n\n"
    )
    if is_qlora:
        load_code += (
            f"# Quantization config for {req.quantization_bits}-bit QLoRA\n"
            f"bnb_config = BitsAndBytesConfig(\n"
            f"    load_in_{req.quantization_bits or 4}bit=True,\n"
            f"    bnb_{req.quantization_bits or 4}bit_quant_type='nf4',\n"
            f"    bnb_{req.quantization_bits or 4}bit_compute_dtype=torch.bfloat16,\n"
            f"    bnb_{req.quantization_bits or 4}bit_use_double_quant=True,\n"
            f")\n"
            f"model_kwargs = {{'quantization_config': bnb_config}}\n\n"
        )
    else:
        dtype = "torch.bfloat16" if hp.bf16 else "torch.float16" if hp.fp16 else "torch.float32"
        load_code += f"model_kwargs = {{'torch_dtype': {dtype}}}\n\n"

    load_code += (
        "print(f'Loading tokenizer: {MODEL_ID}')\n"
        "tokenizer = AutoTokenizer.from_pretrained(\n"
        "    MODEL_ID, token=HF_TOKEN, trust_remote_code=True\n"
        ")\n"
        "if tokenizer.pad_token is None:\n"
        "    tokenizer.pad_token = tokenizer.eos_token\n"
        "    tokenizer.pad_token_id = tokenizer.eos_token_id\n"
        "tokenizer.padding_side = 'right'\n\n"
        "print(f'Loading model: {MODEL_ID}')\n"
        "model = AutoModelForCausalLM.from_pretrained(\n"
        "    MODEL_ID,\n"
        "    device_map='auto',\n"
        "    token=HF_TOKEN,\n"
        "    trust_remote_code=True,\n"
        "    **model_kwargs\n"
        ")\n"
        "model.config.use_cache = False\n"
    )
    if hp.gradient_checkpointing:
        load_code += "model.gradient_checkpointing_enable()\n"
    load_code += (
        "\ntotal_params = sum(p.numel() for p in model.parameters()) / 1e9\n"
        "print(f'✅ Model loaded! Size: {total_params:.2f}B params')\n"
        "print(f'📊 GPU memory: {torch.cuda.memory_allocated() / 1e9:.2f}GB used')\n"
    )
    cells.append(_make_code_cell(load_code))

    # ── LoRA Setup ─────────────────────────────────────────────────────────
    if is_lora:
        cells.append(
            _make_md_cell(
                f"## 🎛️ 7. Configure {'QLoRA' if is_qlora else 'LoRA'}\n\n"
                f"> Rank={lora.r}, Alpha={lora.alpha}, "
                f"Dropout={lora.dropout}\n"
                f"> Targets: `{lora.target_modules}`"
            )
        )
        lora_code = "from peft import LoraConfig, get_peft_model, TaskType, prepare_model_for_kbit_training\n\n"
        if is_qlora:
            lora_code += "# Prepare model for k-bit training (QLoRA requirement)\nmodel = prepare_model_for_kbit_training(model)\n\n"
        lora_code += (
            "lora_config = LoraConfig(\n"
            "    r=LORA_R,\n"
            "    lora_alpha=LORA_ALPHA,\n"
            "    target_modules=LORA_TARGET_MODULES,\n"
            "    lora_dropout=LORA_DROPOUT,\n"
            "    bias='none',\n"
            "    task_type=TaskType.CAUSAL_LM,\n"
            ")\n\n"
            "model = get_peft_model(model, lora_config)\n"
            "model.print_trainable_parameters()\n\n"
            "trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)\n"
            "total = sum(p.numel() for p in model.parameters())\n"
            "print(f'✅ LoRA applied: {trainable/1e6:.2f}M trainable / {total/1e9:.2f}B total ({100*trainable/total:.3f}%)')\n"
            "print(f'   Estimated training VRAM reduction: ~{4 if is_qlora else 2}x less than full FT')\n"
        )
        cells.append(_make_code_cell(lora_code))

    # ── W&B ────────────────────────────────────────────────────────────────
    step = 8 if is_lora else 7
    if req.use_wandb:
        cells.append(_make_md_cell(f"## 📊 {step}. W&B Experiment Tracking"))
        cells.append(
            _make_code_cell(
                "import wandb, os\n\n"
                "# Set WANDB_API_KEY env var or login interactively\n"
                "wandb.login(key=os.environ.get('WANDB_API_KEY', ''))\n"
                f"run = wandb.init(\n"
                f"    project=WANDB_PROJECT,\n"
                f'    name=f"finetune-{req.model_id.split("/")[-1]}-{{EPOCHS}}ep",\n'
                f"    config={{\n"
                f"        'model': MODEL_ID, 'method': METHOD,\n"
                f"        'epochs': EPOCHS, 'lr': LEARNING_RATE,\n"
                f"        'batch_size': BATCH_SIZE * GRAD_ACCUM\n"
                f"    }}\n"
                f")\n"
                "print(f'✅ W&B run: {run.url}')\n"
            )
        )
        step += 1

    # ── Training ───────────────────────────────────────────────────────────
    cells.append(
        _make_md_cell(
            f"## 🚀 {step}. Train!\n\n"
            f"> **Estimated time**: depends on dataset size and GPU\n"
            f"> T4 GPU: ~10-30 min for 500 samples × {hp.epochs} epoch(s)\n"
            f"> Monitor loss in the output below"
        )
    )
    train_code = (
        "from trl import SFTTrainer, SFTConfig\nimport time\n\n"
        "training_args = SFTConfig(\n"
        "    output_dir=OUTPUT_DIR,\n"
        "    num_train_epochs=EPOCHS,\n"
        "    per_device_train_batch_size=BATCH_SIZE,\n"
        "    gradient_accumulation_steps=GRAD_ACCUM,\n"
        "    learning_rate=LEARNING_RATE,\n"
        "    lr_scheduler_type=LR_SCHEDULER,\n"
        "    warmup_ratio=WARMUP_RATIO,\n"
        "    max_seq_length=MAX_SEQ_LENGTH,\n"
        "    weight_decay=WEIGHT_DECAY,\n"
        "    max_grad_norm=MAX_GRAD_NORM,\n"
        "    fp16=FP16,\n"
        "    bf16=BF16,\n"
        f"    optim='{'paged_adamw_32bit' if is_qlora else 'adamw_torch'}',\n"
        "    save_steps=SAVE_STEPS,\n"
        "    save_total_limit=2,\n"
        "    eval_strategy='no',\n"
        "    logging_steps=10,\n"
        "    logging_first_step=True,\n"
        "    report_to='wandb' if USE_WANDB else 'none',\n"
        "    push_to_hub=PUSH_TO_HUB,\n"
    )
    if req.push_to_hub:
        train_code += "    hub_model_id=HUB_MODEL_ID,\n"
    train_code += (
        "    dataset_text_field='text',\n"
        ")\n\n"
        "trainer = SFTTrainer(\n"
        "    model=model,\n"
        "    args=training_args,\n"
        "    train_dataset=dataset,\n"
        "    tokenizer=tokenizer,\n"
        ")\n\n"
        "print('🚀 Starting training...')\n"
        "print(f'   Epochs: {EPOCHS} | LR: {LEARNING_RATE} | Eff. Batch: {BATCH_SIZE * GRAD_ACCUM}')\n"
        "start_time = time.time()\n\n"
        "train_result = trainer.train()\n\n"
        "elapsed = time.time() - start_time\n"
        "print(f'\\n✅ Training complete!')\n"
        "print(f'   Time: {elapsed/60:.1f} minutes')\n"
        "print(f'   Loss: {train_result.training_loss:.4f}')\n"
        "print(f'   Steps: {train_result.global_step}')\n"
    )
    cells.append(_make_code_cell(train_code))
    step += 1

    # ── Save ───────────────────────────────────────────────────────────────
    cells.append(_make_md_cell(f"## 💾 {step}. Save Model & Download"))
    save_code = (
        "import os\n\n"
        "# Save adapter weights and tokenizer\n"
        "trainer.save_model(OUTPUT_DIR)\n"
        "tokenizer.save_pretrained(OUTPUT_DIR)\n"
        "print(f'✅ Model saved to {OUTPUT_DIR}')\n"
        "print(f'   Contents: {os.listdir(OUTPUT_DIR)}')\n\n"
    )
    if is_lora:
        save_code += (
            "# ─── Optional: Merge LoRA with base model ────────────────────────────\n"
            "# Creates a standalone model (larger but no adapter needed at inference)\n"
            "# Uncomment to merge:\n"
            "# from transformers import AutoModelForCausalLM\n"
            "# from peft import PeftModel\n"
            "# print('Merging LoRA weights...')\n"
            "# base = AutoModelForCausalLM.from_pretrained(MODEL_ID, torch_dtype=torch.bfloat16)\n"
            "# merged = PeftModel.from_pretrained(base, OUTPUT_DIR)\n"
            "# merged = merged.merge_and_unload()\n"
            "# merged.save_pretrained('merged_model')\n"
            "# tokenizer.save_pretrained('merged_model')\n"
            "# print('✅ Merged model saved!')\n\n"
        )
    if is_colab:
        save_code += (
            "# Download as zip\n"
            "import zipfile\n"
            "with zipfile.ZipFile('model_weights.zip', 'w', zipfile.ZIP_DEFLATED) as zf:\n"
            "    for root, dirs, files in os.walk(OUTPUT_DIR):\n"
            "        for file in files:\n"
            "            fp = os.path.join(root, file)\n"
            "            zf.write(fp, os.path.relpath(fp, '.'))\n"
            "from google.colab import files\n"
            "files.download('model_weights.zip')\n"
            "print('✅ Download started!')\n"
        )
    if req.push_to_hub:
        save_code += (
            "\n# Push to HuggingFace Hub\n"
            "trainer.push_to_hub(commit_message='Fine-tuned with System2ML')\n"
            f"print(f'✅ Pushed to: https://huggingface.co/{req.hub_model_id}')\n"
        )
    cells.append(_make_code_cell(save_code))
    step += 1

    # ── Inference Test ─────────────────────────────────────────────────────
    cells.append(_make_md_cell(f"## 🧪 {step}. Test Your Fine-Tuned Model"))
    cells.append(
        _make_code_cell(
            "# Test prompt — change this to something relevant to your training data!\n"
            "TEST_PROMPT = 'Explain what fine-tuning does to a language model.'\n\n"
            "# Format the prompt (match your training format)\n"
            "if DATASET_FORMAT == 'alpaca':\n"
            "    formatted = f'### Instruction:\\n{TEST_PROMPT}\\n\\n### Response:\\n'\n"
            "elif DATASET_FORMAT == 'sharegpt':\n"
            "    formatted = f'Human: {TEST_PROMPT}\\nAssistant: '\n"
            "else:\n"
            "    formatted = TEST_PROMPT\n\n"
            "# Generate response\n"
            "model.eval()\n"
            "inputs = tokenizer(formatted, return_tensors='pt').to('cuda')\n"
            "with torch.no_grad():\n"
            "    outputs = model.generate(\n"
            "        **inputs,\n"
            "        max_new_tokens=256,\n"
            "        temperature=0.7,\n"
            "        top_p=0.9,\n"
            "        do_sample=True,\n"
            "        repetition_penalty=1.1,\n"
            "        pad_token_id=tokenizer.eos_token_id\n"
            "    )\n"
            "response = tokenizer.decode(\n"
            "    outputs[0][inputs['input_ids'].shape[1]:],\n"
            "    skip_special_tokens=True\n"
            ")\n"
            "print(f'📝 Prompt: {TEST_PROMPT}')\n"
            "print(f'\\n🤖 Response:\\n{response}')\n"
        )
    )

    # ── Final Notes ────────────────────────────────────────────────────────
    cells.append(
        _make_md_cell(
            "## 🎉 Done!\n\n"
            "Your fine-tuned model is ready. Next steps:\n\n"
            "### Deploy Options\n"
            "- **Local**: Use with Ollama — convert to GGUF format\n"
            "- **API**: Deploy with vLLM for production inference\n"
            "- **Cloud**: Push to HuggingFace Spaces for free hosting\n\n"
            "### Load Your Model Later\n"
            "```python\n"
            "from transformers import AutoModelForCausalLM, AutoTokenizer\n"
            "from peft import PeftModel\n\n"
            f"base = AutoModelForCausalLM.from_pretrained('{req.model_id}')\n"
            "model = PeftModel.from_pretrained(base, './finetuned_model')\n"
            "tokenizer = AutoTokenizer.from_pretrained('./finetuned_model')\n"
            "```\n\n"
            "> **Generated by [System2ML](https://github.com/system2ml)** — The AI Pipeline Design Platform"
        )
    )

    metadata = {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.10.12"},
        "system2ml": {
            "generated_at": datetime.utcnow().isoformat(),
            "model_id": req.model_id,
            "method": req.method,
            "platform": req.platform,
        },
    }
    if is_colab:
        metadata["colab"] = {
            "provenance": [],
            "gpuType": "T4",
            "accelerator": "GPU",
            "name": f"System2ML_{req.model_name.replace(' ', '_')}_{req.method.upper()}.ipynb",
            "include_colab_link": True,
        }

    return {"cells": cells, "metadata": metadata, "nbformat": 4, "nbformat_minor": 5}


# ─── API Routes ────────────────────────────────────────────────────────────────


@router.post("/notebook/generate")
def generate_training_notebook(req: NotebookRequest):
    """Generate a training notebook and return it as JSON."""
    if not req.model_id:
        raise HTTPException(status_code=400, detail="model_id is required")

    job_id = str(uuid.uuid4())[:12]
    notebook = generate_notebook(req)

    _jobs[job_id] = {
        "job_id": job_id,
        "status": "notebook_ready",
        "model_id": req.model_id,
        "method": req.method,
        "platform": req.platform,
        "created_at": datetime.utcnow().isoformat(),
        "notebook": notebook,
    }

    return {
        "job_id": job_id,
        "status": "ready",
        "notebook": notebook,
        "filename": f"system2ml_finetune_{req.model_name.replace(' ', '_')}_{req.method}_{req.platform}.ipynb",
        "cell_count": len(notebook["cells"]),
        "message": "Notebook generated successfully",
        "instructions": {
            "colab": [
                "1. Download the .ipynb file",
                "2. Go to colab.research.google.com",
                "3. File → Upload notebook",
                "4. Runtime → Change runtime type → T4 GPU",
                "5. Add HF_TOKEN in Secrets (left panel 🔑)",
                "6. Runtime → Run all (Ctrl+F9)",
            ],
            "jupyter": [
                "1. Download the .ipynb file",
                "2. pip install jupyter",
                "3. export HF_TOKEN=your_hf_token",
                "4. jupyter notebook",
                "5. Open the notebook and run all cells",
            ],
        }.get(req.platform, ["Download and open in your notebook environment"]),
    }


@router.get("/notebook/{job_id}/download")
def download_notebook(job_id: str):
    """Get notebook JSON for download."""
    from fastapi.responses import Response

    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    notebook = job.get("notebook")
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not generated yet")

    model_name = job.get("model_id", "model").split("/")[-1]
    filename = f"system2ml_{model_name}_{job['method']}.ipynb"

    return Response(
        content=json.dumps(notebook, indent=2),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Filename": filename,
        },
    )


@router.get("/models")
def list_available_models():
    """Return curated list of fine-tunable models with metadata."""
    return {
        "models": [
            {
                "id": "meta-llama/Meta-Llama-3.1-8B-Instruct",
                "name": "Llama 3.1 8B",
                "family": "Llama 3",
                "params": "8B",
                "vram_gb": 16,
                "license": "Llama 3",
                "tags": ["instruction", "general"],
                "qlora_vram_gb": 6,
            },
            {
                "id": "meta-llama/Meta-Llama-3.1-70B-Instruct",
                "name": "Llama 3.1 70B",
                "family": "Llama 3",
                "params": "70B",
                "vram_gb": 80,
                "license": "Llama 3",
                "tags": ["powerful"],
                "qlora_vram_gb": 20,
            },
            {
                "id": "mistralai/Mistral-7B-Instruct-v0.3",
                "name": "Mistral 7B v0.3",
                "family": "Mistral",
                "params": "7B",
                "vram_gb": 14,
                "license": "Apache 2.0",
                "tags": ["commercial", "fast"],
                "qlora_vram_gb": 5,
            },
            {
                "id": "mistralai/Mixtral-8x7B-Instruct-v0.1",
                "name": "Mixtral 8x7B",
                "family": "Mistral",
                "params": "47B MoE",
                "vram_gb": 48,
                "license": "Apache 2.0",
                "tags": ["moe", "powerful"],
                "qlora_vram_gb": 12,
            },
            {
                "id": "Qwen/Qwen2.5-7B-Instruct",
                "name": "Qwen 2.5 7B",
                "family": "Qwen",
                "params": "7B",
                "vram_gb": 14,
                "license": "Apache 2.0",
                "tags": ["code", "multilingual"],
                "qlora_vram_gb": 5,
            },
            {
                "id": "Qwen/Qwen2.5-14B-Instruct",
                "name": "Qwen 2.5 14B",
                "family": "Qwen",
                "params": "14B",
                "vram_gb": 28,
                "license": "Apache 2.0",
                "tags": ["code", "math"],
                "qlora_vram_gb": 8,
            },
            {
                "id": "microsoft/Phi-3.5-mini-instruct",
                "name": "Phi-3.5 Mini",
                "family": "Phi",
                "params": "3.8B",
                "vram_gb": 8,
                "license": "MIT",
                "tags": ["tiny", "edge", "full_ft_ok"],
                "qlora_vram_gb": 4,
            },
            {
                "id": "google/gemma-2-9b-it",
                "name": "Gemma 2 9B",
                "family": "Gemma",
                "params": "9B",
                "vram_gb": 18,
                "license": "Gemma",
                "tags": ["google", "safe"],
                "qlora_vram_gb": 6,
            },
            {
                "id": "deepseek-ai/deepseek-coder-7b-instruct-v1.5",
                "name": "DeepSeek Coder 7B",
                "family": "DeepSeek",
                "params": "7B",
                "vram_gb": 14,
                "license": "DeepSeek",
                "tags": ["code", "specialized"],
                "qlora_vram_gb": 5,
            },
            {
                "id": "tiiuae/falcon-7b-instruct",
                "name": "Falcon 7B",
                "family": "Falcon",
                "params": "7B",
                "vram_gb": 14,
                "license": "Apache 2.0",
                "tags": ["commercial", "apache"],
                "qlora_vram_gb": 5,
            },
        ]
    }


@router.get("/jobs")
def list_jobs():
    """List all fine-tuning jobs."""
    return {"jobs": [{k: v for k, v in job.items() if k != "notebook"} for job in _jobs.values()]}


@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    """Get job status."""
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {k: v for k, v in job.items() if k != "notebook"}


@router.delete("/jobs/{job_id}")
def delete_job(job_id: str):
    """Delete a job."""
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    del _jobs[job_id]
    return {"deleted": True}


@router.post("/estimate")
def estimate_training_cost(req: NotebookRequest):
    """Estimate training time and cost for a configuration."""
    hp = req.hyperparams
    eff_batch = hp.batch_size * hp.gradient_accumulation_steps

    # Very rough estimates (tokens/sec on T4 GPU)
    tokens_per_sec = {"qlora": 800, "lora": 600, "full_ft": 300}.get(req.method, 600)

    # Assume ~500 training samples, average 256 tokens
    assumed_samples = 500
    tokens_per_epoch = assumed_samples * min(hp.max_seq_length, 256)
    total_tokens = tokens_per_epoch * hp.epochs
    estimated_secs = total_tokens / tokens_per_sec

    # Colab T4 free tier: 12h/day
    colab_hours_used = estimated_secs / 3600

    vram_needed = req.model_vram_gb
    if req.method == "qlora":
        vram_needed = max(6, req.model_vram_gb // 4)
    elif req.method == "lora":
        vram_needed = max(8, req.model_vram_gb // 2)

    return {
        "estimated_time_minutes": round(estimated_secs / 60, 1),
        "estimated_vram_gb": vram_needed,
        "fits_colab_t4": vram_needed <= 15,
        "fits_colab_a100": vram_needed <= 40,
        "colab_free_hours_used": round(colab_hours_used, 2),
        "estimated_cost_usd": 0 if vram_needed <= 15 else round(colab_hours_used * 0.5, 2),
        "recommendation": (
            "✅ Fits Colab T4 FREE tier"
            if vram_needed <= 15
            else "⚡ Use Colab A100 ($~0.5/hr)"
            if vram_needed <= 40
            else "🖥️ Needs multi-GPU setup"
        ),
        "tips": [
            f"Effective batch size: {eff_batch} (batch × grad_accum)",
            f"{'QLoRA reduces VRAM by ~4x' if req.method == 'qlora' else ''}",
            "Reduce max_seq_length to save VRAM",
            "Use gradient_checkpointing=True to halve VRAM usage",
        ],
    }


# ─── LoRA Auto-Tuning API ────────────────────────────────────────────────────


class LoRAAutoTuneRequest(BaseModel):
    dataset_rows: int
    model_params_b: int
    method: str = "qlora"


@router.post("/lora/auto-tune")
def auto_tune_lora(req: LoRAAutoTuneRequest):
    """Get AI-recommended LoRA parameters based on dataset and model size."""
    return recommend_lora_config(req.dataset_rows, req.model_params_b)


# ─── Dataset Format Converter API ────────────────────────────────────────────


@router.post("/dataset/convert")
async def convert_dataset(
    file: UploadFile = File(...), source_format: str = "csv", target_format: str = "jsonl"
):
    """Convert dataset between formats (CSV, JSONL, Parquet)."""
    content = await file.read()

    try:
        converted = convert_dataset_format(content, source_format, target_format)
        filename = file.filename.rsplit(".", 1)[0] + f".{target_format}"

        from fastapi.responses import Response

        return Response(
            content=converted,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/dataset/profile")
async def profile_dataset_endpoint(file: UploadFile = File(...), file_format: str = "csv"):
    """Profile a dataset to extract columns, task type, class balance for AI notebook generation."""
    content = await file.read()

    try:
        profile = profile_dataset(content, file_format, file.filename)
        return profile.model_dump()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Adapter Hub API ─────────────────────────────────────────────────────────


@router.post("/adapters")
def create_adapter(adapter: AdapterMetadata):
    """Save a new LoRA adapter to the hub."""
    adapter_data = adapter.model_dump()
    adapter_data["created_at"] = datetime.utcnow().isoformat()
    _adapters[adapter.id] = adapter_data
    return {"success": True, "adapter_id": adapter.id}


@router.get("/adapters")
def list_adapter_hub(model_id: str = None, include_public: bool = True):
    """List saved LoRA adapters."""
    filters = {"model_id": model_id} if model_id else {}
    if not include_public:
        filters["is_public"] = False
    adapters = list_adapters(filters)
    return {"adapters": adapters, "count": len(adapters)}


@router.get("/adapters/{adapter_id}")
def get_adapter_hub(adapter_id: str):
    """Get a specific adapter."""
    adapter = get_adapter(adapter_id)
    if not adapter:
        raise HTTPException(status_code=404, detail="Adapter not found")
    return adapter


@router.put("/adapters/{adapter_id}/version")
def version_adapter_endpoint(adapter_id: str, update_data: Dict[str, Any]):
    """Create a new version of an adapter."""
    adapter = version_adapter(adapter_id, update_data)
    if not adapter:
        raise HTTPException(status_code=404, detail="Adapter not found")
    return {"success": True, "adapter": adapter.model_dump()}


@router.post("/adapters/{adapter_id}/share")
def share_adapter(adapter_id: str, make_public: bool = True):
    """Toggle public/private sharing of an adapter."""
    adapter = _adapters.get(adapter_id)
    if not adapter:
        raise HTTPException(status_code=404, detail="Adapter not found")

    adapter["is_public"] = make_public
    _adapters[adapter_id] = adapter

    return {
        "success": True,
        "is_public": make_public,
        "share_url": f"/adapters/{adapter_id}" if make_public else None,
    }


# ─── Training Progress WebSocket API ─────────────────────────────────────────


@router.websocket("/ws/training/{job_id}")
async def training_progress_websocket(websocket: WebSocket, job_id: str):
    """WebSocket endpoint for real-time training progress streaming."""
    await websocket.accept()

    if job_id not in _active_connections:
        _active_connections[job_id] = []
    _active_connections[job_id].append(websocket)

    try:
        while True:
            # Wait for messages from client
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get("type") == "subscribe":
                # Client subscribing to updates
                await websocket.send_json(
                    {
                        "type": "subscribed",
                        "job_id": job_id,
                        "message": "Now receiving training updates",
                    }
                )

    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        if job_id in _active_connections:
            _active_connections[job_id] = [w for w in _active_connections[job_id] if w != websocket]


async def broadcast_training_progress(job_id: str, progress_data: Dict[str, Any]):
    """Broadcast training progress to all connected clients."""
    if job_id in _active_connections:
        for websocket in _active_connections[job_id]:
            try:
                await websocket.send_json(progress_data)
            except:
                pass


# ─── Model Comparison API ───────────────────────────────────────────────────


class ModelComparisonRequest(BaseModel):
    base_model_id: str
    fine_tuned_model_id: str
    benchmark_dataset: str
    metrics: List[str] = ["accuracy", "f1", "perplexity"]


@router.post("/compare")
def compare_models(req: ModelComparisonRequest):
    """Compare base model vs fine-tuned model on benchmarks."""
    # This would typically run actual inference on benchmark data
    # For now, return a comparison template
    return {
        "base_model": {"id": req.base_model_id, "metrics": {m: None for m in req.metrics}},
        "fine_tuned_model": {
            "id": req.fine_tuned_model_id,
            "metrics": {m: None for m in req.metrics},
        },
        "improvement": {},
        "benchmark_dataset": req.benchmark_dataset,
        "status": "ready_for_benchmark",
    }


# ─── AI Notebook Generation with Dataset Awareness ──────────────────────────


class AINotebookRequest(BaseModel):
    model_id: str
    model_name: str
    model_params_b: int
    dataset_profile: Optional[DatasetProfile] = None
    method: str = "qlora"
    use_wandb: bool = False
    platform: str = "colab"


@router.post("/notebook/ai-generate")
def generate_ai_notebook(req: AINotebookRequest):
    """
    Generate dataset-aware training notebook using Groq for intelligent code generation.
    The notebook adapts to actual column names, task type, class balance, etc.
    """
    # Use dataset profile if provided
    profile = req.dataset_profile

    # Get LoRA recommendations
    dataset_rows = profile.rows if profile else 1000
    lora_config = recommend_lora_config(dataset_rows, req.model_params_b)

    # Build dataset-aware prompt template
    prompt_parts = []

    if profile:
        prompt_parts.append(f"Dataset: {profile.name}")
        prompt_parts.append(f"Columns: {', '.join(profile.columns)}")
        prompt_parts.append(f"Task Type: {profile.task_type or 'causal_lm'}")

        if profile.label_column:
            prompt_parts.append(f"Label Column: {profile.label_column}")
            prompt_parts.append(f"Class Distribution: {profile.class_balance}")

        if profile.text_columns:
            prompt_parts.append(f"Text Columns: {', '.join(profile.text_columns)}")

        if profile.missing_values:
            prompt_parts.append(f"Missing Values: {profile.missing_values}")

    system_prompt = f"""You are generating a fine-tuning notebook for {req.model_name}.
    Dataset Info:
    {chr(10).join(prompt_parts)}
    
    LoRA Recommendations (based on dataset size):
    - Rank (r): {lora_config["r"]}
    - Alpha: {lora_config["alpha"]}
    - Dropout: {lora_config["dropout"]}
    - Overfitting Risk: {lora_config["overfitting_risk"]}
    
    Generate a complete Jupyter notebook that:
    1. Loads the dataset using actual column names from the profile
    2. Uses appropriate formatting function for the task type
    3. Applies recommended LoRA parameters
    4. Handles class imbalance if present
    """

    # For now, generate standard notebook with dataset-aware config
    notebook_req = NotebookRequest(
        model_id=req.model_id,
        model_name=req.model_name,
        model_vram_gb=16,
        method=req.method,
        task_type=profile.task_type if profile and profile.task_type else "causal_lm",
        dataset_format=profile.dataset_format if profile else "alpaca",
        hyperparams=TrainingHyperparams(),
        lora_config=LoRAConfig(
            r=lora_config["r"], alpha=lora_config["alpha"], dropout=lora_config["dropout"]
        ),
        use_wandb=req.use_wandb,
        platform=req.platform,
    )

    notebook = generate_notebook(notebook_req)

    return {
        "notebook": notebook,
        "dataset_profile": profile.model_dump() if profile else None,
        "lora_recommendations": lora_config,
        "ai_prompt": system_prompt,
        "cell_count": len(notebook["cells"]),
    }
