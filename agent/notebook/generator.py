# -*- coding: utf-8 -*-
"""Notebook generation utilities for the Colab training service."""

from __future__ import annotations

import json
import uuid
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Sequence

logger = logging.getLogger(__name__)

HAS_NBFORMAT = False
HAS_JINJA2 = False

try:
    import nbformat
    from nbformat import NotebookNode, v4

    HAS_NBFORMAT = True
except ImportError:
    nbformat = None
    NotebookNode = None
    v4 = None

try:
    from jinja2 import Environment, FileSystemLoader, select_autoescape

    HAS_JINJA2 = True
except ImportError:
    Environment = None
    FileSystemLoader = None
    select_autoescape = None


_TEMPLATE_DIR = Path(__file__).parent / "templates"
_TEMPLATE_ENV = None

if HAS_JINJA2 and _TEMPLATE_DIR.exists():
    _TEMPLATE_ENV = Environment(
        loader=FileSystemLoader(str(_TEMPLATE_DIR)),
        autoescape=select_autoescape(["md", "py", "json"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )


def _render_template(name: str, context: Mapping[str, Any] = {}) -> str:
    """Render a Jinja2 template if available, otherwise return empty string."""
    if _TEMPLATE_ENV is None:
        return ""
    try:
        tmpl = _TEMPLATE_ENV.get_template(name)
        return tmpl.render(**context)
    except Exception as e:
        logger.warning(f"Template {name} not found: {e}")
        return ""


class NotebookGenerator:
    """
    Build a fully-valid Jupyter notebook for Google Colab or any Jupyter environment.

    Uses nbformat for schema-valid notebook generation.
    Supports both AI-generated and template-based notebook creation.
    """

    def __init__(
        self,
        *,
        kernel_name: str = "python3",
        language_version: str = "3.10",
        metadata: Mapping[str, Any] | None = None,
    ) -> None:
        self.kernel_name = kernel_name
        self.language_version = language_version
        self.base_metadata = {
            "kernelspec": {
                "name": self.kernel_name,
                "display_name": "Python 3",
                "language": "python",
            },
            "language_info": {
                "name": "python",
                "version": self.language_version,
                "mimetype": "text/x-python",
                "codemirror_mode": {"name": "ipython", "version": 3},
                "pygments_lexer": "ipython3",
                "nbconvert_exporter": "python",
            },
        }
        if metadata:
            self.base_metadata.update(metadata)

    def create_notebook(
        self,
        config: Mapping[str, Any],
        ai_generated: bool = True,
        ai_response: Optional[str] = None,
    ) -> str:
        """
        Build a notebook from a training configuration dict.

        Parameters
        ----------
        config: Mapping[str, Any]
            Training configuration (model_id, method, dataset, etc.)
        ai_generated: bool
            If True and ai_response provided, use AI-generated notebook
        ai_response: Optional[str]
            JSON string from AI service to use as notebook content

        Returns
        -------
        str
            A JSON string that can be written to .ipynb
        """
        if not HAS_NBFORMAT:
            raise RuntimeError("nbformat is required. Install with: pip install nbformat")

        self._validate_config(config)

        nb = v4.new_notebook(metadata=self.base_metadata)

        if ai_generated and ai_response:
            try:
                ai_nb = json.loads(ai_response)
                if "cells" in ai_nb:
                    nb.cells = []
                    for cell in ai_nb["cells"]:
                        if cell.get("cell_type") == "markdown":
                            nb.cells.append(v4.new_markdown_cell(source=cell.get("source", "")))
                        elif cell.get("cell_type") == "code":
                            nb.cells.append(v4.new_code_cell(source=cell.get("source", "")))
            except (json.JSONDecodeError, KeyError) as e:
                logger.warning(f"Failed to parse AI notebook, falling back to template: {e}")
                nb.cells.extend(self._build_header_cell(config))
                nb.cells.extend(self._build_installation_cells(config))
                nb.cells.extend(self._build_data_preparation_cells(config))
                nb.cells.extend(self._build_training_cells(config))
                nb.cells.extend(self._build_postprocessing_cells(config))
        else:
            nb.cells.extend(self._build_header_cell(config))
            nb.cells.extend(self._build_installation_cells(config))
            nb.cells.extend(self._build_data_preparation_cells(config))
            nb.cells.extend(self._build_training_cells(config))
            nb.cells.extend(self._build_postprocessing_cells(config))

        try:
            nbformat.validate(nb)
        except Exception as e:
            logger.error(f"Notebook validation failed: {e}")

        return json.dumps(nb, indent=2, ensure_ascii=False)

    def _validate_config(self, cfg: Mapping[str, Any]) -> None:
        """Validate required config keys."""
        required = {"model_id", "method"}
        missing = required - cfg.keys()
        if missing:
            raise ValueError(f"Missing required notebook config keys: {sorted(missing)}")

    def _build_header_cell(self, cfg: Mapping[str, Any]) -> List[NotebookNode]:
        """Create markdown header cell."""
        model_name = cfg.get("model_name", cfg.get("model_id", "Untitled"))
        method = cfg.get("method", "lora").upper()

        unsloth_note = " 🚀 (Unsloth - 2x faster)" if cfg.get("use_unsloth") else ""

        header = f"""# Fine-Tuning {model_name} with {method}{unsloth_note}

*Generated by **System2ML** - AI-Powered Pipeline Design*
*Date: {datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")}*

## Configuration
- **Method**: {method}
- **Dataset**: {cfg.get("dataset_name", "Not specified")}
- **Epochs**: {cfg.get("num_epochs", 3)}
- **Batch Size**: {cfg.get("batch_size", 4)}
- **Learning Rate**: {cfg.get("learning_rate", 2e-4)}
"""
        return [v4.new_markdown_cell(source=header)]

    def _build_installation_cells(self, cfg: Mapping[str, Any]) -> List[NotebookNode]:
        """Create installation cell."""
        use_unsloth = cfg.get("use_unsloth", False)

        if use_unsloth:
            install_code = """# Install dependencies with Unsloth for 2x faster training
!pip install -q "unsloth @https://github.com/unslothai/unsloth/releases/download/v2024.11.06/unsloth-2024.11.06-py3-none-any.whl"
!pip install -q transformers datasets peft accelerate bitsandbytes torch pandas tqdm"""
        else:
            install_code = """# Install dependencies
!pip install -q transformers datasets peft accelerate bitsandbytes torch pandas tqdm"""

        return [v4.new_code_cell(source=install_code)]

    def _build_data_preparation_cells(self, cfg: Mapping[str, Any]) -> List[NotebookNode]:
        """Create data preparation cells."""
        dataset_path = cfg.get("dataset_path", "dataset.csv")
        has_labels = cfg.get("has_labels", True)

        code = f'''# Load and prepare dataset
import pandas as pd

DATA_PATH = "{dataset_path}"
df = pd.read_csv(DATA_PATH)

print(f"Dataset loaded: {{len(df)}} rows, {{len(df.columns)}} columns")
print(df.head())

# Prepare data for training
'''
        if has_labels:
            code += """# Separate features and labels
label_col = df.columns[-1]
train_df = df.drop(columns=[label_col])
labels = df[label_col]
print(f"Training samples: {{len(train_df)}}, Labels: {{labels.nunique()}}")
"""

        return [v4.new_code_cell(source=code)]

    def _build_training_cells(self, cfg: Mapping[str, Any]) -> List[NotebookNode]:
        """Create training cells based on method."""
        model_id = cfg.get("model_id", "meta-llama/Meta-Llama-3.1-8B-Instruct")
        method = cfg.get("method", "lora")
        use_unsloth = cfg.get("use_unsloth", False)

        if use_unsloth:
            code = f'''# Load model with Unsloth
from unsloth import FastLanguageModel
import torch

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="{model_id}",
    max_seq_length={cfg.get("max_seq_length", 2048)},
    load_in_4bit={method == "qlora"},
    token=None,  # Add HF token if needed
)

# Add LoRA adapters
model = FastLanguageModel.get_peft_model(
    model,
    r={cfg.get("lora_r", 16)},
    lora_alpha={cfg.get("lora_alpha", 32)},
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout={cfg.get("lora_dropout", 0.05)},
    use_gradient_checkpointing="unsloth",
)

print("Model loaded with Unsloth optimizations!")
model.print_trainable_parameters()'''
        else:
            qbit = cfg.get("quantization_bits", 4)
            code = f'''# Load model and tokenizer
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, TaskType
import torch

MODEL_ID = "{model_id}"

# Quantization config
bnb_config = BitsAndBytesConfig(
    load_in_{qbit}bit=True,
    bnb_{qbit}bit_quant_type="nf4",
    bnb_{qbit}bit_compute_dtype=torch.bfloat16,
) if {method == "qlora"} else None

model_kwargs = {{"quantization_config": bnb_config}} if {method == "qlora"} else {{}}

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForCausalLM.from_pretrained(MODEL_ID, device_map="auto", **model_kwargs)

# Configure LoRA
lora_config = LoraConfig(
    r={cfg.get("lora_r", 16)},
    lora_alpha={cfg.get("lora_alpha", 32)},
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout={cfg.get("lora_dropout", 0.05)},
    bias="none",
    task_type=TaskType.CAUSAL_LM,
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()'''

        return [v4.new_code_cell(source=code)]

    def _build_postprocessing_cells(self, cfg: Mapping[str, Any]) -> List[NotebookNode]:
        """Create post-processing cells."""
        code = """# Save the fine-tuned model
output_dir = "/content/adapter"
model.save_pretrained(output_dir)
tokenizer.save_pretrained(output_dir)
print(f"Model saved to {output_dir}")

# Download for local use
import zipfile
import os
os.chdir("/content")
with zipfile.ZipFile("adapter.zip", "w") as z:
    for root, dirs, files in os.walk("adapter"):
        for file in files:
            z.write(os.path.join(root, file))
print("Download adapter.zip to get your fine-tuned model!")"""

        return [v4.new_code_cell(source=code)]


def validate_notebook(notebook_json: str) -> tuple[bool, Optional[str]]:
    """Validate notebook JSON string."""
    if not HAS_NBFORMAT:
        return False, "nbformat not installed"

    try:
        nb = json.loads(notebook_json)
        nbformat.validate(nb)
        return True, None
    except Exception as e:
        return False, str(e)


def validate_config(config: dict) -> tuple[bool, Optional[str]]:
    """Validate training config for notebook generation."""
    required = {"model_id", "method"}
    missing = required - config.keys()
    if missing:
        return False, f"Missing keys: {missing}"
    return True, None
